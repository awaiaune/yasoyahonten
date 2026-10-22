# Phase 3C-B：検証環境の外部書き込み停止

今回はコードとローカル試験だけ。Cloudflare/Squareへの照会・リソース操作・マイグレーション・デプロイは実施しない。

## サーバー側の設定

| 変数 | 初回導入値 | 意味 |
| --- | --- | --- |
| `SQUARE_ACCESS_MODE` | `READ_ONLY` | Squareへの外部書き込みを拒否 |
| `VALIDATION_CHECKOUT_ENABLED` | `0` | 新規購入停止 |
| `VALIDATION_MAIL_ENABLED` | `0` | 注文・発送・管理異常の実メール送信停止 |
| `VALIDATION_CRON_ENABLED` | `0` | scheduledイベントからの管理復旧停止 |
| `MANAGEMENT_CHECKOUT_PAUSED` | `1` | 既存の購入停止スイッチも維持 |
| `MANAGEMENT_STOCK_WRITES` | `disabled` | 管理者在庫変更停止 |

モードは `READ_ONLY` / `READ_WRITE`、3つの個別スイッチは文字列 `0` / `1` のみ。未指定・不正値・Production環境・実行環境の不一致は停止する。READ_ONLYと購入/メール有効、またはsingle-writerの組み合わせは不正。購入有効と既存購入停止の組み合わせも不正。ブラウザーのリクエスト本文・ヘッダーでは変更できない。

`validation/prepare-management.mjs` は上記の停止設定と空のCron配列で構成を生成し、チェッカーは書き込み可能な初回構成を拒否する。今回、既存のGit対象外生成設定は再生成・上書きしていない。以前の設定は新チェックで拒否されるため、そのままデプロイしない。

ローカル管理サーバーと試験用fixtureは、Square・メールの代替処理だけに明示的なREAD_WRITEを指定する。通常のローカル閲覧サーバーはREAD_ONLY。継承した実Secretや本番設定を読み込まない。ローカル代替Square/メールのバインドがない場合、実APIへフォールバックしない。

## 適用範囲

- 管理API入口で公開・販売状態変更・在庫変更・ジョブ再試行・照合適用を拒否。
- 購入APIとDOの購入入口を停止。既存注文のstatus/recoverは復旧を実行せず、保存済みphaseとREAD_ONLY保留を返す。
- Square Catalog、画像、在庫更新、決済、購入後在庫減算の送信直前に再判定。新しい未知のPOST/PUT/DELETE等も拒否する。
- GETのLocation/Catalog/決済照会とPOSTの在庫counts/batch-retrieveだけを読取操作として許可。接続先はHTTPSの `connect.squareupsandbox.com` だけ。リダイレクトを追従しない。
- DO Alarm、起動時の管理復旧、Cron、手動再試行のいずれからもREAD_ONLYジョブは実行しない。通知も送らない。監視tickはREAD_ONLY中は何も変更しない。
- ジョブID・冪等性キー・payload/body/result・対応表・保留ロックは保持。成功済み外部結果のD1反映も自動再開せず保留する。DOやジョブを初期化しない。
- READ_ONLYは「Square書き込み禁止」であり、D1/R2全体の読取専用化ではない。認証済みの下書き保存・内部画像保存・対応付け・取得在庫のスナップショット保存は可能。ただし今回は実環境で実行しない。
- Resend送信直前に全メール共通の停止判定。READ_ONLY中に停止したメールが、後から必ず自動再送されるとは扱わない。

## 既存商品のIDとSKU

`SQUARE_EXISTING_LINKS` は既存のGit対象外対応表と商品登録計画から生成する公開識別子だけのサーバー側JSON。内部Variation IDをキーに `{itemId, variationId, sku}` を持つ。実際のID対応表をGitに追加しない。

準備スクリプトは既存の対応表のアプリ・Location・商品定義digest・全3Variationを検証した後に生成する。実APIへの接続や再作成はしない。

関連付けではItem/Variation/親Item/SKU/価格/JPY/在庫追跡/Locationを照合。不一致ならDB対応付けを保存しない。既存SKU `yasoya-sandbox-v1:<内部Variation ID>` を、内部IDだけのSKUへ変更しない。同期前に既存SKUを取得して本文へ維持する。画像送信より前に対応付けを確認する。

旧コードの保存済みCatalog本文も送信直前に検査。既存ID/SKUを変える本文は書き換えず拒否し、書込有効時のジョブ処理ではreviewへ移す。新しい操作IDによる自動置換・自動再登録はしない。READ_ONLY解除は別途レビュー・承認が必要。

## 管理画面

在庫は「取得元」「最終取得」「同期状態」を分ける。ローカル代替データの取得をSquare Sandboxとの実同期とは表示しない。未関連付けでは取得時刻は空。READ_ONLY時は在庫操作ボタンを無効化し、商品編集にも読み取り専用を表示する。公開状態と同期状態は別表示のまま維持する。

## 導入前の停止ポイント

1. Phase 3C-Aの読取専用棚卸しは未実施。実際のWorker/D1/R2/DO/Cron/Secret登録名・Accessを把握するまで導入しない。
2. 古い生成設定・Assets/Workerバージョンを使わず、承認済みソースから設定を再生成・検査・dry-runする。dry-runやデプロイは今回実施していない。
3. D1追加マイグレーションとR2の準備は別承認。対応表は保護されたGit対象外設定から復元し、既存3商品を再作成せず、在庫5個の再投入もしない。
4. 読取認証と通信許可が整っても、Squareへの照会は実行前に個別承認を得る。ローカル試験は実環境成功の証明ではない。
5. 旧バージョンで実行中の外部要求や別Workerには、このコードのスイッチは遡及しない。導入時は旧処理・既存Cron・滞留ジョブを調査し、書込停止を確認する。
6. 同一Cloudflareアカウントの編集権限は本番にも及び得る。設定チェックはIAM分離の代替ではない。Production用Wrangler設定は変更しておらず、このSandbox専用コードを本番へデプロイしない。
7. READ_ONLYでの長期保留は再試行期限を延ばさない。解除後、期限切れ・古いSKU本文・不明結果は従来どおりreview/照合が必要。ロックを削除して販売再開しない。

`seed-square.mjs` のクライアントも既定はREAD_ONLY。以前の書込コマンドは環境設定による明示的な解除なしでは動かない。今回は解除・商品登録・在庫設定をしない。
