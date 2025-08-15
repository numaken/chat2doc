'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Folder, Clock, MoreVertical, Edit3, Trash2 } from 'lucide-react'

interface Project {
  id: string
  name: string
  lastUpdated: string
  conversationCount: number
}

interface ProjectSidebarProps {
  activeProject: string | null
  setActiveProject: (projectId: string | null) => void
}

export default function ProjectSidebar({ activeProject, setActiveProject }: ProjectSidebarProps) {
  // 初期状態は空配列（SSRとクライアントで同じ）
  const [projects, setProjectsState] = useState<Project[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [editingProject, setEditingProject] = useState<string | null>(null)
  const [editProjectName, setEditProjectName] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // クライアントサイドでlocalStorageからデータを読み込み
  useEffect(() => {
    const loadProjects = () => {
      const saved = localStorage.getItem('chat2doc_projects')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.error('Failed to load projects:', e)
        }
      }
      // デフォルトプロジェクト
      return [
        {
          id: '1',
          name: 'PostPilot Pro開発',
          lastUpdated: '2024-08-14',
          conversationCount: 5
        },
        {
          id: '2', 
          name: 'WordPressプラグイン',
          lastUpdated: '2024-08-12',
          conversationCount: 3
        }
      ]
    }

    setProjectsState(loadProjects())
    setIsLoaded(true)
  }, [])

  // プロジェクトを更新してlocalStorageに保存
  const setProjects = (newProjects: Project[]) => {
    setProjectsState(newProjects)
    if (typeof window !== 'undefined') {
      localStorage.setItem('chat2doc_projects', JSON.stringify(newProjects))
    }
  }

  const createProject = () => {
    if (newProjectName.trim()) {
      const newProject: Project = {
        id: `project-${Math.random().toString(36).substr(2, 9)}`,
        name: newProjectName.trim(),
        lastUpdated: new Date().toISOString().split('T')[0],
        conversationCount: 0
      }
      setProjects([newProject, ...projects])
      setNewProjectName('')
      setShowCreateForm(false)
      setActiveProject(newProject.id)
    }
  }

  const startEditProject = (project: Project) => {
    setEditingProject(project.id)
    setEditProjectName(project.name)
    setActiveDropdown(null)
  }

  const saveEditProject = () => {
    if (editProjectName.trim() && editingProject) {
      setProjects(projects.map(p => 
        p.id === editingProject 
          ? { ...p, name: editProjectName.trim(), lastUpdated: new Date().toISOString().split('T')[0] }
          : p
      ))
      setEditingProject(null)
      setEditProjectName('')
    }
  }

  const cancelEditProject = () => {
    setEditingProject(null)
    setEditProjectName('')
  }

  const deleteProject = (projectId: string) => {
    setProjects(projects.filter(p => p.id !== projectId))
    if (activeProject === projectId) {
      setActiveProject(null)
    }
    setShowDeleteConfirm(null)
  }

  const toggleDropdown = (projectId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    setActiveDropdown(activeDropdown === projectId ? null : projectId)
  }

  // ドロップダウンの外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null)
      }
    }
    
    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [activeDropdown])

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">プロジェクト</h2>
          <button
            onClick={() => setShowCreateForm(true)}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* 新規作成フォーム */}
        {showCreateForm && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <input
              type="text"
              placeholder="プロジェクト名を入力..."
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createProject()}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={createProject}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
              >
                作成
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  setNewProjectName('')
                }}
                className="px-3 py-1.5 text-gray-600 text-sm hover:bg-gray-100 rounded-md transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>

      {/* プロジェクト一覧 */}
      <div className="flex-1 overflow-y-auto">
        {!isLoaded ? (
          <div className="p-4 text-center text-gray-500">
            読み込み中...
          </div>
        ) : projects.map((project) => (
          <div
            key={project.id}
            className={`relative border-b border-gray-100 transition-colors ${
              activeProject === project.id
                ? 'bg-blue-50 border-l-4 border-l-blue-600'
                : 'hover:bg-gray-50'
            }`}
          >
            {editingProject === project.id ? (
              // 編集モード
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <Folder className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <input
                    type="text"
                    value={editProjectName}
                    onChange={(e) => setEditProjectName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEditProject()
                      if (e.key === 'Escape') cancelEditProject()
                    }}
                    className="flex-1 px-2 py-1 border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={saveEditProject}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                  >
                    保存
                  </button>
                  <button
                    onClick={cancelEditProject}
                    className="px-3 py-1 text-gray-600 text-xs hover:bg-gray-100 rounded transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              // 通常表示モード
              <div
                onClick={() => setActiveProject(project.id)}
                className="p-4 cursor-pointer flex items-start justify-between group"
              >
                <div className="flex items-start gap-3 flex-1">
                  <Folder className={`w-5 h-5 mt-0.5 ${
                    activeProject === project.id ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-medium text-sm sm:text-base leading-tight ${
                      activeProject === project.id ? 'text-blue-900' : 'text-gray-900'
                    }`} title={project.name}>
                      {project.name.length > 20 ? `${project.name.substring(0, 20)}...` : project.name}
                    </h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span className="truncate">{project.lastUpdated}</span>
                      </div>
                      <span className="whitespace-nowrap">{project.conversationCount}件の会話</span>
                    </div>
                  </div>
                </div>
                
                {/* 3点メニューボタン */}
                <div className="relative" ref={activeDropdown === project.id ? dropdownRef : null}>
                  <button 
                    onClick={(e) => toggleDropdown(project.id, e)}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  
                  {/* ドロップダウンメニュー */}
                  {activeDropdown === project.id && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          startEditProject(project)
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Edit3 className="w-4 h-4" />
                        プロジェクト名を変更
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowDeleteConfirm(project.id)
                          setActiveDropdown(null)
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-100"
                      >
                        <Trash2 className="w-4 h-4" />
                        プロジェクトを削除
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 削除確認モーダル */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-[90vw]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">プロジェクトを削除</h3>
                <p className="text-sm text-gray-600">この操作は取り消せません</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-6">
              「{projects.find(p => p.id === showDeleteConfirm)?.name}」を削除しますか？
              このプロジェクトに含まれるすべての会話データも削除されます。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => deleteProject(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* フッター情報 */}
      <div className="p-4 border-t border-gray-200 text-xs text-gray-500">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>OpenAI API 接続中</span>
        </div>
        <p>Chat2Doc β版 - AI会話構造化ツール</p>
      </div>
    </div>
  )
}