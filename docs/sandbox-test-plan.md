# 検証計画とAndroidからの準備

現在の進行は[GitHubブランチからCodespacesへの引き継ぎ](android-codespaces-handoff.md)を優先する。Access/D1/マーカー/DNS/Resendは確認済み。以下の過去の準備手順を繰り返さない。今回は保存対象レビューだけで実行承認待ち。

専用ドメインとAccess入力案の最新条件は [access-validation-domain.md](access-validation-domain.md) を優先する。Cloudflare準備・Android手順・デプロイ前チェック・停止復旧手順は [cloudflare-validation-setup.md](cloudflare-validation-setup.md) を優先する。Squareは3商品登録と各5個の設定まで完了済み。新しい検証では商品登録・在庫初期化を繰り返さない。

Accessアプリyasoya-payments-validationはユーザー確認で作成済み（validation.awaiaune.com、管理者1件Allow、1時間）。アプリ再作成は不要。次はAUD・チームドメイン等の確認と、専用Worker/D1/DOの安全確認を行う。

## 実施段階と承認

1. 今回: 既存29件と追加のオフライン安全テスト。外部接続・リモート資源作成・デプロイなし。
2. 次回承認前: 公開IDを受け取り、manifestと生成設定をレビュー。秘密値は受け取らない。
3. 明示的な承認後のみ: 専用D1作成とマーカー適用、専用Worker/DO/Assets公開、専用Secrets登録、Cloudflare Access等による閲覧者制限。Git自動デプロイは設定しない。
4. さらに承認範囲に含めた場合だけ: Square Sandboxの読み取り確認→テスト在庫設定→架空カードによるテスト決済。本番エンドポイント・実カード・実在庫は使わない。

## 先に確認する項目

- 専用Worker名、workers.dev URL、D1名・UUID、instance_id、DOが検証Worker自身に属すること。
- D1は空の新規DBから開始し、既存本番注文をコピーしない。
- SquareはDeveloper DashboardのSandboxタブ。Sandbox Application ID、テスト販売者Location、3 Variation IDがmanifestと一致。
- Sandboxは3商品3Variation・各980円。セイタカアワダチソウの検証用名称は「セイタカアワダチソウ 葉 10g」。送料と商品IDは既存どおり。Square側のテスト商品は新規で、現在の本番Variation IDを使わない。
- 受信者は管理者所有のテスト用1件だけ。注文入力の氏名・住所・電話も架空データ。
- Cloudflare/GitHubのProduction main連携とは無関係な検証Worker。新しいGitHub連携・本番route/custom domainを付けない。
- Secretの名前・存在のみを確認し、値をログ・スクリーンショット・チャット・Gitへ出さない。

## シナリオ

| シナリオ | 実施場所・方法 | 合格条件 |
|---|---|---|
| Sandbox決済成功 | 承認後、検証ページでSandbox公式の現行テストカードを入力 | 決済1回、在庫1回減算、D1注文1件、メールはテスト受信者だけ |
| 決済失敗 | Squareの現行公式資料にある失敗用トークン／カードを確認して使用 | COMPLETEDにならない、在庫減算なし。結果不明と確定失敗を区別 |
| 購入者側の通信断 | Android Chromeで送信後に機内モード→復帰→同じ画面で確認 | 同じattemptIdで照合し、再課金・再トークン化なし |
| Square応答喪失 | ローカル代替が成功後に応答を失うテスト。共有検証Workerへ障害用公開APIは追加しない | 同じ注文の決済照合で復旧し、課金は1回 |
| 二重タップ・再送 | ローカル自動テスト＋検証ページの同一注文の再確認 | payment ID同一、D1/在庫各1回 |
| DO Alarm | ローカルは実Miniflare Alarmで自動確認済み。承認後は専用環境の保留を作り、全画面を閉じてログとD1で確認 | ブラウザなしで復旧。別注文の巡回が止まらない |
| D1書込失敗 | ローカルの隔離DBトリガーで注入。検証D1の権限や本番DBを壊して再現しない | DO台帳から復旧、在庫確定済みSKUは販売継続、旧注文・発送情報維持 |
| 在庫失敗・応答喪失 | ローカル代替で注入 | 同じキー・日時・payloadで再送、二重減算なし |
| 保留の範囲 | ローカル＋承認後のSandboxテスト在庫 | 異常SKUだけ停止。Sandboxでは他の2商品が購入可能。兄弟バリエーションの試験は従来構成を残したローカル代替で維持 |
| 残り1個・同時購入 | ローカル並行テスト。承認後は専用テストVariationだけ数量1で確認 | サイト内で成功は1件。外部POSとの原子排他は保証しない |
| 手動確認通知 | ローカルResend代替で上限・不一致・期限切れを再現。実通知は別途承認後にテスト先だけ | 一時障害は通知しない。要確認注文だけ固定キーで送信。応答喪失で重複通知しない |
| 再起動・再デプロイ | ローカル再起動済み。検証環境の再公開も都度承認後のみ | 台帳・SKU保留・Alarmが維持され、復旧処理の重複で課金しない |

本物のSandboxではタイムアウトやDB障害を安定して発生させられないため、決定的な障害テストはローカル代替で維持する。Sandboxの成功を全障害ケースの検証済みと扱わない。実際のSDKのCSP接続先や本人認証画面も検証し、本番ホストを許可して通す回避策は使わない。

## Androidで行う操作（端末のターミナル作業は不要）

### A. 承認前に準備できること

1. ChromeでSquare Developer Dashboardへログイン。必要ならChromeメニューの「PC版サイト」を使う。
2. 登録済みのSquare検証アプリを開き、「Sandbox」を選ぶ。アプリの新規作成・商品再登録はしない。
3. Sandbox Application IDと、Sandboxテスト販売者のLocation IDを控える。アクセストークンはチャットに送らない。
4. Sandbox Test AccountからSandbox Dashboardを開く。本番のSquare通常Dashboardでないことを確認する。
5. 登録済みの3商品3バリエーション・各980円・各5個を読み取り確認する。違っていたら報告し、再登録・再初期化で戻さない。
6. Cloudflare Dashboardへログインし、アカウントIDと検証用workers.devのサブドメインを控える。この段階では「Deploy」「Save and deploy」は押さない。
7. 自分が受信できるテストメール1件と、Resendで利用可能な送信元を決める。可能なら検証用Resendキーを別に用意する。送信元ドメインの認証が必要な場合は既存認証を確認し、無断でDNSを書き換えない。
8. アプリID・Location ID・Variation ID・CloudflareアカウントIDなど秘密でない情報だけを共有する。秘密キーと管理者トークンは共有しない。設定案の再確認後に検証環境作成／デプロイを承認する。

### B. 明示的に承認した後に行うこと

9. Cloudflare「Storage & databases → D1」から新規yasoya-validation-ordersを作成し、UUIDを控える。yasoya-ordersは開かず、データのエクスポート／インポートもしない。
10. その新規DBのConsoleで、レビュー済みのvalidation-marker.sqlだけを実行する。DB名・UUID・instance_idが生成設定と一致することを確認する。既存データの削除や初期化をしない。
11. Worker作成はGitHub接続を使わず専用名yasoya-payments-validationで行う。Dashboardの初回作成はデプロイを伴うことがあるため、承認前には実行しない。コードとAssetsの反映は承認済み手順をこちらで実施できるため、Androidでコードを一式貼る必要はない。
12. 専用WorkerのSettings → Variables and Secretsに、SQUARE_SANDBOX_ACCESS_TOKEN、RESEND_VALIDATION_API_KEY、VALIDATION_ADMIN_TOKENをSecretとして登録する。最後は独立した32文字以上のランダム値。通常の本番Secret名や値をコピーしない。保存が再公開を伴う場合も承認対象に含める。
13. BindingsでORDERS_DBが新規D1、PURCHASE_COORDINATORがこの検証WorkerのSandboxPurchaseCoordinatorであることを確認する。本番Workerや本番DBへの参照があれば停止する。
14. 検証URLの閲覧制限はCloudflare Accessを必須とし、全パスをテスト受信者と同じ所有者メール1件だけに制限する。専用のチームドメインとAUDをmanifestへ反映し、Worker側の署名検証も有効にする。設定項目が見つからなければ公開のまま購入試験へ進めず停止する。
15. 検証ページをChromeで開き、Square公式のSandboxテストカードと架空の注文情報だけで試験する。メールは指定テスト先を入力する。実カード・実顧客情報は入力しない。
16. Sandbox Dashboardの決済IDとD1の注文番号・在庫、テストメールを照合する。ログにトークンや個人情報が出ていたら共有せず停止する。

画面名はサービス更新で変わる場合がある。分からない項目は本番の設定を流用して埋めず、その項目だけ確認する。今回Bの操作はまだ行わない。

## 初回のローカル結果（3商品化前）

`npm --prefix dev test`: 37件成功、失敗0、スキップ0（既存29件＋追加8件）。
追加分は本番ID・設定の混入拒否、Secret名分離、送信先・受信者制限、D1マーカー、Sandboxフロント生成、設定不備時の無通信拒否、および専用入口での注文・D1保存を代替APIだけで確認した。
実Sandbox API、Cloudflareリモート資源、Androidブラウザ、実メールには接続していない。検証資源・公開ID・専用Secret・承認が未取得のため、実環境の動作確認は未実施。

## 3商品化後のローカル結果

`npm --prefix dev test`: 60件成功、失敗0・スキップ0（既存52件＋追加8件）。Sandboxの3 ID限定、旧対応表・在庫入力拒否、生成HTML・カートからの20g除外、登録計画と対応表、廃止SKUの検出を確認。検証Workerの見積・在庫・決済入口で20gを無通信拒否する統合試験も実施。本番定義と従来ローカル4Variationの回帰試験を維持。実API接続・商品登録・在庫変更・決済・デプロイは未実施。

## Cloudflare準備後のローカル結果

`npm --prefix dev test`: 63件成功、失敗0・スキップ0。既存60件を維持し、Access設定・署名検証とオフライン対応表照合の3件を追加。詳細と未完了項目はcloudflare-validation-setup.md参照。

## D1マーカー保存確認後のデプロイ準備

ユーザーが検証D1でマーカーSQLを実行し、SELECT結果を確認済み。SQL再実行とAccess/D1再作成は不要。HTTP入口に加え、起動済みDOのfetch/Alarmと7業務サービスの直前にもマーカー照合を追加した。不一致・欠落・D1エラーでは業務処理へ進まない。最新の承認段階・Custom DomainによるDNS作成の影響・テスト結果は[公開前レビュー](validation-predeploy-review.md)を参照。デプロイ・DNS変更・Secrets登録はまだ承認待ち。
