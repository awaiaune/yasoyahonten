# 外部業務サービスに接続しないローカル開発

既存の開発ブランチを使用する。mainの直接編集や新しいworktreeは不要。
検証済み: Node 24.19.0、npm 11.9.0。リポジトリルートから:

```sh
cd dev
npm ci --cache /workspace/.npm-cache --no-audit --no-fund
npm test
npm start
```

導入後はworkerでnpm run devでも同じサーバーを起動。127.0.0.1の8000番だけで待受。テストも8000を使用するため停止後に実行。停止はCtrl+C。ポート競合時に他プロセスを勝手に終了しない。

## 分離

商品・在庫を含む統合管理のローカル確認には、リポジトリルートから `npm --prefix dev run management -- --seed --seed-orders` を使用する。Codespacesの8000番は必ずPrivateにする。Androidの操作順、許可ホスト、架空注文、ローカルデータを残す再起動手順は [統合管理の手順](../docs/management-system.md#android--github-codespaces-の-private-転送) を参照。以下の通常サーバー `npm start` の仕様とは区別する。

- 分離サーバーは本番HTML・CSS・商品・送料・URL・Wrangler設定を配信用に書き換えない。Workerはローカルでメモリ上にバンドルする。
- Wrangler設定、.env、.dev.vars、本番認証情報を読み込まない。Workerへプロセス環境を転送しない。
- Miniflareで既存Workerを実行。外向きfetchは全宛先503。Square Sandboxにも接続しない。
- D1とDurable Objectはdev/.stateだけを利用。本番DB IDと以前の/workspace/.yasoya-stateを使わない。テストは一時状態。
- 管理トークンlocal-development-onlyは公開のローカル固定値。本番利用禁止。
- 配信応答だけで設定JSをローカル同一オリジンへ差し替え、全HTMLで最初に読み込む。
- Square SDKを応答から除去し、Application IDとLocation IDは空。決済を停止。
- CSPのconnect-srcはselfのみ。設定不足時も本番URLへのフォールバック通信を遮断。外部script、iframe、フォーム送信も制限。
- 公開ファイルのみ配信。ソース・設定・Git情報を公開せず、HostとOriginも検査する。
- 既存デザインのためGoogle FontsのCSSとフォントだけブラウザで許可。オフラインでは代替フォントとなる。

在庫取得は未設定エラーとなり、商品詳細の購入ボタンが無効になる。実サービスの成功を模擬しない。注文管理はローカル注文だけ。決済・メール・Square在庫管理は未検証。

必ずこの起動入口を使う。Python静的サーバー、直接wrangler dev、file://、本番サイトには分離を適用しない。以前保存されたクラウド起動設定は本手順で置き換える必要がある（今回ドラフトは変更しない）。OS全体のネットワーク隔離ではなく、別プロセスや手動curl、外部リンクへの移動は制限対象外。

Miniflare安定版4.20260730.0に固定。元のcompatibility_dateは保持するが、新しい日付の互換性を完全再現する保証はない。Android実機、ブラウザでのCSP強制、画面比較は後続確認。公開ファイルのフォールバック文字列は維持しているため、このサーバー以外では本番を参照し得る。

## 決済安全性の追加テスト

npm testは隔離・決済復旧・ブラウザ再送制御のテストを実行する。Squareの代替はテスト専用サービスbindingで、通常のnpm startには注入しない。
決済・注文の耐久台帳、管理者向け警告／復旧API、残る制約はdocs/payment-safety-implementation.mdを参照。D1スキーマ変更はなく、実注文データを初期化しない。

決済の保留範囲は現在、注文・Squareバリエーション単位。D1保存待ちだけでは販売を停止しない。Durable Object Alarmによる無人復旧、手動確認時のResend通知、残る外部在庫競合の制約はdocs/payment-availability.mdを参照する。
