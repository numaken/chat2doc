import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import OpenAI from 'openai';
import { authOptions } from '@/lib/auth';
import { UsageManager } from '@/lib/usageManager';
import type { ChatStructure, ChatMessage } from '@/types/structure';

export const runtime = 'nodejs';

// モデル設定（環境変数で切替可能）
const MODEL_CHAT = process.env.OPENAI_MODEL_CHAT || 'gpt-4o-mini';
const MODEL_STRUCT = process.env.OPENAI_MODEL_STRUCT || MODEL_CHAT;

// セキュリティ保護: APIキーチェック
const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_SHARED;

if (!apiKey || apiKey === 'disabled_for_security_reasons') {
  console.warn('🛡️ OpenAI API無効化 - セキュリティ保護中');
}

const openai = new OpenAI({
  apiKey: apiKey || 'disabled',
});

// Structured Outputs用のツール定義（既存の7分類 + 拡張）
const STRUCT_TOOL = [{
  type: 'function' as const,
  function: {
    name: 'emit_chat_structure',
    description: `開発者向けの会話ログ分析を行い、プロジェクトの状況を7つのカテゴリに構造化して返す。

【コード検出の強化ルール】
以下のパターンを積極的にコードとして認識する：

■ ChatGPT形式:
- \`\`\`javascript, \`\`\`python, \`\`\`tsx 等で囲まれたブロック
- "以下のコードを追加してください"、"このファイルを作成します"
- ファイル名: の後に続くコード

■ Claude形式:
- <invoke>やfunction呼び出しの実装例
- "このようにコードを修正します"、"以下を実装しました"
- \`\`\` で囲まれたコードブロック（言語指定なし）

■ その他のAI形式:
- インデントされたコードブロック（4スペース以上）
- "実装", "追加", "修正", "作成", "書き換え"の動詞と組み合わさったコード
- import文、function定義、class定義を含む行
- ファイルパス（.js, .tsx, .py, .css等）の言及と関連するコード

■ ブラウザコピー特有の形式:
- 改行なしで連続するコード（整形前の状態）
- 行番号が含まれているコード
- "Copy code"ボタンでコピーされた形式`,
    strict: true,
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        purpose: { 
          type: 'string', 
          description: 'プロジェクトの目的や目標を1文で簡潔に（最大200字程度）' 
        },
        progress: { 
          type: 'array', 
          items: { type: 'string' },
          description: '完了したタスクや実装済みの機能を箇条書きで'
        },
        challenges: { 
          type: 'array', 
          items: { type: 'string' },
          description: '現在直面している問題や未解決の課題を箇条書きで'
        },
        nextActions: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              title: { type: 'string', description: '次に取り組むべき具体的なアクション' },
              owner: { type: ['string', 'null'], description: '担当者（分かる場合）' },
              due: { type: ['string', 'null'], description: 'ISO8601日付形式の期限（分かる場合）' }
            },
            required: ['title']
          },
          description: '次に取り組むべき具体的なアクションをToDo形式で'
        },
        code: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              fileName: { type: ['string', 'null'], description: '推測可能なファイル名' },
              description: { type: ['string', 'null'], description: 'コードの説明や用途' },
              snippet: { type: 'string', description: 'コードスニペット本体' }
            },
            required: ['snippet']
          },
          description: '会話中に出現した重要なコードスニペット（ファイル名も含む）'
        },
        intentions: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'なぜその実装・設計を選んだのかの理由や背景'
        },
        concerns: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'セキュリティ、パフォーマンス、保守性などの技術的な懸念事項'
        },
        tags: { 
          type: 'array', 
          items: { type: 'string' },
          description: '技術スタック、プロジェクトカテゴリなどのタグ'
        },
        links: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              label: { type: 'string', description: 'リンクのラベル' },
              url: { type: 'string', description: 'URL' }
            },
            required: ['label', 'url']
          },
          description: '会話中で言及された関連リンク'
        }
      },
      required: ['purpose', 'progress', 'challenges', 'nextActions', 'code', 'intentions', 'concerns', 'tags', 'links']
    }
  }
}];

// SSEイベント送信用ヘルパー
function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest) {
  console.log('🚀 /api/chat/stream リクエスト開始');
  
  try {
    // 認証チェック
    console.log('🔍 認証チェック中...');
    const session = await getServerSession(authOptions);
    console.log('👤 セッション情報:', { 
      hasSession: !!session, 
      userId: session?.user?.id,
      userEmail: session?.user?.email 
    });
    
    if (!session || !session.user || !session.user.email) {
      console.log('❌ 認証エラー: セッションまたはユーザー情報が不足');
      return NextResponse.json(
        { 
          error: 'ログインが必要です。認証後に再度お試しください。',
          code: 'AUTHENTICATION_REQUIRED'
        },
        { status: 401 }
      );
    }

    // 使用量制限チェック
    const usageCheck = UsageManager.canUseService(session.user.id, session.user.email);
    if (!usageCheck.canUse) {
      return NextResponse.json(
        { 
          error: usageCheck.message,
          code: 'USAGE_LIMIT_EXCEEDED',
          usage: usageCheck.usage,
          remainingCount: usageCheck.remainingCount
        },
        { status: 429 }
      );
    }

    // APIキーチェック
    if (!apiKey || apiKey === 'disabled_for_security_reasons' || apiKey === 'disabled') {
      console.log('❌ APIキーエラー: サービス停止中');
      return NextResponse.json(
        { 
          error: 'サービス一時停止中です。認証システム実装後に再開予定です。',
          code: 'SERVICE_TEMPORARILY_DISABLED'
        },
        { status: 503 }
      );
    }

    // リクエストボディの解析
    const body = await request.json();
    const { messages }: { messages: ChatMessage[] } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'メッセージが必要です' },
        { status: 400 }
      );
    }

    console.log('📝 メッセージ数:', messages.length);

    const encoder = new TextEncoder();

    // 1) 会話返信のストリーミング（Chat）
    const chatStreamPromise = openai.chat.completions.create({
      model: MODEL_CHAT,
      stream: true,
      messages: [
        { 
          role: 'system', 
          content: 'あなたは親切で知識豊富なアシスタントです。簡潔で分かりやすい回答を心がけ、技術的な内容については具体的な例を交えて説明してください。' 
        },
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ],
      max_tokens: 2000,
      temperature: 0.3
    });

    // 2) 構造化抽出（Strict JSONスキーマ）
    const structPromise = openai.chat.completions.create({
      model: MODEL_STRUCT,
      messages: [
        { 
          role: 'system', 
          content: `以下の会話から開発プロジェクトに関する重要情報を抽出し、7つのカテゴリに構造化してください。
          
会話の文脈を理解し、技術的な内容や意思決定、今後の方針などを適切に分類して整理してください。
コードが含まれている場合は、その用途や重要性を考慮して抽出してください。` 
        },
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ],
      tools: STRUCT_TOOL,
      tool_choice: { type: 'function', function: { name: 'emit_chat_structure' } },
      parallel_tool_calls: false,
      temperature: 0.1
    }).then(res => {
      const tool = res.choices?.[0]?.message?.tool_calls?.[0];
      if (!tool || tool.type !== 'function' || !tool.function?.arguments) return null;
      try {
        const parsed = JSON.parse(tool.function.arguments) as ChatStructure;
        console.log('✅ 構造化完了:', {
          purpose: parsed.purpose?.substring(0, 50) + '...',
          progressCount: parsed.progress?.length || 0,
          challengesCount: parsed.challenges?.length || 0,
          nextActionsCount: parsed.nextActions?.length || 0,
          codeCount: parsed.code?.length || 0
        });
        return parsed;
      } catch (parseError) {
        console.error('❌ 構造化データの解析エラー:', parseError);
        return null;
      }
    }).catch(error => {
      console.error('❌ 構造化API呼び出しエラー:', error);
      return null;
    });

    const readable = new ReadableStream({
      async start(controller) {
        try {
          // 開始通知
          controller.enqueue(encoder.encode(sseEvent('ready', {})));

          // let assistantContent = ''; // 使用量記録のみのため削除

          // チャットストリーミングの処理
          const chatStream = await chatStreamPromise;
          console.log('🤖 チャットストリーミング開始');

          for await (const chunk of chatStream) {
            const delta = chunk.choices?.[0]?.delta;
            if (delta?.content) {
              controller.enqueue(encoder.encode(sseEvent('token', { text: delta.content })));
            }
          }

          controller.enqueue(encoder.encode(sseEvent('assistant_done', {})));
          console.log('✅ チャット配信完了');

          // 構造化結果の送信
          const structData = await structPromise;
          if (structData) {
            controller.enqueue(encoder.encode(sseEvent('structure', { data: structData })));
            console.log('✅ 構造化データ配信完了');
          } else {
            console.log('⚠️ 構造化データが取得できませんでした');
            controller.enqueue(encoder.encode(sseEvent('error', { 
              message: '構造化処理でエラーが発生しました' 
            })));
          }

          // 使用量を記録（成功時のみ）
          if (session.user?.id && session.user?.email) {
            const updatedUsage = UsageManager.recordUsage(session.user.id, session.user.email);
            console.log('📊 使用量記録:', {
              userId: session.user.id,
              email: session.user.email,
              count: updatedUsage.count,
              plan: updatedUsage.plan,
              remainingCount: UsageManager.canUseService(session.user.id, session.user.email).remainingCount
            });
          }

          controller.enqueue(encoder.encode(sseEvent('done', {})));
          controller.close();
          
        } catch (streamError) {
          console.error('❌ ストリーミング処理エラー:', streamError);
          controller.enqueue(encoder.encode(sseEvent('error', { 
            message: streamError instanceof Error ? streamError.message : 'ストリーミング処理でエラーが発生しました' 
          })));
          controller.close();
        }
      }
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });

  } catch (error) {
    console.error('❌ API Error:', error);
    console.error('Error details:', {
      name: (error as Error)?.name,
      message: (error as Error)?.message,
      stack: (error as Error)?.stack
    });
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        error: 'チャット処理中にエラーが発生しました',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}