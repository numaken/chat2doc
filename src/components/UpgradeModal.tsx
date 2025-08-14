'use client'

import { X, Crown, Check, Zap } from 'lucide-react'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  currentUsage: number
  onUpgrade: () => void
}

export default function UpgradeModal({ isOpen, onClose, currentUsage, onUpgrade }: UpgradeModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
        {/* クローズボタン */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ヘッダー */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            月間利用制限に達しました
          </h2>
          <p className="text-gray-600">
            今月{currentUsage}回ご利用いただき、無料枠（5回）を使い切りました。
          </p>
        </div>

        {/* プレミアムプランの特徴 */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            プレミアムプランの特徴
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Check className="w-4 h-4 text-green-500" />
              <span>無制限の会話構造化</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Check className="w-4 h-4 text-green-500" />
              <span>優先処理（高速化）</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Check className="w-4 h-4 text-green-500" />
              <span>使用履歴・統計機能</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Check className="w-4 h-4 text-green-500" />
              <span>プレミアムサポート</span>
            </div>
          </div>
        </div>

        {/* 料金 */}
        <div className="text-center mb-6">
          <div className="text-3xl font-bold text-gray-900">
            ¥980
            <span className="text-lg font-normal text-gray-600">/月</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            いつでもキャンセル可能
          </p>
        </div>

        {/* アクションボタン */}
        <div className="space-y-3">
          <button
            onClick={onUpgrade}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors font-semibold"
          >
            プレミアムプランにアップグレード
          </button>
          <button
            onClick={onClose}
            className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors"
          >
            来月まで待つ
          </button>
        </div>

        {/* 注意事項 */}
        <p className="text-xs text-gray-500 text-center mt-4">
          プレミアムプランは月額制です。Stripeで安全に決済されます。
        </p>
      </div>
    </div>
  )
}