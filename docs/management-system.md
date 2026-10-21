# 商品・在庫・注文の統合管理（ローカル実装）

2026-10-21。dev/local-isolation上の実装。実リソース作成・リモートSQL・実Square API・メール・デプロイ・コミット・プッシュは実行しない。

## 利用範囲と有効化

既存Worker設定を変更せず、MANAGEMENT_ENABLED=1のときだけ新機能を有効にする。未指定時は従来のカタログ・注文管理・決済を使う。新機能は隔離ローカルまたはsandbox-validationだけで許可し、productionはコードで拒否する。本番対応の承認・別途レビューを経ず本番で有効化できない。

既存注文API、pending/shipped、注文購入時の商品名・価格、注文台帳、Variation単位の注文保留、固定決済キー、既存Alarm復旧は維持する。本番catalog.js、送料350円/3000円以上無料、既存商品HTML/URL、checkout.js、本番wrangler.jsoncは変更しない。

## ローカルでの起動

依存はdev/package-lock.jsonを使う。トークン入力は不要。

```sh
npm ci --prefix dev
npm --prefix dev run management -- --seed --seed-orders
```

http://127.0.0.1:8000/admin/ を開き、ローカル専用のlocal-development-onlyでログインする。注文・商品・在庫の3メニュー。通常の安全な起動 `npm --prefix dev start` は従来どおりで、新機能を有効にしない。

--seedはローカルD1が空の場合だけ既存3商品の公開定義・画像・識別子を取り込み、Square代替に各5個のテスト在庫を作る。実Sandboxの在庫数量を読み取った結果ではない。既に商品があれば再初期化しない。途中失敗時もDB/Square代替JSONを無断で削除しない。状態はdev/.state/management内のD1/DO/R2/代替Square JSONに保持し、Git対象外。バインドには固定された偽の認証値だけを渡し、process.envの実認証を継承しない。外向きfetchは拒否。注文・発送メールも代替実装で実送信しない。

`--seed-orders` は架空の発送待ち・発送済み注文を各1件だけ追加する任意フラグ。注文番号は `LOCAL-DEMO-PENDING-001` と `LOCAL-DEMO-SHIPPED-001`。顧客は架空、メールは example.invalid、商品行にも「架空注文」と表示する。購入APIを呼ばず、決済・在庫減算・実メール送信は発生しない。発送待ちを発送済みにした後も、再実行で発送待ちへ戻したり注文を増やしたりしない。他のローカル注文も更新・削除しない。画面上部のローカル検証表示は、このサーバーの配信応答だけに追加し、既存の発送画面は維持する。

## Android / GitHub Codespaces の Private 転送

新しい管理コードは現時点で未コミット。このCodex環境の変更はCodespacesへ自動反映されない。開発ブランチへのコミット・プッシュは別途承認後に行い、未保存の変更があるCodespacesではpullせず停止する。本番への公開やCloudflare設定は不要。

1. 承認済みの受け渡し後、Codespacesを開き、ターミナルで `git branch --show-current` を実行。dev/local-isolation以外なら停止する。
2. Codespacesに未コミット変更がないことを確認してから、受け渡された開発ブランチを `git pull --ff-only origin dev/local-isolation` で取得する。競合時は停止し、resetや削除をしない。
3. リポジトリルートで `npm ci --prefix dev --no-audit --no-fund` を実行する。依存パッケージのダウンロードは必要だが、業務APIへの接続やトークン登録は不要。
4. `npm --prefix dev run management -- --seed --seed-orders` を実行する。ターミナルは開いたままにする。別のサーバーが8000番を使用している場合は勝手に終了させない。
5. 下部のPortsタブで8000番を追加し、Port Visibilityを **Private** にする。Public / Organizationへ変更しない。サーバーからGitHub側のPrivate設定を強制・確認する機能はない。
6. 8000番のOpen in Browserを押し、必要なら同じGitHubアカウントでログイン。転送URLのパスを `/admin/` にする。URLや認証情報はGitへ保存しない。
7. ローカル用固定値 `local-development-only` でログイン。実際の管理者トークンやSquareトークンは入力しない。
8. 注文管理の発送待ち→架空注文の詳細→発送操作→発送済みへの移動を確認する。「発送完了メールを送信」はこのサーバーでは代替処理だけ。次に商品管理で下書き保存、在庫管理でローカル数量の変更を確認する。
9. 終了はCtrl+C、続けてCodespacesを停止。dev/.state/managementは削除しない。再起動時も同じコマンドを使用できる。

Codespaces内蔵の `CODESPACES=true`、`CODESPACE_NAME`、`GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN=app.github.dev` から、当該環境の8000番のHTTPSホストを1つだけ導出する。加えてループバック127.0.0.1:8000と、CodespacesプロキシがHostを書き換える場合のlocalhost:8000だけを許可。Originは127.0.0.1のHTTPと当該CodespacesのHTTPSだけ。別Codespace、別ポート、任意ドメイン、Origin:null、偽のForwardedヘッダーで許可を拡張できない。メタデータが不正なら起動を停止する。Codespaces設定がない通常環境では従来の127.0.0.1だけ。

転送URLはメモリ内の設定にのみ利用し、ログ・設定ファイルへ保存しない。待受は127.0.0.1:8000のまま。外向きfetch拒否、ローカルD1/DO/R2、代替Square/Resend、同一オリジンのブラウザAPI通信を維持する。実際のCodespaces転送・Android表示はユーザー実機での確認が必要。Google Fontsの取得とGitHubの転送サービス自体はブラウザの通信を伴う。Square・Cloudflareの業務API通信は行わない。

## 画面とデータ

- 注文: 既存一覧・詳細・発送処理をそのまま使用。上位ナビと注文状態タブの識別子を分離。
- 商品: 新規/編集、名前・説明・価格・内容量・表示順、複数バリエーション、下書き、公開、停止、アーカイブ、既存3商品の下書き取り込み。
- 画像: 10枚まで、スマホで縮小JPEG化、選択・並び替え・取り外し、認証付きプレビュー。元画像30MBまで、転送後8MBまで。サーバー側でJPEG/PNG/WebP署名・寸法（最大12000px/4000万画素）・コンテナを検査し、JPEG EXIF等、PNG/WebPの個人メタデータを除去。SVG/アニメーション/未対応形式は拒否。HEICはブラウザで変換できる場合だけ対応し、できなければJPEG選び直し。完全な画像デコード検査ではないため実機の表示確認が必要。
- 在庫: Squareの最新値・確認日時・同期状態・販売保留を表示。入庫/増減/棚卸しは最終数量を固定したPHYSICAL_COUNTとして管理し、同一キーの再試行で数量を加算しない。
- エラー: ジョブの待機/同期/再試行/要確認、履歴、同一ジョブの再試行、Square結果の読取照合。競合時に新規キーで上書きするボタンは設けない。

新規IDはUUID、既存バリエーションIDは引き継ぐ。既存slugは変更不可、既存バリエーションは削除せずactive=false。購入上限は既存カートと互換の1〜10。価格は整数円/JPY。説明はプレーンテキストとしてエスケープし、任意HTMLを実行しない。

## 追加D1スキーマ

worker/migrations/0001_management.sqlはCREATE TABLE/INDEX IF NOT EXISTSのみ。ordersや既存注文台帳を削除/初期化/書換えしない。

| テーブル | 役割 |
| --- | --- |
| mg_products | 固定ID/slug、状態、楽観ロックversion、下書き/公開revision |
| mg_revisions | 不変の名前・説明・価格・内容量・画像順・バリエーションのスナップショット |
| mg_variants | 安定したバリエーションIDと所属商品 |
| mg_images | 内容ハッシュ、R2キー、検証済み形式・サイズ・寸法 |
| mg_mappings | Sandbox/Location専用のItem/Variation IDとバージョン |
| mg_image_mappings | R2画像とSquare Image IDの対応 |
| mg_jobs | 固定送信内容/キー、Square結果、状態、試行回数、次回日時 |
| mg_locks | 同期中・要確認のバリエーションを保留 |
| mg_inventory_operations | 種別・理由・実行者・変更前後・結果 |
| mg_stock_snapshot | 確認済み表示値。販売判断の正本にはしない |
| mg_commands | 下書き等の再送を識別するキー/内容ハッシュ/結果 |
| mg_audit | 認証済み管理者とsystemの変更履歴。顧客情報を複製しない |

商品公開と在庫変更は既存購入DOの同じ固定ID/キューを通す。ジョブと対象ロックはD1.batchで同時保存。未公開の編集・表示順は公開版に反映しない。既存公開版はSquare同期確認後にだけ切り替える。

## 同期と復旧

1. 管理者認証・入力検証・expectedVersion・操作IDの再送検証。
2. 既存注文のSKU保留と管理ジョブのロックを確認。
3. ジョブ/ロック/監査を保存。外部送信の本文とキーを保存してからAPIへ送る。
4. 画像を固定ハッシュキーでSquareへアップロードし、Catalogをversion付きでupsert。名前・価格・通貨・画像・販売状態・既存IDが応答と一致することを検証。
5. Square結果をD1へ保存してから公開版/対応表/ジョブ完了/ロック解除をD1.batchで確定。
6. 通信断/DB失敗は同一内容/同一キーで復旧。Square成功結果が保存済みならDB反映だけを再試行。

Alarmは既存注文の復旧を維持し、管理ジョブも画面を開かずに処理する。1回のAlarmにつき管理ジョブは1件で、通常購入へキューを譲る。最大8回、外部再送は保守的な1時間窓。期限切れ/バージョン競合/恒久エラーはreviewとして保留。確認済みSquare結果からのDB反映は新規書込みをせず復旧可能。

reviewの読取照合は既存ID・価格・画像・販売状態が完全一致した場合だけ公開/解除する。在庫結果不明で成功証跡がない場合や、新規ItemのIDが確定しない期限切れは自動解除しない。管理者がSquareの履歴を確認する。ジョブ/ロック/D1/DOを削除して回避しない。

新規購入の前には公開版から価格を作り、Square Catalogのバージョン/価格/名称も確認する。購入後の復旧は購入時の価格・Variation IDを使う。古いブラウザ価格を請求額に採用しない。

## 在庫について保証できる範囲

同じDOを通る購入と管理者操作は排他できる。外部のSquare POS/他アプリとは原子的に排他できない。Square Inventory APIの読取→PHYSICAL_COUNTにCAS保証を仮定しない。

このためリモート生成設定のMANAGEMENT_STOCK_WRITESはdisabled。single-writerへの変更は他の販売/在庫変更経路を制限する運用の承認後だけ。ローカル代替ではsingle-writerを設定して競合テストを行う。外部経路が並行動作する条件での無条件の在庫上書きや、完全な過剰販売防止は保証しない。既存購入にも在庫照会と決済/減算の間の外部競合が残り得る。

## API

すべての管理APIは既存Bearer認証を使用し、トークンの比較は固定長ダイジェスト比較へ強化。検証Workerでは従来のAccess JWTとD1マーカーも先に検証。ブラウザの更新要求はOriginも検査。認証値/顧客情報を新しい同期ログへ出さない。

- GET /api/admin/products、GET/PUT /api/admin/products/:id
- POST /api/admin/products/import（既存説明・画像を下書き取込。Square書込みなし）
- POST /api/admin/products/:id/link（既存Sandbox IDを読取検証して関連付け。再作成なし）
- POST /api/admin/products/:id/publish、/state
- GET /api/admin/inventory、POST /api/admin/inventory/:variant
- GET /api/admin/jobs、POST /api/admin/jobs/:id/retry、/reconcile
- POST /api/admin/images、GET /api/admin/images/:id（下書き含む管理者プレビュー）
- GET /api/admin/audit
- GET /api/catalog、GET /api/media/:id（公開中/販売停止商品の画像だけ）

新しい管理APIは権限を省略した公開ルートから利用できない。画像は内容ハッシュで保存し、送信MIMEとnosniffを固定。下書き画像を公開URLで配らない。

## ホームページ

機能有効時だけWorkerが既存HTMLテンプレートをHTMLRewriterで描画。トップ/一覧のカード、既存の/products/:slug.html、名称・説明・価格・画像・販売状態・canonical/JSON-LDを公開版から生成する。未知/アーカイブslugは404。既存DOMクラス、ヘッダー/フッター/CSSとカート導線を再利用する。詳細本文は編集可能な説明へ集約し、取込時に既存の説明/内容情報/取扱い本文を含める。商品名・slugを変更しても過去注文のスナップショットは変更しない。

在庫は別途最新APIで確認し、不明/保留時は購入ボタンを無効化。JSON-LDで未確認在庫をInStockと断言しない。実デザインの視覚回帰・Android実機・Google検索での確認は未実施。

## 検証環境への導入（今回は実行しない）

1. この変更とテストをレビュー。コミット/プッシュ、資源作成、SQL、公開はそれぞれ承認後。
2. 本番から分離した検証R2 yasoya-validation-imagesを用意。公開バケット/独自公開URLは作らず、PRODUCT_IMAGES bindingからだけ使う。Access保護・マーカー・既存D1の確認は完了扱い。
3. ローカルだけで `node validation/prepare.mjs prepare` → `node validation/prepare-management.mjs`。生成するvalidation/wrangler-management.local.jsonはGit対象外。既存wrangler.local.json/本番wrangler.jsoncを変更しない。
4. 生成設定を指定するdry-run。実リモート検証・Secrets由来の保証にはならない。
5. 承認後、専用D1だけに追加migrationを適用。想定は `./worker/node_modules/.bin/wrangler d1 migrations apply yasoya-validation-orders --remote --config validation/wrangler-management.local.json`。今回は未実行。
6. 専用Workerへの公開も別途承認後。既存のSandbox/検証Resend/管理者Secretを利用し、本番Secretをコピーしない。R2を使うため追加の専用権限をレビューする。
7. 既存3商品を下書き取込→既存Sandbox Variation IDをlinkで検証→公開。既存IDを再発行しない。D1が空の段階では管理モードの公開一覧も空なので、初回はAccess内で取り込みを完了させ、実顧客へ切り替えない。
8. 在庫方針を承認するまでは在庫書込みdisabled。Sandbox実API、画像、再試行、Alarm、購入、注文/発送通知、実機を段階的に検証する。

## 本番への移行と復旧

現在のコードはSandbox限定。本番へそのままdeploy/flag有効化しない。本番対応の接続先・Secret・権限・バックアップ・運用排他を別途設計/承認する。検証で作った商品データ/IDや注文を本番へコピーしない。

本番導入を将来承認する場合も、既存データをバックアップし、既存の商品ID/URL/価格/画像の比較を行い、読取元切替前にD1公開データと本番Square対応を検証する。段階公開/SEO/通知先/在庫競合の受入が済むまで本番の参照元を変更しない。

緊急時はMANAGEMENT_CHECKOUT_PAUSED=1で新規決済だけ停止し、既存status/管理者recover/Alarmは維持する。これは個別異常で自動的に店舗全体を止める仕組みではなく、明示的な緊急操作。通常は異常ジョブの対象Variationだけ保留する。

管理を無効化した後も、今回追加した購入時Variationスナップショット対応コードなら進行中注文の復旧が可能。ただしそれ以前の古いWorker版へ無条件rollbackしない。新しいIDの商品や進行中注文がある間は復旧コード・対応表・DO台帳を保持し、ブラウザは同じ注文IDのstatusへ誘導する。注文が解決するまで単純に静的CATALOGへ戻す運用は避ける。DB/R2/DO/ジョブの削除・初期化で復旧しない。

## 未検証事項

実Square SandboxへのCatalog/画像/Inventory/Payment API、実D1/R2/DO Alarm、Android写真変換・タップ操作、既存ページの視覚差分、TLS/Access/SDK、実メール送信、外部販売経路との並行操作、規模拡大時の負荷は未検証。モック成功だけで本番利用可とは判定しない。Square APIの実応答・権限・画像形式・冪等性の保持条件を実環境試験で確認する。

## 統合管理の初回ローカル検証結果

`npm --prefix dev test`: 93件成功、失敗0・スキップ0（既存72件＋新規21件、約89秒）。新規は商品→公開→SEO/ホームページ→購入→在庫減算、再送/同時操作、通信断、Catalog/画像の冪等性、D1結果保存/公開失敗、競合、既存注文保護、画像型/メタデータ、既存3商品取込、Alarm/再起動、外部価格変更、緊急新規注文停止/既存復旧、管理無効化後の購入スナップショット復旧を検証。

設定生成と専用設定を指定したWrangler 4.151.1 dry-runも成功。外部APIは代替実装で、実Square Sandbox購入や実Cloudflare Alarmの検証ではない。コードは未コミット・未プッシュ。

## Codespaces対応後のローカル検証結果

`npm --prefix dev test`: 98件成功、失敗0・スキップ0（従来93件＋追加5件、約94秒）。追加テストではCodespaces環境の1ホストだけの許可、不正メタデータ・Host・Origin・転送ヘッダー・絶対URLの拒否、HTTP経由の管理認証・商品保存・在庫更新・注文詳細・発送、二重発送の拒否、固定IDの架空注文の再追加防止、既存注文/発送済み状態/変更済み在庫の再起動後の保持、外向き通信拒否を確認した。外部宛先は拒否ハンドラーで応答し、実Square/Resend/Cloudflareへ接続しない。JavaScript構文チェックとgit diff --checkも成功。実CodespacesのPrivate転送・Android操作は未検証。今回コミット・プッシュ・デプロイは行っていない。
