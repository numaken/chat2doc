'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, Trash2, X } from 'lucide-react'
import Link from 'next/link'

export default function DeleteAccountPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') {
      alert('確認テキストが正しくありません。「DELETE」と入力してください。')
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch('/api/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (response.ok) {
        // LocalStorageをクリア
        if (typeof window !== 'undefined') {
          localStorage.removeItem('chat2doc_usage')
          localStorage.removeItem('structuredProjects')
          localStorage.removeItem('structuredDocuments')
          localStorage.clear()
        }

        // サインアウトしてホームページへリダイレクト
        await signOut({ callbackUrl: '/' })
      } else {
        alert(`エラー: ${data.error}`)
      }
    } catch (error) {
      console.error('アカウント削除エラー:', error)
      alert('アカウント削除中にエラーが発生しました')
    } finally {
      setIsDeleting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">アカウント削除</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 警告メッセージ */}
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-lg font-semibold text-red-900 mb-2">
                重要な警告
              </h2>
              <p className="text-red-700 mb-4">
                アカウントを削除すると、以下のデータがすべて永久に削除されます：
              </p>
              <ul className="list-disc list-inside text-red-700 space-y-1 mb-4">
                <li>すべての構造化されたドキュメント</li>
                <li>プロジェクト履歴</li>
                <li>使用履歴と統計データ</li>
                <li>アカウント設定</li>
              </ul>
              <p className="text-red-700 font-semibold">
                この操作は取り消すことができません。
              </p>
            </div>
          </div>
        </div>

        {/* アカウント情報 */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">削除されるアカウント</h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">メールアドレス</span>
              <span className="text-gray-900 font-medium">{session?.user?.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">ユーザー名</span>
              <span className="text-gray-900 font-medium">{session?.user?.name}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">ユーザーID</span>
              <span className="text-gray-900 font-medium font-mono text-xs">
                {session?.user?.id?.substring(0, 12)}...
              </span>
            </div>
          </div>
        </div>

        {/* 削除確認 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">アカウント削除の確認</h3>
          <p className="text-gray-600 mb-4">
            アカウントを削除するには、下のテキストボックスに「DELETE」と入力してください。
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE と入力"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 mb-6"
          />
          
          <div className="flex justify-between">
            <Link
              href="/dashboard"
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              キャンセル
            </Link>
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={confirmText !== 'DELETE' || isDeleting}
              className={`px-6 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                confirmText === 'DELETE' && !isDeleting
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              アカウントを削除
            </button>
          </div>
        </div>
      </div>

      {/* 最終確認モーダル */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  最終確認
                </h3>
                <p className="text-gray-600">
                  本当にアカウントを削除してもよろしいですか？この操作は取り消せません。
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false)
                  handleDeleteAccount()
                }}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    削除中...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    削除する
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}