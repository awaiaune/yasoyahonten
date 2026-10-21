# 作成済み検証D1の照合と次の準備

## 受領した進捗（2026-10-21・日本時間）

ユーザーからyasoya-validation-ordersの作成完了、Database ID、Account IDを受領した。識別子はGit対象外のmanifest.local.jsonへ反映済み。既存Accessアプリも再作成しない。

- Database IDのUUID形式を確認し、本番yasoya-ordersの既知UUIDと異なることをローカルの本番設定ファイルと比較した。本番DBには接続していない。
- 提示されたAccount IDはローカル設定済みアカウントと一致。実際のCloudflare所属はAPIで未照合。
- 現在のCodex環境はCloudflare API用認証なし、api.cloudflare.comへの通信許可なし。公開IDだけではAPI照合できないため、認証の流用・通信制限の回避をせず停止した。
- 予定バインド名はORDERS_DB。validation/prepare.mjsとsafety.jsは専用DB名とmanifest.databaseIdの完全一致を要求する。Workerへの実バインドはまだ行っていない。

この段階の記録は「ユーザー提示情報とローカル設定の照合済み、リモートメタデータ未照合」。新しいD1の再作成は不要。

## ユーザー画面での確認完了

ユーザーからCloudflare画面でDatabase IDの一致を確認済みとの報告を受け、UUID確認は完了扱いとする。同じ確認を繰り返し依頼しない。APIで独立照合していないことは履歴として区別する。Access/D1の再作成は不要。

ユーザーが識別マーカーSQLを適用し、SELECTでid=1と生成済みinstance_idの一致を確認済み。SQL再実行は不要。次は[公開前レビュー](validation-predeploy-review.md)に沿ってWorkerのデプロイ範囲と停止位置を確認する。公開は承認後のみ。

## 残る作業と承認の区切り

- ローカルmanifestの必須項目はすべて入力済み。オフライン設定・サイト・マーカーSQLの生成とチェックに成功。実リソース・Secret・DNS/TLSまで完成したことを意味しない。[公開前レビュー](validation-predeploy-review.md)を参照。
- ユーザー画面の確認結果を採用し、生成済みの専用Wrangler設定・Assets・マーカーSQLと影響範囲をレビューする。
- 既存の独立instanceIdを保持する。DBのUUIDとinstanceIdは別物。マーカーは自動作成しない。
- 検証用Workerはyasoya-payments-validation、ORDERS_DBは作成済み検証D1のUUIDだけ、DOはそのWorker内のSandboxPurchaseCoordinator。外部script_nameや本番バインドを使わない。
- マーカーSQLはユーザー適用・SELECT確認済み。既存値を保持し、再実行・再初期化しない。
- Worker作成・デプロイ・Custom Domain/DNS/証明書作成・専用Secrets登録は対象とコマンドをレビューし、別途承認後。既存Access設定とAUDも照合する。
- 最初は未認証拒否・所有者ログイン・管理API追加認証・健康状態・商品/在庫読み取りを確認。決済と在庫減算はさらに別途承認後。

## 今回行っていない操作

Cloudflare API照合、SQL実行、Worker作成・接続、デプロイ、DNS変更、Square API接続・決済・在庫変更、コミット・プッシュ・マージ。本番コードと本番設定は変更していない。今回実施した検証は公開IDの形式・既知本番IDとの差異・Git除外・予定バインドのローカル確認だけで、既存65件のテストは再実行していない。
