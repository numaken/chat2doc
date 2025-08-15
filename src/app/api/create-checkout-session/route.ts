import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getStripeInstance, STRIPE_CONFIG } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  console.log('🎫 Stripe checkout session 作成開始')
  
  try {
    // 認証チェック
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

    const { priceId = STRIPE_CONFIG.premium.priceId } = await request.json()
    console.log('💰 使用価格ID:', priceId)

    // Stripe Checkout セッション作成
    console.log('🔧 Stripe インスタンス取得中...')
    const stripe = getStripeInstance()
    console.log('📄 Checkout session 作成中...')
    
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${request.nextUrl.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/app`,
      customer_email: session.user.email,
      metadata: {
        userId: session.user.id,
        email: session.user.email,
      },
      subscription_data: {
        metadata: {
          userId: session.user.id,
          email: session.user.email,
        },
      },
    })

    console.log('✅ Checkout session 作成成功:', {
      sessionId: checkoutSession.id,
      url: checkoutSession.url
    })

    return NextResponse.json({ 
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id 
    })

  } catch (error) {
    console.error('❌ Stripe checkout session 作成失敗:', error)
    return NextResponse.json(
      { error: '決済処理の初期化に失敗しました。詳細: ' + (error as Error).message },
      { status: 500 }
    )
  }
}