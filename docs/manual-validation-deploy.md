# A案: Codex事前レビュー後の段階的な手動デプロイ

2026-10-21。既存Cloudflareアカウントを維持する。Access・ポリシー、D1 UUID、識別マーカー、DNS13件にvalidationがないこと、Resend方針はユーザー確認済みとして採用し、再確認を依頼しない。以前のGitHub Actions案に代わる現在の実行計画。Actions用の既存ローカルファイルは保持するが使用しない。

## 点検結果と修正

- 現在のブランチはdev/local-isolation。既存の未コミット変更も今回のデプロイ対象コードに含まれる。GitHubから既存コミットをcloneするだけでは再現できない。コミット・プッシュは行わない。
- validation/wrangler.local.jsonは専用Worker/アカウント/D1 UUID/DO class/Custom Domain/Assetsだけを指定。envオーバーライド、外部DO script_name、サービスbinding、Secret Store参照、本番Secret・Cloudflare APIトークンを含むvarsはない。
- 検証サイトコピーに残っていた3 JS（products-inventory.js、cart-drawer.js、admin.js）の本番Workerフォールバックを生成時に除去した。設定欠落・sandbox以外・異なるoriginならDOM初期化/通信前に停止する。元の本番JSは変更しない。CSPも同一origin通信に制限する。
- HTTP入口で設定・ホスト・Access JWT・マーカーを検証。DOは起動時、各fetch/Alarm、業務サービス前にマーカー照合。3 Worker Secretsが揃わない初回は503で閉じ、Square/Resend/JWKS/注文保存/在庫操作/Assetsへ進まない。
- 共有ソースには本番向け処理・定数も存在するが、専用entryの設定検証とSandbox接続先制限が先に働く。本番コードを消したり変更したりしていない。Resendは既存ドメインと利用枠を共有するが、今回の初回deployは送信処理を実行しない。

## 実deployで変わる対象

| 対象 | 変更内容 |
| --- | --- |
| アカウント | fcf37e462257810df77e8fbc0e7f4317だけ |
| Worker | yasoya-payments-validationへコード・公開設定を初回公開 |
| DO | このWorker内にSandboxPurchaseCoordinatorのSQLite namespaceを作成（v1-validation migration）、PURCHASE_COORDINATORへbinding |
| Assets | validation/.generated/siteを同じWorkerへアップロード、run_worker_first=true |
| D1 | 既存yasoya-validation-orders、df419687-581f-4935-9754-fcd8bff7ba2bをORDERS_DBへbindingするだけ。SQL実行なし |
| Custom Domain | validation.awaiaune.comのみ登録、対応するDNS/TLS発行を伴い得る |
| 代替公開URL | workers.dev、Preview URLとも無効 |

本番yasoya-honten-payments、yasoya-orders、本番WorkerのDO namespaceは対象に指定しない。DO migrationはD1 migrationではない。Git操作のないWranglerコマンドからmainへのコミット/プッシュ/マージは起こらない。既存本番DNS、MX/TXT、ネームサーバーの変更コマンドも含めない。

## 現在のCodex環境

環境ステータスの現在値ではCloudflare outbound identityなし、Cloudflare資格情報登録なし。CLOUDFLARE_API_TOKEN/API_KEY/EMAILも未設定（値は読まず有無だけ確認）。許可先にapi.cloudflare.comはない。通信制限を回避したAPI接続やOAuthログインは行わない。現在は実deploy不可。

Codexで続ける場合は別途承認後にAndroidのCodex環境設定へ短期専用トークンをSecret CLOUDFLARE_API_TOKENとして登録し、api.cloudflare.comへの通信を許可して設定を公開する。Secretの値はチャット/ファイル/Worker varsに出さない。新しい実行環境へ移る前に未コミットスナップショットを保護する。これは将来の手順で、今回は登録/通信設定変更をしない。

A案では標準トークンのWorkers Scripts Editが同一アカウント内の本番Workerも編集可能である点は残る。専用名・短い期限・対象アカウント限定・コマンド固定・レビュー・使用後失効で運用上制限する。Worker単位の権限隔離を実現したとは説明しない。初回の権限候補はWorkers Scripts Editを該当アカウント、Workers Routes EditとZone Readをawaiaune.comだけ。D1 Edit、DNS Edit、Access Edit、All accounts/zones、Global API Key、本番Square/Resendキーは与えない。不足エラー時は停止して個別に検討する。

## 実行順とコマンド（最後のdeployは別途承認後だけ）

リポジトリまたはレビュー済み配布物のルートで、各行の成功を確認して次へ進む。Node 24、Wrangler 4.151.1を使用。

```sh
npm --prefix dev test
node validation/prepare.mjs prepare
node validation/prepare.mjs check
```

Codexの書き込み可能な設定/ログ出力先を使うdry-run:

```sh
mkdir -p /tmp/yasoya-manual-wrangler-config/.wrangler
XDG_CONFIG_HOME=/tmp/yasoya-manual-wrangler-config WRANGLER_LOG_PATH=/tmp/yasoya-manual-dry-run.log WRANGLER_SEND_METRICS=false ./worker/node_modules/.bin/wrangler deploy --config validation/wrangler.local.json --dry-run --outdir /tmp/yasoya-manual-deploy-review
```

**次の1行は今回は実行しない。認証/通信準備と初回公開（検証DNS/TLSを含む）の承認後だけ。** APIトークンは環境のSecret経由で注入し、コマンドへ値を埋め込まない。

```sh
XDG_CONFIG_HOME=/tmp/yasoya-manual-wrangler-config WRANGLER_LOG_PATH=/tmp/yasoya-manual-deploy.log WRANGLER_SEND_METRICS=false ./worker/node_modules/.bin/wrangler deploy --config validation/wrangler.local.json
```

--yes、別の--name、--env、無指定のwrangler deploy、npm --prefix worker run deployは使わない。確認済みCloudflare資源の再確認をユーザーへ依頼しない。コマンドが競合上書きや対象外資源への操作を求めた場合だけ、その場で停止する。

## Custom Domainと公開後の境界

DNSの現状確認は完了。実登録までの他操作による競合、既存公開先の置換を求めるエラーは残り得る。上書きしない。DNS/TLS伝播と証明書発行には待ち時間や失敗があり得る。Accessアプリの作成済み設定は利用するが、実際のTLS・JWTヘッダー・リダイレクトは公開後の動作確認事項。

workers.dev/Previewを有効にして回避しない。Assetsは全パスでWorker認証を通す。DOはbindingからだけ呼ぶ。初回はSecretなし503が想定結果。別ホストで200のAssetsが出た場合、Accessを外したりSecretを足して試したりせず停止する。実際の公開先の検査は既存Access設定の確認やり直しとは別の、新規デプロイ結果の検証。

初回deployだけの承認では、Worker Secrets登録、注文管理画面（初回orders DDLを含む）、Square API実接続、決済、在庫操作、実メール送信へ進まない。

## AndroidのCodespacesへ渡す現在の方法

ZIP転送をやめ、dev/local-isolationへ必要なコードだけを承認後に保存する。[GitHubブランチ経由の手順](android-codespaces-handoff.md)を参照。main変更、Actions実行、ZIPのGit登録は不要。

実値入りmanifest/対応表/生成設定はGitへ保存しない。Codespacesへブランチを開いただけではprepare/deployの設定は揃わず、別工程の安全な引き継ぎが必要。既存マーカー・IDを再発行しない。Cloudflareトークンは将来の最終承認後にだけbashの非表示入力で一時利用する。今回の保存候補レビューではgit add/commit/pushも行わない。

## 停止・復旧

テスト/チェック/dry-runの失敗では公開へ進まない。deploy途中失敗は一部だけ作成された可能性があるため、結果を読み取ってから対応する。無条件再実行やD1/DO削除をしない。初回には戻せる旧Worker版がない。必要な場合の検証ホストだけの公開停止も対象を提示して承認を得る。本番DNS・Access・D1マーカーを変更して回避しない。

## 今回の最終結果

設定チェック成功。Wrangler 4.151.1のdry-run成功（リモート公開なし）。`npm --prefix dev test` は72件成功、失敗0・スキップ0。従来71件を維持し、検証Assetsの本番フォールバック除去/設定欠落時の通信拒否を1件追加。本番の追跡対象Worker・サイト・商品定義・設定の差分なし。既存の無関係な未コミット文書は保持。実deploy/SQL/DNS変更/Secrets登録/外部業務API接続/コミット/プッシュは未実施。
