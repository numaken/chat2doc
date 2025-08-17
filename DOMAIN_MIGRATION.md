# 独自ドメイン移行ガイド

## 移行先
- 現在: `chat2doc-beryl.vercel.app`
- 移行後: `chat2doc.panolabollc.com`

## 手順

### 1. DNS設定（Panolabo LLC側）
DNSプロバイダーで以下のいずれかを設定：

**オプションA: CNAME設定（推奨）**
```
Type: CNAME
Name: chat2doc
Value: cname.vercel-dns.com
TTL: 3600
```

**オプションB: Aレコード設定**
```
Type: A
Name: chat2doc
Value: 76.76.21.21
TTL: 3600
```

### 2. Vercel設定
1. [Vercel Dashboard](https://vercel.com/dashboard)にログイン
2. `chat2doc`プロジェクトを選択
3. Settings → Domains
4. Add Domain → `chat2doc.panolabollc.com`を入力
5. Verifyボタンをクリック

### 3. 環境変数の更新（Vercel管理画面）

Settings → Environment Variables で以下を更新：

```bash
# 本番環境
NEXTAUTH_URL=https://chat2doc.panolabollc.com

# Google OAuth（Google Cloud Console側も更新必要）
# 承認済みのリダイレクトURI:
# https://chat2doc.panolabollc.com/api/auth/callback/google

# Stripe Webhook（Stripe Dashboard側も更新必要）
# Webhook Endpoint URL:
# https://chat2doc.panolabollc.com/api/webhook/stripe
```

### 4. Google OAuth設定の更新
[Google Cloud Console](https://console.cloud.google.com/)で：
1. 該当プロジェクトを選択
2. APIs & Services → Credentials
3. OAuth 2.0 Client IDを編集
4. Authorized redirect URIsに追加：
   - `https://chat2doc.panolabollc.com/api/auth/callback/google`
5. Authorized JavaScript originsに追加：
   - `https://chat2doc.panolabollc.com`

### 5. Stripe設定の更新
[Stripe Dashboard](https://dashboard.stripe.com/)で：
1. Developers → Webhooks
2. 既存のWebhookエンドポイントを編集
3. Endpoint URLを更新：
   - `https://chat2doc.panolabollc.com/api/webhook/stripe`

## 影響範囲

### ✅ 影響なし
- フロントエンドコード（相対パス使用）
- APIルート（相対パス使用）
- 内部リンク（相対パス使用）

### ⚠️ 要確認・更新
1. **NextAuth設定**
   - `NEXTAUTH_URL`環境変数

2. **外部サービス連携**
   - Google OAuth リダイレクトURI
   - Stripe Webhook URL
   - その他の外部API（ある場合）

3. **SEO/メタデータ**
   - サイトマップ（ある場合）
   - canonical URL（設定している場合）
   - OGP/メタタグ（絶対URL使用の場合）

4. **メール通知**
   - メール内のリンク（ある場合）

5. **CORS設定**
   - API側でCORS設定している場合

## 移行スケジュール案

### Phase 1: 準備（移行前）
- [ ] DNS設定の準備
- [ ] Vercelでドメイン追加
- [ ] SSL証明書の確認

### Phase 2: 設定更新（移行当日）
- [ ] 環境変数更新
- [ ] Google OAuth設定更新
- [ ] Stripe Webhook更新

### Phase 3: 確認（移行後）
- [ ] ログイン機能テスト
- [ ] 決済機能テスト
- [ ] API疎通確認
- [ ] SSL証明書確認

## リスクと対策

### リスク
1. **一時的なサービス停止**
   - DNS伝播に最大48時間かかる可能性
   - 対策: 両ドメインを並行運用

2. **認証エラー**
   - OAuth設定の不整合
   - 対策: 事前に両方のURLを登録

3. **決済Webhook失敗**
   - Stripe側の設定遅れ
   - 対策: 両URLでWebhook受信設定

## ロールバック手順
問題発生時は以下の手順で元に戻す：

1. Vercelでカスタムドメインを削除
2. 環境変数を元に戻す
3. 外部サービスの設定を元に戻す

## 完了チェックリスト
- [ ] https://chat2doc.panolabollc.com でアクセス可能
- [ ] SSL証明書が有効（緑の鍵マーク）
- [ ] Googleログイン成功
- [ ] Stripe決済フロー動作確認
- [ ] API呼び出し正常動作
- [ ] 旧URLからのリダイレクト設定（必要に応じて）