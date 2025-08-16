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

    // システムプロンプトを定義
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
              content: systemPrompt + `\n\n注意: これは${chunks.length}個のチャンクの${i + 1}番目です。必ず有効なJSONのみで応答してください。`
            },
            {
              role: "user", 
              content: `以下の会話ログの一部を構造化してください：\n\n${chunks[i]}`
            }
          ],
          max_tokens: 500,
          temperature: 0.3,
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
          content: systemPrompt
        },
        {
          role: "user", 
          content: `以下の会話ログを構造化してください：\n\n${fullText}`
        }
      ],
      max_tokens: 500,
      temperature: 0.3, // より一貫性のある出力のため低めに設定
    })

    const responseContent = completion.choices[0]?.message?.content
    console.log('✅ OpenAI APIレスポンス受信')

    if (!responseContent) {
      throw new Error('OpenAI APIからの応答が空です')
    }

    // JSONの抽出を試みる（複数パターンに対応）
    let structuredData: StructuredData
    try {
      console.log('🔍 JSON解析開始')
      let jsonString = responseContent.trim()
      
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
      
      structuredData = JSON.parse(jsonString) as StructuredData
      
      // 必要なプロパティが存在することを確認
      if (!structuredData.purpose || !Array.isArray(structuredData.progress) || 
          !Array.isArray(structuredData.challenges) || !Array.isArray(structuredData.nextActions)) {
        throw new Error('Invalid structure')
      }

    } catch (parseError) {
      console.error('❌ JSON解析エラー:', parseError)
      console.log('📄 元の応答:', responseContent)
      
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