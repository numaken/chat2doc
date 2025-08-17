import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import OpenAI from 'openai'
import { UsageManager } from '@/lib/usageManager'

interface StructuredData {
  purpose: string
  progress: string[]
  challenges: string[]
  nextActions: string[]
  code?: Array<{
    fileName?: string
    description?: string
    snippet?: string
  }>
  intentions?: string[]
  concerns?: string[]
}

// セキュリティ保護: APIキーチェック
const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_SHARED

if (!apiKey || apiKey === 'disabled_for_security_reasons') {
  console.warn('🛡️ OpenAI API無効化 - セキュリティ保護中')
}

console.log('🔧 API初期化時の確認:', { 
  hasApiKey: !!apiKey, 
  keyLength: apiKey?.length,
  keyPrefix: apiKey?.substring(0, 15) + '...'
})

const openai = new OpenAI({
  apiKey: apiKey || 'disabled',
})

export async function POST(request: NextRequest) {
  console.log('🚀 /api/structurize リクエスト開始')
  
  try {
    // 認証チェック: ログインユーザーのみAPIアクセス可能
    console.log('🔍 認証チェック中...')
    const session = await getServerSession()
    console.log('👤 セッション情報:', { 
      hasSession: !!session, 
      userId: session?.user?.id,
      userEmail: session?.user?.email 
    })
    
    if (!session || !session.user || !session.user.email) {
      console.log('❌ 認証エラー: セッションまたはユーザー情報が不足')
      return NextResponse.json(
        { 
          error: 'ログインが必要です。認証後に再度お試しください。',
          code: 'AUTHENTICATION_REQUIRED'
        },
        { status: 401 }
      )
    }

    // 使用量制限チェック
    const usageCheck = UsageManager.canUseService(session.user.id, session.user.email)
    if (!usageCheck.canUse) {
      return NextResponse.json(
        { 
          error: usageCheck.message,
          code: 'USAGE_LIMIT_EXCEEDED',
          usage: usageCheck.usage,
          remainingCount: usageCheck.remainingCount
        },
        { status: 429 } // Too Many Requests
      )
    }

    // セキュリティチェック: APIキーが無効な場合はサービス停止
    console.log('🔑 APIキー確認:', { 
      hasApiKey: !!apiKey, 
      keyPrefix: apiKey?.substring(0, 10) + '...',
      keySource: process.env.OPENAI_API_KEY ? 'OPENAI_API_KEY' : 'OPENAI_API_KEY_SHARED'
    })
    
    if (!apiKey || apiKey === 'disabled_for_security_reasons' || apiKey === 'disabled') {
      console.log('❌ APIキーエラー: サービス停止中')
      return NextResponse.json(
        { 
          error: 'サービス一時停止中です。認証システム実装後に再開予定です。',
          code: 'SERVICE_TEMPORARILY_DISABLED'
        },
        { status: 503 }
      )
    }

    console.log('📄 リクエストボディ解析中...')
    const body = await request.json()
    const { conversationText } = body
    console.log('📝 会話テキスト長:', conversationText?.length || 0)

    if (!conversationText || !conversationText.trim()) {
      console.log('❌ 会話テキストエラー: 空またはundefined')
      return NextResponse.json(
        { error: '会話テキストが必要です' },
        { status: 400 }
      )
    }

    // 文字数による事前チェック（概算でトークン数を推定）
    const estimatedTokens = Math.ceil(conversationText.length / 3) // 1文字≈0.33トークンで概算
    const maxTokens = 15000 // max_tokensも考慮した安全な制限
    
    if (estimatedTokens > maxTokens && conversationText.length <= 15000) {
      console.log(`⚠️ 長いテキスト警告: ${conversationText.length}文字 (推定${estimatedTokens}トークン)`)
      console.log('🔄 自動的にチャンク処理を実行します')
    }

    // システムプロンプトを定義（複数AI形式に対応したコード検出強化版）
    const systemPrompt = `あなたは開発者向けの会話ログ分析AIアシスタントです。

重要: 必ず有効なJSON形式でのみ応答してください。他のテキストは一切含めないでください。

以下の会話ログを分析し、プロジェクトの状況を以下の7つのカテゴリに構造化してください：

1. 目的（purpose）: プロジェクトの目的や目標を1文で簡潔に
2. 対応履歴（progress）: 完了したタスクや実装済みの機能を箇条書きで
3. 課題（challenges）: 現在直面している問題や未解決の課題を箇条書きで
4. 次のアクション（nextActions）: 次に取り組むべき具体的なアクションを箇条書きで
5. コード（code）: 会話中に出現した重要なコードスニペット（ファイル名も含む）
6. 意図（intentions）: なぜその実装・設計を選んだのかの理由や背景
7. 懸念点（concerns）: セキュリティ、パフォーマンス、保守性などの技術的な懸念事項

【コード検出の強化ルール】
以下のパターンを積極的にコードとして認識してください：

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
- "Copy code"ボタンでコピーされた形式

応答は必ず以下の形式の有効なJSONでなければなりません。他のテキストや説明は含めないでください：

{
  "purpose": "プロジェクトの目的を1文で",
  "progress": ["完了したタスク1", "完了したタスク2"],
  "challenges": ["課題1", "課題2"],
  "nextActions": ["次のアクション1", "次のアクション2"],
  "code": [{"fileName": "ファイル名", "description": "コードの説明", "snippet": "コードスニペット"}],
  "intentions": ["設計意図1", "設計意図2"],
  "concerns": ["技術的懸念点1", "技術的懸念点2"]
}`

    // 長いテキストをチャンクに分割して処理
    const fullText = conversationText.trim()
    const maxCharsPerChunk = 15000 // チャンクあたり約6000トークン相当（安全マージン込み）
    
    if (fullText.length > maxCharsPerChunk) {
      console.log(`📝 長いテキストを検出 (${fullText.length} 文字). チャンク分割処理を実行します`)
      
      // テキストをチャンクに分割
      const chunks = []
      for (let i = 0; i < fullText.length; i += maxCharsPerChunk) {
        chunks.push(fullText.substring(i, i + maxCharsPerChunk))
      }
      
      console.log(`🔄 ${chunks.length} チャンクに分割しました`)
      
      // 各チャンクを順番に処理
      const chunkResults: StructuredData[] = []
      for (let i = 0; i < chunks.length; i++) {
        console.log(`⚡ チャンク ${i + 1}/${chunks.length} を処理中...`)
        
        const chunkCompletion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `あなたは会話ログ分析AIです。以下のJSONフォーマットでのみ応答してください。他のテキストは一切含めないでください。

【コード検出強化】
ChatGPT・Claude・その他AIの様々な形式を検出：
- \`\`\`言語名 や \`\`\` で囲まれたブロック
- "実装"、"追加"、"修正"等の動詞と関連するコード
- ファイル名（.js/.tsx/.py等）の言及
- import文、function定義、class定義
- インデント済みコードブロック
- 行番号付きコード
- "Copy code"形式

{
  "purpose": "1文での目的",
  "progress": ["完了事項1", "完了事項2"],
  "challenges": ["課題1", "課題2"],
  "nextActions": ["次のアクション1", "次のアクション2"],
  "code": [{"fileName": "推測可能なファイル名", "description": "コード説明", "snippet": "コード内容"}],
  "intentions": ["意図1", "意図2"],
  "concerns": ["懸念1", "懸念2"]
}

重要: 必ず有効なJSONのみで応答し、説明文や前置きは一切含めないでください。`
            },
            {
              role: "user", 
              content: `会話ログ（${chunks.length}個中${i + 1}番目）:\n\n${chunks[i]}`
            }
          ],
          max_tokens: 800,
          temperature: 0.1,
        })
        
        const chunkContent = chunkCompletion.choices[0]?.message?.content
        if (chunkContent) {
          try {
            let jsonString = chunkContent.trim()
            
            // JSONブロック抽出（同じロジックを使用）
            const jsonMatch = jsonString.match(/```json\s*([\s\S]*?)\s*```/)
            if (jsonMatch) {
              jsonString = jsonMatch[1].trim()
            } else {
              const codeMatch = jsonString.match(/```\s*([\s\S]*?)\s*```/)
              if (codeMatch) {
                jsonString = codeMatch[1].trim()
              } else {
                const jsonStart = jsonString.indexOf('{')
                const jsonEnd = jsonString.lastIndexOf('}') + 1
                if (jsonStart !== -1 && jsonEnd > jsonStart) {
                  jsonString = jsonString.substring(jsonStart, jsonEnd)
                }
              }
            }
            
            const chunkData = JSON.parse(jsonString) as StructuredData
            
            // 必要なプロパティが存在することを確認
            if (chunkData.purpose && Array.isArray(chunkData.progress) && 
                Array.isArray(chunkData.challenges) && Array.isArray(chunkData.nextActions)) {
              chunkResults.push(chunkData)
              console.log(`✅ チャンク ${i + 1} 処理完了:`, {
                purpose: chunkData.purpose?.substring(0, 50) + '...',
                progressCount: chunkData.progress?.length || 0,
                challengesCount: chunkData.challenges?.length || 0,
                nextActionsCount: chunkData.nextActions?.length || 0
              })
            } else {
              console.log(`⚠️ チャンク ${i + 1} のデータが不完全:`, {
                hasPurpose: !!chunkData.purpose,
                hasProgress: Array.isArray(chunkData.progress),
                hasChallenges: Array.isArray(chunkData.challenges),
                hasNextActions: Array.isArray(chunkData.nextActions),
                rawData: chunkData
              })
            }
          } catch (parseError) {
            console.error(`❌ チャンク ${i + 1} の解析エラー:`, parseError)
            console.error(`❌ 元のレスポンス:`, chunkContent)
          }
        }
      }
      
      // 結果をマージ
      console.log(`🔗 ${chunkResults.length} チャンクの結果をマージ中...`)
      
      if (chunkResults.length === 0) {
        console.error('❌ チャンク処理結果が0件です。フォールバック処理を実行します。')
        // チャンクが全て失敗した場合のフォールバック
        return NextResponse.json(
          { 
            error: 'チャンク処理で有効な結果が得られませんでした',
            details: 'すべてのチャンクでJSON解析または構造確認に失敗しました',
            suggestion: '会話ログをより短く分割するか、内容を簡素化してください'
          },
          { status: 500 }
        )
      }
      
      const mergedResult: StructuredData = {
        purpose: chunkResults[0]?.purpose || "複数の会話チャンクから抽出されたプロジェクト",
        progress: [],
        challenges: [],
        nextActions: [],
        code: [],
        intentions: [],
        concerns: []
      }
      
      // 各チャンクの結果を統合（チャンク番号は付けない）
      chunkResults.forEach((chunk) => {
        if (chunk.progress) mergedResult.progress.push(...chunk.progress)
        if (chunk.challenges) mergedResult.challenges.push(...chunk.challenges)
        if (chunk.nextActions) mergedResult.nextActions.push(...chunk.nextActions)
        if (chunk.code && mergedResult.code) mergedResult.code.push(...chunk.code)
        if (chunk.intentions && mergedResult.intentions) mergedResult.intentions.push(...chunk.intentions)
        if (chunk.concerns && mergedResult.concerns) mergedResult.concerns.push(...chunk.concerns)
      })
      
      // 重複除去と整理
      mergedResult.progress = [...new Set(mergedResult.progress)]
      mergedResult.challenges = [...new Set(mergedResult.challenges)]
      mergedResult.nextActions = [...new Set(mergedResult.nextActions)]
      if (mergedResult.intentions) mergedResult.intentions = [...new Set(mergedResult.intentions)]
      if (mergedResult.concerns) mergedResult.concerns = [...new Set(mergedResult.concerns)]
      // codeは構造が異なるため重複除去しない
      
      console.log(`🎯 マージ完了:`, {
        purpose: mergedResult.purpose.substring(0, 50) + '...',
        progressCount: mergedResult.progress.length,
        challengesCount: mergedResult.challenges.length,
        nextActionsCount: mergedResult.nextActions.length,
        codeCount: mergedResult.code?.length || 0,
        intentionsCount: mergedResult.intentions?.length || 0,
        concernsCount: mergedResult.concerns?.length || 0
      })
      
      // マージ結果の詳細ログ
      if (mergedResult.progress.length === 0 && mergedResult.challenges.length === 0 && mergedResult.nextActions.length === 0) {
        console.warn('⚠️ マージ結果が空です。元のチャンクデータを確認:', chunkResults.map(chunk => ({
          purpose: chunk.purpose?.substring(0, 30),
          progressLength: chunk.progress?.length,
          challengesLength: chunk.challenges?.length,
          nextActionsLength: chunk.nextActions?.length
        })))
      }

      // 使用量を記録（チャンク処理成功時のみ）
      const updatedUsage = UsageManager.recordUsage(session.user.id, session.user.email)
      console.log('📊 使用量記録 (チャンク処理):', {
        userId: session.user.id,
        email: session.user.email,
        count: updatedUsage.count,
        plan: updatedUsage.plan,
        chunks: chunks.length,
        remainingCount: UsageManager.canUseService(session.user.id, session.user.email).remainingCount
      })
      
      return NextResponse.json({
        success: true,
        structuredData: mergedResult,
        metadata: {
          model: 'gpt-3.5-turbo',
          chunks: chunks.length,
          totalChars: fullText.length,
          timestamp: new Date().toISOString()
        },
        usage: {
          count: updatedUsage.count,
          plan: updatedUsage.plan,
          remainingCount: UsageManager.canUseService(session.user.id, session.user.email).remainingCount
        }
      })
    }

    // 通常の処理（25,000文字以下の場合）
    console.log('🤖 OpenAI API呼び出し開始')
    console.log('📝 処理文字数:', fullText.length)

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `会話ログを分析し、以下の正確なJSON形式で応答してください。

{
  "purpose": "プロジェクトの目的を1文で",
  "progress": ["完了したタスク1", "完了したタスク2"],
  "challenges": ["課題1", "課題2"],
  "nextActions": ["次のアクション1", "次のアクション2"],
  "code": [{"fileName": "ファイル名", "description": "説明", "snippet": "コード"}],
  "intentions": ["設計意図1", "設計意図2"],
  "concerns": ["技術的懸念1", "技術的懸念2"]
}

重要: このJSON形式のみで応答し、説明文は一切含めないでください。`
        },
        {
          role: "user", 
          content: `会話ログを分析してプロジェクト情報を抽出してください：\n\n${fullText}`
        }
      ],
      max_tokens: 1000,
      temperature: 0.1, // より一貫性のあるJSON出力のため低めに設定
    })

    const responseContent = completion.choices[0]?.message?.content
    console.log('✅ OpenAI APIレスポンス受信')

    if (!responseContent) {
      throw new Error('OpenAI APIからの応答が空です')
    }

    // JSONの抽出を試みる（複数パターンに対応）
    let structuredData: StructuredData
    let jsonString = responseContent.trim()
    try {
      console.log('🔍 JSON解析開始')
      
      // パターン1: ```json ``` で囲まれている場合
      const jsonMatch = jsonString.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        jsonString = jsonMatch[1].trim()
        console.log('📋 JSONブロックを検出')
      }
      // パターン2: ``` で囲まれている場合（json指定なし）
      else {
        const codeMatch = jsonString.match(/```\s*([\s\S]*?)\s*```/)
        if (codeMatch) {
          jsonString = codeMatch[1].trim()
          console.log('📋 コードブロックを検出')
        }
      }
      
      // パターン3: { で始まる部分を抽出
      const jsonStart = jsonString.indexOf('{')
      const jsonEnd = jsonString.lastIndexOf('}') + 1
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        jsonString = jsonString.substring(jsonStart, jsonEnd)
        console.log('📋 JSON部分を抽出:', jsonString.substring(0, 100) + '...')
      }
      
      // より堅牢な JSON 解析の試行
      try {
        structuredData = JSON.parse(jsonString) as StructuredData
      } catch (firstParseError) {
        console.log('❌ 最初のJSON解析失敗、別パターンを試行')
        
        // 改行文字や制御文字を除去して再試行
        const cleanedJson = jsonString
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // 制御文字を除去
          .replace(/\n\s*\n/g, '\n') // 重複改行を除去
          .trim()
        
        try {
          structuredData = JSON.parse(cleanedJson) as StructuredData
          console.log('✅ 2回目のJSON解析成功')
        } catch (secondParseError) {
          console.log('❌ 2回目も失敗、最後の手段を試行')
          
          // 最後の手段: 手動でJSONを修復試行
          const fixedJson = cleanedJson
            .replace(/,\s*}/g, '}') // 末尾のカンマを除去
            .replace(/,\s*]/g, ']') // 配列の末尾カンマを除去
          
          structuredData = JSON.parse(fixedJson) as StructuredData
          console.log('✅ 修復後のJSON解析成功')
        }
      }
      
      // 必要なプロパティが存在することを確認
      if (!structuredData.purpose || !Array.isArray(structuredData.progress) || 
          !Array.isArray(structuredData.challenges) || !Array.isArray(structuredData.nextActions)) {
        throw new Error('Invalid structure')
      }

    } catch (parseError) {
      console.error('❌ JSON解析エラー:', parseError)
      console.log('📄 元の応答:', responseContent)
      console.log('📄 解析しようとしたJSON文字列:', jsonString)
      console.log('📄 JSON文字列の長さ:', jsonString?.length)
      console.log('📄 JSON文字列の最初の200文字:', jsonString?.substring(0, 200))
      
      // フォールバック: OpenAI APIレスポンスが不正な形式の場合
      console.log('⚠️ フォールバック処理: 手動での結果確認が必要')
      structuredData = {
        purpose: "会話内容の分析を実行しましたが、結果の構造化で問題が発生しました",
        progress: ["AIによる会話ログの解析は完了"],
        challenges: ["構造化結果の自動生成でエラーが発生", "手動での内容確認が必要"],
        nextActions: ["会話内容を再度確認してください", "必要に応じて会話ログを分割してから再実行"],
        code: [],
        intentions: ["より適切な構造化のため、会話内容の明確化が重要"],
        concerns: ["一時的な技術的問題の可能性", "会話内容が複雑すぎる可能性"]
      }
    }

    console.log('🎯 構造化完了:', {
      purpose: structuredData.purpose.substring(0, 50) + '...',
      progressCount: structuredData.progress.length,
      challengesCount: structuredData.challenges.length, 
      nextActionsCount: structuredData.nextActions.length,
      codeCount: structuredData.code?.length || 0,
      intentionsCount: structuredData.intentions?.length || 0,
      concernsCount: structuredData.concerns?.length || 0
    })

    // 使用量を記録（成功時のみ）
    const updatedUsage = UsageManager.recordUsage(session.user.id, session.user.email)
    console.log('📊 使用量記録:', {
      userId: session.user.id,
      email: session.user.email,
      count: updatedUsage.count,
      plan: updatedUsage.plan,
      remainingCount: UsageManager.canUseService(session.user.id, session.user.email).remainingCount
    })

    // トークン使用量をログ出力
    console.log('💰 トークン使用量:', {
      prompt: completion.usage?.prompt_tokens,
      completion: completion.usage?.completion_tokens,
      total: completion.usage?.total_tokens
    })

    return NextResponse.json({
      success: true,
      structuredData,
      metadata: {
        model: 'gpt-3.5-turbo',
        tokens: completion.usage?.total_tokens,
        timestamp: new Date().toISOString()
      },
      usage: {
        count: updatedUsage.count,
        plan: updatedUsage.plan,
        remainingCount: UsageManager.canUseService(session.user.id, session.user.email).remainingCount
      }
    })

  } catch (error) {
    console.error('❌ API Error:', error)
    console.error('Error details:', {
      name: (error as Error)?.name,
      message: (error as Error)?.message,
      stack: (error as Error)?.stack
    })
    
    if (error instanceof Error && error.message.includes('API key')) {
      console.log('❌ OpenAI APIキーエラー')
      return NextResponse.json(
        { 
          error: 'OpenAI APIキーが設定されていません',
          details: error.message,
          code: 'OPENAI_API_KEY_ERROR'
        },
        { status: 500 }
      )
    }

    // より詳細なエラー情報を返す
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { 
        error: '会話の構造化中にエラーが発生しました',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}