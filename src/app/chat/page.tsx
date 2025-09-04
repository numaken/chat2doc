'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { ChatStructure, ChatMessage } from '@/types/structure';

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [structure, setStructure] = useState<ChatStructure | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'structure'>('chat');
  const [error, setError] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 認証チェック
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
    }
  }, [session, status, router]);

  // スクロール自動調整
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // チャット送信処理
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || streaming) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setStreaming(true);
    setError(null);

    // 以前のリクエストをキャンセル
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: newMessages }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'リクエストが失敗しました');
      }

      if (!response.body) {
        throw new Error('レスポンスボディが空です');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (!line.trim()) continue;
          
          const eventMatch = line.match(/^event: (.+)$/m);
          const dataMatch = line.match(/^data: (.+)$/m);
          
          if (eventMatch && dataMatch) {
            const event = eventMatch[1];
            const data = dataMatch[1];
            
            try {
              const parsedData = JSON.parse(data);
              
              switch (event) {
                case 'ready':
                  console.log('🚀 ストリーミング開始');
                  break;
                
                case 'token':
                  if (parsedData.text) {
                    assistantContent += parsedData.text;
                    setMessages(prevMessages => {
                      const withoutLastAssistant = prevMessages.filter(
                        (_, i) => i !== prevMessages.length - 1 || 
                        prevMessages[prevMessages.length - 1].role !== 'assistant'
                      );
                      return [
                        ...withoutLastAssistant,
                        {
                          role: 'assistant',
                          content: assistantContent,
                          timestamp: new Date().toISOString()
                        }
                      ];
                    });
                  }
                  break;
                
                case 'assistant_done':
                  console.log('✅ アシスタント応答完了');
                  break;
                
                case 'structure':
                  if (parsedData.data) {
                    setStructure(parsedData.data);
                    console.log('📝 構造化データ受信:', parsedData.data);
                  }
                  break;
                
                case 'error':
                  setError(parsedData.message || 'エラーが発生しました');
                  break;
                
                case 'done':
                  console.log('✅ ストリーミング完了');
                  break;
              }
            } catch (parseError) {
              console.error('SSEデータの解析エラー:', parseError, data);
            }
          }
        }
      }
    } catch (fetchError) {
      if (fetchError instanceof Error) {
        if (fetchError.name === 'AbortError') {
          console.log('リクエストがキャンセルされました');
        } else {
          console.error('送信エラー:', fetchError);
          setError(fetchError.message);
        }
      }
    } finally {
      setStreaming(false);
      abortControllerRef.current = null;
    }
  }

  // ローディング中
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  // 未認証
  if (!session) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between shrink-0">
        <h1 className="text-xl font-semibold">Chat2Doc 内蔵チャット</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {session.user?.email}
          </span>
        </div>
      </header>

      {/* モバイル用タブ */}
      <div className="md:hidden bg-white border-b shrink-0">
        <div className="flex">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-3 px-4 text-center font-medium ${
              activeTab === 'chat' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500'
            }`}
          >
            💬 チャット
          </button>
          <button
            onClick={() => setActiveTab('structure')}
            className={`flex-1 py-3 px-4 text-center font-medium ${
              activeTab === 'structure' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500'
            }`}
          >
            📝 構造化
          </button>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* チャットパネル */}
        <div className={`${
          activeTab === 'chat' ? 'block' : 'hidden'
        } md:block md:w-1/2 w-full flex flex-col bg-white border-r min-h-0`}>
          
          {/* メッセージエリア */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 mt-8">
                <div className="text-4xl mb-2">🤖</div>
                <p className="text-lg mb-2">Chat2Doc内蔵チャットへようこそ！</p>
                <p className="text-sm">
                  会話しながらリアルタイムで構造化されたドキュメントが生成されます。
                </p>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">
                    {message.content}
                  </div>
                  {message.timestamp && (
                    <div className={`text-xs mt-2 opacity-70 ${
                      message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {streaming && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    <span className="text-sm text-gray-600">生成中...</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="text-red-600 text-sm">
                    <strong>エラー:</strong> {error}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 入力フォーム */}
          <form onSubmit={handleSend} className="p-4 border-t bg-gray-50 shrink-0">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="メッセージを入力してください..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={streaming}
              />
              <button
                type="submit"
                disabled={!input.trim() || streaming}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {streaming ? '送信中...' : '送信'}
              </button>
            </div>
          </form>
        </div>

        {/* 構造化パネル */}
        <div className={`${
          activeTab === 'structure' ? 'block' : 'hidden'
        } md:block md:w-1/2 w-full bg-white overflow-y-auto min-h-0`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">📝 リアルタイム構造化</h2>
              {structure && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  最終更新: {new Date().toLocaleTimeString()}
                </span>
              )}
            </div>

            {!structure ? (
              <div className="text-center text-gray-500 mt-12">
                <div className="text-4xl mb-4">⏳</div>
                <p className="text-lg mb-2">構造化待機中</p>
                <p className="text-sm">
                  メッセージを送信すると、会話が自動的に7つのカテゴリに構造化されます。
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 目的 */}
                <section className="border-b pb-4">
                  <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
                    🎯 目的
                  </h3>
                  <p className="text-gray-700">{structure.purpose}</p>
                </section>

                {/* 対応履歴 */}
                {structure.progress.length > 0 && (
                  <section className="border-b pb-4">
                    <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
                      ✅ 対応履歴
                    </h3>
                    <ul className="space-y-1">
                      {structure.progress.map((item, index) => (
                        <li key={index} className="text-gray-700 flex items-start">
                          <span className="text-green-500 mr-2">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* 課題 */}
                {structure.challenges.length > 0 && (
                  <section className="border-b pb-4">
                    <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
                      ⚠️ 課題
                    </h3>
                    <ul className="space-y-1">
                      {structure.challenges.map((item, index) => (
                        <li key={index} className="text-gray-700 flex items-start">
                          <span className="text-yellow-500 mr-2">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* 次のアクション */}
                {structure.nextActions.length > 0 && (
                  <section className="border-b pb-4">
                    <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
                      📋 次のアクション
                    </h3>
                    <ul className="space-y-2">
                      {structure.nextActions.map((action, index) => (
                        <li key={index} className="text-gray-700 p-3 bg-blue-50 rounded-lg">
                          <div className="font-medium">{action.title}</div>
                          {(action.owner || action.due) && (
                            <div className="text-sm text-gray-600 mt-1">
                              {action.owner && <span className="mr-3">👤 {action.owner}</span>}
                              {action.due && <span>📅 {action.due}</span>}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* コード */}
                {structure.code.length > 0 && (
                  <section className="border-b pb-4">
                    <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
                      💻 コード
                    </h3>
                    <div className="space-y-3">
                      {structure.code.map((codeItem, index) => (
                        <div key={index} className="bg-gray-900 text-gray-100 rounded-lg p-4">
                          {(codeItem.fileName || codeItem.description) && (
                            <div className="text-sm text-gray-400 mb-2">
                              {codeItem.fileName && (
                                <span className="font-mono">{codeItem.fileName}</span>
                              )}
                              {codeItem.description && (
                                <span className="ml-2">- {codeItem.description}</span>
                              )}
                            </div>
                          )}
                          <pre className="text-sm overflow-x-auto">
                            <code>{codeItem.snippet}</code>
                          </pre>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* 意図 */}
                {structure.intentions.length > 0 && (
                  <section className="border-b pb-4">
                    <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
                      💡 意図
                    </h3>
                    <ul className="space-y-1">
                      {structure.intentions.map((item, index) => (
                        <li key={index} className="text-gray-700 flex items-start">
                          <span className="text-blue-500 mr-2">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* 懸念点 */}
                {structure.concerns.length > 0 && (
                  <section className="border-b pb-4">
                    <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
                      🚨 懸念点
                    </h3>
                    <ul className="space-y-1">
                      {structure.concerns.map((item, index) => (
                        <li key={index} className="text-gray-700 flex items-start">
                          <span className="text-red-500 mr-2">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* タグ */}
                {structure.tags.length > 0 && (
                  <section className="border-b pb-4">
                    <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
                      🏷️ タグ
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {structure.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {/* リンク */}
                {structure.links.length > 0 && (
                  <section>
                    <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
                      🔗 関連リンク
                    </h3>
                    <ul className="space-y-1">
                      {structure.links.map((link, index) => (
                        <li key={index}>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            {link.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}