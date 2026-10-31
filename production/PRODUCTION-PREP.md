# Production v53 移植（未デプロイ）

基準: 検証済み `6dfe0db`。専用ブランチ `production/v53-port-20261031`。
ユーザー確認: 本番D1は orders のみ、既存注文2件、Time Travel利用可能。実DDLの全列確認・実データのSQL export/復元は未完了。

## 保持するもの

- Worker `yasoya-honten-payments` / D1 `yasoya-orders` (`442fa9fd-25d3-4c01-bcc3-04be7b420cf5`)
- `PurchaseCoordinator`、既存migration tag、namespace、固定Object名、購入台帳/冪等性/在庫保留
- `SQUARE_ACCESS_TOKEN`、`ADMIN_TOKEN`、`RESEND_API_KEY`。値を取得/コピーしない
- 既存注文2件はテスト注文で完全保全は必須ではない。初回は残し、商品参照・Square履歴を無条件初期化しない
- `production/existing-products.json` の4 Item/Variation/SKU。継続はレモンバーム・よもぎ、終了2商品も対応表/注文参照を残す

worker/wrangler.jsonc はGitHub main c32234dの安全設定を復元した。main/stagingのブランチ/作業ツリーを変更していない。新規entrypointはcandidate設定からだけ参照し、既存Build経路を変更しない。

## 配信・認証境界

- 公開Worker: `production/storefront-worker.js`。Productionのidentityを必須にし、Sandboxキー混入を拒否。公開サイトにはAccessを要求しない。
- 管理画面: 既存 `production/admin-worker.js` を別のAccess保護ドメインで使用。PAYMENTS_SERVICEで同じ購入Workerへ転送。公開ドメイン経由の管理APIは403。既存ADMIN_TOKENとAccess署名・管理者メール・Originを検証。
- v53 SSRをshared moduleへ移動し、ステージングも同じ描画関数を再利用。Production用ビルドはProduction SDK/公開robotsを使用。管理画面はnoindex維持。
- `node production/prepare-v53.mjs` はローカルファイルの生成のみ。デプロイしない。
- `production/v53.candidate.jsonc` は未確定値があるレビュー用。受付・管理・新公開機能は初期値OFF。既存D1/DOをそのまま参照し、ステージングresourceを使わない。
- GitHub Pagesへ静的HTMLだけをmergeしてもD1の動的掲載は動かない。公開Workerへの実ルーティング切替は別承認。main更新でPages/Workers Buildsが動くため、準備ブランチは自動Buildを確認するまでpushしない。

## 移植した管理処理

- 下書きはD1だけに保存。既存公開版と分離し、統合公開中でも下書き編集は外部作用を持たない。
- `PRODUCTION_UNIFIED_PUBLISH_ENABLED=1` と `PRODUCTION_STOREFRONT_PUBLISH_ENABLED=1` により、既存のproduction catalog権限の範囲でのみ統合公開を有効化。
- 同じ永続job/固定request/idempotencyを使用。Square確認後に対応表・成功証跡・公開revision・ロック解除を同じD1 batchで確定。未知の結果は新しいキーで再送しない。
- 既存商品の初回購入は、実読取照合したproduction mapping（SKU/instance/verified_at込み）で検証可能。Sandbox用の架空ジョブは作らない。
- バージョン差や説明/画像だけの差は、重要なID/SKU/価格/販売設定を確認できれば購入を止めない。価格不一致・SKU不一致・バージョン後退・証拠不足は停止。
- 過去の商品の対応付けは `save → link → site`（Square書込なし）を初期移行だけで利用する。通常運用UIは「下書き保存」「公開する」。
- `STOREFRONT_RETIRE_GOLDENROD=1` で2商品を販売導線・旧カート・新規購入から除外。旧URLは410。Square削除/在庫ゼロ化はしない。
- `STOREFRONT_FEATURED_ENABLED=1` で既存mg_audit/mg_commandsにトップ掲載を最大3件保存。停止時に掲載設定も同時に整理。

## 追加型D1準備

1. 切替直前のTime Travel復元対象時点を記録し、ordersの列・制約を現行コードの期待DDLと照合する。テーブル名/2件という情報だけでDDL完全一致とは判断しない。
2. `production/schema-review.mjs` が既存mg_*との衝突を拒否する。既存注文をALTER/DROP/UPDATEしない。
3. `node production/prepare-migration.mjs --prepare` はレビュー用SQLと専用instance UUIDを生成するだけ。実行しない。
4. 原本 `worker/migrations-production/0001_management.sql` → `0002_management_supervision.sql`、続いてproduction_environment markerの追加。生成instance UUIDと最終Worker設定を一致させる。
5. 本番mg_mappingsはproduction制約とSKU/instance/verified_at列を持つ。Sandbox D1ダンプ・staging markerは使わない。
6. 4商品を既存Variation IDで読取照合して関連付け。終了2商品はD1でarchived、継続2商品は既存slug/980 JPYを保持。現在在庫を取得できない場合0で初期化しない。

## 実バックアップ経路（未実行）

CodexのSecretプロキシを変更したり直接通信で迂回しない。ユーザー管理の手元端末/Codespaces等の認証済み環境を使う。

1. Node/npx、Python 3、SQLiteと通常のWranglerログインがある端末を使う。必要なら端末上で `npx wrangler@4.155.0 login` を行う。Tokenをコード/チャット/GitHubへ貼らない。Codexのプレースホルダーを端末へコピーしない。
2. レビュー済み `production/backup-production-d1.sh` を端末に保存し `bash production/backup-production-d1.sh` を実行する（リポジトリを用意せずスクリプト単体をダウンロードして実行してもよい）。
3. 対象DB名/IDをread-only一覧で確認し、全ユーザーテーブルのpre-read → 公式 `wrangler d1 export --remote` → 隔離SQLite復元 → integrity/FK → 全件数と注文/商品IDのpost-read比較を行う。
4. `~/.local/state/yasoya-production-backups/<UTC>/` に0700/0600で保存。SQL/SQLiteはGit配下を拒否。debugログは破棄。共有は `backup-verification.json` だけ。
5. 更新がexport中にあればverifiedとせず要照合。SQL全体exportは任意の追加保護。採用済み簡素化方針ではTime Travel記録と追加型移行を必須とする。

## 本番で未確定・禁止中

- Time Travel切替直前記録、最新Worker全設定/Active Version、DO保留/実migration、Webhooks、現在在庫/Location
- Production App ID、Access設定、既存/新規の本番画像R2名、DNS/公開ルートと切替方法
- 候補設定の最終照合、Wrangler 4.155.0の実Build確認（package/lockで固定済み）、全機能フラグの段階有効化
- 実カードの最小1決済は別承認。既存注文を保持して決済1件・注文1件・在庫1減を確認する。応答不明なら同じattemptIdを照会し新規決済を重ねない。

Time Travel切替直前記録・設定確定と明示承認まではデプロイ、スキーマ適用、mainへのmerge/push、ルート切替、Square実操作を行わない。

## 有効化フラグ（後日の承認・設定照合後のみ）

- 管理: MANAGEMENT_ENABLED / PRODUCTION_MANAGEMENT_SCHEMA_READY / READ_ENABLED / DRAFT_ENABLED / IMAGES_ENABLED。READ等はPRODUCTION_MANAGEMENT_接頭辞。
- 統合公開: PRODUCTION_MANAGEMENT_CATALOG_ENABLED、PRODUCTION_UNIFIED_PUBLISH_ENABLED、PRODUCTION_STOREFRONT_ENABLED、PRODUCTION_STOREFRONT_PUBLISH_ENABLED、PRODUCTION_MANAGED_CHECKOUT_ENABLEDを1。
- 商品公開権限の承認値: PRODUCTION_CATALOG_CUTOVER_APPROVAL=verified-storefront-and-pricing-v1。candidateはNOT_APPROVED。
- 在庫管理は別に PRODUCTION_MANAGEMENT_INVENTORY_ENABLED=1 / MANAGEMENT_STOCK_WRITES=single-writer / PRODUCTION_INVENTORY_WRITER_APPROVAL=shared-purchase-do-single-writer-v1 が必要。candidateはOFF/disabled/NOT_APPROVED。
- 新規決済受付 PRODUCTION_CHECKOUT_ENABLED は、Time Travel記録と切替・受入承認まで0を維持。管理公開や在庫権限とは分離。
- 管理用Square SecretはPRODUCTION_MANAGEMENT_SQUARE_TOKENがあれば優先し、未登録なら購入用の既存SQUARE_ACCESS_TOKENをサーバー側で再利用する。追加Secretは必須ではない。実トークンのCatalog/Inventory権限は本番受入時に別途確認する。実トークン値は設定ファイルに書かない。管理Accessと既存ADMIN_TOKENも継続。

既存画像の保護: 初回関連付けでD1/R2写真が未登録でも、レモンバーム/よもぎは既存の同名静的写真を表示する。D1画像0件の既存商品公開ではSquare既存image_idsを保持し、初期移行で空配列による上書きをしない。写真を全て削除する操作はこの保護と区別して別途設計する。

## ローカル検証結果

126件成功・失敗0。Production相当の全APIはオフライン代替で、本番/Sandboxへの実通信・実決済は行っていない。

- ordersのみのDBと架空の発送済み2件を作成し、追加型移行の前後で全列・全値を比較して一致
- 既存4 Item/Variation/SKUの読取関連付け、既知SKU不一致拒否、終了2商品の参照/在庫保持
- 下書き/公開分離、同一ID更新、公開前照合、既存Square画像の保護
- Square応答消失・D1保存失敗から同じjobを再開し重複upsertなし
- 最大3件の掲載設定、停止・再開、旧URL/旧カート購入拒否
- 入庫後・バージョン更新後の購入、1決済/1注文/在庫1減とリプレイ、既存2注文の保持
- Production SDK/CSP/カードattachのブラウザ検証、Sandbox credential混入と誤DB拒否
- 既存本番管理/購入/監視とステージングの回帰

再現手順: `npm --prefix dev ci` → `node production/prepare-v53.mjs` → 以下。

```sh
node --test --test-concurrency=2 \
 dev/production-v53.test.mjs dev/production-migration-plan.test.mjs \
 dev/production-management.test.mjs dev/management.test.mjs \
 dev/management-supervision.test.mjs dev/staging-release.test.mjs \
 dev/staging-featured.test.mjs dev/staging-v53.test.mjs \
 dev/staging-sync.test.mjs dev/production-checkout.browser.mjs \
 dev/production-release-ready.test.mjs dev/production-pause.browser.mjs
```

実DDLの全列は未受領のため、orders列定義は現行購入WorkerのCREATE TABLEから再現した。切替前に実DDLと照合する。SQLバックアップは任意の追加保護。Time Travel・既存注文2件のユーザー確認を、実SQLダンプの復元成功と読み替えない。

最新の簡素化方針・スマートフォン確認表・実行順序は `FINAL-CUTOVER.md` を正とする。
