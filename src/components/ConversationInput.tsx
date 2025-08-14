'use client'

import { useState } from 'react'
import { Send, Sparkles, FileText, AlertCircle } from 'lucide-react'

interface ConversationInputProps {
  projectId: string
  conversations: any[]
  setConversations: (conversations: any[]) => void
}

export default function ConversationInput({ 
  projectId, 
  conversations, 
  setConversations 
}: ConversationInputProps) {
  const [inputText, setInputText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')

  const processConversation = async () => {
    if (!inputText.trim()) return

    setIsProcessing(true)
    setError('')

    try {
      console.log('🚀 API呼び出し開始')
      
      const response = await fetch('/api/structurize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationText: inputText,
          projectId: projectId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'API呼び出しに失敗しました')
      }

      const result = await response.json()
      console.log('✅ 構造化完了:', result)

      const newConversation = {
        id: `conv-${Math.random().toString(36).substr(2, 9)}`,
        projectId,
        originalText: inputText,
        structuredData: result.structuredData,
        metadata: result.metadata,
        timestamp: new Date().toISOString()
      }

      setConversations([...conversations, newConversation])
      setInputText('')
      
      // 成功メッセージを表示（オプション）
      console.log('📊 トークン使用量:', result.metadata?.tokens)
      
    } catch (err) {
      console.error('❌ エラー:', err)
      setError(err instanceof Error ? err.message : '会話の構造化に失敗しました。しばらく待ってから再試行してください。')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">会話ログ入力</h2>
        <p className="text-gray-600">
          ChatGPTやClaude等との会話ログをペーストして、構造化されたドキュメントに変換します
        </p>
      </div>

      {/* 入力エリア */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 mb-4">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="ここにChatGPTとの会話ログをペーストしてください...

例:
ユーザー: PostPilot ProにTwitter自動投稿機能を追加したいのですが、どのような実装方法がありますか？

ChatGPT: Twitter API v2を使用した自動投稿機能の実装について説明します...
"
            className="w-full h-full p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isProcessing}
          />
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* アクションボタン */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <FileText className="w-4 h-4" />
            <span>{inputText.length} 文字</span>
          </div>
          
          <button
            onClick={processConversation}
            disabled={!inputText.trim() || isProcessing}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? (
              <>
                <Sparkles className="w-5 h-5 animate-spin" />
                構造化中...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                構造化実行
              </>
            )}
          </button>
        </div>
      </div>

      {/* 処理履歴 */}
      {conversations.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">処理履歴</h3>
          <div className="space-y-3">
            {conversations.slice(-3).reverse().map((conv) => (
              <div key={conv.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(conv.timestamp).toLocaleString('ja-JP')}
                  </span>
                  <span className="text-xs text-gray-500">
                    {conv.originalText.length} 文字
                  </span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {conv.originalText.substring(0, 100)}...
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}