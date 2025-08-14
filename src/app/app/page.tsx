'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { FileText, MessageSquare, Users, Bot, Shield } from 'lucide-react'
import Header from '@/components/Header'
import ProjectSidebar from '@/components/ProjectSidebar'
import ConversationInput from '@/components/ConversationInput'
import CurrentStatePanel from '@/components/CurrentStatePanel'
import UsageIndicator from '@/components/UsageIndicator'

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

export default function AppPage() {
  const { status } = useSession()
  const [activeProject, setActiveProjectState] = useState<string | null>(null)
  const [conversations, setConversationsState] = useState<Conversation[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // localStorageから会話データを読み込み
  useEffect(() => {
    const savedConversations = localStorage.getItem('chat2doc_conversations')
    const savedActiveProject = localStorage.getItem('chat2doc_activeProject')
    
    if (savedConversations) {
      try {
        setConversationsState(JSON.parse(savedConversations))
      } catch (e) {
        console.error('Failed to load conversations:', e)
      }
    }
    
    if (savedActiveProject) {
      setActiveProjectState(savedActiveProject)
    }
    
    setIsLoaded(true)
  }, [])

  // アクティブプロジェクトをlocalStorageに保存
  const setActiveProject = (projectId: string | null) => {
    setActiveProjectState(projectId)
    if (typeof window !== 'undefined') {
      if (projectId) {
        localStorage.setItem('chat2doc_activeProject', projectId)
      } else {
        localStorage.removeItem('chat2doc_activeProject')
      }
    }
  }

  // 会話データをlocalStorageに保存
  const setConversations = (newConversations: Conversation[]) => {
    setConversationsState(newConversations)
    if (typeof window !== 'undefined') {
      localStorage.setItem('chat2doc_conversations', JSON.stringify(newConversations))
    }
  }

  // 認証チェック
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Shield className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">ログインが必要です</h1>
          <p className="text-gray-600 mb-6">
            Chat2Docをご利用いただくには、Googleアカウントでのログインが必要です。
          </p>
          <button
            onClick={() => signIn('google', { callbackUrl: '/app' })}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Google でログイン
          </button>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)]">
        {/* 左サイドバー: プロジェクト管理 */}
        <div className="lg:w-80 border-b lg:border-b-0 lg:border-r border-gray-200">
          <ProjectSidebar 
            activeProject={activeProject}
            setActiveProject={setActiveProject}
          />
        </div>
        
        {/* メインエリア: 会話入力 */}
        <main className="flex-1 flex flex-col xl:flex-row min-h-0">
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
            {/* 使用量表示 */}
            <UsageIndicator />
            
            {activeProject ? (
              <ConversationInput 
                projectId={activeProject}
                conversations={conversations}
                setConversations={setConversations}
              />
            ) : (
              <WelcomeScreen />
            )}
          </div>
          
          {/* 右サイドバー: 現在地パネル */}
          {activeProject && (
            <div className="xl:w-96 border-t xl:border-t-0 xl:border-l border-gray-200">
              <CurrentStatePanel 
                projectId={activeProject}
                conversations={conversations}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function WelcomeScreen() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-lg">
        <div className="mb-8">
          <MessageSquare className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Chat2Doc へようこそ
          </h1>
          <p className="text-gray-600">
            AIとの会話を構造化されたドキュメントに変換し、プロジェクトの知識資産として活用しましょう
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="p-4 bg-white rounded-lg shadow-sm border">
            <FileText className="w-8 h-8 text-green-500 mb-2" />
            <h3 className="font-semibold mb-1">構造化</h3>
            <p className="text-sm text-gray-600">
              会話を目的・課題・履歴に自動分類
            </p>
          </div>
          
          <div className="p-4 bg-white rounded-lg shadow-sm border">
            <Users className="w-8 h-8 text-purple-500 mb-2" />
            <h3 className="font-semibold mb-1">継続性</h3>
            <p className="text-sm text-gray-600">
              プロジェクトの現在地を常に把握
            </p>
          </div>
          
          <div className="p-4 bg-white rounded-lg shadow-sm border">
            <Bot className="w-8 h-8 text-blue-500 mb-2" />
            <h3 className="font-semibold mb-1">AI連携</h3>
            <p className="text-sm text-gray-600">
              文脈を理解したAI支援の継続
            </p>
          </div>
        </div>

        <p className="text-sm text-gray-500">
          左のサイドバーから新しいプロジェクトを作成してください
        </p>
      </div>
    </div>
  )
}