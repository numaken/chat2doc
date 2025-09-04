'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Sparkles, FileText, AlertCircle, MessageCircle, Clipboard } from 'lucide-react'
import UpgradeModal from './UpgradeModal'
import { useUpgrade } from '@/hooks/useUpgrade'
import type { ChatStructure, ChatMessage } from '@/types/structure'

interface ConversationInputProps {
  projectId: string
  conversations: Conversation[]
  setConversations: (conversations: Conversation[]) => void
}

interface Conversation {
  id: string
  projectId: string
  originalText: string
  structuredData: {
    purpose: string
    progress: string[]
    challenges: string[]
    nextActions: string[]
    code?: Array<{
      fileName?: string
      description?: string
      snippet?: string
    }>
    intentions?: string[]
    concerns?: string[]
  }
  metadata: {
    model: string
    tokens?: number
    chunks?: number
    totalChars?: number
    timestamp: string
  }
  timestamp: string
}

export default function ConversationInput({ 
  projectId, 
  conversations, 
  setConversations 
}: ConversationInputProps) {
  const [inputText, setInputText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [usageInfo, setUsageInfo] = useState<{ count: number; plan: string } | null>(null)
  const { upgradeToPremiuim } = useUpgrade()

  // チャットモード用の状態
  const [isRealTimeMode, setIsRealTimeMode] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [currentStructure, setCurrentStructure] = useState<ChatStructure | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // スクロール効果（チャット追加時）
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatMessages])

  // チャットメッセージ送信機能
  const sendChatMessage = async () => {
    if (!inputText.trim() || streaming) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputText,
      timestamp: new Date().toISOString()
    }

    const updatedMessages = [...chatMessages, userMessage]
    setChatMessages(updatedMessages)
    setInputText('')
    setStreaming(true)

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages })
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString()
      }
      setChatMessages([...updatedMessages, assistantMessage])

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                
                if (line.startsWith('event: token')) {
                  assistantContent += data.text
                  setChatMessages(prev => {
                    const newMessages = [...prev]
                    if (newMessages[newMessages.length - 1].role === 'assistant') {
                      newMessages[newMessages.length - 1].content = assistantContent
                    }
                    return newMessages
                  })
                } else if (line.startsWith('event: structure')) {
                  setCurrentStructure(data.data)
                } else if (line.startsWith('event: error')) {
                  console.error('Stream error:', data.message)
                }
              } catch (parseErr) {
                console.log('Failed to parse SSE data:', line)
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

      const finalMessages = [...updatedMessages, { ...assistantMessage, content: assistantContent }]
      setChatMessages(finalMessages)

    } catch (error) {
      console.error('Chat error:', error)
      setError(error instanceof Error ? error.message : 'チャットでエラーが発生しました')
    } finally {
      setStreaming(false)
    }
  }

  // チャット内容をプロジェクトに保存
  const saveChatToProject = () => {
    if (!currentStructure || chatMessages.length === 0) return

    const conversationText = chatMessages
      .map(msg => `${msg.role === 'user' ? 'ユーザー' : 'AI'}: ${msg.content}`)
      .join('\n\n')

    const newConversation = {
      id: `conv-${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      originalText: conversationText,
      structuredData: {
        purpose: currentStructure.purpose,
        progress: currentStructure.progress,
        challenges: currentStructure.challenges,
        nextActions: currentStructure.nextActions.map(action => action.title),
        code: currentStructure.code?.map(c => ({
          fileName: c.fileName || undefined,
          description: c.description || undefined,  
          snippet: c.snippet || undefined
        })) || [],
        intentions: currentStructure.intentions,
        concerns: currentStructure.concerns
      },
      metadata: {
        model: 'gpt-4o-mini',
        tokens: conversationText.length,
        chunks: 1,
        totalChars: conversationText.length,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    }

    setConversations([...conversations, newConversation])
    
    // チャットをリセット
    setChatMessages([])
    setCurrentStructure(null)
    
    // 成功メッセージ
    alert('会話をプロジェクトに保存しました！')
    
    // 使用量表示を更新
    window.dispatchEvent(new CustomEvent('usageUpdated'))
  }

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
        console.error('❌ APIレスポンスエラー:', response.status, response.statusText)
        
        let errorData
        try {
          errorData = await response.json()
          console.error('❌ エラー詳細:', errorData)
        } catch (parseError) {
          console.error('❌ JSONパースエラー:', parseError)
          throw new Error(`APIエラー (${response.status}): ${response.statusText}`)
        }
        
        // 使用量制限の場合はアップグレードモーダル表示
        if (response.status === 429 && errorData.code === 'USAGE_LIMIT_EXCEEDED') {
          setUsageInfo(errorData.usage)
          setShowUpgradeModal(true)
          return
        }
        
        // より詳細なエラーメッセージ
        const errorMessage = errorData.details 
          ? `${errorData.error}: ${errorData.details}`
          : errorData.error || `APIエラー (${response.status})`
        
        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log('✅ 構造化完了:', result)

      // 使用量情報を更新
      if (result.usage) {
        setUsageInfo(result.usage)
        console.log('📊 使用量情報:', result.usage)
      }

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
      
      // 使用量表示を更新するためのイベントを発火
      window.dispatchEvent(new CustomEvent('usageUpdated'))
      
      // 成功メッセージを表示（オプション）
      console.log('📊 トークン使用量:', result.metadata?.tokens)
      console.log('📊 残り使用可能回数:', result.usage?.remainingCount)
      
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
        {/* モード切替 */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {isRealTimeMode ? 'リアルタイムチャット' : '会話ログ入力'}
            </h2>
            <p className="text-gray-600 mt-1">
              {isRealTimeMode 
                ? 'AIとリアルタイムで会話し、自動的に構造化します' 
                : 'ChatGPTやClaude等との会話ログをペーストして、構造化されたドキュメントに変換します'
              }
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${!isRealTimeMode ? 'text-blue-600' : 'text-gray-500'}`}>
              ペーストモード
            </span>
            <button
              onClick={() => setIsRealTimeMode(!isRealTimeMode)}
              className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
              style={{ backgroundColor: isRealTimeMode ? '#3B82F6' : '#D1D5DB' }}
            >
              <span
                className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                style={{ transform: isRealTimeMode ? 'translateX(20px)' : 'translateX(0)' }}
              />
            </button>
            <span className={`text-sm font-medium ${isRealTimeMode ? 'text-blue-600' : 'text-gray-500'}`}>
              チャットモード
            </span>
          </div>
        </div>
      </div>

      {/* 入力エリア */}
      <div className="flex-1 flex flex-col">
        {isRealTimeMode ? (
          /* チャットモード */
          <div className="flex-1 flex flex-col">
            {/* チャット履歴表示 */}
            <div className="flex-1 mb-4 border border-gray-300 rounded-lg overflow-hidden bg-white">
              <div className="h-full overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {chatMessages.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">
                    AIと会話を開始しましょう
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] p-3 rounded-lg ${
                        msg.role === 'user' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                        {msg.timestamp && (
                          <div className={`text-xs mt-1 opacity-70`}>
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                
                {/* ストリーミング中の表示 */}
                {streaming && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-900 p-3 rounded-lg max-w-[70%]">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-sm">入力中...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* チャット入力エリア */}
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                placeholder="メッセージを入力..."
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={streaming}
              />
              <button
                onClick={sendChatMessage}
                disabled={!inputText.trim() || streaming}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {streaming ? (
                  <Sparkles className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            
            {/* 現在の構造化データ表示 */}
            {currentStructure && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  現在の構造化データ
                </h4>
                <div className="text-sm text-gray-700">
                  <div className="mb-2">
                    <strong>目的:</strong> {currentStructure.purpose}
                  </div>
                  {currentStructure.progress.length > 0 && (
                    <div className="mb-2">
                      <strong>進捗:</strong> {currentStructure.progress.length}件
                    </div>
                  )}
                  {currentStructure.challenges.length > 0 && (
                    <div className="mb-2">
                      <strong>課題:</strong> {currentStructure.challenges.length}件
                    </div>
                  )}
                  {currentStructure.code.length > 0 && (
                    <div className="mb-2">
                      <strong>コード:</strong> {currentStructure.code.length}件
                    </div>
                  )}
                </div>
                
                {/* 会話をプロジェクトに保存ボタン */}
                <button
                  onClick={saveChatToProject}
                  className="mt-3 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm flex items-center gap-2"
                >
                  <Clipboard className="w-4 h-4" />
                  会話をプロジェクトに保存
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ペーストモード（既存） */
          <div className="flex-1 mb-4">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="ここにAIとの会話ログをペーストしてください...

【対応AI】ChatGPT, Claude, Gemini, Perplexity等
【コード検出を向上させるコツ】
✓ ファイル名を明記: 「app.js に以下を実装」
✓ 実装動詞を使用: 「〜を追加しました」「〜を修正」
✓ コードブロックを維持: ```で囲まれた形式をそのまま

例:
ユーザー: PostPilot ProにTwitter自動投稿機能を追加したいのですが？

ChatGPT: 以下のコードをapi/twitter.jsに実装してください：
```javascript
export async function postTweet(content) {
  // Twitter API実装
}
```
"
              className="w-full h-full p-4 text-base border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              style={{ minHeight: '200px' }}
              disabled={isProcessing}
            />
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* アクションボタン（ペーストモードのみ） */}
        {!isRealTimeMode && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <FileText className="w-4 h-4" />
              <span>{inputText.length} 文字</span>
            </div>
            
            <button
              onClick={processConversation}
              disabled={!inputText.trim() || isProcessing}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium text-base sm:text-sm"
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
        )}
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

      {/* アップグレードモーダル */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentUsage={usageInfo?.count || 0}
        onUpgrade={() => {
          setShowUpgradeModal(false)
          upgradeToPremiuim()
        }}
      />
    </div>
  )
}