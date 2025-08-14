import { MessageSquare, Settings } from 'lucide-react'

export default function Header() {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <MessageSquare className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Chat2Doc</h1>
          <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-medium">
            β版
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}