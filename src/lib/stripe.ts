import Stripe from 'stripe'
import { loadStripe } from '@stripe/stripe-js'

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
})

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