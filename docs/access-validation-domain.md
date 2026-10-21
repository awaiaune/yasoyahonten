# Cloudflare Access完了後の検証環境準備

## 現在の進捗（2026-10-20・日本時間）

以下はユーザーがAndroid管理画面で確認した内容。Codexによるリモート照会や実ログイン試験の結果ではない。

| 項目 | 状態 |
|---|---|
| Accessアプリ | yasoya-payments-validation、Applications一覧に登録済み |
| 保護対象ホスト | validation.awaiaune.com |
| ポリシー | 確認済みの管理者Gmail 1件のみAllow |
| セッション | 1時間 |
| Square Sandbox | 前段で3商品・3Variation、各980 JPY、各5個を確認済み。今回再取得・変更なし |
| 検証D1 | 2026-10-21にユーザーからyasoya-validation-ordersの作成完了・UUIDを受領。ローカル反映済み。リモートメタデータ未照合 |
| 検証Worker・DO | この作業では作成・デプロイしていない。実環境の存在・バインディングは未照合 |
| DNS / 証明書 | 前段のユーザー確認ではvalidationのDNSレコードなし、Workers Routesなし。Custom Domain紐付けと証明書は未適用・未検証 |

Accessアプリは再作成しない。以前の障害で一覧取得できなかった状態から、ユーザーによる登録確認済みへ進捗を更新する。障害全体の解消や他アプリとの競合がないことまで推定しない。
アプリ表示名は確認済みのyasoya-payments-validationを維持する。JWT検証に使うのは表示名ではなく、チームドメイン・Application Audience (AUD)・許可メールである。

## 残る設定

| 必要な項目 | 設定先 / 確認内容 |
|---|---|
| CloudflareアカウントID | manifest.accountId。awaiaune.comを管理するアカウントか確認 |
| Accessチームドメイン | manifest.accessTeamDomain。team.cloudflareaccess.com形式。アプリURLと取り違えない |
| 作成済みアプリのAUD | manifest.accessAudience。Application Audience (AUD)という公開識別子。JWT・Secretではない |
| Accessの追加確認 | Pathが全パス、Allowが所有者1件、Bypass/Everyone/広いドメイン許可なし。重複・ワイルドカードアプリの影響を確認 |
| 専用D1 | yasoya-validation-orders、新規UUID。本番D1をコピーせず、作成承認後にUUIDを確定 |
| 専用Worker / DO | yasoya-payments-validation / SandboxPurchaseCoordinator。Git連携なし、本番Workerや外部namespaceを参照しない |
| 検証URL | https://validation.awaiaune.com。ゾーンActive、ワイルドカードDNS・既存Custom Domain等の競合を確認し、このホストだけのDNS/証明書作成を承認 |
| Resend送信元 | manifest.resendFromは利用可能な単一メールアドレス。通知先・返信先は確認済み所有者1件 |
| Worker専用Secrets | SQUARE_SANDBOX_ACCESS_TOKEN、RESEND_VALIDATION_API_KEY、VALIDATION_ADMIN_TOKEN。値をGit・manifest・チャットに保存しない |

ユーザー提示のCloudflareアカウントID、Accessチームドメイン、AUDは形式を確認しGit対象外のローカルmanifestへ反映済み。リモートでの所属・署名検証は未実施。検証D1のUUIDもGit対象外設定へ反映済み。送信元もvalidation@send.awaiaune.comに確定し、ローカル設定の必須項目は入力済み。オフライン生成・チェックに成功。実リソース・Secrets・DNS/TLSは別途確認が必要。最新の[公開前レビュー](validation-predeploy-review.md)を参照。リモート照合の制約と次の手順は[d1-validation-plan.md](d1-validation-plan.md)を参照。instance_idと登録済み3商品対応表は保持する。仮のD1 UUIDや本番値で埋めない。CodexのSecretはCloudflare Workerに自動転送されない。

## 識別子取得前の手順（取得済み・繰り返し不要）

Account ID・チームドメイン・既存アプリAUDの取得は完了。検証D1の作成情報も受領済み。次は [作成済みD1の照合](d1-validation-plan.md) から進める。以下は履歴として残す。

1. **既存アプリの詳細を開く。** Zero Trust → Access controls → Applications → yasoya-payments-validationをタップ。Overview / Settings / Application details相当の欄でApplication Audience (AUD)を控える。見つからなければ再作成せず、見えている項目名だけ確認する。
2. **既存アプリの保護範囲を読む。** ホストvalidation.awaiaune.com、Path空欄（全パス）、管理者GmailだけAllow、1時間を確認。Bypass/Everyoneや別の広い許可がないかも確認する。変更が必要なら保存せず内容を共有する。ログイン方法はメールOTPを使う計画だが、まだ選択状態は未確認。
3. **チームドメインを確認する。** Zero TrustのSettings / Custom Pages / Team domain等の表示から、team.cloudflareaccess.com形式の値を控える。UIで場所が異なる場合は無理に編集しない。
4. **アカウントとDNSを確認する。** 通常のCloudflare Dashboardでawaiaune.comの所属アカウントIDとゾーンActiveを確認。DNSのvalidation・*、Workers Routes、既存Custom Domainに競合がないか読むだけにする。本番レコード・NS・DNSSECは変更しない。
5. **Squareは確認だけ行う。** Square Developer Dashboardで既存アプリのSandboxを選び、Default Test Account（日本）を開く。登録済み3商品、各980円・各5個を確認。違っていても再登録・棚卸しで戻さず報告する。実カード、Production、本番在庫は操作しない。
6. **公開識別子だけ共有する。** AUD、チームドメイン、CloudflareアカウントIDと競合確認結果を共有する。Secret・OTP・cookie・JWTは送らない。通知先は確認済みGmailを再利用し、Resendの送信元も確認する。

ここまでの操作は読み取りのみ。今回Create、Save and deploy、DNS追加、SQL実行は指示しない。

## その後の実施順序（各対象を確認・承認後）

1. **専用D1は作成済み。** 受領したyasoya-validation-ordersのUUIDを設定に反映済み。再作成せず、アカウント・DB名・UUIDのリモート所属を照合する。本番DBは開かない。
2. **ローカル設定を完成させる段階。** 公開IDをGit対象外のmanifestへ反映。保存済みVariation対応表・アプリ・Location・商品digestを突合し、prepare/checkと生成設定のレビューを行う。D1のinstance_idマーカーSQLはユーザー適用・SELECT確認済み。再適用しない。
3. **専用Workerを公開する段階。** 接続先、D1 UUID、DOクラス、DNS/証明書、実行コマンドを提示し、明示承認後に実施する。Worker作成自体が初回デプロイを伴う場合も承認対象。GitHub連携や本番worker/設定で代替しない。Custom Domainの反映はDNS作成も伴い得る。
4. **専用Secret・D1マーカーを設定する段階。** 専用WorkerのVariables and SecretsへSandboxキー、Resend検証キー、独立した32文字以上の管理トークンを入力。D1マーカーは適用・SELECT確認済みで保持する。Secret値をCodexのファイル経由で運ばない。
5. **決済前の読み取り検証。** 未ログイン・別メールの拒否、所有者ログイン、管理APIの追加Bearer認証、健康状態、商品表示、在庫読み取りを確認。D1/DOの参照先とAssets配信が専用環境であることを照合する。
6. **決済試験の段階。** 試験対象・在庫への影響・通知先を確認し、別途承認後にSandboxテストカードで実施。既存5個の在庫を試験後に無断で戻さない。

## コード側の安全条件

- Custom Domain構成ではworkers_dev=false、preview_urls=false、routeはvalidation.awaiaune.comの完全一致1件のみ。本番・apex・ワイルドカード・別のホストを拒否。
- サイトとAPIを同一originへ揃え、Access cookieを通常のsame-origin通信で送る。旧workers.devへ迂回しない。
- WorkerもAccess JWTのRS256署名、issuer、専用AUD、期限、所有者メールを検証。管理APIには追加の専用Bearerが必要。
- 専用D1 UUIDとinstance_idマーカーを確認。DOは検証Worker内の新規namespace。本番DBのマーカー書き換えや台帳削除で回避しない。
- Square送信先はconnect.squareupsandbox.com/v2/だけ。既知の本番ID、通常の本番Secret名、Cloudflare管理APIキーのWorker混入を拒否。
- 通知先・返信先はテスト受信者1件。cc/bcc禁止。Access cookie/JWTをSquare/Resendへ転送しない。
- DO AlarmはブラウザのAccessセッションと独立して動作する。ログアウトを自動復旧の停止手段としない。結果不明時は同じ注文IDで照合し、再課金や在庫リセットをしない。

オフラインテストは実ホストのTLS、Access cookie/JWTヘッダー、Sandbox SDKのCSP/本人認証画面、実メール、Cloudflare上のAlarm継続動作を証明しない。これらは専用環境で段階的に確認する。

## 補足と停止条件

同じゾーンのCustom Domainは通常ゾーン所属アカウント内に設定する。別アカウントのためのゾーン移管やNS変更は行わない。DNS/Worker/Accessの競合、D1 UUIDや対応表の不一致、未確認のSecretがあれば、その段階で停止する。Accessの既存アプリは削除・重複作成しない。

以前のApplications取得障害とCodexのDNS一時エラーは履歴として保持する。ユーザー確認でAccess登録が分かったが、DNS/TLSや実リクエストの保護確認が完了したという意味ではない。

## 今回のローカル確認結果

`npm --prefix dev test`: 65件成功、失敗0・スキップ0。既存コードの変更なしで再実行し、本番設定・本番サイトは未変更。保存済み3商品の対応表とmanifestの公開ID・商品ソースdigestは一致。Access作成の進捗はユーザー確認に基づき反映したが、実際のJWT・DNS・TLS・Worker/D1/DOの照合は未実施。外部API接続・リソース作成・SQL適用・デプロイ・決済・在庫変更・コミット・プッシュは実施していない。

## マーカー適用後の追記

ユーザーが検証D1のマーカー保存結果を確認済み。再実行不要。起動済みDOのfetch/Alarmと各業務サービスにもマーカー照合を追加した。最新の結果・承認待ち操作は[公開前レビュー](validation-predeploy-review.md)を優先する。
