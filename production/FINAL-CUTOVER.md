# 最終切替手順（2026-10-31更新・未実行・承認待ち）

本番準備ブランチ `production/v53-port-20261031`、基準 `1cc621d`。注文2件はテスト注文だが初回は残す。ordersの削除・初期化はしない。保護は切替直前のTime Travel時点記録＋追加型SQL。バックアップexportは任意であり、Codex認証の再試験は行わない。

## 確定済み（再確認不要）

- Cloudflare Account ID: `fcf37e462257810df77e8fbc0e7f4317`（ユーザーがDashboardで確認した値。CodexからのAPI照合は未実施）。
- GitHub Pages: main/root、独自ドメイン yasoyahonten.awaiaune.com。
- DNS: 同ホストは `CNAME awaiaune.github.io`、DNS only。現時点はGitHub Pages配信。
- Workers Builds: mainで有効、Preview Builds無効、Root=worker、Deploy=`npx wrangler deploy`。
- 購入Worker: yasoya-honten-payments、既存API origin=`https://yasoya-honten-payments.tatsurou3523.workers.dev`（ユーザー確認済み）。Custom Domains/Routesなし、Worker全体のAccessなし。新サイト切替後もこのAPI originを維持する。
- D1 binding ORDERS_DB → yasoya-orders、DO binding PURCHASE_COORDINATOR → PurchaseCoordinator。orders存在・テスト注文2件・Time Travel利用可。
- RUNTIME_TIER/SQUARE_ENVIRONMENT=production、Location=LQ693S4H2NBZ8、API version=2026-07-15、SITE_URL=https://yasoyahonten.awaiaune.com。
- ユーザー確認済みProduction Application ID: `sq0idp-JYrGicMfKr-ILhZeLS9Xsw`。Locationは上記の本番ID。
- ユーザー提示の既存Worker完全Version ID（切戻し候補）: `4ddbd925-2967-4d93-b553-ff4ea4d685a5`。切替直前に別Versionへ変わっていれば記録を更新する。
- Secrets SQUARE_ACCESS_TOKEN / ADMIN_TOKEN とResend設定は存在。値を取得・転記しない。
- MANAGEMENT_ENABLED=0、購入/管理フラグはOFF。本番管理Access・本番画像R2は未確認で、既存ステージング/validationを流用しない。

## 未設定項目と必要な操作（今は実行しない）

| 項目 | 採用案・操作場所 | 設定内容 |
|---|---|---|
| 本番画像R2 | R2 Object Storage → Create bucket | `yasoya-honten-product-images`、公開アクセス無効。購入Workerのbinding=`PRODUCT_IMAGES`。設定ファイルの名前は作成案で、実在確認を意味しない |
| 管理用Access | Zero Trust → Access → Applications → Add application → Self-hosted | 名前=`yasoya-honten-admin`、ホスト=`admin.awaiaune.com`、全パス、Allowは承認管理者のメールのみ。Bypass/Everyoneは使わない。ホストの既存用途があれば作成前に停止 |
| 管理用Worker | Workers & Pages → 新規Worker | `yasoya-honten-admin`、Service binding `PAYMENTS_SERVICE` → `yasoya-honten-payments`。workers.dev/Preview URL無効。公開時にCustom Domain=`admin.awaiaune.com`。先に上のAccessを用意する |
| Access環境変数 | 両Worker → Settings → Variables and Secrets | `PRODUCTION_ADMIN_ORIGIN=https://admin.awaiaune.com`、`PRODUCTION_ACCESS_TEAM_DOMAIN`=本番AccessのTeam Domain、`PRODUCTION_ACCESS_AUDIENCE`=新アプリAUD、`PRODUCTION_ADMIN_EMAIL`=許可メール。ステージングAUDは使わない |
| Square App ID（確認済み） | 購入Worker → Settings → Variables and Secrets | 上記の確認済みApp IDを`SQUARE_PRODUCTION_APPLICATION_ID`へ設定。LocationはLQ693S4H2NBZ8を維持。App IDはSecretではない |
| 管理用Square Secret | 購入Worker → Settings → Variables and Secrets → Secret | コードは`PRODUCTION_MANAGEMENT_SQUARE_TOKEN`を参照する。未登録ならProduction管理用トークンを安全なSecret入力で登録。既存`SQUARE_ACCESS_TOKEN`は上書きしない。値はチャット/コード/ログへ出さない |
| 公開ドメイン | 購入Worker → Settings → Domains & Routes → Custom Domain | 最後に`yasoyahonten.awaiaune.com`を割当てる。既存CNAMEが競合する場合だけDNS画面で既知CNAMEを削除して直ちに追加。Worker用DNSはCloudflareに管理させ、手動CNAME先を推測しない。Accessはこのホスト/購入APIへ適用しない |

管理WorkerはAccess JWTを検証し、購入Workerも管理APIで同じ署名/AUD/メールを再検証する。さらに既存ADMIN_TOKENでログインする。公開ホストやworkers.devからの管理API直アクセスは拒否。購入APIにはAccessログインを要求しない。

初期の商品画像は既存レモンバーム/よもぎの静的写真を使える。ステージングR2の6オブジェクトやSandbox商品DBを丸ごと移さない。追加画像は本番管理画面から個別アップロードし、非公開R2からWorker経由で配信する。既存Square画像IDはローカル画像未登録を理由に削除しない。

## まだ必要な非秘密情報（同じ画面の既知項目は不要）

- Account ID・既存workers.dev URL・完全Version IDは上記のユーザー提示値を採用済みで、再確認は不要。
- コード照合済み: 準備ブランチとローカル保存済みorigin/mainの`worker/wrangler.jsonc`は、D1名`yasoya-orders`・binding `ORDERS_DB`・ID `442fa9fd-25d3-4c01-bcc3-04be7b420cf5`、DO binding `PURCHASE_COORDINATOR`・class `PurchaseCoordinator`で一致。新しい公開entrypointも同じclassを再exportする。これは稼働設定の取得結果ではない。
- DO実設定はユーザーがCloudflareで確認済み: namespace `yasoya-honten-payments_PurchaseCoordinator`、class `PurchaseCoordinator`、namespace ID `6802cc5abc6d440285ec19c9e7c82103`、Bound Worker `yasoya-honten-payments`。移行入力/検証コードと一致。CodexによるAPI取得結果ではない。Wranglerの既存DO bindingは同Workerのclassを指定しnamespace IDを直接指定しないため、同じWorker名/class/bindingを維持し、namespace再作成・削除・再初期化は行わない。
- D1のOverviewでIDが設定案 `442fa9fd-25d3-4c01-bcc3-04be7b420cf5` と一致するかだけ確認。
- DOのnamespace名・ID・class・Bound Workerは上記の確認済み値を採用し、同じ画面の再確認は不要。
- migration tagはコードの`v1-purchase-coordinator`、固定Object名は`yasoya-honten-global-purchase-lock`を維持。実migration履歴は未確認のまま明記し、それだけを理由にData Studioを繰り返さない。class改名・追加migration・初期化はしない。
- 新AccessのTeam Domain/AUD/許可メール。Production App ID・Locationの再確認は不要。Secret値は不要。

## 設定ファイル・追加SQL

1. `production/v53.candidate.jsonc` は既存購入Worker向けの**未完成テンプレート**。REPLACEや未作成リソース名を含む間はデプロイしない。
2. 上の実値をGit対象外の `production/dashboard.local.json` に入力する。形式は `dashboard-input.example.json`。Preview無効は反映済み、Workers Buildsは現況どおり有効として記録済み。R2/Access作成済みなどの真偽値を先にtrueにしない。
3. オフラインで `node production/prepare-v53.mjs`、`node production/prepare-admin.mjs`、`node production/prepare-release.mjs production/dashboard.local.json` を実行。
4. `production/release/` にbootstrap/ready/admin設定、additive.sql、Console用all.sql/番号順分割SQL、manifest、旧checkout停止版が生成される。同じmanifestのinstance UUIDは再生成でも維持する。SQLは `worker/migrations-production/0001_management.sql` → `0002_management_supervision.sql` → Production専用marker挿入。orders更新/削除や在庫初期化は含まない。既存管理テーブルがあれば再適用せず差分確認。
5. 生成した管理設定のCustom Domainも手動追加とし、設定の初回デプロイではDNSを変えない。Access変数は両WorkerのDashboardに設定し`keep_vars=true`で保持。Secretは一切設定ファイルへ含めない。Resendのメール変数も候補設定から除外し、現行Dashboard値を保持する。
6. 非秘密の生成設定/SQLのみをレビューPR対象にする。**この準備ブランチ全体をmainにmergeしない。** Pagesを壊さないようroot HTML/旧checkout/公開用JSを先行でv53へ置換しない。必要なWorker・production・依存コードとv53原本の`staging/site/`、`staging/prepare.mjs`、共有管理JS/CSSも選別し、旧checkout変更は停止スクリプト読込だけに限定する。

### 正式な主要フラグ名（コード照合済み）

- 常時停止: `PRODUCTION_CHECKOUT_ENABLED=0`（再開は別承認）。
- bootstrap: `MANAGEMENT_ENABLED=1`、`PRODUCTION_MANAGEMENT_SCHEMA_READY=1`、`PRODUCTION_MANAGEMENT_READ_ENABLED=1`、`PRODUCTION_MANAGEMENT_DRAFT_ENABLED=1`、`PRODUCTION_MANAGEMENT_IMAGES_ENABLED=1`。`PRODUCTION_MANAGEMENT_CATALOG_ENABLED=0`、`PRODUCTION_MANAGEMENT_INVENTORY_ENABLED=0`、`MANAGEMENT_STOCK_WRITES=disabled`。
- ready: 上に加え`PRODUCTION_STOREFRONT_ENABLED=1`、`PRODUCTION_STOREFRONT_PUBLISH_ENABLED=1`、`PRODUCTION_MANAGED_CHECKOUT_ENABLED=1`、`PRODUCTION_UNIFIED_PUBLISH_ENABLED=1`、`STOREFRONT_FEATURED_ENABLED=1`、`STOREFRONT_RETIRE_GOLDENROD=1`。Catalog/Inventoryの許可設定は生成コードに明記し最終レビュー対象とする。managed checkout有効と新規決済受付ONは別設定。

## 承認後の具体的な実行順序

1. **自動反映を止める**: 購入Worker → Settings → BuildsでDisable builds=ON（Previewは既にOFFのまま）。main更新前に行う。GitHub Pagesにはこの停止は効かないため、上記の選別PRと旧画面保護が必須。新管理Workerもmain自動反映に任せず承認したコミットを明示的に公開する。
2. **準備リソースと受付停止**: 上の本番専用R2・Access・管理Worker・変数/Secretを設定。購入Workerの`PRODUCTION_CHECKOUT_ENABLED=0`を維持し、旧checkoutへ停止表示を適用する。受付済み決済の状態照会/復旧は旧API originで維持し、未確定決済を再送しない。
3. **D1追加**: D1 yasoya-ordersのTime Travelで直前日時（タイムゾーン付き）/bookmarkが表示されれば記録。Restoreは押さない。同DBのConsoleにレビュー済み追加SQLを番号順で適用する。エラー時は停止し、DROPや全初期化で解決しない。
4. **準備バックエンド公開**: 選別PRを承認後mainへ反映。Root=worker、Build command=`node ../production/prepare-v53.mjs`、Deploy command=`npx wrangler@4.155.0 deploy --config ../production/release/bootstrap.jsonc`。意図したSHAに対し明示的にBuildを1回起動する。再有効化だけで過去コミットが起動するとは仮定しない。keep_varsは非秘密変数を保持するが、configに明記したフラグはconfig値が優先する。既存Secretは再登録/上書きしない。
5. **管理画面公開**: 管理WorkerのビルドはRoot=workerなら `node ../production/prepare-admin.mjs`、Deployは `npx wrangler@4.155.0 deploy --config ../production/release/admin.jsonc`。Access保護を用意したadmin.awaiaune.comをこのWorkerのCustom Domainに追加する。ログイン/閲覧を確認。
6. **商品関連付け**: `existing-products.json`の4商品のID/SKUを読取照合してD1へ関連付け。継続2商品は980円/JPY/既存Item・Variation・SKUを維持しサイト公開、終了2商品はD1 archived。Squareの商品削除/在庫上書きはしない。トップ掲載は1=レモンバーム、2=よもぎ、3=空欄。初期取込にSquareへの更新は不要。
7. **新サイト有効化**: ready設定で同Workerを公開。購入受付0は維持。readyは管理Catalog/Inventory書込み権限も有効にするため、その権限有効化も最終承認に含める（実際のSquare更新は別途内容確認して行う）。公開内容・既存商品リンク・終了商品の直URL/旧カート拒否を確認後、公開ホストをCustom Domainへ切替。現在のDNS onlyのまま通常Worker Routeを追加する方式は採用しない。動的トップ/SHOP/商品詳細はWorker+D1から配信し、商品追加時のGit pushは不要。
8. **購入は別承認**: 実カードテスト/一般購入受付再開は別承認。承認後に購入フラグを1へ変更し、980円商品1点（送料は画面の現行ルール込み）を1回だけ決済。1決済/1注文/在庫1減を確認する。結果不明なら同じattemptIdで状態照会し、別注文として再決済しない。返金は自動で行わない。

公開後の自動反映は、固定Wrangler/本番設定を指定したBuild commandを保持し、承認した時点で再有効化する。Pages設定は移行中残すが、DNS切替後の正規ホストはWorker配信になる。main更新からPagesへのビルドが起きても正規ホストの動的商品には使わない。

## 購入停止の影響・切戻し

- 旧画面でカードを入力済みでも、新規送信は受け付けない。受付済み決済の状態確認・記録・在庫反映は止めない。停止は返金や注文削除を意味しない。
- 不具合時は購入OFFを維持し、Workerを記録した完全Versionへ戻す。公開Custom Domainを解除して旧`CNAME awaiaune.github.io`/DNS onlyへ戻し、対応する旧Pages画面を使う。新管理画面は閉じる。Workerと画面を別々の世代で購入再開しない。
- 追加D1テーブルと既存DO namespace/class/Object名は保持。Time Travel復元は新規管理データ等も巻き戻すため自動実行しない。Square変更・実決済はWorkerのVersion切戻しでは戻らず、個別照合が必要。この切替では商品の再作成/在庫上書きを行わない。

## 判定

既存126件のローカル検証とステージング実機結果を再利用する。今回変更した構成生成11件成功・失敗0（新規1件を含む）。管理UIのオフライン梱包も成功。本番の現在値に未確認があり、本番専用R2/Accessは未作成なので、最終配備設定はまだ生成・実行しない。上記不足を埋めた実設定/SQL/対象SHAを提示し、最終承認後にのみ実行する。
