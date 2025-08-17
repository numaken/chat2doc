# Chat2Doc

AI会話を構造化されたドキュメントに変換し、プロジェクトの知識資産として活用するサービス

## 機能概要

- **AI会話ログの構造化**: ChatGPT・Claude・Gemini等との会話を7つのカテゴリに自動分類
- **モバイル対応ペースト機能**: `/import`ページで全文ペーストから本文・コード自動分離
- **Markdown出力**: 構造化結果をドキュメントとして即座にエクスポート
- **認証システム**: 未ログイン（ローカル保存）／ログイン（クラウド同期・共有）の選択可能

## Getting Started

### 開発環境のセットアップ

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### 環境変数の設定

`.env.local` ファイルを作成し、以下を設定：

```bash
# OpenAI API設定
OPENAI_API_KEY=your_openai_api_key_here

# NextAuth設定（認証機能用）
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000

# Google OAuth設定
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## モデル切替の仕組み

Chat2Docでは、処理速度と精度のバランスに応じてAIモデルを選択できる設計になっています。

### 現在の設定

- **高速（軽量）モデル**: `gpt-3.5-turbo` - コスト効率重視、基本的な構造化に最適
- **高精度（リッチ）モデル**: `gpt-4` - より詳細な分析が必要な場合（未実装）

### 設定箇所

モデルの切替は以下のファイルで管理されています：

1. **APIルート**: `src/app/api/structurize/route.ts` (187行目、371行目)
2. **テスト用API**: `src/app/api/debug-*` ファイル群
3. **環境変数**: `.env.local` で `OPENAI_MODEL` 変数による切替（将来実装予定）

### 設定例（将来対応）

```bash
# .env.local
OPENAI_MODEL=gpt-3.5-turbo  # 高速モード
# OPENAI_MODEL=gpt-4        # 高精度モード
```

## 主要ページ

- `/` - ランディングページ
- `/app` - メインアプリケーション（要認証）
- `/import` - ペースト・整形機能（未認証でも利用可能）
- `/auth/signin` - Google OAuth認証

## テスト

```bash
# ユニットテスト実行
npm run test

# 監視モードでテスト実行
npm run test:watch
```

テストファイル：
- `src/utils/ingest.test.ts` - ペースト機能のコア処理テスト

## アーキテクチャ

- **フレームワーク**: Next.js 15 (App Router)
- **認証**: NextAuth.js (Google OAuth)
- **AI API**: OpenAI (GPT-3.5-turbo)
- **スタイリング**: Tailwind CSS
- **テスト**: Vitest

## デプロイ

本プロジェクトはVercelでホストされています。

```bash
# 本番ビルド確認
npm run build
npm run start
```

環境変数は本番環境でも同様に設定してください。
