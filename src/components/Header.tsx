'use client'

import { MessageSquare, BarChart3, User, LogOut } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'

export default function Header() {
  const { data: session } = useSession()
  const [showUserMenu, setShowUserMenu] = useState(false)

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <Link href="/" className="flex items-center gap-2 sm:gap-3">
          <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">Chat2Doc</h1>
            <span className="text-xs bg-red-100 text-red-800 px-1.5 sm:px-2 py-0.5 rounded-full font-medium">
              β版
            </span>
          </div>
        </Link>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-4">
        {session ? (
          <>
            <Link 
              href="/dashboard" 
              className="hidden sm:flex items-center gap-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm">ダッシュボード</span>
            </Link>
            
            {/* モバイル用ダッシュボードアイコン */}
            <Link 
              href="/dashboard" 
              className="sm:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              title="ダッシュボード"
            >
              <BarChart3 className="w-5 h-5" />
            </Link>
            
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1 sm:gap-2 text-gray-600 hover:text-gray-900 px-2 sm:px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
              >
                {session.user?.image ? (
                  <Image 
                    src={session.user.image} 
                    alt={session.user.name || ''} 
                    width={24}
                    height={24}
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <User className="w-4 h-4" />
                )}
                <span className="text-sm hidden sm:block">{session.user?.name}</span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                  <div className="px-4 py-2 text-sm text-gray-700 border-b">
                    {session.user?.email}
                  </div>
                  <Link
                    href="/dashboard"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <BarChart3 className="w-4 h-4 inline mr-2" />
                    ダッシュボード
                  </Link>
                  <button
                    onClick={() => {
                      setShowUserMenu(false)
                      signOut({ callbackUrl: '/' })
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <LogOut className="w-4 h-4 inline mr-2" />
                    ログアウト
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <span className="text-sm text-gray-600">AIとの会話を知識資産に変換</span>
        )}
      </div>
    </header>
  )
}