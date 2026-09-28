# 八草屋本店 注文管理アップデート 初回設定

この版は以下を追加します。
- D1への注文保存
- `/admin/` の発送待ち / 発送済み管理
- 発送方法・追跡番号（任意）
- Resend発送完了メール
- 発送日時保存
- Durable Objectによる購入処理の直列化（残り1点の同時注文対策）

## 必須の初回設定

### 1. Cloudflare D1を1個作成
Cloudflare Dashboard → Storage & databases → D1 → Create database
Database name: `yasoya-orders`

作成後に表示される Database ID をコピーし、`worker/wrangler.jsonc` の
`REPLACE_WITH_D1_DATABASE_ID` と置き換える。

### 2. 管理者トークンをWorker Secretに登録
推測されにくい長いランダム文字列を用意し、WorkerのSecretとして
`ADMIN_TOKEN`
という名前で登録する。

※ ADMIN_TOKENはGitHubに書かない。
※ SQUARE_ACCESS_TOKEN / RESEND_API_KEY と同じくSecret扱い。

### 3. GitHubへ反映して自動デプロイ
既存のRoot directory `worker` / deploy command `npx wrangler deploy` のままでOK。
初回デプロイ時にPurchaseCoordinator Durable Objectが作成される。

### 4. 管理画面
`https://yasoyahonten.awaiaune.com/admin/`
を開き、ADMIN_TOKENを入力。

## テスト
1. `/admin/` が未認証では注文を表示しないことを確認。
2. ADMIN_TOKENでログイン。
3. 本番Visaで1回だけ購入。
4. Square在庫が1回分だけ減る。
5. 注文メールが届く。
6. `/admin/` の「発送待ち」に注文が自動表示される。
7. 発送方法を選び、必要なら追跡番号を入力。
8. 「発送完了メールを送信」。
9. お客様側に発送メールが届く。
10. 注文が「発送済み」に移り、発送日時が残る。

## 既存注文について
D1導入前の注文は自動では登録されません。導入後の新規決済から自動登録されます。
