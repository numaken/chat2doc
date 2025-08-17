import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_SHARED
const openai = new OpenAI({
  apiKey: apiKey || 'disabled',
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conversationText } = body

    if (!conversationText || !conversationText.trim()) {
      return NextResponse.json({ error: '会話テキストが必要です' }, { status: 400 })
    }

    console.log('🔍 認証なしデバッグモード: 構造化処理を詳細分析')
    console.log('📝 入力テキスト長:', conversationText.length)

    // 簡潔なシステムプロンプト
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
          content: `会話ログを分析してプロジェクト情報を抽出してください：\n\n${conversationText}`
        }
      ],
      max_tokens: 1000,
      temperature: 0.1,
    })

    const responseContent = completion.choices[0]?.message?.content
    console.log('✅ OpenAI APIレスポンス受信')
    console.log('📄 レスポンス内容:', responseContent)
    console.log('📄 レスポンス長:', responseContent?.length || 0)
    
    // JSON解析を試行
    let parseResult = null
    let parseError = null
    
    try {
      if (responseContent) {
        let jsonString = responseContent.trim()
        
        // JSON抽出パターンを試行
        const jsonMatch = jsonString.match(/```json\s*([\s\S]*?)\s*```/)
        if (jsonMatch) {
          jsonString = jsonMatch[1].trim()
          console.log('📋 JSONブロックを検出')
        } else {
          const codeMatch = jsonString.match(/```\s*([\s\S]*?)\s*```/)
          if (codeMatch) {
            jsonString = codeMatch[1].trim()
            console.log('📋 コードブロックを検出')
          } else {
            const jsonStart = jsonString.indexOf('{')
            const jsonEnd = jsonString.lastIndexOf('}') + 1
            if (jsonStart !== -1 && jsonEnd > jsonStart) {
              jsonString = jsonString.substring(jsonStart, jsonEnd)
              console.log('📋 JSON部分を抽出')
            }
          }
        }
        
        parseResult = JSON.parse(jsonString)
        console.log('✅ JSON解析成功')
      }
    } catch (err) {
      parseError = err
      console.log('❌ JSON解析失敗:', err)
    }
    
    // 詳細なデバッグ情報を返す
    return NextResponse.json({
      success: true,
      debug: {
        inputLength: conversationText.length,
        openaiResponse: responseContent,
        responseLength: responseContent?.length || 0,
        tokenUsage: completion.usage,
        model: completion.model,
        parseSuccess: !!parseResult,
        parseError: parseError ? String(parseError) : null,
        parsedData: parseResult,
        timestamp: new Date().toISOString()
      },
      rawResponse: responseContent
    })

  } catch (error) {
    console.error('❌ デバッグ処理エラー:', error)
    return NextResponse.json({
      error: 'デバッグ処理でエラーが発生',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}