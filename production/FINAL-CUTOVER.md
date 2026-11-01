# 最終切替手順（2026-11-01更新・未実行・承認待ち）

本番準備ブランチ `production/v53-port-20261031`、基準 `1cc621d`。注文2件はテスト注文だが初回は残す。ordersの削除・初期化はしない。保護は切替直前のTime Travel時点記録＋追加型SQL。バックアップexportは任意であり、Codex認証の再試験は行わない。

## 確定済み（再確認不要）

- Cloudflare Account ID: `fcf37e462257810df77e8fbc0e7f4317`（ユーザーがDashboardで確認した値。CodexからのAPI照合は未実施）。
- GitHub Pages: main/root、独自ドメイン yasoyahonten.awaiaune.com。
- DNS: 同ホストは `CNAME awaiaune.github.io`、DNS only。現時点はGitHub Pages配信。
- Workers Builds: main連携、**Disable builds=ONをユーザー確認済み**。Preview Builds無効、Root=worker、現行Deploy=`npx wrangler deploy`。停止設定は維持する。
- 購入Worker: yasoya-honten-payments、既存API origin=`https://yasoya-honten-payments.tatsurou3523.workers.dev`（ユーザー確認済み）。Custom Domains/Routesなし、Worker全体のAccessなし。新サイト切替後もこのAPI originを維持する。
- D1実設定はユーザーがCloudflareで確認済み: `ORDERS_DB` → `yasoya-orders`、Database ID=`442fa9fd-25d3-4c01-bcc3-04be7b420cf5`。本番準備設定と完全一致。orders存在・テスト注文2件・Time Travel利用可。DO binding PURCHASE_COORDINATOR → PurchaseCoordinator。
- RUNTIME_TIER/SQUARE_ENVIRONMENT=production、Location=LQ693S4H2NBZ8、API version=2026-07-15、SITE_URL=https://yasoyahonten.awaiaune.com。
- ユーザー確認済みProduction Application ID: `sq0idp-JYrGicMfKr-ILhZeLS9Xsw`。Locationは上記の本番ID。
- ユーザー提示の既存Worker完全Version ID（切戻し候補）: `4ddbd925-2967-4d93-b553-ff4ea4d685a5`。切替直前に別Versionへ変わっていれば記録を更新する。
- Secrets SQUARE_ACCESS_TOKEN / ADMIN_TOKEN とResend設定は存在。値を取得・転記しない。
- MANAGEMENT_ENABLED=0、購入/管理フラグはOFF。本番R2は確認済みとのユーザー申告を採用し、再調査しない。既存ステージング/validationを流用しない。
- 本番管理Accessはユーザーが作成済み: Application=`yasoya-honten-admin`、保護対象=`admin.awaiaune.com`の全パス、Policy=`Yasoya Admin Only`、管理者メールのみAllow。AUD=`83b65f5860ed7658d558dd620138208905240339a95e4ef9053fd2cddbfedd79`。Team Domain=`white-hill-a411.cloudflareaccess.com`、Issuer=`https://white-hill-a411.cloudflareaccess.com`。許可メールもユーザー確認済みのため再確認しない。実メールをコードへ推測で転記せず、両Workerの`PRODUCTION_ADMIN_EMAIL`へポリシーと同じ値を設定する。これらの本番Workerへの反映は未実行。

## 準備状況と残る操作（Codexから本番操作はしない）

| 項目 | 採用案・操作場所 | 設定内容 |
|---|---|---|
| 本番画像R2（ユーザー確認済み） | 再調査・再作成不要 | 設定案の`yasoya-honten-product-images`、binding=`PRODUCT_IMAGES`を維持。本番bindingの反映は承認後 |
| 管理用Access（作成済み） | Zero Trust → Access → Applications → yasoya-honten-admin | 全パス・管理者メールのみAllow・上記AUDを採用。再作成・再確認不要。Team Domain/AUD/許可メールを両Workerへ反映するのは承認後 |
| 管理用Worker | Workers & Pages → 新規Worker | `yasoya-honten-admin`、Service binding `PAYMENTS_SERVICE` → `yasoya-honten-payments`。workers.dev/Preview URL無効。公開時にCustom Domain=`admin.awaiaune.com`。先に上のAccessを用意する |
| Access環境変数 | 両Worker → Settings → Variables and Secrets | `PRODUCTION_ADMIN_ORIGIN=https://admin.awaiaune.com`、`PRODUCTION_ACCESS_TEAM_DOMAIN`=本番AccessのTeam Domain、`PRODUCTION_ACCESS_AUDIENCE`=新アプリAUD、`PRODUCTION_ADMIN_EMAIL`=許可メール。ステージングAUDは使わない |
| Square App ID（確認済み） | 購入Worker → Settings → Variables and Secrets | 上記の確認済みApp IDを`SQUARE_PRODUCTION_APPLICATION_ID`へ設定。LocationはLQ693S4H2NBZ8を維持。App IDはSecretではない |
| 管理用Square Secret（追加不要） | 購入Workerの既存Secretをサーバー内で再利用 | `PRODUCTION_MANAGEMENT_SQUARE_TOKEN`は未登録とユーザー確認済み。存在すれば優先し、なければ`SQUARE_ACCESS_TOKEN`を利用。新Secretの登録は必須にしない。実トークンのCatalog/Inventory権限は実通信していないため未確認。権限不足なら操作は失敗として停止し、別トークンへの再送は行わない |
| 公開ドメイン | 購入Worker → Settings → Domains & Routes → Custom Domain | 最後に`yasoyahonten.awaiaune.com`を割当てる。既存CNAMEが競合する場合だけDNS画面で既知CNAMEを削除して直ちに追加。Worker用DNSはCloudflareに管理させ、手動CNAME先を推測しない。Accessはこのホスト/購入APIへ適用しない |

準備の順番は次のとおり。現段階ではCodexから実行しない。

1. 本番R2はユーザー確認済みとして扱い、再作成しない。既存購入Workerへのbinding反映は承認した本番デプロイ時にまとめる。
2. 管理専用AccessのTeam Domain・AUD・許可メール・全パス保護は確認済みとして扱い、再確認しない。公開サイト・既存APIホストを対象にしない。
3. 管理Workerは名前・Service binding・Build/Deploy設定を準備する。新規作成画面がDeployを要求する場合はまだ実行せず、その直前で止める。workers.dev/Previewは無効、Custom Domain追加はAccess準備後の承認済み公開時に行う。
4. 新しいSquare Secret登録は不要。既存`SQUARE_ACCESS_TOKEN`を購入Worker内の管理通信にも利用する。管理Worker・ブラウザへコピーしない。権限はAccess＋ADMIN_TOKEN＋管理権限フラグで引き続き制限する。既存Secretの表示・転記・上書きはしない。

管理WorkerはAccess JWTを検証し、購入Workerも管理APIで同じ署名/AUD/メールを再検証する。さらに既存ADMIN_TOKENでログインする。公開ホストやworkers.devからの管理API直アクセスは拒否。購入APIにはAccessログインを要求しない。

初期の商品画像は既存レモンバーム/よもぎの静的写真を使える。ステージングR2の6オブジェクトやSandbox商品DBを丸ごと移さない。追加画像は本番管理画面から個別アップロードし、非公開R2からWorker経由で配信する。既存Square画像IDはローカル画像未登録を理由に削除しない。

## まだ必要な非秘密情報（同じ画面の既知項目は不要）

- Account ID・既存workers.dev URL・完全Version IDは上記のユーザー提示値を採用済みで、再確認は不要。
- コード照合済み: 準備ブランチとローカル保存済みorigin/mainの`worker/wrangler.jsonc`は、D1名`yasoya-orders`・binding `ORDERS_DB`・ID `442fa9fd-25d3-4c01-bcc3-04be7b420cf5`、DO binding `PURCHASE_COORDINATOR`・class `PurchaseCoordinator`で一致。新しい公開entrypointも同じclassを再exportする。これは稼働設定の取得結果ではない。
- DO実設定はユーザーがCloudflareで確認済み: namespace `yasoya-honten-payments_PurchaseCoordinator`、class `PurchaseCoordinator`、namespace ID `6802cc5abc6d440285ec19c9e7c82103`、Bound Worker `yasoya-honten-payments`。移行入力/検証コードと一致。CodexによるAPI取得結果ではない。Wranglerの既存DO bindingは同Workerのclassを指定しnamespace IDを直接指定しないため、同じWorker名/class/bindingを維持し、namespace再作成・削除・再初期化は行わない。
- D1実Database ID・DO実namespace/class/接続Workerはユーザー確認済み。同じ照合を繰り返さず、次は未準備リソースへ進む。
- DOのnamespace名・ID・class・Bound Workerは上記の確認済み値を採用し、同じ画面の再確認は不要。
- migration tagはコードの`v1-purchase-coordinator`、固定Object名は`yasoya-honten-global-purchase-lock`を維持。実migration履歴は未確認のまま明記し、それだけを理由にData Studioを繰り返さない。class改名・追加migration・初期化はしない。
- Access情報はユーザー確認済み。メール実値は本番反映時に管理者が既存ポリシーと同値を入力し、チャットへの再提示は求めない。メールはバージョン管理する設定から省き、`keep_vars`で保持する。新規管理Workerでは公開前に既存Accessポリシーと同じメールをDashboardで設定する。
- 管理用Square Secretの追加は必須条件から除外済み。既存Secretの実権限は未確認であり、管理機能受入時の読取照合で権限エラーなら停止する。Catalog/Inventoryへの実書込みテストは別途操作内容を承認してから行う。

## 設定ファイル・追加SQL

1. `production/v53.candidate.jsonc` は既存購入Worker向けの**未完成テンプレート**。REPLACEや未作成リソース名を含む間はデプロイしない。
2. 上の実値をGit対象外の `production/dashboard.local.json` に入力する。形式は `dashboard-input.example.json`。Preview無効は反映済み、Workers Builds停止はユーザー確認済みとして反映済み。R2/Access作成済みなどの真偽値を先にtrueにしない。
3. オフラインで `node production/prepare-v53.mjs`、`node production/prepare-admin.mjs`、`node production/prepare-release.mjs production/dashboard.local.json` を実行。
4. `production/release/` にbootstrap/ready/admin設定、additive.sql、Console用all.sql/番号順分割SQL、manifest、旧checkout停止版が生成される。同じmanifestのinstance UUIDは再生成でも維持する。SQLは `worker/migrations-production/0001_management.sql` → `0002_management_supervision.sql` → Production専用marker挿入。orders更新/削除や在庫初期化は含まない。既存管理テーブルがあれば再適用せず差分確認。
5. 生成した管理設定のCustom Domainも手動追加とし、設定の初回デプロイではDNSを変えない。Team Domain/AUDは両Workerの生成設定に含め、許可メールだけDashboardで設定し`keep_vars=true`で保持。Secretは一切設定ファイルへ含めない。Resendのメール変数も候補設定から除外し、現行Dashboard値を保持する。
6. 非秘密の生成設定/SQLのみをレビューPR対象にする。**この準備ブランチ全体をmainにmergeしない。** Pagesを壊さないようroot HTML/旧checkout/公開用JSを先行でv53へ置換しない。必要なWorker・production・依存コードとv53原本の`staging/site/`、`staging/prepare.mjs`、共有管理JS/CSSも選別し、旧checkout変更は停止スクリプト読込だけに限定する。

### 正式な主要フラグ名（コード照合済み）

- 常時停止: `PRODUCTION_CHECKOUT_ENABLED=0`（再開は別承認）。
- bootstrap: `MANAGEMENT_ENABLED=1`、`PRODUCTION_MANAGEMENT_SCHEMA_READY=1`、`PRODUCTION_MANAGEMENT_READ_ENABLED=1`、`PRODUCTION_MANAGEMENT_DRAFT_ENABLED=1`、`PRODUCTION_MANAGEMENT_IMAGES_ENABLED=1`。`PRODUCTION_MANAGEMENT_CATALOG_ENABLED=0`、`PRODUCTION_MANAGEMENT_INVENTORY_ENABLED=0`、`MANAGEMENT_STOCK_WRITES=disabled`。
- ready: 上に加え`PRODUCTION_STOREFRONT_ENABLED=1`、`PRODUCTION_STOREFRONT_PUBLISH_ENABLED=1`、`PRODUCTION_MANAGED_CHECKOUT_ENABLED=1`、`PRODUCTION_UNIFIED_PUBLISH_ENABLED=1`、`STOREFRONT_FEATURED_ENABLED=1`、`STOREFRONT_RETIRE_GOLDENROD=1`。Catalog/Inventoryの許可設定は生成コードに明記し最終レビュー対象とする。managed checkout有効と新規決済受付ONは別設定。

## 管理Worker先行導入（main・Pagesを更新しない初回経路）

この節が初回管理導入の優先手順。下のサイト全面切替手順は別承認の後続工程とする。今回、Cloudflare実設定は一切変更していない。

| 順序 | 承認後に実行する内容 | 保護するもの |
|---|---|---|
| 1 | 準備ブランチ`production/v53-port-20261031`だけをpush。mainへmerge/pushしない。必要ならレビューPRを作るがmergeしない | Pagesはmain/rootなのでサイト更新なし。購入WorkerはBuilds停止、PreviewもOFF |
| 2 | 直前のTime Travel時点と既存Worker Versionを記録し、対象D1へ`production/release/console/`の追加SQLを適用 | orders/既存DO/Squareは初期化しない。SQL適用は別承認 |
| 3 | 購入WorkerのBuildsを停止のまま、配信元Production branchを上記専用ブランチへ変更。Root=worker、Build=`node ../production/prepare-v53.mjs`、Deploy=`npx wrangler@4.155.0 deploy --config ../production/release/bootstrap.jsonc`。許可メールをDashboardの`PRODUCTION_ADMIN_EMAIL`へ設定 | この設定変更も本番操作として直前承認。既存Secret/R2/D1/DO識別子を保持。購入OFF、Square管理書込みOFF |
| 4 | 承認した1回のBuildだけ起動。手動起動が使えなければ、明示承認のうえ一時的にBuildsを有効にし専用ブランチへ空コミットをpushして起動。完了後は再びBuilds停止 | mainを触らない。新サイトの正規ドメイン/DNSは触らない。旧workers.dev APIを継続 |
| 5 | 新管理Workerを同じGitHub専用ブランチから作成。Root=worker、Build=`node ../production/prepare-admin.mjs`、Deploy=`npx wrangler@4.155.0 deploy --config ../production/release/admin.jsonc`。公開前に同じ許可メールを設定 | ADMIN_TOKEN/Square Secretは新Workerへコピーしない。SERVICE binding経由で既存Workerを利用。workers.dev/Preview URLなし、assetsは認証後のみ |
| 6 | Access保護済み`admin.awaiaune.com`を管理WorkerのCustom Domainへ追加し、Access＋既存ADMIN_TOKENで管理画面へログイン | この管理ドメイン接続は別承認のDNS操作。公開サイトのCNAMEは変えない。購入OFFのまま。初期の管理閲覧を確認 |
| 7 | 商品が未取込なら、既存4商品の読取照合→D1下書き/対応付けを管理APIから行う。継続2商品、終了2商品の区分を保持して商品/在庫表示を確認 | このD1登録も承認対象。既存Square ID/SKU/980円を維持。Square再作成/在庫上書きなし。Pagesへは反映しない |

新管理Worker作成画面がDeployを要求する場合は、準備だけでは進めず承認を取る。自動ビルドが始まる設定操作も承認対象。管理Worker側のBuildsも初回後は停止し、以後のブランチpushで無断公開しない。

変更対象は`production/release/`の非秘密設定/追加SQL、管理Worker・既存購入Workerの公開コード/設定、追加の管理D1テーブル、管理用ドメイン接続。変更しないものはmain、Pages設定と公開root、正規サイトDNS、Square商品/価格/在庫、既存D1 orders、DO namespace/class/Object名、既存Secret値。R2は既存本番bucketへbindingするが、初回閲覧確認ではオブジェクトを書き込まない。

初回導入の切戻し: 両WorkerのBuildsを停止し、管理ドメイン接続を外してAccessは残す。購入Workerを`4ddbd925-2967-4d93-b553-ff4ea4d685a5`へ戻し、購入OFFを維持。Buildsの配信元はmainへ戻すが再有効化しない。追加管理テーブルは残し、Time Travel復元/DO初期化/Square巻戻しはしない。正規サイトDNS/main/Pagesは未変更なので戻す必要がない。

## サイト全面切替：後続の別承認手順

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

既存126件のローカル検証とステージング実機結果を再利用する。今回変更した構成生成11件成功・失敗0（新規1件を含む）。管理UIのオフライン梱包も成功。本番の現在値に未確認があり、本番への許可メール設定・追加SQL・公開はまだ実行していない。配備用の非秘密設定/SQLは今回生成し、準備済みinstance UUIDを維持する。実行対象と影響を提示し、最終承認後にのみ実行する。

2026-11-01追加検証: `dev/production-access-config.test.mjs` 10件＋設定生成11件、計21件成功・失敗0。確認済みTeam Domain/AUDを使い、ローカル生成RSA鍵・模擬メール/証明書でJWTを検証。正常JWT、不正Issuer/AUD/メール/有効期限/署名/alg、メールヘッダー偽装、署名が有効でもworkers.dev/Preview経由拒否を確認。外部通信なし。実メールのポリシー照合や本番環境変数への反映を実施したという意味ではない。

2026-11-01既存Secret再利用: `PRODUCTION_MANAGEMENT_SQUARE_TOKEN`未登録をユーザー確認。サーバー側で既存`SQUARE_ACCESS_TOKEN`を利用し、専用Secretがある構成も維持。管理Worker/ブラウザへの転記なし。Production回帰・認証・設定生成・Secret非露出59件成功、続くメール未収集での設定生成1件も成功（同時に既存設定生成11件を再確認、計60種類）。模擬Squareで画像/商品同期/在庫/購入の回帰を確認し、401/403で再送せず停止。実トークン権限・本番Squareの受入は未実施。管理Worker設定にREPLACEはなく、許可メールだけDashboard設定必須。Asset梱包成功。main push/本番操作なし。

2026-11-01 Build停止後準備: ユーザー確認のDisable builds=ONを反映。管理Worker先行は専用ブランチから導入し、main/Pages/正規サイトDNSを更新しない経路を確定。`production/release/`に非秘密のbootstrap/ready/admin設定、追加SQL、Console分割SQL、manifest、旧画面停止版を生成（全て未実行）。instance UUIDは既存の準備済みSQLと同じ値を維持。配備設定3種をオフラインでbundleし、Asset参照・追加SQLマーカー・DB/DO・購入OFF・初回Square書込みOFFを確認。認証/設定22件成功・失敗0。最初の検証コマンドはルートからesbuild依存を解決できず停止したが、dev側依存を正しく参照して再実行し成功（コード/本番の不具合ではない）。本番/外部通信なし。次は専用ブランチのみのpushとDraft PR準備の承認。
