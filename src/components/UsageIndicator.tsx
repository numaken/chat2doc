'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Shield, Zap, Crown } from 'lucide-react'
import { UsageManager } from '@/lib/usageManager'

interface UsageData {
  count: number
  plan: 'free' | 'premium'
  remainingCount: number
}

export default function UsageIndicator() {
  const { data: session } = useSession()
  const [usage, setUsage] = useState<UsageData | null>(null)

  useEffect(() => {
    if (session?.user?.id && session?.user?.email) {
      const usageCheck = UsageManager.canUseService(session.user.id, session.user.email)
      setUsage({
        count: usageCheck.usage.count,
        plan: usageCheck.usage.plan,
        remainingCount: usageCheck.remainingCount
      })
    }
  }, [session])

  if (!usage) return null

  const isPremium = usage.plan === 'premium'
  const progressPercentage = isPremium 
    ? 100 
    : Math.min((usage.count / 5) * 100, 100)

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isPremium ? (
            <>
              <Crown className="w-5 h-5 text-yellow-500" />
              <span className="font-semibold text-gray-900">プレミアムプラン</span>
            </>
          ) : (
            <>
              <Shield className="w-5 h-5 text-blue-500" />
              <span className="font-semibold text-gray-900">無料プラン</span>
            </>
          )}
        </div>
        
        {!isPremium && (
          <button className="text-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1 rounded-full hover:from-blue-600 hover:to-purple-700 transition-colors">
            アップグレード
          </button>
        )}
      </div>

      {isPremium ? (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Zap className="w-4 h-4 text-yellow-500" />
          <span>無制限利用可能</span>
        </div>
      ) : (
        <>
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>今月の利用回数</span>
            <span>{usage.count} / 5回</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                progressPercentage >= 100 
                  ? 'bg-red-500' 
                  : progressPercentage >= 80 
                    ? 'bg-yellow-500' 
                    : 'bg-blue-500'
              }`}
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          
          <div className="text-xs text-gray-500">
            {usage.remainingCount > 0 
              ? `あと${usage.remainingCount}回利用可能` 
              : '月間制限に達しました'}
          </div>
        </>
      )}
    </div>
  )
}