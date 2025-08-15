'use client'

import { useState } from 'react'

export function useUpgrade() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upgradeToPremiuim = async () => {
    console.log('🚀 アップグレードプロセス開始')
    setIsLoading(true)
    setError(null)

    try {
      console.log('📡 Stripe checkout session API呼び出し')
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        console.error('❌ API エラー:', response.status)
        let errorData;
        try {
          const responseText = await response.text()
          console.error('レスポンステキスト:', responseText)
          errorData = responseText ? JSON.parse(responseText) : {}
        } catch (parseError) {
          console.error('JSON パースエラー:', parseError)
          throw new Error(`サーバーエラー (${response.status}): レスポンス解析失敗`)
        }
        throw new Error(errorData.error || '決済処理の初期化に失敗しました')
      }

      const { checkoutUrl } = await response.json()
      console.log('✅ Checkout URL取得:', checkoutUrl)
      
      if (checkoutUrl) {
        console.log('🔄 Stripeページにリダイレクト中...')
        // Stripeの決済ページにリダイレクト
        window.location.href = checkoutUrl
      } else {
        throw new Error('決済URLの取得に失敗しました')
      }

    } catch (err) {
      console.error('Upgrade error:', err)
      setError(err instanceof Error ? err.message : '決済処理でエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  return {
    upgradeToPremiuim,
    isLoading,
    error
  }
}