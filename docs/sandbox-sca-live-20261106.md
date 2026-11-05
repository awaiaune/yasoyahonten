# 実Sandbox 3DS検証（2026-11-06、未完了）

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
