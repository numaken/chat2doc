'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Crown, ArrowRight } from 'lucide-react'
import Link from 'next/link'

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    const session_id = searchParams.get('session_id')
    setSessionId(session_id)

    // 決済成功時にプレミアムプランに自動更新
    if (session_id) {
      try {
        const currentMonth = new Date().toISOString().substring(0, 7)
        const usageData = JSON.parse(localStorage.getItem('chat2doc_usage') || '{}')
        
        // 全ユーザーのプランをプレミアムに更新（現在のユーザーを特定）
        Object.keys(usageData).forEach(key => {
          if (key.endsWith(`-${currentMonth}`)) {
            usageData[key].plan = 'premium'
            console.log('✅ 決済成功: プレミアムプランに自動更新', key)
          }
        })
        
        localStorage.setItem('chat2doc_usage', JSON.stringify(usageData))
      } catch (error) {
        console.error('プレミアムプラン更新エラー:', error)
      }
    }

    // 5秒後に自動でアプリページにリダイレクト
    const timer = setTimeout(() => {
      router.push('/app')
    }, 5000)

    return () => clearTimeout(timer)
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* 成功アイコン */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>

        {/* メッセージ */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          プレミアムプランへようこそ！
        </h1>
        
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Crown className="w-6 h-6 text-yellow-500" />
            <span className="font-semibold text-gray-900">プレミアムプラン有効</span>
          </div>
          <p className="text-sm text-gray-600">
            無制限でChat2Docをご利用いただけます
          </p>
        </div>

        <p className="text-gray-600 mb-6">
          決済が正常に完了しました。プレミアムプランの機能をお楽しみください。
        </p>

        {/* セッション情報 */}
        {sessionId && (
          <div className="bg-gray-50 rounded-lg p-3 mb-6">
            <p className="text-xs text-gray-500">
              決済ID: {sessionId.substring(0, 20)}...
            </p>
          </div>
        )}

        {/* アクションボタン */}
        <div className="space-y-3">
          <Link 
            href="/app"
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors font-semibold flex items-center justify-center gap-2"
          >
            Chat2Docを使い始める
            <ArrowRight className="w-5 h-5" />
          </Link>
          
          <Link 
            href="/"
            className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ホームに戻る
          </Link>
        </div>

        {/* 自動リダイレクトの案内 */}
        <p className="text-xs text-gray-500 mt-4">
          5秒後に自動的にアプリページにリダイレクトします
        </p>
      </div>
    </div>
  )
}

export default function PaymentSuccess() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}