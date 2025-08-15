'use client'

import { MessageSquare, BarChart3, User, LogOut, Sparkles, Crown } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'

export default function Header() {
  const { data: session } = useSession()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isPremium, setIsPremium] = useState(false)

  // プレミアムプランの確認
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const currentMonth = new Date().toISOString().substring(0, 7)
        const usageData = JSON.parse(localStorage.getItem('chat2doc_usage') || '{}')
        const userKey = Object.keys(usageData).find(key => key.endsWith(`-${currentMonth}`))
        if (userKey && usageData[userKey]?.plan === 'premium') {
          setIsPremium(true)
        }
      } catch (error) {
        console.error('プレミアム状態確認エラー:', error)
      }
    }
  }, [])

  return (
    <header className="h-16 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 shadow-lg border-b border-blue-800/50 flex items-center justify-between px-4 sm:px-6 relative overflow-hidden">
      {/* 背景装飾 */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/5 to-blue-600/10"></div>
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent"></div>
      <div className="flex items-center gap-2 sm:gap-3 relative z-10">
        <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg blur-sm opacity-75 group-hover:opacity-100 transition-opacity"></div>
            <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-white relative z-10 drop-shadow-lg" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent drop-shadow-sm">
              Chat2Doc
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-gradient-to-r from-red-500 to-pink-500 text-white px-1.5 sm:px-2 py-0.5 rounded-full font-medium shadow-sm">
                β版
              </span>
              {isPremium && (
                <div className="flex items-center gap-1">
                  <Crown className="w-3 h-3 text-yellow-400 animate-pulse" />
                  <span className="text-xs text-yellow-400 font-medium">PRO</span>
                </div>
              )}
            </div>
          </div>
        </Link>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-4 relative z-10">
        {session ? (
          <>
            <Link 
              href="/dashboard" 
              className="hidden sm:flex items-center gap-2 text-blue-100 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 backdrop-blur-sm transition-all duration-200 group"
            >
              <BarChart3 className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">ダッシュボード</span>
            </Link>
            
            {/* モバイル用ダッシュボードアイコン */}
            <Link 
              href="/dashboard" 
              className="sm:hidden p-2 text-blue-100 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
              title="ダッシュボード"
            >
              <BarChart3 className="w-5 h-5" />
            </Link>
            
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1 sm:gap-2 text-blue-100 hover:text-white px-2 sm:px-3 py-2 rounded-lg hover:bg-white/10 backdrop-blur-sm transition-all duration-200 group"
              >
                {session.user?.image ? (
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-sm opacity-75 group-hover:opacity-100 transition-opacity"></div>
                    <Image 
                      src={session.user.image} 
                      alt={session.user.name || ''} 
                      width={24}
                      height={24}
                      className="w-6 h-6 rounded-full border-2 border-white/20 relative z-10"
                    />
                  </div>
                ) : (
                  <div className="p-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
                <span className="text-sm hidden sm:block font-medium">{session.user?.name}</span>
                {isPremium && (
                  <Crown className="w-3 h-3 text-yellow-400" />
                )}
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-3 w-56 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-200/50 py-2 z-50 animate-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="text-sm font-medium text-gray-900">{session.user?.name}</div>
                    <div className="text-xs text-gray-500 truncate">{session.user?.email}</div>
                    {isPremium && (
                      <div className="flex items-center gap-1 mt-1">
                        <Crown className="w-3 h-3 text-yellow-500" />
                        <span className="text-xs font-medium text-yellow-600">プレミアムメンバー</span>
                      </div>
                    )}
                  </div>
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-colors group"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <BarChart3 className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                    ダッシュボード
                  </Link>
                  <button
                    onClick={() => {
                      setShowUserMenu(false)
                      signOut({ callbackUrl: '/' })
                    }}
                    className="flex items-center gap-3 w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-red-50 transition-colors group"
                  >
                    <LogOut className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
                    ログアウト
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-300 animate-pulse" />
            <span className="text-sm text-blue-100 font-medium">AIとの会話を知識資産に変換</span>
          </div>
        )}
      </div>
    </header>
  )
}