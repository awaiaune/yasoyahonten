# 本番対応 Phase 3（2026-10-27、未適用）

> 方針更新：初回だけ短時間のWeb決済停止を許容し、新購入画面とv1 APIを一体で切り替える。旧クライアントの完全な無停止互換は初回の必須条件から外した。現在の承認・停止条件は [production-cutover-runbook.md](production-cutover-runbook.md)、API契約は [checkout-api-contract-v1.md](checkout-api-contract-v1.md) を優先する。以下の175件/39件はPhase 3時点の記録。

基準: dev/local-isolation / 8a66408e74814850a6789941113e7c151d8d38ef。稼働Version 41ec1df6-0903-4771-bb35-7b7b49cfa1f8 等の実構成はユーザー確認情報として利用した。対応する稼働ソース一式・実namespace ID・全Item/Variation/SKUの照合は未完了。既存の未追跡ファイルは保護している。

## 実装と境界

production-policy は Sandbox policy と別の本番境界。環境・本番Worker名・Locationを固定し、SandboxトークンやLOCAL代替バインディングの混入を拒否。管理 READ / DRAFT / IMAGES / CATALOG / INVENTORY は個別設定（PRODUCTION_MANAGEMENT_…_ENABLED='0'/'1'）でデフォルト拒否。管理停止は既存注文通知・購入復旧を止める設定ではない。不正な管理権限設定も通常購入・注文通知の認可から分離する。PRODUCTION_MANAGEMENT_SCHEMA_READY=1はマイグレーション後のロック参照を開始する宣言で、Catalog/在庫権限の前提。運用開始後は書き込み停止のためにこの宣言を外さず、各権限だけを無効化して既存ロックの参照を維持する。

購入の新しい耐久APIは安定したattemptIdまたはUUIDのIdempotency-Keyが必須。両方ある場合も一致が必要。PRODUCTION_PURCHASE_PROTOCOL='durable-v1' を明示したときだけ進める。応答不明・処理中のHTTP 202は409/PURCHASE_PENDINGへ変換し、旧ブラウザーの無条件完了判定を防ぐ。同じIDを保持して状態照会すること。ランダムな注文IDの補完やカードトークンからの推定IDは行わない。

**旧クライアントは安定IDを送らないため409/PURCHASE_CLIENT_UPGRADE_REQUIREDで外部送信前に拒否する。旧クライアントの無停止互換を達成したとは扱わない。** この実装を既存購入Workerへそのまま本番反映してはいけない。旧クライアント更新・キャッシュ・処理途中要求・稼働DOの互換性を確認し、更新誘導で販売を継続できる切替設計を承認するまで本番切替を停止する。

管理UIは新設案 yasoya-honten-admin / admin.awaiaune.com。未作成・ホスト未承認。Access署名・issuer・AUD・管理者email・期限・OriginをUI入口と既存購入バックエンドの両方で検証し、Bearer管理者認証も維持。PAYMENTS_SERVICEは既存 yasoya-honten-payments へのService Binding。購入API・公開サイトにAccessを強制しない。UI用WorkerにSquareキーを渡さない。workers.dev/Preview無効、AssetsはWorker先行。

本番用R2名 yasoya-honten-product-images は提案であり存在未確認。画像はproduction/配下に保存する。コードやサンプルにはSecret値を置かない。既存のSQUARE_ACCESS_TOKEN/RESEND_API_KEY/ADMIN_TOKENは購入・通知用として維持。管理外部通信には別Secret PRODUCTION_MANAGEMENT_SQUARE_TOKENを使用し、Catalog/Inventoryの最小権限を推奨。値を読んで移し替えない。

## 商品・在庫

4商品のコード上のVariation IDを照合済みとみなさない。本番ではSandbox固定の3商品importを禁止。実データを基に下書きを作り、link操作でSquareのItem/Variation/価格/名称/JPY/追跡設定/LocationとSKUの一意性を読み取り検証してから対応表へ保存する。SKUはハードコードせず読取値を維持し、UNIQUE制約と再照合で重複・変更を拒否。商品名とVariation名が異なる場合、実Variation名を下書きに設定する必要がある。未照合なら既存商品の公開を拒否する。

Square本番の読取時にも管理READ権限とDBマーカーが必要。外部送信直前の許可API・scopeで管理トークンによる決済を拒否する。Catalog/画像と在庫の書き込みは独立した設定。Catalogを許可するにはPRODUCTION_CATALOG_CUTOVER_APPROVAL='verified-storefront-and-pricing-v1'、在庫にはPRODUCTION_INVENTORY_WRITER_APPROVAL='shared-purchase-do-single-writer-v1' と MANAGEMENT_STOCK_WRITES='single-writer' が必要。いずれもSecretではなく、運用条件を承認した設定である。

既存購入DOクラス、namespace、バインディング、固定名 yasoya-honten-global-purchase-lock を維持し、管理操作も同じqueueを通す。管理ジョブは固定ID/本文/結果を保存し、失敗時は再試行または対象Variationのみreview。Alarmの注文復旧は本番では止めない。管理通知の実メール・新規Cronは今回追加しない。

在庫はSquare正本。PHYSICAL_COUNTの直前再照合と適用後照合、固定キー再送で二重加算を防ぐ。外部SKUの変更も拒否。POS/別アプリとの原子的なCASはできないため、単一書き込み経路が確保できなければ在庫権限を有効化しない。

**公開サイト・商品URL・SEO・送料・決済画面は今回切り替えない。** 本番の価格正本は引き続き既存CATALOG。管理有効だけで公開版D1へ参照元を変更しない。既存商品の価格変更公開は拒否する。新規商品の本番サイト表示と商品参照元の一括切替、Squareとサイトの価格同時切替は次工程。この条件が未成立の間はCatalog権限を有効化しない。

## 本番用スキーマ（未適用）

worker/migrations-production/0001_management.sql → 0002_management_supervision.sql。Sandboxの既存migrationは変更しない。本番専用mg_テーブル（対応表はproduction制約、SKU・instance_id・verified_atを保持）とproduction_environmentを新設する。ordersのCREATE/ALTER/DROP/UPDATE/DELETEは含まない。mg_名の衝突は適用時エラーとし、不一致をIF NOT EXISTSで隠さない。0001の識別テーブルに既存の異なる定義があれば適用前に停止する。

識別マーカーは新しい本番専用UUID、既存D1 UUID、Locationを含む。自動INSERTはしない。バックアップ後に、SQL全文とマーカー値を別途承認してから設定する。Time Travelを使う際は直前の復旧地点と期限を記録。販売中のordersを巻き戻すためにD1全体を復元しない。必要なら別DBへの復元と管理データの差分救出を検討する。DO・Square・R2はD1復元で戻らない。

## 準備手順と停止条件

- production/backend.example.jsonc と admin.example.jsonc は非デプロイ用の未完成テンプレート。未確認値・候補ホスト・候補R2名を含む。既存本番のCron/Observability/Secret/全vars/DO履歴との統合レビュー前にdeployしない。
- node production/prepare-admin.mjs は管理UIの公開ファイル5点だけをGit対象外へ包装する。公開サイトや本番設定は書き換えない。
- npm --prefix dev test と npm --prefix dev run test:ui はローカル代替APIだけで実行する。実Square本番/Sandboxへの接続はしない。
- 稼働Versionとソースの対応、namespace IDと移行履歴、全実ID/SKU、Access用ホスト/AUD、R2、バックアップを読み取りで確定する。
- ローカル実装のレビュー後にコミット/push、リソース作成、migration、Worker反映、管理権限有効化をそれぞれ承認する。現時点ではどれも実行しない。
- 10/28は旧購入クライアント互換・実ID照合・本番設定の確定、10/29は回帰/復旧演習、10/30は承認後の読取/下書き導入、10/31は条件を満たす権限だけを段階有効化。停止条件が残ればSquare書き込みと公開切替を延期し、現行販売を維持する。

## 最終ローカル検証

- npm --prefix dev test: 175件成功、失敗0・スキップ0（既存159件＋本番対応16件）。
- npm --prefix dev run test:ui: 39件成功、失敗0・スキップ0（既存38件＋本番形状のAccess付き画面1件）。
- 本番形状の試験も全てメモリ内D1/R2/DO、架空JWT、Square/Resend代替応答を使用。実本番ID・権限の照合結果ではない。
- 既存注文保持、重複購入、購入後D1失敗からの復旧、通知経路維持、管理設定不正時の購入継続、対応表/SKU重複拒否、在庫競合、Origin/JWT、写真付き下書きの再読み込みを確認。
- 本番設定・商品カタログ・公開HTML・購入JS・CSSは今回変更していない。コードのcommit/push、リソース作成、SQL適用、Secret登録、デプロイは未実施。

Squareの「4商品」が4 Itemなのか、3 Item/4 Variationなのかは未確定。現在の管理モデルは1商品につき1 Square Itemを要求する。葉10gと葉・茎20gが別Itemの場合は無理に統合せず、実構成に合わせたマスター/URLグループ設計を追加する。この確認と旧クライアント切替方式が未解決の間、読取/下書き機能であっても既存購入Workerへの反映は延期する。
