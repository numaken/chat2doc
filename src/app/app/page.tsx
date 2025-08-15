'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { FileText, MessageSquare, Users, Bot, Shield, ChevronDown, Folder } from 'lucide-react'
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

interface Project {
  id: string
  name: string
  lastUpdated: string
  conversationCount: number
}

export default function AppPage() {
  const { status } = useSession()
  const [activeProject, setActiveProjectState] = useState<string | null>(null)
  const [conversations, setConversationsState] = useState<Conversation[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [showMobileProjectSelector, setShowMobileProjectSelector] = useState(false)

  // localStorageから会話データを読み込み
  useEffect(() => {
    const savedConversations = localStorage.getItem('chat2doc_conversations')
    const savedActiveProject = localStorage.getItem('chat2doc_activeProject')
    const savedProjects = localStorage.getItem('chat2doc_projects')
    
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

    if (savedProjects) {
      try {
        setProjects(JSON.parse(savedProjects))
      } catch (e) {
        console.error('Failed to load projects:', e)
        setProjects([
          { id: '1', name: 'PostPilot Pro開発', lastUpdated: '2024-08-14', conversationCount: 5 },
          { id: '2', name: 'WordPressプラグイン', lastUpdated: '2024-08-12', conversationCount: 5 }
        ])
      }
    } else {
      setProjects([
        { id: '1', name: 'PostPilot Pro開発', lastUpdated: '2024-08-14', conversationCount: 5 },
        { id: '2', name: 'WordPressプラグイン', lastUpdated: '2024-08-12', conversationCount: 5 }
      ])
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
        {/* モバイル用プロジェクト選択バー */}
        <div className="lg:hidden bg-white border-b border-gray-200 p-3">
          <button
            onClick={() => setShowMobileProjectSelector(!showMobileProjectSelector)}
            className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Folder className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-gray-900">
                {activeProject ? 
                  projects.find(p => p.id === activeProject)?.name || 'プロジェクト未選択' : 
                  'プロジェクトを選択'
                }
              </span>
            </div>
            <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${showMobileProjectSelector ? 'rotate-180' : ''}`} />
          </button>
          
          {/* モバイル用プロジェクトドロップダウン */}
          {showMobileProjectSelector && (
            <div className="absolute left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-lg">
              <div className="max-h-64 overflow-y-auto">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => {
                      setActiveProject(project.id)
                      setShowMobileProjectSelector(false)
                    }}
                    className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                      activeProject === project.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <Folder className={`w-5 h-5 ${activeProject === project.id ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div className="flex-1 text-left">
                      <div className={`font-medium ${activeProject === project.id ? 'text-blue-900' : 'text-gray-900'}`}>
                        {project.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {project.lastUpdated} • {project.conversationCount}件の会話
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 左サイドバー: プロジェクト管理（デスクトップのみ） */}
        <div className="hidden lg:block lg:w-80 border-r border-gray-200">
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
    <div className="flex items-center justify-center h-full p-4">
      <div className="text-center max-w-2xl">
        <div className="mb-6 sm:mb-8">
          <MessageSquare className="w-12 h-12 sm:w-16 sm:h-16 text-blue-500 mx-auto mb-3 sm:mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Chat2Doc へようこそ
          </h1>
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
            AIとの会話を構造化されたドキュメントに変換し、プロジェクトの知識資産として活用しましょう
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="p-3 sm:p-4 bg-white rounded-lg shadow-sm border">
            <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 mb-2 mx-auto sm:mx-0" />
            <h3 className="font-semibold mb-1 text-sm sm:text-base">構造化</h3>
            <p className="text-xs sm:text-sm text-gray-600">
              会話を目的・課題・履歴に自動分類
            </p>
          </div>
          
          <div className="p-3 sm:p-4 bg-white rounded-lg shadow-sm border">
            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500 mb-2 mx-auto sm:mx-0" />
            <h3 className="font-semibold mb-1 text-sm sm:text-base">継続性</h3>
            <p className="text-xs sm:text-sm text-gray-600">
              プロジェクトの現在地を常に把握
            </p>
          </div>
          
          <div className="p-3 sm:p-4 bg-white rounded-lg shadow-sm border">
            <Bot className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 mb-2 mx-auto sm:mx-0" />
            <h3 className="font-semibold mb-1 text-sm sm:text-base">AI連携</h3>
            <p className="text-xs sm:text-sm text-gray-600">
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