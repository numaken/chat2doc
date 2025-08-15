'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  Crown, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  ArrowLeft,
  MessageSquare,
  Zap,
  Shield,
  BarChart3
} from 'lucide-react'
import Link from 'next/link'

export default function SubscriptionCancel() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showReasonModal, setShowReasonModal] = useState(false)
  const [selectedCancelType, setSelectedCancelType] = useState<'at_period_end' | 'immediately'>('at_period_end')

  // プレミアムプランの確認
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const currentMonth = new Date().toISOString().substring(0, 7)
        const usageData = JSON.parse(localStorage.getItem('chat2doc_usage') || '{}')
        const userKey = Object.keys(usageData).find(key => key.endsWith(`-${currentMonth}`))
        if (userKey && usageData[userKey]?.plan === 'premium') {
          setIsPremium(true)
        } else {
          // プレミアムプランでない場合はリダイレクト
          router.push('/dashboard')
        }
      } catch (error) {
        console.error('プレミアム状態確認エラー:', error)
        router.push('/dashboard')
      }
    }
  }, [router])

  // 認証チェック
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  const handleCancelClick = (cancelType: 'at_period_end' | 'immediately') => {
    setSelectedCancelType(cancelType)
    setShowReasonModal(true)
  }

  const handleCancelSubscription = async () => {
    const confirmMessage = selectedCancelType === 'immediately'
      ? `本当にプレミアムプランを即座に解約しますか？\n\n解約すると以下の機能がすぐに使用できなくなります：\n- 無制限AI文書生成\n- 高度な会話分析機能\n- 優先サポート\n\n解約後は月5回制限の無料プランに戻ります。`
      : `本当にプレミアムプランを期間終了時に解約しますか？\n\n現在の請求期間終了まで引き続きプレミアム機能をご利用いただけます。\n期間終了後は月5回制限の無料プランに戻ります。`

    if (!window.confirm(confirmMessage)) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reason: cancelReason || 'No reason provided',
          cancelationType: selectedCancelType
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        if (selectedCancelType === 'immediately') {
          // 即座に解約の場合、localStorageを更新
          const currentMonth = new Date().toISOString().substring(0, 7)
          const usageData = JSON.parse(localStorage.getItem('chat2doc_usage') || '{}')
          Object.keys(usageData).forEach(key => {
            if (key.endsWith(`-${currentMonth}`)) {
              usageData[key].plan = 'free'
            }
          })
          localStorage.setItem('chat2doc_usage', JSON.stringify(usageData))
        }

        alert(result.message)
        router.push('/dashboard')
      } else {
        alert(`解約処理でエラーが発生しました: ${result.error || '不明なエラー'}`)
      }
    } catch (error) {
      console.error('Cancellation error:', error)
      alert('解約処理に失敗しました。サポートにお問い合わせください。')
    } finally {
      setLoading(false)
      setShowReasonModal(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  if (!session || !isPremium) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link 
              href="/dashboard"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>ダッシュボードに戻る</span>
            </Link>
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              <span className="text-sm font-medium text-gray-900">プレミアムプラン</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 警告アイコンとタイトル */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            プレミアムプラン解約
          </h1>
          <p className="text-gray-600">
            解約前に以下の内容をご確認ください
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* 現在のプラン情報 */}
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Crown className="w-6 h-6 text-yellow-600" />
              <h3 className="text-xl font-bold text-gray-900">現在のプラン</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">プラン</span>
                <span className="font-semibold text-gray-900">プレミアム</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">月額料金</span>
                <span className="font-semibold text-gray-900">¥980</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">利用状況</span>
                <span className="font-semibold text-green-600">無制限</span>
              </div>
            </div>
          </div>

          {/* 失われる機能 */}
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <XCircle className="w-6 h-6 text-red-600" />
              <h3 className="text-xl font-bold text-gray-900">失われる機能</h3>
            </div>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-red-500" />
                <span className="text-gray-700">無制限AI文書生成</span>
              </li>
              <li className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-red-500" />
                <span className="text-gray-700">高速処理・優先レスポンス</span>
              </li>
              <li className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-red-500" />
                <span className="text-gray-700">詳細統計・分析機能</span>
              </li>
              <li className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-red-500" />
                <span className="text-gray-700">優先サポート</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 解約後の無料プラン */}
        <div className="mt-8 bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-bold text-gray-900">解約後の無料プラン</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-700">月5回のAI文書生成</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-700">基本的な会話分析</span>
              </li>
            </ul>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-700">7つのカテゴリ分類</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-700">基本サポート</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 解約オプション */}
        <div className="mt-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
            解約方法を選択してください
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            {/* 期間終了時に解約 */}
            <div className="bg-white border-2 border-green-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="text-center mb-4">
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="text-lg font-bold text-gray-900">期間終了時に解約</h4>
                <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full mt-2">
                  推奨
                </span>
              </div>
              <p className="text-gray-600 text-center mb-6">
                現在の請求期間終了までプレミアム機能を継続利用。
                お支払い済みの期間を無駄にしません。
              </p>
              <button
                onClick={() => handleCancelClick('at_period_end')}
                disabled={loading}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                期間終了時に解約
              </button>
            </div>

            {/* 即座に解約 */}
            <div className="bg-white border-2 border-red-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="text-center mb-4">
                <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <h4 className="text-lg font-bold text-gray-900">即座に解約</h4>
              </div>
              <p className="text-gray-600 text-center mb-6">
                今すぐプレミアム機能を停止し、
                無料プランに戻ります。残り期間の返金はありません。
              </p>
              <button
                onClick={() => handleCancelClick('immediately')}
                disabled={loading}
                className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                即座に解約
              </button>
            </div>
          </div>
        </div>

        {/* 継続ボタン */}
        <div className="mt-8 text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-blue-600 text-white py-3 px-8 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Crown className="w-5 h-5" />
            プレミアムプランを継続する
          </Link>
        </div>

        {/* サポート情報 */}
        <div className="mt-12 text-center border-t border-gray-200 pt-8">
          <p className="text-gray-600">
            解約に関するご質問や、サービス改善のご要望は
            <br />
            <a 
              href="mailto:support@chat2doc.com" 
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              support@chat2doc.com
            </a>
            までお問い合わせください
          </p>
        </div>
      </div>

      {/* 解約理由モーダル */}
      {showReasonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              解約理由をお聞かせください（任意）
            </h3>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="サービス改善のため、解約理由をお聞かせください"
              className="w-full p-3 border border-gray-300 rounded-lg resize-none h-24 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowReasonModal(false)}
                className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={loading}
                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '処理中...' : '解約する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}