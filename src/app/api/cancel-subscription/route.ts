import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getStripeInstance } from '@/lib/stripe'
import { UsageManager } from '@/lib/usageManager'

export async function POST(request: NextRequest) {
  console.log('🚫 サブスクリプション解約リクエスト開始')
  
  try {
    // 認証チェック
    console.log('🔍 認証確認中...')
    const session = await getServerSession()
    console.log('👤 セッション情報:', { 
      hasSession: !!session, 
      userId: session?.user?.id,
      userEmail: session?.user?.email 
    })
    
    if (!session || !session.user || !session.user.email) {
      console.log('❌ 認証エラー: セッションまたはユーザー情報が不足')
      return NextResponse.json(
        { error: 'ログインが必要です。' },
        { status: 401 }
      )
    }

    // リクエストボディ解析
    console.log('📄 リクエストボディ解析中...')
    let reason = 'User requested cancellation'
    let cancelationType = 'at_period_end' // 'at_period_end' または 'immediately'
    
    try {
      const body = await request.json()
      reason = body.reason || reason
      cancelationType = body.cancelationType || cancelationType
    } catch {
      console.log('ℹ️ リクエストボディが空、デフォルト値を使用')
    }
    
    console.log('🎯 解約設定:', { 
      userId: session.user.id,
      email: session.user.email,
      reason,
      cancelationType 
    })

    // Stripe初期化
    console.log('🔧 Stripe インスタンス取得中...')
    const stripe = getStripeInstance()

    // 1. ユーザーのStripe顧客情報を検索
    console.log('🔍 Stripe顧客情報を検索中...')
    const customers = await stripe.customers.list({
      email: session.user.email,
      limit: 1
    })

    if (customers.data.length === 0) {
      console.log('❌ 顧客情報が見つかりません')
      return NextResponse.json(
        { 
          error: 'アクティブなサブスクリプションが見つかりません',
          code: 'NO_CUSTOMER_FOUND'
        },
        { status: 404 }
      )
    }

    const customer = customers.data[0]
    console.log('✅ 顧客情報取得:', { customerId: customer.id })

    // 2. アクティブなサブスクリプションを検索
    console.log('🔍 アクティブなサブスクリプションを検索中...')
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1
    })

    if (subscriptions.data.length === 0) {
      console.log('❌ アクティブなサブスクリプションが見つかりません')
      return NextResponse.json(
        { 
          error: 'アクティブなサブスクリプションが見つかりません',
          code: 'NO_ACTIVE_SUBSCRIPTION'
        },
        { status: 404 }
      )
    }

    const subscription = subscriptions.data[0]
    console.log('✅ サブスクリプション取得:', { 
      subscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodEnd: (subscription as any).current_period_end
    })

    let canceledSubscription
    
    if (cancelationType === 'immediately') {
      // 即座に解約
      console.log('⚡ 即座にサブスクリプションを解約中...')
      canceledSubscription = await stripe.subscriptions.cancel(subscription.id, {
        cancellation_details: {
          comment: reason,
          feedback: 'other'
        }
      })
      
      // 即座にフリープランにダウングレード
      if (session.user.id && session.user.email) {
        UsageManager.downgradeToFree(session.user.id, session.user.email)
      }
      
    } else {
      // 期間終了時に解約（デフォルト）
      console.log('📅 期間終了時の解約を設定中...')
      canceledSubscription = await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: true,
        cancellation_details: {
          comment: reason,
          feedback: 'other'
        }
      })
    }

    console.log('✅ サブスクリプション解約処理完了:', {
      subscriptionId: canceledSubscription.id,
      cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
      canceledAt: canceledSubscription.canceled_at,
      currentPeriodEnd: canceledSubscription.current_period_end
    })

    const responseData = {
      success: true,
      message: cancelationType === 'immediately' 
        ? 'サブスクリプションが即座に解約されました' 
        : 'サブスクリプションが期間終了時に解約予定として設定されました',
      subscriptionId: canceledSubscription.id,
      cancelationType,
      cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
      canceledAt: canceledSubscription.canceled_at,
      currentPeriodEnd: canceledSubscription.current_period_end,
      // 日付を分かりやすい形式で追加
      periodEndDate: new Date(canceledSubscription.current_period_end * 1000).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }

    console.log('📤 レスポンス送信:', responseData)
    return NextResponse.json(responseData)

  } catch (error) {
    console.error('❌ サブスクリプション解約エラー:')
    console.error('Error details:', error)
    console.error('Error stack:', (error as Error).stack)
    
    // Stripeエラーの詳細処理
    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as { type: string; message: string }
      if (stripeError.type === 'StripeInvalidRequestError') {
        return NextResponse.json(
          {
            error: '無効なサブスクリプションです',
            details: stripeError.message,
            code: 'INVALID_SUBSCRIPTION'
          },
          { status: 400 }
        )
      }
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { 
        error: '解約処理でエラーが発生しました',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// サブスクリプション再開API  
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function PATCH(_request: NextRequest) {
  console.log('🔄 サブスクリプション再開リクエスト開始')
  
  try {
    // 認証チェック
    const session = await getServerSession()
    
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { error: 'ログインが必要です。' },
        { status: 401 }
      )
    }

    // Stripe初期化
    const stripe = getStripeInstance()

    // 顧客情報を検索
    const customers = await stripe.customers.list({
      email: session.user.email,
      limit: 1
    })

    if (customers.data.length === 0) {
      return NextResponse.json(
        { error: '顧客情報が見つかりません' },
        { status: 404 }
      )
    }

    const customer = customers.data[0]

    // サブスクリプションを検索（cancel_at_period_end=trueのものを含む）
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1
    })

    if (subscriptions.data.length === 0) {
      return NextResponse.json(
        { error: 'サブスクリプションが見つかりません' },
        { status: 404 }
      )
    }

    const subscription = subscriptions.data[0]

    if (!subscription.cancel_at_period_end) {
      return NextResponse.json(
        { error: 'このサブスクリプションは解約予定ではありません' },
        { status: 400 }
      )
    }

    // 解約予定をキャンセル（再開）
    const reactivatedSubscription = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: false
    })

    console.log('✅ サブスクリプション再開完了:', {
      subscriptionId: reactivatedSubscription.id,
      cancelAtPeriodEnd: reactivatedSubscription.cancel_at_period_end
    })

    return NextResponse.json({
      success: true,
      message: 'サブスクリプションが再開されました',
      subscriptionId: reactivatedSubscription.id,
      cancelAtPeriodEnd: reactivatedSubscription.cancel_at_period_end
    })

  } catch (error) {
    console.error('❌ サブスクリプション再開エラー:', error)
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { 
        error: '再開処理でエラーが発生しました',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}