import { NextRequest, NextResponse } from 'next/server'
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

    // ユーザーの使用統計を取得
    const usage = UsageManager.getUserUsage(session.user.id, session.user.email)
    const usageCheck = UsageManager.canUseService(session.user.id, session.user.email)

    // 統計データを生成
    const stats = {
      currentMonth: usage.month,
      usageCount: usage.count,
      plan: usage.plan,
      remainingCount: usageCheck.remainingCount,
      canUse: usageCheck.canUse,
      lastUsed: usage.lastUsed,
      memberSince: usage.createdAt,
      totalSavingsEstimate: usage.count * 50, // 1回あたり50円の工数削減と仮定
    }

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error) {
    console.error('統計取得エラー:', error)
    return NextResponse.json(
      { error: '統計データの取得に失敗しました。' },
      { status: 500 }
    )
  }
}