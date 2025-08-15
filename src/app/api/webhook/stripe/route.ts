import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getStripeInstance } from '@/lib/stripe'
import { UsageManager } from '@/lib/usageManager'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    const stripe = getStripeInstance()
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.mode === 'subscription' && session.metadata?.userId && session.metadata?.email) {
          console.log('✅ サブスクリプション開始:', {
            userId: session.metadata.userId,
            email: session.metadata.email,
            customerId: session.customer
          })

          // ユーザーをプレミアムプランにアップグレード
          UsageManager.upgradeToPremium(session.metadata.userId, session.metadata.email)
          
          console.log('🎉 プレミアムプランにアップグレード完了')
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        
        if (subscription.metadata?.userId && subscription.metadata?.email) {
          console.log('❌ サブスクリプション終了:', {
            userId: subscription.metadata.userId,
            email: subscription.metadata.email,
            subscriptionId: subscription.id,
            canceledAt: subscription.canceled_at
          })

          // プレミアムプランを無料プランにダウングレード
          UsageManager.downgradeToFree(subscription.metadata.userId, subscription.metadata.email)
          
          console.log('📉 無料プランにダウングレード完了')
        } else {
          console.log('⚠️ サブスクリプション削除イベントにメタデータが不足:', {
            subscriptionId: subscription.id,
            customerId: subscription.customer
          })
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        
        if (subscription.cancel_at_period_end) {
          console.log('⏰ サブスクリプション解約予定:', {
            subscriptionId: subscription.id,
            customerId: subscription.customer,
            cancelAt: subscription.cancel_at || subscription.current_period_end
          })
          // 解約予定の場合は特別な処理は不要（期間終了まで継続）
        } else if (subscription.status === 'active') {
          console.log('🔄 サブスクリプション再開:', {
            subscriptionId: subscription.id,
            customerId: subscription.customer
          })
          // 再開された場合の処理（必要に応じて）
        }
        break
      }

      case 'invoice.payment_succeeded': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as any
        
        if (invoice.subscription && invoice.billing_reason === 'subscription_cycle') {
          console.log('💰 サブスクリプション更新成功:', {
            subscriptionId: invoice.subscription,
            amount: invoice.amount_paid,
            currency: invoice.currency
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as any
        
        console.log('❌ 決済失敗:', {
          subscriptionId: invoice.subscription,
          customerEmail: invoice.customer_email
        })
        break
      }

      default:
        console.log(`未処理のイベント: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook処理エラー:', error)
    return NextResponse.json({ error: 'Webhook処理に失敗しました' }, { status: 500 })
  }
}