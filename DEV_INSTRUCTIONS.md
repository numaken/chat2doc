# DEV_INSTRUCTIONS.md

## 概要
このファイルは Chat2Doc β版における「全部コピペ → 本文/コードを自動分離して整形」機能の実装指示です。  
Claude Code 等の AI コードアシスタントが参照し、実装作業を行えるよう整理しています。

---

## タスク概要
- ペーストされた生テキスト（チャットのコピペ）を解析
- 本文とコードを自動的に分離
- Markdown 形式で整形（本文＋コード付録）
- スマホユーザー前提の簡単 UI を提供

---

## 1. 依存関係
Vitest を導入し、ユニットテストを実行可能にする。

```bash
npm i -D vitest @types/node
```

package.json に追記:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

## 2. ユーティリティ（取り込みパイプライン）

新規: `src/utils/ingest.ts`

- 生テキストから UI ノイズを除去
- インデント/シェル行コードも抽出
- 本文/コードを分離
- Markdown 整形関数を提供

（省略: 実装コードはこのファイルに追加する）

## 3. ペースト UI コンポーネント

新規: `src/components/PasteIngestor.tsx`

- textarea に「全部ペースト」
- 自動で本文/コードを分離
- タブで切り替え表示（整形プレビュー／本文のみ／コード）
- コピー機能（本文／コード／Markdown全体）
- iOS Safari で失敗時は prompt フォールバック

## 4. ページ追加

新規: `src/app/import/page.tsx`

- /import ページを作成
- PasteIngestor を読み込み表示
- シンプルな説明文とUIを配置

## 5. テスト

新規: `src/utils/ingest.test.ts`

- フェンス付きコードの検出
- インデント塊の検出
- UIノイズの除去
- Markdown整形（付録の付与）

## 6. 受け入れ基準

- スマホ/PC 両対応
- 全文ペーストで本文/コード分離が自動で行われる
- UIノイズ（「Copy code」「Open in…」「Regenerate…」等）が本文に混入しない
- フェンス・インデント・シェル行 ($, PS>, #) のコード検出が機能
- 「本文＋付録をMarkdownでコピー」ボタンが動作する（iOS Safari は prompt フォールバック）
- npm run test がグリーン

## 7. コミット/PR

ブランチ名: `feat/mobile-paste-ingest`

コミット粒度:
- `chore(test): add vitest and basic config`
- `feat(ingest): add sanitize/extract/toMarkdown pipeline`
- `feat(ui): add PasteIngestor component and /import page`
- `test(ingest): add unit tests for fences/indent/ui-noise`

PR タイトル:
`feat: モバイル前提の「全部コピペ→整形」β機能`

PR 本文: 動機、仕様、UIスクショ、テスト観点、既知の限界を簡潔に記載

## 8. 備考

- リポは Next.js + TypeScript の App Router 構成。既存コードとの衝突はほぼ無い。
- README は最小構成のままなので、PR後に /import ページの使い方 を追記推奨。

## 9. LP文言およびモデル表記に関する対応

現状のLPには「Googleログインが必要」と「登録不要・すぐ使える」という矛盾した文言が混在している。  
また「GPT-3.5-turbo」が明示されているが、現状の標準から見ると弱い訴求となっている。  「GPT-3.5-turbo」という表記は削除で。

### 対応方針
- 文言を二段階表記に統一する：
  - **未ログイン:** ローカル保存のみ（お試し利用）
  - **ログイン:** クラウド同期・共有機能が有効（β段階の範囲を明示）
- モデル表記は固定せず、「高速（軽量モデル）／高精度（リッチモデル）」という切替可能な設計にアップデートする。

### 実装タスク
- LPコンポーネント（Hero セクション下や「高速処理」ブロック）を修正。
- フッターや法務リンクは維持しつつ、本文に「データ取扱い」の簡易説明図を追加する余地を確保。

---

## 10. ドキュメント整備

- `README.md` に以下を追加する：
  - `/import` ページの使い方（スマホ/PCでの貼り付け例）
  - 「未ログイン／ログイン時の保存範囲」について簡潔に説明
- `DEV_INSTRUCTIONS.md` は本ファイルを随時更新し、最新仕様を一元管理する。

---

## 11. Issues/PR 運用

- 新規 Issue として以下を立てる：
  1. **LP文言統一（ログイン要否）**
  2. **モデル表記アップデート**
  3. **/import 機能実装（本タスク）**
- 各 Issue に対応する PR を分けるとレビューが容易になる。

---

👉 このファイルを `DEV_INSTRUCTIONS.md` としてリポ直下に置いてください。  
Claude Code に「この指示ファイルに従って実装して」と伝えれば、ブランチ作成〜PRまで通せます。  

ご希望なら、私の方で **実際に書き込むコード全文**（ingest.ts, PasteIngestor.tsx, page.tsx, ingest.test.ts）を `.md` に追記する版も作れます。どうしますか？