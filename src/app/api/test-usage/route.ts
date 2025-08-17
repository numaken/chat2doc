import { NextRequest, NextResponse } from 'next/server'
import { UsageManager } from '@/lib/usageManager'

export async function POST(request: NextRequest) {
  try {
    // テスト用のダミーユーザー情報
    const testUserId = 'test-user-123'
    const testEmail = 'test@example.com'

    console.log('🧪 使用量テスト開始')

    // 現在の使用量を確認
    const beforeUsage = UsageManager.getUserUsage(testUserId, testEmail)
    const beforeCheck = UsageManager.canUseService(testUserId, testEmail)

    console.log('📊 使用前:', {
      count: beforeUsage.count,
      plan: beforeUsage.plan,
      remainingCount: beforeCheck.remainingCount
    })

    // 使用量を記録
    const afterUsage = UsageManager.recordUsage(testUserId, testEmail)
    
    // 記録後に再度取得して最新状態を確認
    const latestUsage = UsageManager.getUserUsage(testUserId, testEmail)
    const afterCheck = UsageManager.canUseService(testUserId, testEmail)

    console.log('📊 使用後:', {
      count: latestUsage.count,
      plan: latestUsage.plan,
      remainingCount: afterCheck.remainingCount
    })

    return NextResponse.json({
      success: true,
      test: {
        before: {
          count: beforeUsage.count,
          plan: beforeUsage.plan,
          remainingCount: beforeCheck.remainingCount
        },
        after: {
          count: latestUsage.count,
          plan: latestUsage.plan,
          remainingCount: afterCheck.remainingCount
        },
        changed: beforeUsage.count !== latestUsage.count,
        debug: {
          recordUsageReturned: afterUsage.count,
          latestUsageCount: latestUsage.count,
          remainingCalculation: `5 - ${latestUsage.count} = ${5 - latestUsage.count}`
        }
      }
    })

  } catch (error) {
    console.error('❌ 使用量テストエラー:', error)
    return NextResponse.json(
      { error: '使用量テストでエラーが発生しました', details: String(error) },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // テスト用のダミーユーザー情報で現在の状態を確認
    const testUserId = 'test-user-123'
    const testEmail = 'test@example.com'

    const usage = UsageManager.getUserUsage(testUserId, testEmail)
    const usageCheck = UsageManager.canUseService(testUserId, testEmail)

    return NextResponse.json({
      success: true,
      currentState: {
        userId: testUserId,
        email: testEmail,
        count: usage.count,
        plan: usage.plan,
        remainingCount: usageCheck.remainingCount,
        canUse: usageCheck.canUse,
        month: usage.month
      }
    })

  } catch (error) {
    console.error('❌ 使用量状態確認エラー:', error)
    return NextResponse.json(
      { error: '使用量状態確認でエラーが発生しました', details: String(error) },
      { status: 500 }
    )
  }
}