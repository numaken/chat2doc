import Stripe from 'stripe'
import { loadStripe } from '@stripe/stripe-js'

// Server-side Stripe instance with proper error handling
let stripe: Stripe | null = null

export function getStripeInstance(): Stripe {
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    console.log('🔐 Stripe 設定確認:', {
      hasSecretKey: !!secretKey,
      secretKeyPrefix: secretKey?.substring(0, 10) + '...',
      hasPriceId: !!process.env.STRIPE_PREMIUM_PRICE_ID,
      priceIdPrefix: process.env.STRIPE_PREMIUM_PRICE_ID?.substring(0, 10) + '...'
    })
    
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured')
    }
    
    stripe = new Stripe(secretKey, {
      apiVersion: '2025-07-30.basil',
    })
  }
  
  return stripe
}

// Client-side Stripe instance
export const getStripe = () => {
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
}

// Product and Price IDs (to be created in Stripe Dashboard)
export const STRIPE_CONFIG = {
  premium: {
    priceId: process.env.STRIPE_PREMIUM_PRICE_ID || 'price_premium_monthly',
    amount: 980, // 980円
    currency: 'jpy',
    interval: 'month'
  }
}