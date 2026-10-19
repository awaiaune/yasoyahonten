# Square Sandbox商品・在庫の準備（実行未承認）

今回作成したのはスクリプトとオフラインテストのみ。Square APIへは接続しておらず、商品・在庫・Workerを作成していない。デプロイ・本番変更・コミット・プッシュも行わない。

## 読み取った実データ

価格・購入上限・商品IDはworker/src/catalog.js。商品グループはproducts/*.htmlのdata-product-idとProduct/ProductGroup構造化データを読み、名前・価格の一致を検査する。READMEの古い商品一覧から推測しない。

| 商品グループ | サイト商品ID | Variation名 | 価格 |
|---|---|---|---|
| 乾燥レモンバーム 10g | lemonbalm-10g | 乾燥レモンバーム 10g | 980 JPY |
| 乾燥ヨモギ 10g | yomogi-10g | 乾燥ヨモギ 10g | 980 JPY |
| 乾燥セイタカアワダチソウ | goldenrod-leaf-10g | 乾燥セイタカアワダチソウ 葉 10g | 980 JPY |
| 同上 | goldenrod-leaf-stem-20g | 乾燥セイタカアワダチソウ 葉と茎 20g | 980 JPY |

3つのITEMと4つのITEM_VARIATIONを一括作成する。送料は既存コードの350円／商品合計3000円以上無料を維持し、Squareの商品や在庫として送料を登録しない。購入上限10は在庫数ではない。在庫数を推測して初期化しない。

## スクリプト

`validation/seed-square.mjs`。追加依存なし（Node 24確認）。

- `plan`: ファイル読取りのみ。トークン不要、APIアクセスなし。商品と価格を表示する。
- `catalog --approve-sandbox-write`: 承認後だけ使う。Sandbox preflight→カタログ全ページ読取り→不足分だけ1バッチで登録→再読取り検証→対応表保存。
- `inventory --approve-sandbox-write`: 別途在庫初期化を承認後だけ使う。対応表を照合し、未初期化で在庫レコードのないVariationだけに明示数量でPHYSICAL_COUNTを一括送信する。

今回はplanと代替APIのテストのみ実行する。書込み用フラグは、人による実行承認に代わるものではない。

## 安全性

- APIホストはコード内でconnect.squareupsandbox.comに固定。任意URL、環境切替、本番へのフォールバックは禁止。
- Square-Versionは既存設定と同じ2026-07-15を固定。未対応なら失敗として止め、勝手に変更しない。
- SQUARE_SANDBOX_ACCESS_TOKENだけをメモリ上で読む。通常のSQUARE_ACCESS_TOKENが環境にあれば拒否する。トークン引数・設定ファイルのtokenフィールドは受け付けない。
- Application IDはSandbox形式、Locationは本番の既知ID以外。実行前にSandboxのGET /v2/locationsで指定Locationの存在・ACTIVE・日本・JPYを検証する。
- アクセストークンの発行元はオフラインで証明できない。誤って本番値を貼ることをコードだけで判定できないが、送信先は必ずSandboxで、本番エンドポイントを使わない。Sandbox認証・Location照合失敗時はそこで止まる。Application IDとトークンの同一アプリ性は画面でも確認する。
- HTTP redirectは追従しない。APIエラー本文・例外詳細・Authorization・トークン値はログに出さない。
- サイトの商品IDは維持するが、本番Square Variation IDを作成・在庫要求に使わない。レスポンスIDも既知本番IDなら拒否する。
- 秘密情報を保存しない。生成JSONには公開ID、商品情報、操作キーと状態だけを入れる。操作の冪等性キーは認証トークンではない。

## 重複作成と復旧

専用SKU `yasoya-sandbox-v1:<商品ID>` とITEMのdescriptionマーカーで管理対象を識別する。
既存の対象は、名称・価格・通貨・Location・Variation構成・在庫追跡が完全一致した場合だけ再利用する。上書き更新はしない。似た名前だけの商品、同じSKUの未管理商品、重複・不一致・削除済み結果があれば停止する。

作成前にpendingジャーナルをfsync＋atomic renameで保存する。同じ入力のCatalogバッチには決定的な同一キーを使用する。ローカルの排他ファイルで二重起動を拒否する。
送信後に応答が失われても、次回の完全な一覧読取りで全対象が確認できれば対応表だけを回復し、2回目の作成を送らない。確認できなければ新キーで再作成しない。

本ツールは一つの実行環境から単独実行する前提。他端末・別環境から同時に登録せず、実行中にDashboardで対象を編集しない。Square側の冪等性・一覧可視性・descriptionやLocationの返却形式は実API未検証。想定と違えば安全側に停止する。ジャーナルや排他ファイルを消して無理に再実行しない。

## 在庫の初期化

`validation/square-stock.example.json` は全数量nullで、未承認のまま実行できない。全4商品IDの整数数量（0〜1000のテスト用範囲）を明示する必要がある。
最後の1個の試験なら対象Variationだけ1、他の商品は販売継続試験に必要な数を決める。これらは試験計画であり、実在庫から複写しない。

既にいずれかの状態の在庫レコードがあれば、数量0でも自動初期化を拒否する。現在数が空でも在庫変更履歴があれば拒否する。履歴が途中ページまでしか得られない場合も停止する。Squareが商品作成時に0レコードを自動作成した場合も止まり、履歴確認後の別途判断が必要。
初期化済みジャーナルがあれば、テスト購入で数量が減った後も再設定しない。数量を変えて同じツールでリセットすることも拒否する。
在庫更新の応答が失われた場合はpendingのまま保持し、再送もPHYSICAL_COUNTでの再上書きも行わない。Sandboxの在庫履歴を確認する別の承認済み対応が必要。追加の入庫や棚卸しツールではない。

## ファイル

入力（.gitignore対象）:
- validation/square-seed.local.json: square-seed.example.jsonを基にenvironment=sandbox、取得したApplication IDとLocation IDだけを記入。
- validation/square-stock.local.json: 全4商品IDと承認した数量だけを記入。

出力（.gitignore対象、認証情報なし、権限0600）:
- validation/.generated/square-variations.local.json: 商品ID→Sandbox Variation ID、グループ→Sandbox Item ID、Location、ソースダイジェスト。
- validation/.generated/catalog-journal.local.json: カタログ作成のpending/verified状態。
- validation/.generated/inventory-journal.local.json: 在庫初期化のpending/verified状態。
- validation/.generated/square-seed.lock: 排他。異常終了で残る場合は、実行中プロセスと未確定API結果を調査するまで消さない。

対応表のvariationsを、既存検証環境のmanifest.local.jsonのvariationsへ取り込める。アプリ・Locationの一致とvalidation/prepare.mjs checkを確認してから使う。Cloudflareの設定をこのスクリプトが自動で変更することはない。

## Androidだけで行う手順

1. ChromeでSquare Developer Dashboardを開き、取得済みのSandbox Application ID／Location IDがDefault Test Account（日本）のものか再確認する。必要なら「PC版サイト」を使う。
2. Sandboxの商品ライブラリは0件のままでよい。先に手動で同名商品を作らない。
3. このクラウド実行環境の設定画面からSecretsへSQUARE_SANDBOX_ACCESS_TOKENを登録する。Square Developer DashboardのSandboxタブで発行した値だけを貼る。通信先の指定欄があればconnect.squareupsandbox.comだけを指定する。本番のキーを流用しない。
4. 秘密値はチャット・GitHub・スクリーンショットに貼らない。Secretsを登録する画面がなければ停止して、その画面がないことだけを伝える。
5. 秘密でないApplication IDとLocation IDを共有する。こちらでsquare-seed.local.jsonを用意し、まずオフラインplanを提示する。スマホでファイルやターミナルを操作する必要はない。
6. 作成する3商品4Variationと各980円を確認し、「Sandboxの商品登録と事前の読み取り確認を承認する」と明示する。今回の依頼だけではまだ実行しない。
7. 承認後にこちらが単独実行する。成功したらAndroidのSandbox Dashboardで商品を確認する。失敗時はトークンやジャーナルを削除してやり直さず、状態を確認する。
8. 次に初期数量を全4Variationについて決め、在庫初期化を別途承認する。商品登録と在庫初期化は独立して確認できる。
9. 生成したVariation対応表とSandbox Dashboardの数量を確認する。テスト購入後にこの初期化を繰り返して在庫を戻さない。
10. Cloudflare検証Workerへの設定反映・デプロイ・テスト決済は、別段階で設定を確認し承認する。本ツールは決済もデプロイも行わない。

現在のApplication ID／Location IDの値やトークンはまだ取得していないため、実APIの認証・Location・商品作成・実在庫初期化は未検証。

## 今回の検証結果

npm --prefix dev test: 52件成功、失敗0、スキップ0（既存37件＋追加15件）。
商品定義一致、設定混入拒否、Sandbox事前照合、redirect拒否、一括作成・再実行・既存衝突・応答喪失、対応表、数量未指定拒否・在庫再初期化防止・既存履歴、ジャーナル耐久化・排他・秘密値非出力を代替APIで確認した。
実行したCLIはplanだけで、実API接続・商品作成・在庫初期化・デプロイは行っていない。
