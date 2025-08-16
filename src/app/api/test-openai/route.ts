import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  console.log('🧪 OpenAI テストAPI開始')
  
  try {
    // 認証チェック
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // APIキー確認
    const apiKey = process.env.OPENAI_API_KEY
    console.log('🔑 APIキー確認:', { 
      hasKey: !!apiKey, 
      keyLength: apiKey?.length,
      keyPrefix: apiKey?.substring(0, 15) + '...'
    })

    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OpenAI APIキーが設定されていません',
        env: process.env.NODE_ENV 
      }, { status: 500 })
    }

    // OpenAI インスタンス作成
    const openai = new OpenAI({ apiKey })

    // 簡単なテストリクエスト
    console.log('🤖 簡単なテストリクエスト送信中...')
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant. Respond with valid JSON only."
        },
        {
          role: "user", 
          content: 'Return this exact JSON: {"status": "success", "message": "OpenAI API is working", "timestamp": "' + new Date().toISOString() + '"}'
        }
      ],
      max_tokens: 100,
      temperature: 0,
    })

    const response = completion.choices[0]?.message?.content
    console.log('✅ OpenAI レスポンス:', response)

    return NextResponse.json({
      success: true,
      openaiResponse: response,
      tokenUsage: completion.usage,
      model: completion.model
    })

  } catch (error) {
    console.error('❌ OpenAI テストエラー:', error)
    
    if (error instanceof Error) {
      return NextResponse.json({
        error: 'OpenAI APIテストでエラーが発生',
        details: error.message,
        stack: error.stack?.substring(0, 500)
      }, { status: 500 })
    }

    return NextResponse.json({
      error: '不明なエラーが発生',
      details: String(error)
    }, { status: 500 })
  }
}