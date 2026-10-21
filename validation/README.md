# Square Sandbox / Cloudflare検証環境（未デプロイ）

このディレクトリは承認前の構成案・オフライン検証用。本番設定worker/wrangler.jsoncは変更しない。
既存のdevローカル隔離を維持する。このツールにはdeploy機能を設けていない。

## 分離構成

- Worker: yasoya-payments-validation（本番と別名、Git連携なし）。候補URLはvalidation.awaiaune.com。DNS/既存Routes確認と承認までは適用しない。Custom Domain利用時はworkers.devとPreview URLsを無効にする
- D1: yasoya-validation-orders（新規UUID。本番D1のコピー・インポートをしない）
- DO: SandboxPurchaseCoordinator（検証Worker内だけの新規namespace。script_nameによる外部参照を禁止）
- 公開ページ: 同じ検証WorkerのAssets配信。元のHTML/CSSを維持し、配信用コピーだけSDK・設定JSと商品構成をSandboxの3商品に切替
- Square: Sandboxアプリ・テスト販売者・Location・3つのVariationを別途用意。既存サイトの商品ID・980円・送料規則を維持。検証用セイタカアワダチソウの名称は「セイタカアワダチソウ 葉 10g」
- メール: 独立したResendキーとテスト受信者1件。購入者メールもその1件に限定。実顧客データを使わない
- 推奨: 別のCloudflareアカウントか、少なくとも検証リソースに限定した権限を使う。本番のトークン・権限を再利用しない

候補URLとAccess画面の最新入力案・DNS確認条件は [専用ドメインとAccess](../docs/access-validation-domain.md) を優先する。

2026-10-20のユーザー確認でAccessアプリyasoya-payments-validationの作成・Applications一覧登録が完了。ホストはvalidation.awaiaune.com、管理者Gmail 1件だけAllow、セッション1時間。再作成しない。チームドメイン・AUD等の設定反映と実ログイン検証は未完了。DNS・Worker・D1・DOの作成/公開は安全確認と別途承認後。次のAndroid操作は上記手順書を参照。

詳しいAndroid操作順、承認の区切り、チェックリストと停止・復旧手順は [Cloudflare検証環境の準備](../docs/cloudflare-validation-setup.md) を参照。既存のSandbox商品3件・各5個は維持し、再登録・再初期化しない。

検証D1もユーザーから作成完了情報を受領し、UUIDをGit対象外設定へ反映済み。API認証・通信許可がなく実リソースの所属は未照合。[作成済みD1の照合手順](../docs/d1-validation-plan.md)を参照。

送信元validation@send.awaiaune.com、宛先・返信先は管理者1件に確定。新ドメイン・受信箱を作らず、既存認証済みドメインを利用する。最新の生成結果と未完了項目は[公開前レビュー](../docs/validation-predeploy-review.md)を参照。

## 設定の作成・レビュー（ネットワークなし）

manifest.example.jsonを元にmanifest.local.jsonを作り、3つの10g商品のSandbox Variation ID、公開IDと検証用メール情報だけを入れる。アクセストークン・管理者トークンは絶対に含めない。
保存済みの`.generated/square-variations.local.json`と`square-seed.local.json`を保持する。manifestの3 ID・アプリ・Location・商品ソースdigestが対応表と一致しない場合は生成を拒否する。Accessチームドメイン・専用AUD、テスト受信先1件と単一送信元も必要。
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

- 設定不足、既知の本番Worker/D1/Location/Variation ID、通常の本番Application ID、本番ドメイン、許可された検証ホスト以外のroutes、外部DO参照、未知の設定項目を拒否。
- 実行時もmanifestと各変数を突合。D1のvalidation_environmentに同じinstance_idがなければ業務処理を拒否。マーカーは自動作成しない。
- Sandbox層ではSquare送信先をconnect.squareupsandbox.com/v2/だけに制限。本番のconnect.squareup.comを拒否。
- Secret名を分離: SQUARE_SANDBOX_ACCESS_TOKEN / RESEND_VALIDATION_API_KEY / VALIDATION_ADMIN_TOKEN。
  通常のSQUARE_ACCESS_TOKEN / RESEND_API_KEY / ADMIN_TOKENが存在したら拒否。後者を本番からコピーしない。
- 通知先・購入時メールはmanifestのテスト受信者だけ。cc/bccは禁止。管理者トークンは32文字以上の独立した乱数。
- 閲覧はCloudflare Access必須。検証WorkerでもJWTのRS256署名、issuer、AUD、期限、通知先と同じ所有者emailを検証。未認証・偽造・証明書取得失敗はページ/APIとも401で拒否。管理APIはさらに専用Bearerが必要。Preview URLsは無効。
- フロントはSandbox SDKのみ。CSPで本番Square等へのブラウザ接続を許可しない。noindexと検索除外を設定。
- ローカルのLOCAL_SQUARE/LOCAL_RESEND bindingは検証Workerで拒否。実行障害の注入はローカルテストだけに残す。

## 保証の範囲

オフラインでは秘密キーの発行元、リモートD1の実体、ユーザーがDashboardで後から変更した設定は証明できない。専用Secret名と送信先制限で本番への送信を防ぐが、誤って本番トークン文字列をSandbox用Secretに貼ったかどうかは判定できない。
承認後、Sandboxエンドポイントだけに読み取りリクエストしてLocationとカタログを照合する必要がある。認証失敗を理由に本番へ切り替えるフォールバックは作らない。
D1マーカーは二次防御であり、誤った本番DBにマーカーを書いてはならない。リモートSQL前に名前とUUIDを確認する。初回チェックのSELECTも接続になるため、デプロイ設定のUUID照合を先に行う。

Square Sandboxは前段で商品3件と各5個の在庫を確認済み。Cloudflareは「ローカルで安全チェックを準備、資源・公開ID・専用Secret・作成済みAccessとのJWT設定照合・デプロイ承認待ち」。リモート検証環境の準備完了を意味しない。

## D1マーカー保存確認後のデプロイ準備

ユーザーが検証D1でマーカーSQLを実行し、SELECT結果を確認済み。SQL再実行とAccess/D1再作成は不要。HTTP入口に加え、起動済みDOのfetch/Alarmと7業務サービスの直前にもマーカー照合を追加した。不一致・欠落・D1エラーでは業務処理へ進まない。最新の承認段階・Custom DomainによるDNS作成の影響・テスト結果は[公開前レビュー](../docs/validation-predeploy-review.md)を参照。デプロイ・DNS変更・Secrets登録はまだ承認待ち。

Androidの受け渡しは[GitHub検証ブランチからCodespacesへ](../docs/android-codespaces-handoff.md)を参照。GitHub Actionsは使用せず、実値入りローカル設定・対応表はGitへ保存しない。

## 現在の方針: A案の手動公開

既存Cloudflareアカウントを維持し、Codexでレビューした専用設定を段階的に手動デプロイする方針へ確定。GitHub Actions案は使用しない。最新のコマンド・権限の残余リスク・Android代替手順は[手動デプロイ計画](../docs/manual-validation-deploy.md)を優先する。確認済みのAccess/D1/マーカー/DNS/Resendを再確認しない。

## ブランチ経由の保存準備

dev/local-isolationへ承認後に検証コード・テンプレート・テスト・手順書だけを保存する。今回は整理と機密情報チェックまで。ZIP方式は終了。Codespacesでの実設定引き継ぎ、認証、実deployは別段階。
