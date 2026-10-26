# Sandbox管理書き込みモード

対象は dev/local-isolation と yasoya-payments-validation のみ。この手順の準備・テストはローカルで完結し、実デプロイや実Square書き込みを自動実行しない。

## モードと認可

通常の prepare/check は従来どおり READ_ONLY。管理書き込みは明示的な prepare-write/check-write のみで生成する。ブラウザーからモードや承認値を変更できない。

生成するサーバー設定:

```text
SQUARE_ACCESS_MODE=SANDBOX_MANAGEMENT
VALIDATION_MANAGEMENT_WRITE_APPROVAL=sandbox-management-single-writer-v1
MANAGEMENT_ENABLED=1
MANAGEMENT_STOCK_WRITES=single-writer
MANAGEMENT_CHECKOUT_PAUSED=1
VALIDATION_CHECKOUT_ENABLED=0
VALIDATION_MAIL_ENABLED=0
VALIDATION_CRON_ENABLED=0
```

承認文字列はSecretではなく、単一書き込み経路の運用を了承したことを示す固定値。これだけでは認可にならない。Access JWT、既存管理トークン、Origin、検証D1識別マーカー、Sandbox専用環境、既存3商品のItem/Variation/SKU対応表が必要。設定の欠落・矛盾・不正値では停止する。

Squareの接続先は https://connect.squareupsandbox.com のみ。リダイレクト追従なし。外部送信直前にも許可APIを検証し、書き込みは POST /v2/catalog/batch-upsert、POST /v2/catalog/images、POST /v2/inventory/changes/batch-create に限定。管理在庫は対象Locationの IN_STOCK の PHYSICAL_COUNT のみ。書き込み前に GET /v2/locations で設定済みLocationの ACTIVE / JP / JPY を照合する。Catalogも対象Location以外へ公開しない。Payments・Refunds・Ordersの書き込みは拒否する。

既存Secretは SQUARE_SANDBOX_ACCESS_TOKEN と VALIDATION_ADMIN_TOKEN を使用。一般名 SQUARE_ACCESS_TOKEN、RESEND_API_KEY、ADMIN_TOKEN やCloudflareデプロイトークンをWorkerへ登録しない。メール停止中はResendキーの追加不要。APIトークンの値をコマンド引数・ファイル・ログ・Gitへ出さない。Squareで必要となる権限は MERCHANT_PROFILE_READ、ITEMS_READ、ITEMS_WRITE、INVENTORY_READ、INVENTORY_WRITE。決済権限はこの機能に不要。

## データと同期

- 商品名・説明・価格・内容量・購入上限・写真順は検証D1の下書きリビジョンへ保存する。画像本体は検証R2。購入上限はD1とサーバー側購入検証の値であり、Squareの独自販売チャネルへ購入上限を設定する機能ではない。
- 公開は保存済みリビジョンをジョブ化し、画像→Catalog→結果検証→対応表と公開版のD1トランザクションの順で行う。Square同期完了まで新しい公開版へ切り替えない。下書き保存だけではSquareを書き換えない。
- 既存SKU・Item・Variation IDを維持する。新規SKUはCatalog一覧を全ページ確認し、同名SKUがあれば新規作成せずreviewへ。外部追加の未管理Variationを含む既存Itemも、削除・上書きせずreviewへ進める。
- 画像は同じ画像IDから固定の冪等性キーを作る。Catalog/在庫も同じ操作ID・保存済み本文・時刻で再試行する。応答消失後に新しい操作IDへ切り替えない。
- 在庫の正本はSquare。入庫は実在庫に加算した最終数量、棚卸しは指定した最終数量を固定し、冪等なPHYSICAL_COUNTを送る。古い表示や送信前の数量変化は拒否。結果検証前は該当Variationを保留し、他の商品は継続する。
- 競合や安全な再試行期限超過はreviewへ。履歴・同期状態・手動の再試行/照合は既存管理画面を使用する。新規Itemの応答が失われ、安全な同じキーでの再試行期限も過ぎた場合、Item ID不明のため自動照合できないことがある。SKUとSquare履歴を手動照合し、重複作成しない。
- Alarmは管理ジョブだけ復旧する。既存購入のAlarm・status/recoverは決済/在庫減算を再開しない。既存注文台帳・固定キー・在庫保留は維持する。メール・Cronは動かさない。メール停止中の通知行だけで短周期Alarmを繰り返さない。

## ローカル検証・反映の最短手順

実装のGitHub保存・検証Workerへの反映は別途承認後に行う。まず最新コードと既存のGit対象外入力3点（manifest、seed公開設定、生成済みSquare対応表）がそろったCodespacesで、リポジトリ直下から実行する。

```bash
node validation/prepare.mjs prepare
node validation/prepare.mjs check
node validation/prepare-management.mjs prepare-write
node validation/prepare-management.mjs check-write
npm --prefix dev test
npm --prefix dev run test:ui
WRANGLER_SEND_METRICS=false ./worker/node_modules/.bin/wrangler deploy --config validation/wrangler-management.local.json --dry-run --outdir /tmp/yasoya-management-write-review
```

generatedディレクトリ・ローカルJSON・SecretはGitへ追加しない。生成された識別マーカーSQLは適用しない。既存0001/0002適用済み環境には新たなマイグレーションは不要。テストはメモリ内D1/R2/DOとSquare代替APIだけを使用する。

dry-runの名前・D1 UUID・専用R2・DO・Assets、Access用ホスト、workers.dev/Preview無効、ログ有効/Issues無効、上記停止フラグを確認する。Cloudflare側との想定外の差分がある場合は停止する。dry-runでは実Secret・実バインディング・実API権限までは検証できない。

別途デプロイ承認後だけ、上の deploy コマンドから --dry-run と --outdir を外して同じ検証用設定を適用する。mainや本番用packageのdeployスクリプトを使わない。DNS/TLSや有料契約の変更が伴う場合はその操作を個別確認する。

Androidでは https://validation.awaiaune.com/admin/ をAccess認証→管理ログインの順で開く。商品画面の取得元と「Sandbox管理書込／購入停止」を確認する。まず専用の新規テスト商品を下書き保存→公開し、同期完了・写真保持・Square側IDを照合する。在庫画面で最新数量を取得し、入庫→棚卸しを各1回行う。この実書き込み試験も別途承認後とし、既存3商品の在庫を5へ再初期化しない。

## 停止・復旧と残る制限

在庫操作中は、同じSandbox Location/VariationをSquare Dashboard・他アプリ・POSから変更しない。Square Inventory APIに比較交換/CASの保証はなく、直前照合と送信の間の外部変更を完全には排除できない。単一書き込み経路が保証できない場合は READ_ONLY に戻し、在庫書き込みを停止する。

問題発生時は既存ジョブID・本文・結果・対応表・ロックを保持する。データ削除、在庫再初期化、DOリセット、古い安全機構のないWorkerへのロールバックはしない。READ_ONLYへ戻すときは prepare/check で設定を再生成して別途承認後に適用する。適用だけでは既に送信中の外部要求を取り消せないので、その結果を先に照合する。

Cron停止中の無人復旧はDO Alarmが利用できる場合に限る。Alarm予約自体が失敗し、以後アクセスもない場合の独立監視は動かない。次回DO起動や管理操作・再試行で検出するまで保留が残る可能性がある。管理者通知は画面内のみで実メールは送らない。

本番API接続は行わず、実Squareの書き込み応答・画像受付・実DO再起動/Alarm・Cloudflare/R2権限・Android実機での最終確認は未検証。ローカルテスト成功を実環境成功とは扱わない。
