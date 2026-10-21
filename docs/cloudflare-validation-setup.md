# 決済検証用Cloudflare環境の準備（Access作成済み・Worker未デプロイ）

現在の進行は[GitHubブランチからCodespacesへの引き継ぎ](android-codespaces-handoff.md)を優先する。Access/D1/マーカー/DNS/Resendは確認済み。以下の過去の準備手順を繰り返さない。今回は保存対象レビューだけで実行承認待ち。

今回行うのはローカルのコード・設定案・テストだけ。Cloudflareのリソース作成、公開、Secret登録、リモートSQL、Square API接続・在庫変更・決済は行わない。後述の作成操作も、対象と設定を確認して別途承認を受けてから行う。

候補URLをvalidation.awaiaune.comへ変更する場合の最新条件・Access入力案は [access-validation-domain.md](access-validation-domain.md) を優先する。Accessはユーザー確認で作成済み。DNS/既存ルールの残り確認と専用Worker・D1の公開前レビューは未完了。

## 構成と分離の確認

| 項目 | 検証用の指定 | 混在を防ぐ確認 |
|---|---|---|
| Worker / Assets | yasoya-payments-validation、専用検証ホスト | 本番名・許可ホスト以外のroute・未知フィールドを拒否。Git連携なし。custom domain時はworkers_dev=false、preview_urls=false。全AssetsをWorker経由で配信 |
| D1 | yasoya-validation-orders、新規UUID | 既知の本番UUIDを拒否。専用instance_idマーカーをSELECTで照合。既存注文のコピー・削除なし |
| Durable Object | SandboxPurchaseCoordinator、検証Worker内の新namespace | 外部script_name・本番クラスの指定を拒否。新規migrationタグv1-validation |
| Square | Sandboxアプリ、Location LHD4ZZ1ZYPHD1、JP/JPY | 通常の本番Secret名と既知の本番Variation IDを拒否。送信先はconnect.squareupsandbox.com/v2/のみ |
| 通知 | 指定テストメール1件 | toは1件、cc/bcc禁止、reply_toも同じ1件。送信元はResendで使える単一のメールアドレス |
| 閲覧 | Cloudflare Accessの専用アプリ、全パス | WorkerでもRS256署名・issuer・AUD・期限・通知先と同じ所有者emailを照合。不明・失敗は401 |
| 管理API | Accessに加えVALIDATION_ADMIN_TOKEN | Bearer tokenは別の32文字以上の乱数。Accessログインだけでは注文管理APIを許可しない |

本番のWorker設定・カタログ・HTML/CSSは変更しない。本番D1/DOを複製しない。DO Alarmはブラウザ認証から独立して稼働し、専用環境・D1マーカーの確認を維持する。AccessはAlarmの停止スイッチではない。

オフラインで保証できるのは生成設定の参照先・拒否条件まで。Cloudflareの実リソース、所属アカウント、Dashboardで設定後のバインディングやAccessポリシーは未確認。別Cloudflareアカウントを推奨し、同一アカウントの場合も本番権限を持たない検証用権限を使用する。

## 登録済み商品の対応表

| 商品ID | Sandbox Variation ID | 価格 |
|---|---|---:|
| lemonbalm-10g | Git対象外の対応表から読み込む | 980 JPY |
| yomogi-10g | Git対象外の対応表から読み込む | 980 JPY |
| goldenrod-leaf-10g | Git対象外の対応表から読み込む | 980 JPY |

前段で各5個、合計15個を確認済み。今回再取得も変更もしない。
`validation/.generated/square-variations.local.json`を正本としてmanifest.variationsへ反映する。生成ツールは対応表のアプリ・Location・商品ソースdigest・3つのID・Item IDをmanifestと再照合する。不足や差異があれば設定生成を拒否し、仮IDを補わない。
対応表・商品登録/在庫ジャーナル・変更前後記録はGit対象外のまま保持する。別の実行環境へ移る場合もこれらを失わないこと。Gitからコードを取得するだけでは操作記録は復元されない。失ったら商品や在庫を再初期化せず停止する。

## Androidで今回確認できる項目（作成ボタンは押さない）

1. ChromeでCloudflare Dashboardにログイン。必要ならメニューから「PC版サイト」を選ぶ。検証に使うアカウントを確認し、アカウントIDを控える。
2. Workers & Pagesで既存のworkers.devサブドメインを確認する。本番Workerの編集・Deploy・Createは押さない。未設定なら今は新規設定せず、その旨だけ共有する。
3. 作成済みAccessアプリyasoya-payments-validationの詳細からAUDを控え、チームドメインも確認する。アプリは再作成しない。
4. 確認済みの所有者Gmail 1件をテスト通知先にも使用する。
5. Resendで検証用に使える送信元アドレスを確認する。独立した検証キーを使う計画とし、今はキーをチャット・ファイルに貼らない。DNSの変更やテストメール送信もしない。
6. アカウントID、workers.devサブドメイン、Accessチームドメイン、テスト受信先と送信元という秘密でない項目だけ共有する。Secret値は共有しない。

Accessアプリは作成済みなのでAUDは既存詳細画面から取得する。D1 UUIDは専用D1の作成承認後に確定する。仮UUIDや本番の値で埋めない。manifest.local.jsonは公開IDだけの下書きで、不足項目がある限りprepare/checkを通さない。

## 別途承認後のAndroid操作順序（今は実行しない）

1. 対象アカウント・リソース名・通知先を確認し、専用D1作成の承認を得る。Accessアプリは作成済み。
2. Storage & databases → D1からyasoya-validation-ordersを新規作成し、名前とUUIDを控える。本番DBのエクスポート・インポートはしない。
3. 専用Workerの候補URLは https://validation.awaiaune.com 。既存DNS・Routes・Accessとの競合を確認し、このホストだけのCustom Domain/DNS・証明書作成を別途承認する。rootや本番ホストを割り当てない。
4. 作成済みのAccessアプリで全パス保護・所有者メール1件のAllow・追加のBypass等がないことを確認する。新規アプリを作らない。メールOTP等のログイン方法も確認する。
5. アプリのApplication Audience (AUD)を控える。Access設定は本番アプリと別にする。workers.devの保護を先に設定できないUIの場合も、Worker側の署名検証は必須のまま。保護を確認するまで購入試験をしない。
6. 公開IDをmanifestへ反映し、こちらでオフラインprepare/check、生成SQL・Wrangler設定・コピーAssetsをレビューする。
7. マーカーSQLの適用は、専用D1の名前とUUIDを再確認し、別途承認した場合だけ行う。生成されたSQLだけを使用し、本番DBにマーカーを作らない。ordersテーブルは既存コードが専用DB内に作成するため、本番データの移植は不要。
8. 専用Worker作成・初回公開はデプロイなので別途承認後だけ。GitHub接続は使わない。コード反映は明示的なvalidation/wrangler.local.json指定で行い、本番worker/のコマンドを使わない。初回はSecret未設定等で503になってよい。
9. 専用WorkerのSettings → Variables and SecretsでSQUARE_SANDBOX_ACCESS_TOKEN、RESEND_VALIDATION_API_KEY、VALIDATION_ADMIN_TOKENをSecretとして登録する。CodexのSecretはCloudflareへ自動転送されない。実トークンを取り出してファイルに保存しない。管理者トークンは独立した32文字以上の乱数をパスワード管理アプリ等で管理する。
10. BindingsでORDERS_DBが専用D1、PURCHASE_COORDINATORが専用WorkerのSandboxPurchaseCoordinatorであることを照合する。Domains & Routesでは承認済み専用ホストのみ、custom domain時はworkers.devも無効、Preview URLs無効、Git自動ビルドなしを確認する。
11. 未ログインのChromeシークレットタブでページ・health・管理APIが保護されていることを確認する。Accessログイン後も、管理者Bearerなしの管理APIは401であることを確認する。
12. Sandbox SDKの表示・ログイン継続・D1マーカー・通知先を確認してから、テスト決済の承認を別途得る。Sandbox公式のテストカードと架空情報のみ使う。既存の5個を無断で1個や5個に戻さない。

管理画面は既存実装どおり、専用管理トークンをタブのsessionStorageに保持する。共有端末は使わず、検証後はログアウトする。今回トークン値の入力・保存は行っていない。

画面名や操作場所が異なる場合は、その項目で止める。本番設定を流用しない。

## デプロイ前チェックリスト

- [ ] dev/local-isolationの差分とテスト結果を確認。コード保存とデプロイ承認は別に扱う。
- [ ] manifestのWorker名・アカウント・D1 UUID・instance_id・workers.dev URLをレビュー。
- [ ] D1は本番と別UUID。DOにscript_nameや本番namespace参照なし。
- [ ] 保存済み3商品対応表・Application ID・Location・ソースdigestが一致。20gなし。
- [ ] Accessチームドメインと専用AUDを設定。所有者1件のAllow、Bypassなし、全パス対象。
- [ ] WorkerでもAccess署名検証を有効化。Assetsもrun_worker_first=true。Preview URLs無効。
- [ ] 検証用Secret名だけ使用。値はGit・manifest・手順書に保存しない。
- [ ] Resend送信元は単一アドレス、宛先と返信先は同じテスト受信者1件。
- [ ] prepare/checkで成功し、生成物に認証情報・本番設定・本番Secretファイルがない。
- [ ] 実行するリソース作成・リモートSQL・デプロイの範囲について明示的承認がある。

## 停止と復旧

| 問題 | 停止・復旧方法 |
|---|---|
| 対応表欠落、IDやソース不一致 | 生成・公開を止める。既存対応表・ジャーナルを保全し、Sandboxの読み取り照合を別途承認後に行う。商品再登録・在庫リセットで直さない |
| D1 UUID/マーカー不一致 | リモートSQL・決済を止める。本番DBにマーカーを足さない。専用リソースの選択を確認し、削除・初期化せず正しいバインディングをレビュー |
| Access未設定・JWT不正・JWKS取得不可 | ページ/APIを401で拒否。ログイン、チームドメイン、AUD、時刻、証明書取得経路を確認。署名検証・TLSを無効化して通さない |
| Secret・通知設定不備 | 503で業務処理を拒否。専用WorkerのSecret名を確認。値を表示して調べない。本番名へのフォールバックを作らない |
| 誤公開・参照先不明 | 新規テストを止める。専用環境のAccess制限を確認し、対象が専用Workerと確認できてからトラフィック停止を検討。Alarmは別に動くため「Accessを閉じたので復旧も停止」と扱わない |
| 決済後に異常 | 新しい注文IDで再課金しない。DO/D1/ジャーナルを消さず、同じ注文IDで照合。結果不明時に在庫の棚卸で帳尻を合わせない |
| 公開失敗・ロールバック | 専用Workerの承認済みバージョンへ戻す前に、台帳・スキーマとの互換性を確認。D1/DOやSquare在庫は巻き戻さない。本番Workerの変更で代替しない |

検証中に全端末を閉じてもAlarmは進む。完全停止が必要なら新規受付とAlarmを分けて設計・承認し、台帳を保全する。本番導入前には外部POSとの在庫競合、SDK/CSP、実Accessのヘッダー・cookie挙動、実メール、Alarmの持続動作を専用環境で確認する。

## 今回の確認結果

`npm --prefix dev test`: 63件成功、失敗0・スキップ0（既存60件を維持、追加3件）。JWKSとSquare/Resendはテスト用代替通信のみ。Access署名・issuer・AUD・所有者・期限、管理APIの二段階認証、宛先/返信先制限、対応表不一致拒否を確認した。

保存済み3商品の対応表から公開IDだけのmanifest.local.json下書きを作成した。未入力はaccountId、workerOrigin、databaseId、notificationEmail、resendFrom、accessTeamDomain、accessAudience。`node validation/prepare.mjs check` は不足項目を検出して終了コード1で停止した（想定どおり）。実リソース参照・設定適用・Android実機表示は未検証。Cloudflare/Square/Resendへの接続、作成・デプロイ・メール送信・決済・在庫変更は実施していない。
