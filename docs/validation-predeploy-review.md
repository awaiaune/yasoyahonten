# 検証Worker公開前の準備状況（2026-10-21）

## 確定したメール設定

- 既存認証済みドメインsend.awaiaune.comを使用する（ユーザー確認）。新しいドメイン・受信箱・DNSレコードは作成しない。
- RESEND_FROM_EMAILはvalidation@send.awaiaune.com。
- ORDER_NOTIFICATION_EMAILとREPLY_TO_EMAILは確認済み管理者Gmail 1件。実値はGit対象外設定に保持し、テンプレート・手順書へ転記しない。
- 送信専用アドレスに受信箱は不要。返信先を管理者に指定する。
- 購入時の連絡先メールも管理者のアドレスだけを許可する。異なる宛先を入力した購入要求は拒否する。
- 注文受付・購入者向け控え・要確認通知・発送通知はいずれも共通のsendResendEmail経由。宛先はtoの1件だけ、cc/bccは禁止、reply_toも管理者だけを許可する。許可以外の宛先を黙って書き換えず、送信前に拒否する。
- 既存注文の連絡先が別メールだった場合も、発送メールを外部へ送らず停止する。管理者が状態を確認する。注文受付と購入者向け控えは同じ管理者へ2通届く場合がある（宛先を1アドレスに限定する設計）。
- 専用Secret名はRESEND_VALIDATION_API_KEY。本番Resendキーを再利用しない。後の承認段階で検証用Sending accessキーを用意し、可能なら送信ドメインをsend.awaiaune.comに限定する。値はCloudflareの専用WorkerのSecret欄へ直接入力し、チャット・Git・ローカルファイルに保存しない。

## オフラインで生成・確認したもの

`node validation/prepare.mjs prepare`と`node validation/prepare.mjs check`は外部接続せず成功した。以下はすべてGit対象外。

- validation/wrangler.local.json: 検証Worker名・対象アカウント・作成済み検証D1 UUID・ORDERS_DB・SandboxPurchaseCoordinator・Access・メール設定。
- validation/.generated/site/: 元の本番ファイルを変更せずに生成したSandbox用サイト。3商品、Sandbox SDK、同一originのAPI。
- validation/.generated/validation-marker.sql: 専用D1向けのCREATE TABLE IF NOT EXISTSと識別マーカーINSERTの2文。ユーザーが適用し、SELECTでid=1と生成済みinstance_idの一致を確認済み。再実行しない。

workers_dev=false、preview_urls=false、Custom Domainはvalidation.awaiaune.comの1件だけ。デプロイがDNS/証明書作成を伴い得るため、DNS作成も含めた承認が必要。本番DB UUIDと異なることをローカル照合し、既存の商品登録・在庫ジャーナルを変更せず保持した。

設定ファイル上の必須項目は埋まったが、実環境の準備完了ではない。検証D1のUUIDはユーザーがCloudflare画面で確認済みとして採用し、同じ確認は繰り返し依頼しない。Cloudflare APIでの独立照合は未実施という履歴を保持する。Resendの認証状態はユーザー確認に基づくもので、キー権限・実配送は未検証。

## マーカー適用後の最終レビュー

ユーザーが検証D1へSQLを適用し、SELECTで保存結果を確認済み。ローカル設定のinstanceIdと一致する。AccessアプリとD1の再作成、同じUUID確認、SQL再実行は不要。この作業中にはリモートSQLを実行していない。

### マーカー確認の順序

- HTTP入口は設定とホスト、Access JWTを検証し、マーカーSELECTに成功してから既存WorkerやAssetsへ渡す。Access署名用公開鍵の取得だけはマーカーより前にあり得る。Square・Resend・注文保存・在庫操作は後。
- 検証DOは起動時に加え、内部fetchとAlarmの直列キュー内で毎回マーカーを再検証する。起動済みインスタンスでも不一致・欠落・D1障害なら台帳処理前に停止する。
- 在庫照会・決済・決済照合・在庫減算・注文保存・要確認通知・注文メールの7サービスも、呼び出し前にSELECTする。既存本番Workerの実装は変更しない。
- マーカー不一致時は検証環境の業務処理全体を止める。個別の決済異常で商品だけ保留する機構とは別の、環境誤接続への防御。マーカーを自動作成・修復しない。
- SELECTと外部APIは原子的ではない。検証後にマーカーが変更されても送信済み要求は取り消せない。マーカーを運用中に変更しない。障害時は注文・DO台帳を保持し、既存IDで照合する。Alarmのマーカー不一致が続く場合は自動復旧も進まず、有限の自動再試行が尽きた後は管理者による再開が必要になり得る。

### 分離と公開経路

| 対象 | 設定 |
| --- | --- |
| Worker | yasoya-payments-validation |
| D1 | ORDERS_DB → yasoya-validation-orders、確認済み専用UUID |
| DO | PURCHASE_COORDINATOR → SandboxPurchaseCoordinator、このWorker内の新規namespace |
| 公開先 | validation.awaiaune.comだけ、Custom Domain |
| 別経路 | workers_dev=false、preview_urls=false、別originもWorkerで拒否 |
| 閲覧 | 作成済みAccessアプリ＋WorkerのRS256署名・issuer・AUD・期限・所有者email検証 |
| 管理API | Accessに加えて独立したVALIDATION_ADMIN_TOKEN |
| Square | connect.squareupsandbox.com/v2/だけ、Sandbox SDK、3商品対応表 |

本番D1 UUID・Square Location/Variationとの共有、外部DO参照、設定不足時の本番フォールバックをローカルチェックで拒否する。デプロイ後の実バインド・公開経路はまだ未検証。Secretの発行元は名前だけでは証明できない。

Resendは既存認証済みドメインを共有する。専用キー・validation@send.awaiaune.com・管理者1件だけの宛先を使うが、実送信は同じアカウントの送信枠・レート制限・ドメイン評価へ影響し得る。本番キーやドメイン設定は変更しない。

## Androidで次に進む段階と停止位置

1. **いまは承認待ち。** Access/D1/マーカーは完了。Create、Deploy、DNS追加、Secrets登録を押さない。
2. **公開範囲の承認後。** 専用Worker、DO namespace、Assetsを生成済み設定で作成・デプロイする。想定コマンドはリポジトリルートで `node validation/prepare.mjs check` の後、`./worker/node_modules/.bin/wrangler deploy --config validation/wrangler.local.json`。Cloudflare API認証と通信許可も事前に必要。無指定のWranglerや本番worker/のdeployを使わない。Custom Domain設定によりDNSレコード・証明書が自動作成され得るため、これも承認範囲に含める。失敗したら本番設定を流用せず停止。
3. **Secrets登録の承認後。** Cloudflare → Workers & Pages → yasoya-payments-validation → Settings → Variables and Secrets。SQUARE_SANDBOX_ACCESS_TOKEN、RESEND_VALIDATION_API_KEY、VALIDATION_ADMIN_TOKENをSecretとして入力。最後は独立した32文字以上の乱数。値をチャット・Git・manifest・ログへ出さない。CodexのSecretは自動転送されない。保存による新バージョン公開も承認対象。未設定中は503で閉じる。
4. **初回確認範囲の承認後。** SettingsのDomains & RoutesとBindingsで上記の専用接続とworkers.dev/Preview無効を確認。Chromeのシークレット画面で未認証拒否、通常画面で所有者ログインとhealth・商品表示・在庫読み取りまで確認して停止。管理画面の初回APIはordersと索引を自動作成し得るので、この段階では開かない。
5. **個別試験の承認後。** 専用D1のorders/索引作成と注文書き込み、Sandbox決済・在庫減算・実メール送信の範囲を提示してから実施。元の在庫に無断で戻さない。

停止・復旧: 設定拒否やマーカーエラーは本番値への置換・マーカー書換え・台帳削除で回避しない。送信済みか不明な決済/在庫操作を新IDでやり直さず、既存の注文ID・冪等性キーで照合する。Access障害時も認証を解除して公開しない。

## ローカル検証

既存65件にマーカー順序の3件を追加。7サービスの正常時と欠落/不一致/D1エラー時の順序、起動済み・再起動DOとAlarm、正しいAccess JWTでもマーカーがなければ主要9経路が503になることを検証する。Square・Resend・Access公開鍵は代替実装のみ。実Cloudflare・Square・Resendへの接続、SQL実行、デプロイ、DNS変更、Secrets登録、コミット・プッシュは行っていない。

実行結果: `npm --prefix dev test` は68件成功、失敗0・スキップ0（約73秒）。`node validation/prepare.mjs check` と `git diff --check` も成功。設定内のマーカー一致、専用D1/DO、workers.dev/Preview無効をローカル確認済み。本番の追跡対象Worker・サイトの差分なし。

## Access実画面確認後の確定計画（2026-10-21）

ユーザーの実画面確認により、yasoya-payments-validation、validation.awaiaune.com、Path空欄（全パス）、yasoya-validation-only、Allow、Include Emails、所有者メール1件、ルール1件、適用アプリ1件、セッション1時間を確認完了とする。メール実値はGit対象外manifestに保持。アプリ再作成・同じ設定の再確認は求めない。

### 最終承認後に使うコマンド

リポジトリルートで実行。現時点ではデプロイもdry-runも未実行。インストール済みWrangler 4.151.1を使い、実行時にnpxから別バージョンを取得しない。

```sh
node validation/prepare.mjs check
./worker/node_modules/.bin/wrangler deploy --config validation/wrangler.local.json --dry-run --outdir /tmp/yasoya-validation-deploy-review
./worker/node_modules/.bin/wrangler deploy --config validation/wrangler.local.json
```

各行を個別に実行し、失敗・想定外の対象・資格情報の混入があれば次の行へ進まない。dry-runはリモート公開しないが、出力はローカル生成物としてGitへ入れない。Cloudflare認証は専用の安全な経路で供給し、Worker変数にCloudflare APIトークンを含めない。validation配下に未レビューの.dev.vars/.env等がある場合は自動読み込みを調査してから停止・解消する。現在のCodexにはCloudflare API認証と通信許可がないため、承認だけでは実行できず、認証/通信の準備が別途必要。

リモート変更直前の停止条件: 同名Workerが既に存在して用途が不明、対象アカウント不一致、validationホストに競合する既存公開先がある、対象外ルート/DNS/Secrets変更が表示された場合は中止。本番リソースを開いて代用しない。

### 公開と影響の境界

- 作成対象は専用Worker、そのSQLite DO namespace（v1-validation migration）、Assetsデプロイ。既存専用D1はバインドするだけで、このdeployコマンドにD1 SQL実行は含まない。DO migrationはD1 migrationではない。
- Custom Domainの登録はvalidation.awaiaune.comのDNSとTLS証明書に影響し得る。awaiaune.comのルート、他サブドメイン、MX/TXT、ネームサーバー、本番Workerの設定を変更する操作は計画に含めない。ゾーン/アカウントや利用枠は共通であるためサービス全体の完全隔離とは言わない。
- workers.devとPreview URLを無効化し、Assetsもrun_worker_first=trueで入口を通す。Workerは別originを拒否し、正規originもAccessの署名検証を必須とする。DOは公開URLを作らずbindingのみ。Access未保護の別ホストを追加しない。
- 上記はコード/生成設定で確認済みの計画。実環境に迂回URLがないという最終判定は、公開後のDomains & Routes、Preview設定、未認証GET/HEAD/APIの拒否で行う。HTTP200でAssets/APIが出る場合は次工程へ進まない。
- Secretsが1つでも未登録ならassertRuntimeが最初に拒否し、HTTPは503、Square/Resend/Access JWKSへの外部fetch、D1 SELECT/書込み、Assets配信へ進まない。DOも台帳を処理しない。未登録の間は正常表示できないのが想定動作。

### 失敗時

初回deployの失敗は途中でWorker/DO/DNSの一部だけ作成された可能性を扱い、むやみに再実行・削除しない。作成結果を読み取り、検証ホストの到達経路とAccessを確認して停止する。誤公開時は検証ホストの公開経路だけを無効化する対応を別途承認し、本番DNSは操作しない。既存検証バージョンへのrollbackはそのバージョンもAccess/マーカー/接続先制約を満たす場合だけ。初回公開では戻す旧版がない。DO migrationやデータはrollbackで元に戻ると想定しない。D1/DO/冪等性ジャーナルは削除せず保持する。

今回の最終承認待ち範囲は専用Worker・DO・AssetsとvalidationホストのCustom Domain/DNS/TLS。Secrets登録、初回API検証、メール、決済、在庫変更はこれだけで許可されたと扱わない。

## 現在の方針: A案の手動公開

既存Cloudflareアカウントを維持し、Codexでレビューした専用設定を段階的に手動デプロイする方針へ確定。GitHub Actions案は使用しない。最新のコマンド・権限の残余リスク・Android代替手順は[手動デプロイ計画](manual-validation-deploy.md)を優先する。確認済みのAccess/D1/マーカー/DNS/Resendを再確認しない。

## GitHub検証ブランチ経由の引き継ぎ

ZIP方式を終了し、dev/local-isolationに検証コード・テンプレート・テスト・関連文書だけを保存する計画へ変更。今回は保存対象の整理まででコミット/プッシュなし。Actionsワークフロー、ローカル生成物、実対応表、無関係な文書は対象外。手順は[Codespaces引き継ぎ](android-codespaces-handoff.md)。実値入りローカル設定は別途Git外で移す必要があり、Git保存だけでデプロイ準備完了とはしない。
