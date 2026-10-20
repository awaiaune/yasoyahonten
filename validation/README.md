# Square Sandbox / Cloudflare検証環境（未デプロイ）

このディレクトリは承認前の構成案・オフライン検証用。本番設定worker/wrangler.jsoncは変更しない。
既存のdevローカル隔離を維持する。このツールにはdeploy機能を設けていない。

## 分離構成

- Worker: yasoya-payments-validation（本番と別名、Git連携を付けない、専用workers.dev URL）
- D1: yasoya-validation-orders（新規UUID。本番D1のコピー・インポートをしない）
- DO: SandboxPurchaseCoordinator（検証Worker内だけの新規namespace。script_nameによる外部参照を禁止）
- 公開ページ: 同じ検証WorkerのAssets配信。元のHTML/CSSを維持し、配信用コピーだけSDK・設定JSと商品構成をSandboxの3商品に切替
- Square: Sandboxアプリ・テスト販売者・Location・3つのVariationを別途用意。既存サイトの商品ID・980円・送料規則を維持。検証用セイタカアワダチソウの名称は「セイタカアワダチソウ 葉 10g」
- メール: 独立したResendキーとテスト受信者1件。購入者メールもその1件に限定。実顧客データを使わない
- 推奨: 別のCloudflareアカウントか、少なくとも検証リソースに限定した権限を使う。本番のトークン・権限を再利用しない

## 設定の作成・レビュー（ネットワークなし）

manifest.example.jsonを元にmanifest.local.jsonを作り、3つの10g商品のSandbox Variation ID、公開IDと検証用メール情報だけを入れる。アクセストークン・管理者トークンは絶対に含めない。
公開IDが揃った後、リポジトリルートから:

```
node validation/prepare.mjs prepare
node validation/prepare.mjs check
npm --prefix dev test
```

これらはデプロイも実APIアクセスもしない。生成物はすべて.gitignore対象:
- validation/wrangler.local.json: 専用Worker/D1/DO/Assets/varsの完全な設定
- validation/.generated/site: コピーした検証用サイト
- validation/.generated/validation-marker.sql: 新規検証D1にだけ適用するマーカーSQL

設定・コード・テスト結果をユーザーが確認し、対象URL・D1 UUID・Square Location・通知先を明示的に承認するまで、デプロイ・リモートSQL・実APIリクエストを実行しない。デプロイを承認したとしても、本番の設定を使うコマンドや無指定のWrangler操作は禁止。

## 安全チェック

- 設定不足、既知の本番Worker/D1/Location/Variation ID、通常の本番Application ID、本番ドメイン、routes、外部DO参照、未知の設定項目を拒否。
- 実行時もmanifestと各変数を突合。D1のvalidation_environmentに同じinstance_idがなければ業務処理を拒否。マーカーは自動作成しない。
- Sandbox層ではSquare送信先をconnect.squareupsandbox.com/v2/だけに制限。本番のconnect.squareup.comを拒否。
- Secret名を分離: SQUARE_SANDBOX_ACCESS_TOKEN / RESEND_VALIDATION_API_KEY / VALIDATION_ADMIN_TOKEN。
  通常のSQUARE_ACCESS_TOKEN / RESEND_API_KEY / ADMIN_TOKENが存在したら拒否。後者を本番からコピーしない。
- 通知先・購入時メールはmanifestのテスト受信者だけ。cc/bccは禁止。管理者トークンは32文字以上の独立した乱数。
- フロントはSandbox SDKのみ。CSPで本番Square等へのブラウザ接続を許可しない。noindexと検索除外を設定。
- ローカルのLOCAL_SQUARE/LOCAL_RESEND bindingは検証Workerで拒否。実行障害の注入はローカルテストだけに残す。

## 保証の範囲

オフラインでは秘密キーの発行元、リモートD1の実体、ユーザーがDashboardで後から変更した設定は証明できない。専用Secret名と送信先制限で本番への送信を防ぐが、誤って本番トークン文字列をSandbox用Secretに貼ったかどうかは判定できない。
承認後、Sandboxエンドポイントだけに読み取りリクエストしてLocationとカタログを照合する必要がある。認証失敗を理由に本番へ切り替えるフォールバックは作らない。
D1マーカーは二次防御であり、誤った本番DBにマーカーを書いてはならない。リモートSQL前に名前とUUIDを確認する。初回チェックのSELECTも接続になるため、デプロイ設定のUUID照合を先に行う。

今回の状態は「ローカルで安全チェック済み、検証環境の資源・ID・Secret・デプロイ承認待ち」であり、実Sandbox疎通や本番相当の準備完了を意味しない。
