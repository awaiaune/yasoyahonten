# 八草屋本店 Worker v2.0

Square決済とResend注文メールを処理するCloudflare Workerです。

## 同梱内容

```text
worker/
├── src/
│   ├── index.js       決済・メール・API本体
│   └── catalog.js     商品、価格、上限、送料
├── wrangler.jsonc     Cloudflare設定
├── package.json
└── .gitignore

site/js/checkout.js     購入者情報をWorkerへ送る最新版
```

## 現在の商品設定

- レモンバーム 10g：980円、最大10個
- ヨモギ 10g：980円、最大10個
- セイタカアワダチソウ 10g：980円、最大10個
- 送料：350円
- 商品合計3,000円以上：送料無料

## GitHubへ置く場所

既存サイトのリポジトリへ、次のように追加します。

```text
サイトのルート/
├── index.html
├── js/
│   └── checkout.js   ← 同梱版へ置換
└── worker/           ← フォルダごと追加
```

## Cloudflare Workerに必要なSecrets

Cloudflare DashboardのWorkerで、以下をSecretとして登録します。

- `SQUARE_ACCESS_TOKEN`
- `RESEND_API_KEY`

SecretはGitHubや`wrangler.jsonc`へ絶対に書かないでください。

## `wrangler.jsonc`で確認する値

- `SQUARE_ENVIRONMENT`
- `SQUARE_LOCATION_ID`
- `ALLOWED_ORIGINS`
- `RESEND_FROM_EMAIL`
- `ORDER_NOTIFICATION_EMAIL`
- `REPLY_TO_EMAIL`
- `SITE_URL`

Resendで認証したドメインが`send.awaiaune.com`なら、送信元は例えば以下です。

```text
八草屋本店 <order@send.awaiaune.com>
```

## CloudflareとGitHubを連携する設定

Cloudflare Workerの設定画面からGitHubリポジトリを接続します。

- Production branch：サイトで使用しているブランチ（通常`main`）
- Root directory：`worker`
- Build command：空欄でOK
- Deploy command：`npx wrangler deploy`

接続後は、GitHubの`worker/`内を更新してCommitすると、Workerが自動デプロイされます。

## 最初のテスト

1. GitHubへアップロードしてCommit
2. CloudflareのBuildが成功したことを確認
3. `/api/health`を開く
4. `version`が`2.0.0`になっていることを確認
5. Sandboxでテスト購入
6. Square API Logsで`COMPLETED`を確認
7. 管理者メールと購入者メールの両方を確認

## 本番切替

本番へ切り替える際は、SandboxとProductionを混在させないでください。

- `worker/wrangler.jsonc`
  - `SQUARE_ENVIRONMENT`: `production`
  - `SQUARE_LOCATION_ID`: Production Location ID
- Cloudflare Secret
  - `SQUARE_ACCESS_TOKEN`: Production Access Tokenへ上書き
- `js/store-config.js`
  - Production Application ID
  - Production Location ID

本番公開前に、少額の実決済と返金テストを行ってください。
