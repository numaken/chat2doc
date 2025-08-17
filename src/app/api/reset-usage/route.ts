import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { UsageManager } from '@/lib/usageManager'

export async function POST() {
  try {
    // 認証チェック
    const session = await getServerSession()
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { error: 'ログインが必要です。' },
        { status: 401 }
      )
    }

    // 使用量データをリセット（デバッグ・テスト用）
    UsageManager.resetUsageData()

    // 新しい使用量データを取得
    const newUsage = UsageManager.getUserUsage(session.user.id, session.user.email)
    const newUsageCheck = UsageManager.canUseService(session.user.id, session.user.email)

    return NextResponse.json({
      success: true,
      message: '使用量データをリセットしました',
      newUsage: {
        usage: newUsage,
        usageCheck: newUsageCheck
      }
    })

  } catch (error) {
    console.error('使用量リセットエラー:', error)
    return NextResponse.json(
      { error: '使用量データのリセットに失敗しました。' },
      { status: 500 }
    )
  }
}