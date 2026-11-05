# 決済本人認証の調査と修正（2026-11-05）

## 判定と実証範囲

基準 `18cc5fa9330a227cbb3a298d7ae25c3b4dcebd3c`。本番・push・決済ON・外部決済APIの実行は行わない。

確定：HTTP 402 / CARD_DECLINED_VERIFICATION_REQUIRED / PAYMENT_METHOD_ERROR / FAILED は利用者提供の事実。追加認証要求による拒否を示すが、拒否の根本理由・カード発行会社の認証結果は不明。

実ブラウザで確定：基準コードの購入可否APIを6.1秒遅延させると、SDK呼び出し時の transient user activation は false。修正版は同じ遅延でも true。ブラウザは実物、SDK・通信・発行会社はローカル代替である。実Squareがこの差によって拒否したことは証明していない。

公式仕様：https://developer.squareup.com/docs/web-payments/take-card-payment

Card.tokenize(verificationDetails) が認証を実施し、返却された token を CreatePayment.source_id に渡す。旧 verifyBuyer()/verificationToken を推測で復活させない。SDKの OK は最終決済・本人認証承認の独立した証明ではない。

## 旧 main と基準コードの全変更領域

旧 main `c32234d9bfcc09f6a8edddd91d6a88e3ee56809e:js/checkout.js` と基準 `js/checkout-v1.js` を比較。

| 領域 | 旧 | 基準・維持する安全性 |
|---|---|---|
| 初期化 | 見積→カード配置 | 既存試行→契約/受付→見積→SDK待機/環境検証→カード配置 |
| PAY NOW | 直ちに tokenize | 既存試行・受付API待機後に tokenize（今回の修正対象） |
| 本人認証内容 | 金額/JPY/CHARGE/customerInitiated/sellerKeyedIn/contact | 同一。contact抽出処理も同一 |
| SDK呼出し | card.tokenizeを直呼び | Promise.then経由、5分の期限、CSP frame/form違反で中断。期限/CSP中断は維持し直呼びへ変更 |
| 決済API | /api/payments | /api/v1/payments、contractVersion、固定attemptId |
| 再試行 | catch後ボタン再有効化 | prepared/submitted保存、結果不明で同一試行を保持、再課金禁止 |
| 失敗表示 | SDKの生エラー/console.error | 固定日本語メッセージ、許可された診断分類、SDK詳細非表示 |
| 結果確認 | なし | 状態照会ボタン、再読込復旧、404でも送信済み試行を破棄しない |
| 完了 | 応答後カート消去・URL遷移 | paymentId/orderReference確認、タブ内照合参照、サンキューページで注文再照合 |
| 通信 | fetch | no-store、期限、契約不一致と不明結果を区別 |
| UI | エラー/在庫表示 | フォーム初期化段階、CSP・SDK不一致、購入停止/再読込操作、重複操作抑止 |

CreatePaymentのリクエスト本文構築も旧/基準間で同じ。Productionの公開App ID / Location IDはソースと準備設定で一致。実稼働設定・SecretのSquareアプリ所有関係は未確認。

## 今回の実装

1. 初期化時の既存試行・購入可否・商品在庫照合を維持。
2. PAY NOWでは同期的なフォーム・ローカル状態確認→固定試行ID→SDKを直呼び。認証前のfetch/await/Promise.thenを除去。
3. 認証後に既存試行、最新購入可否、見積り・在庫を再確認。購入OFF、照合通信失敗、見積/カート変更、他タブでの試行変更なら決済APIへ送信しない。
4. 固定試行・DO直列化・Square冪等キー、価格/在庫サーバー検証、メールOutboxを維持。CSP許可先・3DS方式は変更しない。
5. 診断専用DOキー `payment-trace:<attemptId>`。既存attempt/保留/注文を編集しない。最大7日、200試行、64イベント/試行、ブラウザ報告24件/試行。過剰なブラウザ報告でサーバー証跡を追い出さない。期限は初回記録基準で延長しない。Alarmが物理削除、取得時も期限切れは除外。稼働停止時は削除が遅れる可能性がある。
6. ブラウザ報告はstage/操作有効boolean/固定CSPディレクティブ/連番だけ。サーバーはstage/HTTP/公式コード/受信ヘッダーのRequest ID/メール宛先区分ごとの状態だけ。カード、トークン、氏名・メール、URL、生レスポンスは記録しない。
7. 診断の送信/保存失敗は決済・メールの成否を変えない。診断が欠落すれば「未確認」。ブラウザ報告は改変可能で、決済証拠・認可に用いない。Origin制限だけを認証とは扱わない。保存上限で資源を制限。
8. 認証済み GET /api/admin/payment-attempts?include_failed=1&include_diagnostics=1 で履歴取得。ProductionはAccess JWT+管理者認証を既存のまま必須とする。公開側POST /api/v1/payment-diagnosticsは書込みのみで、購入・復旧・診断読取りは実行できない。
9. メール状態の診断はaccepted（Resend受付）とdeliveredを区別。購入OFF時のAlarmによるメール単独復旧も記録する。

SDK OK時に認証前のAPI待機を取り除いたことだけを根本原因確定とは扱わない。Chrome製品版 157.0.8103.38 でも同じアクティベーション差を再現した（SDK・決済はモック）。

保存先はDOのみでD1 SQL・Secret追加・本番設定変更は不要。診断履歴が一部欠けても、台帳・保留・Outboxを基準に復旧し、履歴欠落を再課金許可にしない。

## 配信物と実環境

`node production/prepare-v53.mjs` はcheckout/adminの現行JSをproduction/.generated/v53へコピーする。テストで元ファイルと生成物を比較する。管理Workerのパッケージは同じadmin資材を使う。

ネットワーク許可に本番公開サイト、Square SDK/PCI、Sandbox APIがない。Sandbox公開App/Location変数と専用Secretも未設定。したがって実配信JS/SDK/CSP、Production runtime config、稼働Worker Versionとの照合、実Sandbox 3DSは未確認。過去のVersion IDを現在値として転記しない。

実検証再開時：本番サイトのGETだけで公開JSのハッシュ、SDK src、レスポンスCSP、公開App/Locationを確認。認証済み環境で `wrangler deployments status --config <現行の本番local設定>` を読取実行して完全Version IDとトラフィック比率を記録。設定ファイルは書き換えない。

実Sandboxでは専用App/Location/Secretを使用し、Chromeでチャレンジ成功・失敗・中断を実施。同じ試行のSDK結果→Square応答→台帳→在庫→メール受付→サンキュー照合を確認。Android Braveとの比較は別に必要。テストPAN/トークンをログ・画像・traceへ記録しない。モック成功を実Sandbox成功に置換しない。

## ホスト型決済の代替設計（未実装・本番利用不可）

公式仕様：
- https://developer.squareup.com/docs/checkout-api
- https://developer.squareup.com/docs/checkout-api/square-order-checkout
- https://developer.squareup.com/docs/webhooks/step3validate
- OpenAPI: square/connect-api-specification@0689c901bdfe1ff73f47aa28b17ccd6e0c40bf2d

独自SDK認証問題が残る場合は別の決済プロトコルとして導入する。既存charge関数をPayment Link作成へ単純置換しない。

1. DOで固定attemptと見積り（980+350=1330 JPY、3000円以上送料無料）・SKU保留を永続化。既存Square IDを管理上保持する。サーバーが検証した金額だけでCreatePaymentLink.orderを構成。ブラウザ金額は信用しない。
2. リンク作成の固定idempotency_key、order_id、payment_link.id、見積fingerprintをDOに保存。応答消失時に新キーで作り直さない。新規APIの送信権限は別の承認が必要。
3. 在庫の責任を一つにする。ad-hoc line item（catalog_object_idなし）と既存の手動Inventory減算を組み合わせる案をSandboxで検証する。Square側の自動在庫減算との二重反映を許さない。管理上のVariation対応はDOに保持する。
4. webhookは生body+正規通知URL+signature keyでHMAC-SHA256を検証し定時間比較、event_idを永続的に重複排除。イベント受信だけで完了判定せずSquare GETでpayment/order/location/金額/通貨/対応attemptを照合。不明結果は保留。
5. 注文保存・在庫減算・メールは既存の冪等な後処理へ収束。途中離脱・Webhook遅延でもDO AlarmでGET照会する。redirect_urlへの帰還だけでTHANK YOU成功を表示しない。
6. 価格/送料の変更可否、追加送料/チップ/クーポン、同一リンクでの複数支払い、リンク取消と支払いの競合、期限切れ在庫保留、Webhook欠落を実Sandboxで検証する。リンク作成の冪等性だけでは二重課金防止を証明できない。Payment Link単回使用を証明できない場合、この方式は採用STOP。支払い中の保留は単純タイムアウトで解除しない。
7. 全体を満たすまでは現行方式と並行して本番有効化しない。一般公開リンクを単純に設置して販売再開しない。

## 販売開始の条件

ローカル成功だけでは販売開始GOにしない。実Sandbox 3DS成功、実配信構成の一致、未知の既存試行の照合、Android実機確認を終えた後、本番変更と限定実決済は別承認で実行する。現在は購入OFFを維持する。

## テスト実行上の補足

標準回帰とUIは順次実行する。双方に固定8000ポートを使うテストがあるため同時起動しない。ログは/tmpへ保存し、実行には期限を付ける。

標準外の過去の検証も実行したところ、checkoutのnoindex不在と購入OFF時のカート有効化を要求する2箇所の古い期待値が失敗した（親テストを含め失敗3件）。修正前18cc5faの隔離worktreeでも同じ失敗を再現。機能コードは変更せず、noindex維持、購入OFF時は無効/カート空、購入ON時は実際のクリック/追加数量を検査するよう更新した。テストの削除・スキップはしない。

ローカル生成物のSHA-256マニフェスト：/tmp/yasoya-auth-build/asset-manifest.json（公開JS/HTMLだけ。秘密情報なし）。実配信物との照合は未実施。

## 最終ローカル結果

- 標準回帰 `npm --prefix dev test`: 371/371成功、失敗/スキップ0。
- 標準UI `npm --prefix dev run test:ui`: 75/75成功、失敗/スキップ0。
- 標準外の残り全 `.test.mjs`: 191/191成功、失敗/スキップ0。
- 合計637件成功。Chrome製品版157.0.8103.38で認証/CSP/遅延/安全遮断の17件を別途再実行し全成功（637件に重複加算しない）。
- 購入/管理Workerのesbuild成功。生成checkout/admin JS/HTMLは元ファイルと完全一致。
- 実Square Sandboxチャレンジ・実決済：未実施。Android Brave実機：未実施。本番配信物/稼働Version照合：未実施。正式販売判定：STOP。
- ログ：`/tmp/yasoya-auth-regression-complete.log`、`/tmp/yasoya-auth-ui-complete.log`、`/tmp/yasoya-auth-additional-complete.log`、`/tmp/yasoya-auth-chrome.log`。Gitには格納しない。
- 本番設定、CSPの許可先、D1/DO/R2/Square本番データ、購入受付OFF、Secretを変更していない。push/deployは未実施。
