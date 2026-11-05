# 実Sandbox 3DS検証（2026-11-06）


## 通信許可追加後の再検証結果（最新）

検証基準70479680ca434a2f8a7427fe60971394d7bbaa14。Square SDK・3DSシミュレーター・Payments・Inventoryは実Sandboxへ接続。VISA/JCBの公式Web SDK用シナリオを利用し、日本Location・JPY・商品980円＋送料350円＝1,330円で実施した。

| シナリオ | 実結果 |
|---|---|
| VISA/JCB、チャレンジなし各1件 | 各COMPLETED、決済POST各1回 |
| VISA/JCB、チャレンジあり各1件 | 実認証画面表示→公式コード入力→認証POST 200→各COMPLETED |
| 公式の認証失敗シナリオ | tokenizeはOK、その後のPaymentsは402 / CARD_DECLINED_VERIFICATION_REQUIRED / PAYMENT_METHOD_ERROR / FAILED。注文・減算・メールなし |
| 認証画面で中断 | SDK失敗で終了。Payments未送信、注文・減算・メールなし |
| ブラウザへ購入応答を返さない障害注入（修正前・修正後） | 計2件COMPLETED。元試行の照会・再読込で復旧し、再課金・再減算・二重注文・メール重複なし |

実COMPLETEDは計6件、意図したFAILEDは1件。認証中断は決済作成0件。保存済み7件すべてを実GET /v2/payments/{id}で再照合し、金額1,330 JPY・Application ID・Location・注文参照の一致を確認。Request IDは取得応答ヘッダーに含まれず未取得。Payment IDを含む安全な証跡はGit無視のdev/.state/real-sandbox-sca/に保存し、カード・nonce・Secret・生レスポンスは結果記録に含めない。

専用Sandbox在庫は20→14点（減算6）。ローカル注文6件、各980+350=1330、各inventory_adjusted=1。メールは各2宛先、計12タスクがローカル受理シンクでaccepted。未解決試行・在庫保留なし。旧応答消失試行は、Sandbox購入受付OFFのまま同じ試行・同じ決済でTHANK YOUへ復旧し、追加のSquare決済/在庫書込み/メール受付はいずれも0。

追加の製品修正はjs/checkout-v1.jsの状態確認ボタン制御だけ。認証開始から決済送信中まで無効にし、状態不明の応答後に再び有効にする。処理中の押下が黙って無視される状態を防ぐ。認証前の非同期待機は復活させず、課金・注文・在庫・メールのサーバー処理と本番設定は変更しない。遅延SDK/遅延決済を使う回帰テストを追加した。

ローカル最終回帰は通常372件＋追加191件＋UI78件＝641件成功、失敗・スキップ0。公開用Worker/管理Workerのesbuildと、staging/production生成資材のcheckout-v1.js一致も確認した。これらの件数は実Square決済件数とは別。

### 検証の限界

- merchant資材/API実行、D1相当SQLite、DO保存アダプター、メール受付シンクはローカル代替。実Cloudflare D1/DO・Alarm・Resend受付/配信は未検証。
- チャレンジ画面は実表示し、有効なAuthenticateボタンをキーボードで確定した。マウス自動クリックは安定せず、Android Braveの実機タップは未検証。タップ動作まで成功とは扱わない。
- シミュレーターのstackpath.bootstrapcdn.comのstylesheetとmerchantのGoogle Fontsはこの環境では取得していない。認証・決済は完了したが、これらの完全な見た目は検証していない。
- 通信断は実ネットワーク障害ではなく、Squareの実決済後にmerchant応答を破棄する障害注入。Square自体が長時間不通になるケースの実障害試験は行っていない。
- Production決済、公開/デプロイ、push、本番D1/DO/R2・設定は変更していない。本番販売開始の可否や実カード認証はこの検証だけで確定しない。

以下は通信許可追加前の履歴であり、当時のSTOP判定・未到達件数を保存したもの。


基準：7ed2e00a4606d58c0bccc8115a2619af97a47d9f。購入ON・デプロイ・push・Production APIへの送信は行っていない。

## 実通信で確認した事実

- Sandbox GET /v2/locations：200。設定LocationはJP / JPY / ACTIVE、カード処理対応。
- 実Web Payments SDK・PCI iframe：200、実カード入力フォームを配置できた。
- 正式なWeb Payments SDK用SCA表のVISAを使用し、1,330 JPYで本人認証開始。開始時user activation=true。
- SDKはmerchant document内にPOSTフォームを生成し、Square管理のapi.squareupsandbox.comへ本人認証情報を送る。実ブラウザでform-action違反を再現。blocked URIは保存せず、Squareドメインのホストだけを検査した。
- 基準CSPはform-action 'self'のため、この正規POSTを遮断する。frame-src/connect-srcにSquareを許可してもform-actionは独立している。
- この時点でSDK処理を安全中断。Payments POST=0、COMPLETED=0、注文・在庫減算・メール・サンキューは未到達。成功証拠として提示できるPayment IDはない。

## 修正

stagingはform-actionにhttps://api.squareupsandbox.comだけを追加。Productionは対応するhttps://api.squareup.comだけを追加した。Production実通信での3DS検証はしていない。任意のカード発行会社ドメイン、https:全体、ワイルドカードフォーム送信は許可していない。frame/script/決済台帳・在庫・メール処理は変更しない。

SquareフォームPOSTの許可と、無関係な発行会社へのフォームPOST遮断をブラウザ回帰テストへ追加。これはモックであり、実Sandbox完走の代用ではない。

## 残る阻害要因

現在のCodex通信許可にapi.squareupsandbox.comがない。実認証を続けるには同ホストを追加してPublishが必要。square-fonts-production-f.squarecdn.comも実取得403（未許可）。d1g145x70srn7h.cloudfront.netは字体の予備配信先として合わせて許可する。認証情報の再登録は根拠がないため依頼しない。

最初の診断ハーネスではIn-App SDK表のカードを誤抽出した。Web SDK専用表に訂正した結果を上記の証拠とする。誤った試験データで出たPCI BAD_REQUESTを製品不具合の根拠にしない。またネイティブChromiumには既存環境CAが不足していたため、環境プロキシCAだけをNSSへ追加し、TLS検証を無効化せずに解決した。

## データと代替範囲

既存商品に触れず、専用Sandbox Item/Variationと初期20点の専用在庫を作成した。確認終了時20点。既存のSandbox商品・本番商品・本番在庫を編集していない。再実行時は保存したリソースID・冪等キーを再利用し、在庫初期化を繰り返さない。

注文SQLite/DO保存アダプター/メール受付シンクはローカル代替。リモートD1/DO、Resend受付・配信は実検証していない。メールはstaging側OFFのままであり、実配送成功とは扱わない。

私有ハーネス・専用リソースID・安全な失敗証跡はGit無視のdev/.state/real-sandbox-sca/へ保全。Secret・カード値・nonceはコミットしない。公式カード表はWeb SDK節だけをHTMLParserで取り込み、値を標準出力に出さない。実決済ハーネスには--run-real-sandboxと認証先通信許可の事前チェックがある。実SDK/Payments/在庫とローカル代替を結果で区別する。

再開：通信許可Publish後、公式Web SDK表を取得し、保存済み専用商品を再利用してVISA/JCBチャレンジあり・なしを検証する。実COMPLETEDを取得してから中断・応答消失・同一試行照会へ進む。不明な決済は新規試行で再送せず、同じ試行の読み取り照合に止める。

最終ローカル検証：標準回帰371、追加191、UI78、計640件成功（失敗・スキップ0）。購入・管理Workerのローカルビルド成功。Square本人認証フォーム許可の新規3ケースはモックで、実Sandbox完走とは別に数える。実COMPLETEDは0件のまま。現時点の判定はSTOP。
