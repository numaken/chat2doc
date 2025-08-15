import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getStripeInstance, STRIPE_CONFIG } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const session = await getServerSession()
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { error: 'ログインが必要です。' },
        { status: 401 }
      )
    }

    const { priceId = STRIPE_CONFIG.premium.priceId } = await request.json()

    // Stripe Checkout セッション作成
    const stripe = getStripeInstance()
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

    return NextResponse.json({ 
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id 
    })

  } catch (error) {
    console.error('Stripe checkout session creation failed:', error)
    return NextResponse.json(
      { error: '決済処理の初期化に失敗しました。' },
      { status: 500 }
    )
  }
}