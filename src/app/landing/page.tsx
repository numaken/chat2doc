'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, Check, MessageSquare, FileText, Bot, Target, Users, Code, Lightbulb, AlertCircle, Zap, Shield, Clock, X } from 'lucide-react'

export default function LandingPage() {
  const [showUsageModal, setShowUsageModal] = useState(false)
  const [showDemoInterface, setShowDemoInterface] = useState(false)
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Chat2Doc</span>
              <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">β版</span>
            </div>
            <Link 
              href="/app" 
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              アプリを開く
            </Link>
          </div>
        </div>
      </header>

      {/* ヒーローセクション */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 sm:mb-6">
            AI会話を<br className="hidden sm:block" />
            <span className="text-blue-600">知識資産</span>に変換
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8 max-w-3xl mx-auto px-2">
            ChatGPT・Claude・Gemini等との会話ログを構造化されたドキュメントに自動変換。<br className="hidden md:block" />
            開発プロジェクトの引き継ぎ書・仕様書・議事録として活用できます。
          </p>
          {/* 認証導入の案内 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-6 sm:mb-8 max-w-2xl mx-auto mx-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
              <span className="font-semibold text-blue-800 text-sm sm:text-base">安全な認証システム導入</span>
            </div>
            <p className="text-blue-700 text-xs sm:text-sm">
              セキュリティ強化により、Googleアカウントでのログインが必要になりました。無料でご利用いただけます。
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12 px-4">
            <Link 
              href="/auth/signin" 
              className="bg-blue-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              ログインして始める
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>
            <button 
              onClick={() => setShowUsageModal(true)}
              className="border border-gray-300 text-gray-700 px-6 sm:px-8 py-3 sm:py-4 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
            >
              使用例を見る
            </button>
          </div>
          
          {/* デモ画像エリア */}
          <div 
            className="bg-white rounded-lg shadow-xl p-4 sm:p-6 max-w-4xl mx-auto mx-4 cursor-pointer hover:shadow-2xl transition-shadow"
            onClick={() => setShowDemoInterface(true)}
          >
            <div className="bg-gray-100 rounded-lg h-48 sm:h-64 flex items-center justify-center hover:bg-gray-200 transition-colors">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
                <p className="text-gray-500 text-sm sm:text-base">Chat2Doc インターフェース デモ</p>
                <p className="text-gray-400 text-xs mt-2">クリックして詳細を表示</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 問題・解決セクション */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                こんな課題はありませんか？
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  </div>
                  <p className="text-gray-700">AI との重要な会話が ChatGPT の履歴に埋もれてしまう</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  </div>
                  <p className="text-gray-700">プロジェクトの進捗や課題が整理されずに散らばっている</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  </div>
                  <p className="text-gray-700">チームメンバーへの引き継ぎに時間がかかる</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  </div>
                  <p className="text-gray-700">過去の議論や決定事項を探すのに苦労する</p>
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-blue-600 mb-6">
                Chat2Doc が解決します
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-green-500 mt-1" />
                  <p className="text-gray-700">会話ログを <strong>7つのカテゴリ</strong> に自動構造化</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-green-500 mt-1" />
                  <p className="text-gray-700">プロジェクトの <strong>現在地</strong> を一目で把握</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-green-500 mt-1" />
                  <p className="text-gray-700"><strong>Markdown形式</strong> で即座にエクスポート</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-6 h-6 text-green-500 mt-1" />
                  <p className="text-gray-700">開発者向け最適化：<strong>コード・意図・懸念点</strong> も抽出</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7つの構造化カテゴリ */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              AI会話を7つのカテゴリに自動分類
            </h2>
            <p className="text-xl text-gray-600">
              Chat2Docは会話の内容を分析し、プロジェクト管理に必要な情報を自動抽出します
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <Target className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">目的</h3>
              <p className="text-sm text-gray-600">プロジェクトの目標と狙いを明確化</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <Check className="w-8 h-8 text-green-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">対応履歴</h3>
              <p className="text-sm text-gray-600">完了したタスクと実装済み機能</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <AlertCircle className="w-8 h-8 text-amber-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">課題</h3>
              <p className="text-sm text-gray-600">現在直面している問題と障壁</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <ArrowRight className="w-8 h-8 text-purple-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">次のアクション</h3>
              <p className="text-sm text-gray-600">今後取り組むべき具体的なステップ</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <Code className="w-8 h-8 text-cyan-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">コード</h3>
              <p className="text-sm text-gray-600">重要なコードスニペットとファイル情報</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <Lightbulb className="w-8 h-8 text-yellow-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">設計意図</h3>
              <p className="text-sm text-gray-600">なぜその実装を選んだのかの背景</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <Shield className="w-8 h-8 text-red-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">技術的懸念</h3>
              <p className="text-sm text-gray-600">セキュリティ・パフォーマンス等の注意点</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <FileText className="w-8 h-8 text-indigo-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Markdown出力</h3>
              <p className="text-sm text-gray-600">構造化結果を即座にドキュメント化</p>
            </div>
          </div>
        </div>
      </section>

      {/* 使用例 */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              こんな場面で活用できます
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">開発チーム</h3>
              <p className="text-gray-600">
                技術検討・実装方針・課題解決の過程を整理し、チーム内での知識共有を促進
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">フリーランス</h3>
              <p className="text-gray-600">
                クライアントとの打ち合わせ・要求分析・プロジェクト進捗の整理に活用
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">プロダクトマネージャー</h3>
              <p className="text-gray-600">
                機能要件・技術課題・ユーザーフィードバックの整理と意思決定記録
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 特徴・メリット */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              なぜChat2Docなのか？
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <Zap className="w-12 h-12 text-yellow-500 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">高速処理</h3>
              <p className="text-gray-600">
                GPT-3.5-turboによるコスト効率的な処理。90,000文字超の長い会話も自動分割して数秒で構造化
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <Shield className="w-12 h-12 text-green-500 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">プライバシー保護</h3>
              <p className="text-gray-600">
                ローカルストレージでのデータ保存。機密性の高い開発情報も安全に管理
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <Clock className="w-12 h-12 text-blue-500 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">即座に利用可能</h3>
              <p className="text-gray-600">
                アカウント登録不要、すぐに使い始められます。Markdownエクスポートで他ツールとの連携も簡単
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            今すぐAI会話を知識資産に変換しましょう
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            無料で始められます。登録不要、すぐにお使いいただけます。
          </p>
          <Link 
            href="/app" 
            className="bg-white text-blue-600 px-8 py-4 rounded-lg hover:bg-gray-100 transition-colors inline-flex items-center gap-2 font-semibold"
          >
            Chat2Docを始める
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* フッター */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <MessageSquare className="w-6 h-6 text-blue-500" />
                <span className="text-lg font-bold text-white">Chat2Doc</span>
              </div>
              <p className="text-gray-400 mb-4">
                AI会話を構造化されたドキュメントに変換し、プロジェクトの知識資産として活用するサービス
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">サービス</h4>
              <ul className="space-y-2">
                <li><Link href="/app" className="hover:text-white transition-colors">アプリを開く</Link></li>
                <li><button onClick={() => setShowUsageModal(true)} className="hover:text-white transition-colors">使い方ガイド</button></li>
                <li><Link href="/dashboard" className="hover:text-white transition-colors">ダッシュボード</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">サポート</h4>
              <ul className="space-y-2">
                <li><a href="mailto:support@chat2doc.example.com" className="hover:text-white transition-colors">お問い合わせ</a></li>
                <li><button onClick={() => alert('プライバシーポリシーページを準備中です')} className="hover:text-white transition-colors">プライバシーポリシー</button></li>
                <li><button onClick={() => alert('利用規約ページを準備中です')} className="hover:text-white transition-colors">利用規約</button></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center">
            <p>&copy; 2024 Chat2Doc. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* 使用例モーダル */}
      {showUsageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Chat2Doc 使用例</h2>
                <button 
                  onClick={() => setShowUsageModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">1. 入力例（AI会話ログ）</h3>
                  <div className="bg-gray-100 p-4 rounded-lg text-sm">
                    <p className="text-gray-700 mb-2"><strong>ユーザー:</strong> Next.jsでユーザー認証を実装したいのですが、どの方法がおすすめですか？</p>
                    <p className="text-gray-700 mb-2"><strong>AI:</strong> Next.jsでの認証実装には主に3つの選択肢があります...</p>
                    <p className="text-gray-500 text-xs">（会話が続く...）</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">2. 構造化結果</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">🎯 目的</h4>
                      <p className="text-blue-800 text-sm">Next.jsアプリケーションにユーザー認証機能を実装</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-2">✅ 対応履歴</h4>
                      <p className="text-green-800 text-sm">• 認証ライブラリの比較検討<br/>• NextAuth.js選定</p>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-lg">
                      <h4 className="font-medium text-amber-900 mb-2">⚠️ 課題</h4>
                      <p className="text-amber-800 text-sm">• セッション管理の複雑さ<br/>• OAuth設定の理解</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="font-medium text-purple-900 mb-2">🔄 次のアクション</h4>
                      <p className="text-purple-800 text-sm">• NextAuth.jsの設定<br/>• Google OAuth設定</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">3. Markdown出力</h3>
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm font-mono">
                    <div className="text-green-400"># Next.js認証実装プロジェクト</div>
                    <div className="mt-2 text-yellow-400">## 目的</div>
                    <div className="text-gray-300">Next.jsアプリケーションにユーザー認証機能を実装</div>
                    <div className="mt-2 text-yellow-400">## 対応履歴</div>
                    <div className="text-gray-300">- 認証ライブラリの比較検討<br/>- NextAuth.js選定</div>
                    <div className="text-gray-500">...</div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 text-center">
                <Link 
                  href="/auth/signin"
                  onClick={() => setShowUsageModal(false)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                >
                  今すぐ試してみる
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* デモインターフェースモーダル */}
      {showDemoInterface && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Chat2Doc インターフェース</h2>
                <button 
                  onClick={() => setShowDemoInterface(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="bg-gray-100 rounded-lg p-6">
                <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                  <h3 className="font-semibold text-gray-900 mb-2">💬 会話ログ入力エリア</h3>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">ChatGPT、Claude、Geminiなどの会話ログをここに貼り付け</p>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg shadow-sm p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">📊 構造化プレビュー</h3>
                    <div className="space-y-2">
                      <div className="bg-blue-100 p-2 rounded text-sm">🎯 目的</div>
                      <div className="bg-green-100 p-2 rounded text-sm">✅ 対応履歴</div>
                      <div className="bg-amber-100 p-2 rounded text-sm">⚠️ 課題</div>
                      <div className="bg-purple-100 p-2 rounded text-sm">🔄 次のアクション</div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-sm p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">📄 Markdown出力</h3>
                    <div className="bg-gray-900 text-green-400 p-3 rounded text-xs font-mono">
                      <div># プロジェクト名</div>
                      <div>## 目的</div>
                      <div>## 対応履歴</div>
                      <div>...</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 text-center">
                <Link 
                  href="/auth/signin"
                  onClick={() => setShowDemoInterface(false)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                >
                  実際に使ってみる
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}