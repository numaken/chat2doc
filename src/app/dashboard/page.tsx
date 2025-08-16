'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { BarChart, TrendingUp, Crown, Calendar, DollarSign, ArrowLeft, Settings, CreditCard, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface UserStats {
  currentMonth: string
  usageCount: number
  plan: 'free' | 'premium'
  remainingCount: number
  canUse: boolean
  lastUsed: string
  memberSince: string
  totalSavingsEstimate: number
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (session) {
      fetchStats()
    }
  }, [session])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/user-stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('統計データの取得に失敗:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">ダッシュボードにアクセスするにはログインが必要です。</p>
          <Link href="/auth/signin" className="text-blue-600 hover:text-blue-700">
            ログインページへ
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/app" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">ダッシュボード</h1>
            </div>
            <div className="flex items-center gap-2">
              {stats?.plan === 'premium' ? (
                <div className="flex items-center gap-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm">
                  <Crown className="w-4 h-4" />
                  プレミアム
                </div>
              ) : (
                <div className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                  無料プラン
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 統計カード */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">今月の利用回数</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats?.usageCount || 0}回</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">残り利用可能回数</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.plan === 'premium' ? '無制限' : `${stats?.remainingCount || 0}回`}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">推定工数削減</dt>
                  <dd className="text-lg font-medium text-gray-900">¥{stats?.totalSavingsEstimate?.toLocaleString() || 0}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">利用開始日</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.memberSince ? new Date(stats.memberSince).toLocaleDateString('ja-JP') : '不明'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* 詳細情報 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">利用状況</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">現在のプラン</span>
                  <span className="text-sm font-medium text-gray-900">
                    {stats?.plan === 'premium' ? 'プレミアム' : '無料プラン'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">対象月</span>
                  <span className="text-sm font-medium text-gray-900">{stats?.currentMonth}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">最終利用日</span>
                  <span className="text-sm font-medium text-gray-900">
                    {stats?.lastUsed ? new Date(stats.lastUsed).toLocaleDateString('ja-JP') : '未使用'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">利用可能状態</span>
                  <span className={`text-sm font-medium ${stats?.canUse ? 'text-green-600' : 'text-red-600'}`}>
                    {stats?.canUse ? '利用可能' : '制限中'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">アカウント情報</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">メールアドレス</span>
                  <span className="text-sm font-medium text-gray-900">{session?.user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">ユーザー名</span>
                  <span className="text-sm font-medium text-gray-900">{session?.user?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">ユーザーID</span>
                  <span className="text-sm font-medium text-gray-900 font-mono text-xs">
                    {session?.user?.id?.substring(0, 12)}...
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* サブスクリプション管理 */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                サブスクリプション管理
              </h3>
              <div className="space-y-4">
                {stats?.plan === 'premium' ? (
                  <>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Crown className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-800">プレミアムプラン</span>
                      </div>
                      <p className="text-xs text-yellow-700">
                        無制限でChat2Docをご利用いただけます
                      </p>
                    </div>
                    <div className="space-y-2">
                      <button
                        onClick={() => window.open('https://billing.stripe.com/p/login/test_fZu8wIgjI3ih2Ou5ZvgrS00', '_blank')}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        <CreditCard className="w-4 h-4" />
                        請求情報を管理
                      </button>
                      <Link
                        href="/subscription/cancel"
                        className="w-full flex items-center justify-center gap-2 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        サブスクリプションを解約
                      </Link>
                      <Link
                        href="/settings/delete-account"
                        className="w-full flex items-center justify-center gap-2 bg-red-800 text-white py-2 px-4 rounded-lg hover:bg-red-900 transition-colors text-sm"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        アカウントを完全削除
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">無料プラン</span>
                      </div>
                      <p className="text-xs text-blue-700">
                        月5回まで利用可能です
                      </p>
                    </div>
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          // アップグレードボタンの処理
                          const upgradeButton = document.querySelector('.upgrade-button') as HTMLButtonElement
                          if (upgradeButton) {
                            upgradeButton.click()
                          } else {
                            window.location.href = '/app'
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                      >
                        <Crown className="w-4 h-4" />
                        プレミアムにアップグレード
                      </button>
                      <Link
                        href="/settings/delete-account"
                        className="w-full flex items-center justify-center gap-2 bg-red-800 text-white py-2 px-4 rounded-lg hover:bg-red-900 transition-colors text-sm"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        アカウントを完全削除
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}