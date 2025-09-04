/**
 * Chat2Doc統合構造化スキーマ
 * 既存の7分類 + Structured Outputs対応
 */

export type ChatStructure = {
  // 既存7分類に準拠
  purpose: string;           // 1. 目的・目標を1文で簡潔に
  progress: string[];        // 2. 対応履歴（完了したタスクや実装済み機能）
  challenges: string[];      // 3. 課題（現在直面している問題や未解決の課題）
  nextActions: {             // 4. 次のアクション（ToDo形式に拡張）
    title: string;
    owner?: string | null;
    due?: string | null;     // ISO8601形式の日付（分かる場合）
  }[];
  code: {                    // 5. コード（重要なコードスニペット）
    fileName?: string | null;
    description?: string | null;
    snippet: string;
  }[];
  intentions: string[];      // 6. 意図（実装・設計を選んだ理由や背景）
  concerns: string[];        // 7. 懸念点（セキュリティ、パフォーマンス、保守性など）
  
  // 追加メタデータ
  tags: string[];           // カテゴリタグ
  links: {                  // 関連リンク
    label: string;
    url: string;
  }[];
};

/**
 * SSE配信用のイベント型定義
 */
export type SSEEvent = 
  | { type: 'ready' }
  | { type: 'token'; text: string }
  | { type: 'assistant_done' }
  | { type: 'structure'; data: ChatStructure }
  | { type: 'done' }
  | { type: 'error'; message: string };

/**
 * チャット用のメッセージ型
 */
export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
};

/**
 * 既存APIとの互換性用（レガシー）
 */
export type LegacyStructuredData = {
  purpose: string;
  progress: string[];
  challenges: string[];
  nextActions: string[];
  code?: Array<{
    fileName?: string;
    description?: string;
    snippet?: string;
  }>;
  intentions?: string[];
  concerns?: string[];
};

/**
 * レガシー形式からChatStructure形式への変換
 */
export function legacyToChatStructure(legacy: LegacyStructuredData): ChatStructure {
  return {
    purpose: legacy.purpose,
    progress: legacy.progress,
    challenges: legacy.challenges,
    nextActions: legacy.nextActions.map(action => ({ title: action })),
    code: (legacy.code || []).map(c => ({
      fileName: c.fileName || null,
      description: c.description || null,
      snippet: c.snippet || ''
    })),
    intentions: legacy.intentions || [],
    concerns: legacy.concerns || [],
    tags: [],
    links: []
  };
}