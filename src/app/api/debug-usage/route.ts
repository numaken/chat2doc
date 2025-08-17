import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { UsageManager } from '@/lib/usageManager'

export async function GET() {
  try {
    // 認証チェック
    const session = await getServerSession()
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { error: 'ログインが必要です。' },
        { status: 401 }
      )
    }

    // 現在の使用量データを詳細に取得
    const usage = UsageManager.getUserUsage(session.user.id, session.user.email)
    const usageCheck = UsageManager.canUseService(session.user.id, session.user.email)

    // 全てのローカルストレージデータを取得（デバッグ用）
    const allUsage = UsageManager.getAllUserUsage()

    // 現在の月を取得
    const currentMonth = new Date().toISOString().substring(0, 7) // YYYY-MM

    return NextResponse.json({
      success: true,
      debug: {
        currentUser: {
          userId: session.user.id,
          email: session.user.email,
          usage: usage,
          usageCheck: usageCheck
        },
        currentMonth: currentMonth,
        allUsage: allUsage,
        serverTime: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('デバッグ用使用量取得エラー:', error)
    return NextResponse.json(
      { error: 'デバッグデータの取得に失敗しました。' },
      { status: 500 }
    )
  }
}