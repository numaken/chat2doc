import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import OpenAI from 'openai'

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

const openai = new OpenAI({
  apiKey: apiKey || 'disabled',
})

export async function POST(request: NextRequest) {
  try {
    // 認証チェック: ログインユーザーのみAPIアクセス可能
    const session = await getServerSession()
    if (!session || !session.user) {
      return NextResponse.json(
        { 
          error: 'ログインが必要です。認証後に再度お試しください。',
          code: 'AUTHENTICATION_REQUIRED'
        },
        { status: 401 }
      )
    }

    // セキュリティチェック: APIキーが無効な場合はサービス停止
    if (!apiKey || apiKey === 'disabled_for_security_reasons' || apiKey === 'disabled') {
      return NextResponse.json(
        { 
          error: 'サービス一時停止中です。認証システム実装後に再開予定です。',
          code: 'SERVICE_TEMPORARILY_DISABLED'
        },
        { status: 503 }
      )
    }

    const { conversationText } = await request.json()

    if (!conversationText || !conversationText.trim()) {
      return NextResponse.json(
        { error: '会話テキストが必要です' },
        { status: 400 }
      )
    }

    // システムプロンプトを定義
    const systemPrompt = `あなたは開発者向けの会話ログ分析AIアシスタントです。

以下の会話ログを分析し、プロジェクトの状況を以下の7つのカテゴリに構造化してください：

1. 目的（purpose）: プロジェクトの目的や目標を1文で簡潔に
2. 対応履歴（progress）: 完了したタスクや実装済みの機能を箇条書きで
3. 課題（challenges）: 現在直面している問題や未解決の課題を箇条書きで
4. 次のアクション（nextActions）: 次に取り組むべき具体的なアクションを箇条書きで
5. コード（code）: 会話中に出現した重要なコードスニペット（ファイル名も含む）
6. 意図（intentions）: なぜその実装・設計を選んだのかの理由や背景
7. 懸念点（concerns）: セキュリティ、パフォーマンス、保守性などの技術的な懸念事項

必ず以下のJSON形式で出力してください：
{
  "purpose": "プロジェクトの目的を1文で",
  "progress": [
    "完了したタスク1",
    "完了したタスク2"
  ],
  "challenges": [
    "課題1", 
    "課題2"
  ],
  "nextActions": [
    "次のアクション1",
    "次のアクション2"
  ],
  "code": [
    {
      "fileName": "ファイル名",
      "description": "コードの説明",
      "snippet": "コードスニペット"
    }
  ],
  "intentions": [
    "設計意図1",
    "設計意図2"
  ],
  "concerns": [
    "技術的懸念点1",
    "技術的懸念点2"
  ]
}

会話の文脈から開発者にとって価値のある具体的な情報を抽出してください。`

    // 長いテキストをチャンクに分割して処理
    const fullText = conversationText.trim()
    const maxCharsPerChunk = 25000 // チャンクあたり約10000トークン相当
    
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
              content: systemPrompt + `\n\n注意: これは${chunks.length}個のチャンクの${i + 1}番目です。`
            },
            {
              role: "user", 
              content: `以下の会話ログの一部を構造化してください：\n\n${chunks[i]}`
            }
          ],
          max_tokens: 1000,
          temperature: 0.3,
        })
        
        const chunkContent = chunkCompletion.choices[0]?.message?.content
        if (chunkContent) {
          try {
            const jsonMatch = chunkContent.match(/```json\s*([\s\S]*?)\s*```/)
            const jsonString = jsonMatch ? jsonMatch[1] : chunkContent
            const chunkData = JSON.parse(jsonString.trim()) as StructuredData
            
            // 必要なプロパティが存在することを確認
            if (chunkData.purpose && Array.isArray(chunkData.progress) && 
                Array.isArray(chunkData.challenges) && Array.isArray(chunkData.nextActions)) {
              chunkResults.push(chunkData)
            }
            console.log(`✅ チャンク ${i + 1} 処理完了`)
          } catch (parseError) {
            console.error(`❌ チャンク ${i + 1} の解析エラー:`, parseError)
          }
        }
      }
      
      // 結果をマージ
      console.log(`🔗 ${chunkResults.length} チャンクの結果をマージ中...`)
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
      
      return NextResponse.json({
        success: true,
        structuredData: mergedResult,
        metadata: {
          model: 'gpt-3.5-turbo',
          chunks: chunks.length,
          totalChars: fullText.length,
          timestamp: new Date().toISOString()
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
          content: systemPrompt
        },
        {
          role: "user", 
          content: `以下の会話ログを構造化してください：\n\n${fullText}`
        }
      ],
      max_tokens: 1000,
      temperature: 0.3, // より一貫性のある出力のため低めに設定
    })

    const responseContent = completion.choices[0]?.message?.content
    console.log('✅ OpenAI APIレスポンス受信')

    if (!responseContent) {
      throw new Error('OpenAI APIからの応答が空です')
    }

    // JSONの抽出を試みる（```json ``` で囲まれている場合に対応）
    let structuredData: StructuredData
    try {
      // JSONブロックを抽出
      const jsonMatch = responseContent.match(/```json\s*([\s\S]*?)\s*```/)
      const jsonString = jsonMatch ? jsonMatch[1] : responseContent
      
      structuredData = JSON.parse(jsonString.trim()) as StructuredData
      
      // 必要なプロパティが存在することを確認
      if (!structuredData.purpose || !Array.isArray(structuredData.progress) || 
          !Array.isArray(structuredData.challenges) || !Array.isArray(structuredData.nextActions)) {
        throw new Error('Invalid structure')
      }

    } catch (parseError) {
      console.error('❌ JSON解析エラー:', parseError)
      console.log('📄 元の応答:', responseContent)
      
      // フォールバック: 簡単な構造化データを返す
      structuredData = {
        purpose: "会話ログの構造化が部分的に完了しました",
        progress: ["AIによる会話分析を実行"],
        challenges: ["JSON形式での完全な構造化に課題が発生"],
        nextActions: ["手動での構造化結果の確認と調整が必要"],
        code: [],
        intentions: [],
        concerns: []
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
      }
    })

  } catch (error) {
    console.error('❌ API Error:', error)
    
    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        { error: 'OpenAI APIキーが設定されていません' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: '会話の構造化中にエラーが発生しました' },
      { status: 500 }
    )
  }
}