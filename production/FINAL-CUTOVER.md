# 最終切替手順（未実行・最終承認待ち）

注文2件はユーザーのテスト注文。完全保全は移行の必須条件ではないが、初回はそのまま残す。D1初期化/注文削除/Square削除は行わない。
保護方式は承認済みの「切替直前のTime Travel復元時点記録＋追加型移行」。SQL export/隔離復元は任意の追加保護で、Codexの認証修復待ちを本番作業の必須経路にしない。

## スマートフォンで一度に集める情報

Cloudflare Dashboardを同じアカウントで開く。Secret値・署名鍵・顧客データは共有しない。

| 場所 | 確認/記録するもの | 合格条件 |
|---|---|---|
| アカウントホーム | Account ID | 登録済みアカウントと一致 |
| Workers & Pages → yasoya-honten-payments → Deployments | 稼働中の完全Version ID、配分、Git SHA | 切戻し先を全文で保存。古い4ddbd925…を現況と決めつけない |
| 同Worker → Settings → Domains & Routes | 既存workers.dev API URL、公開ルート | 旧API URLはPRODUCTION_LEGACY_API_ORIGINとして残す |
| 同Worker → Bindings | ORDERS_DB、PURCHASE_COORDINATOR、class | D1=442fa9fd-25d3-4c01-bcc3-04be7b420cf5、DO namespace=6802cc5abc6d440285ec19c9e7c82103、PurchaseCoordinator。新namespaceを作らない |
| 同Worker → Settings → Build | Production branch、Root、Build/Deploy command、Preview設定 | main。現在値だけを記録。変更は承認後。実作業前にDisable builds=ON、Preview builds=OFFとし、準備ブランチでも起動しないようにする |
| D1 → yasoya-orders | ID、orders列定義、Time Travel | 既知のordersのみ/2件は再調査不要。直前の復元対象日時(表示タイムゾーンも記録しUTCへ統一)・bookmark(表示される場合)・保持期限を記録。Restoreは押さない |
| R2 | Production用の非公開画像bucket | Staging bucketを流用しない。既存があればその名前、なければ作成案yasoya-honten-product-imagesを承認対象にする |
| Zero Trust → Access → Applications | admin.awaiaune.comのTeam Domain、AUD、許可メール | 管理画面のみ保護。公開サイトや公開購入APIを認証保護しない。stagingのAUDは流用しない |
| Worker → Variables and Secrets | 既存3Secret名と管理用Secret名 | SQUARE_ACCESS_TOKEN / ADMIN_TOKEN / RESEND_API_KEYを保持。PRODUCTION_MANAGEMENT_SQUARE_TOKENを追加する場合も値はSecret設定だけ。チャット/コードに貼らない |
| Square Developer Dashboard → Production | App ID・Location | sq0idp-で始まる本番App ID、Location LQ693S4H2NBZ8。Sandbox App/Tokenは不使用 |
| DNS/ルート | yasoyahonten.awaiaune.comの現在値と切替先 | 現在はGitHub Pages。Worker route利用かcustom domainへのDNS変更かを実設定から確定し、旧値も保存 |

SquareのApp ID/LocationはCloudflareだけでは確認が完結しないので、同じ確認作業でSquareのProduction画面も開く。
GitHub Pagesは別途Repository → Settings → Pagesのmain/(root)自動公開を確認する。main更新で静的サイトも公開されるため、旧checkout/root HTMLの先行切替を避ける。
DO migration tagはmainの宣言v1-purchase-coordinatorを維持。画面で実履歴が確認できなければ「実履歴未確認」と記録し、再初期化/新class/migrationを追加しない。

## Codex側の準備

1. 確認値を `production/dashboard-input.example.json` の形式でローカルのproduction/dashboard.local.jsonに入力（Secret値なし、Git対象外）。
2. `node production/prepare-v53.mjs` → `node production/prepare-release.mjs production/dashboard.local.json`。
3. production/release配下にbootstrap.jsonc、ready.jsonc、additive.sql、コメントなしConsole用all.sql/分割SQL、manifest.jsonを生成する。instance UUIDは再実行でも同じmanifestのものを再利用する。
4. Access Team/AUD/許可メールは生成configへ埋め込まずDashboard varsに設定し、keep_varsで保持。Secretも設定ファイルに入れない。
5. mainへ反映するPRは公開用root HTML/旧checkoutを新デザインへ先行更新しない差分に整理する。旧checkoutの変更は、main版に停止告知とproduction/pause-checkout.jsの読込だけを加えたmaintenance-checkout.htmlに限定する。この準備ブランチ全体をそのままmainにmergeしない。

## 承認後の実行順序

1. **切替前記録**: 完全Worker Version、旧DNS/ルート、Time Travel利用可を確認。復元対象時点そのものは新規受付OFF後・SQL適用直前に記録する。Restoreは実行しない。Build停止/Preview停止を確認。
2. **新規購入停止**: 本番PRODUCTION_CHECKOUT_ENABLED=0を確認し、生成したmaintenance-checkout.htmlを旧checkout.htmlへ適用し、旧画面でも停止を明示。停止スクリプトは新規送信だけを抑止し、既存の状態確認ボタンを妨げない。新しい注文は503で拒否。受付済みの状態照会は旧API URLで継続できる。既に完了した決済の記録/在庫処理を消さない。未確定時は同じattemptIdで照会し、再決済しない。
3. **追加SQL**: ここでTime Travelの直前時点を記録し、対象DBを確認した同じD1 Consoleで、コメントなしconsole/all.sqlを適用。全文貼付に問題があれば番号順の短いSQLを使用する。ordersは触らず管理テーブル/Production markerだけ追加。再実行で衝突した場合は停止し、DROP/初期化しない。
4. **準備バックエンド**: 既存Buildsでbootstrapを一度だけ明示的に実行。Root directory=workerを維持する場合、Build command=`node ../production/prepare-v53.mjs`、Deploy command=`npx wrangler@4.155.0 deploy --config ../production/release/bootstrap.jsonc`。確認値を反映して生成したproduction/releaseの非秘密config/SQLを、本番反映用PRのレビュー対象に含める。未確認値のまま生成・反映しない。自動ビルド再有効化だけで既存commitのBuildが始まるとは仮定しない。
5. **管理公開/関連付け**: Access保護済みadmin Workerを公開しサービスbindingを既存購入Workerへ。4商品をsave→linkの読取照合で関連付け、継続2商品だけsite公開、終了2商品はD1 archived。Square Item/Variation/SKU・在庫は作り直さない。掲載順1=レモンバーム、2=よもぎ、3=空欄を設定。
6. **新サイト準備**: ready profileを明示的に公開する。管理Catalog/在庫機能はこの承認範囲に含めるか、最終承認時に明確にする。購入受付は0のまま。公開ルートを切替える前に管理閲覧/画像/公開/既存ID/終了商品の拒否を確認する。
7. **公開ルート切替**: 確認済みDNS/Worker routeを新サイトへ切替。旧API originは残す。ホーム/SHOP/既存URL・カード画面の停止表示・旧カート終了商品の排除を確認。
8. **別承認で再開**: Productionの実カードテスト・一般購入受付再開は今回の準備と分ける。承認後1回のテストで1決済/1注文/在庫1減を確認。返金は自動実行しない。

## 購入受付OFFの影響と切戻し

- 新規購入は完了できない。旧画面のカード入力済みで未送信の場合も新規決済は拒否する。
- 既存決済の状態照会は旧API originを保持して受ける。受付停止は返金・注文削除・在庫巻戻しを意味しない。
- 切戻しは受付OFFのまま、記録したWorker完全Versionと対応する旧ルート/画面を戻す。追加D1テーブルは原則残し、DO namespace/class/Object名は変更しない。
- Time Travel復元は別の本番変更。新規注文や管理データまで戻るため、自動・無条件で実行しない。テスト2件が不要でも他データの無条件初期化はしない。

## 未確認の間の判定

コード/SQL準備はできても、確認値にREPLACE・不一致・未承認があれば実デプロイ不可。Codex認証失敗は既存Builds/Console経路を使うため単独の阻害要因にはしない。上記の確認値とTime Travel直前記録を揃えた後、実行対象を確定して最終承認を求める。

## 今回の検証

回帰・設定準備・ブラウザ126件成功（失敗0）。125件の通し検証に加え、旧画面の停止告知/送信抑止/状態照会維持1件を検証。全てオフライン代替API・ダミーDBであり、実Cloudflare設定値の確認や実決済成功を意味しない。現時点ではDashboard入力が未受領のため、production/releaseの実配備用configは生成していない。
