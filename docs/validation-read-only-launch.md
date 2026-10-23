# 検証管理画面の初回導入：READ_ONLY

目的はAccess内の管理画面で既存3商品を下書きとして管理し、Square Sandboxから取得した在庫を表示すること。Squareへの公開・商品再作成・在庫設定・決済・メール・Cronは有効にしない。

## 完了として扱う情報

- 専用Worker yasoya-payments-validation、D1 yasoya-validation-orders、ORDERS_DB、専用SandboxPurchaseCoordinatorのバインドをユーザー確認済み。
- D1は識別マーカーとCloudflare内部テーブルのみ。mg_系と同名インデックス/ビューはなし。マーカーを再作成しない。
- Time Travelの復旧範囲とブックマーク取得済み。SQLエクスポートは権限不足が既知。再試行せず、バックアップ取得済みとも扱わない。
- 既存3商品のSandbox ID/SKU/価格/在庫追跡を照合済み。初期在庫5個を再投入しない。
- 既存Accessアプリ/ポリシーを使う。再作成・公開範囲拡大はしない。

## ローカル準備（外部変更なし）

リポジトリルート、dev/local-isolation、Node 24以上、Wrangler 4.151.1。

```sh
npm --prefix dev test
npm --prefix dev run test:ui
node validation/prepare.mjs prepare
node validation/prepare.mjs check
node validation/prepare-management.mjs prepare
node validation/prepare-management.mjs check
```

生成には既存のGit対象外manifest.local.json、square-seed.local.json、.generated/square-variations.local.jsonを使う。トークンは読み込まない。元の商品定義、既存Item/Variation/SKUを使い、管理用チェックでは生成設定と保存済み入力の一致も検証する。

```sh
XDG_CONFIG_HOME=/tmp/yasoya-ready-wrangler WRANGLER_LOG_PATH=/tmp/yasoya-ready-dry-run.log WRANGLER_SEND_METRICS=false ./worker/node_modules/.bin/wrangler deploy --config validation/wrangler-management.local.json --dry-run --outdir /tmp/yasoya-ready-review
```

古いwrangler.local.jsonやworker/wrangler.jsoncで管理Workerをデプロイしない。今回は設定生成・チェック・dry-runまで。入力が不足するCodespacesでは既存の公開ID設定を非公開で引き継ぐ。新しいVariationを作って埋め合わせない。


## 今回の保存対象（9ファイル）

- .gitignore
- validation/README.md
- validation/prepare-management.mjs
- validation/safety.js
- worker/src/management/service.js
- js/admin-management.js
- dev/sandbox-safety.test.mjs
- dev/admin-ui.browser.mjs
- docs/validation-read-only-launch.md

既存の未追跡.github/、docs/admin-system-design.md、docs/github-actions-validation.mdは対象外。実ID対応表・ローカル設定・生成AssetsはGit対象外のまま。

## 条件付き承認済みの導入範囲

2026-10-23に以下の導入範囲は条件付きで承認済み。R2の有料契約確定とDNS/TLS変更は個別確認する。認証不足で実行不能な工程は未実施と報告し、独立して進められる作業は継続する。どこかで失敗したら原因と部分適用状態を確認し、破壊的な再実行・復元はしない。

1. **コード受け渡し**：今回のコード・テスト・手順書・.gitignoreだけを開発ブランチへ保存する場合はコミット/プッシュも承認対象に含める。生成設定・実対応表・Secret・対象外文書は含めない。承認前は実施しない。
2. **R2**：未利用の場合だけアカウントでR2利用開始。その後、非公開バケットyasoya-validation-imagesを作成（既存なら再作成しない）。利用開始は請求情報/従量課金規約への同意を伴い得るため、所有者が画面の料金条件を確認する。有料契約確定が必要な場合は、その操作だけ停止して個別承認を得る。r2.dev・公開Custom Domainは設定しない。
3. **先に書込停止版Workerを適用**：同名検証Workerへ管理用生成設定・Assetsをデプロイし、PRODUCT_IMAGESを専用R2へ接続。ORDERS_DBと既存専用DOを維持。先にREAD_ONLYコードを入れることで、その後のSecret登録が旧コードの書込経路を有効にしないようにする。DB未準備/Secret未登録の間の503は想定する準備中状態であり、本番や認証の制限を緩めて回避しない。既存DO/ジョブは削除・初期化しない。
4. **検証Secret**：SQUARE_SANDBOX_ACCESS_TOKEN、VALIDATION_ADMIN_TOKENの2件のみ、未登録/不明な場合にユーザー管理の値を登録する。前者はSandbox専用、後者は32文字以上の専用値。値をチャット・ファイル・Git・コマンド引数・ログに出さない。管理者キー更新は検証管理画面の再ログインを伴う。RESEND_VALIDATION_API_KEYはメール停止中は不要で、今回は登録/更新しない。既存の正しいSecretは維持する。
5. **D1追加スキーマ**：変更直前に検証D1の既存スキーマと識別レコード、復旧ブックマークの有効性を読み取り確認する。不一致なら変更せず停止し、マーカーを再作成しない。その後、検証D1 Consoleでリポジトリのworker/migrations/0001_management.sqlを原文どおり適用し、成功/定義を確認後に0002_management_supervision.sqlを適用。12+2テーブルと2明示インデックスのみ追加。validation_environment/_cf_KVを変更しない。失敗したエクスポートや権限拡大を前提にしない。Consoleからの実行はログインユーザー権限を使い、CodespacesトークンのD1権限と区別する。Console手動適用はWranglerのd1_migrations履歴に自動記録されないため、ファイルSHA256・適用日時・結果を非公開作業記録に残す。
6. **管理画面で取り込み・関連付け**：既存3商品の名称・説明・写真を下書きとして取り込み。D1の商品/画像行とR2の写真オブジェクトを追加する。繰返し取込は既存商品を上書きしない。各編集画面の「販売状態・連携設定」を開き「既存Sandbox IDを関連付け」で保存済み対応表をサーバー照合する（手入力不要）。GET Catalog objectで既存ID/SKU/980円JPY/Location/在庫追跡を照合し、D1へ既存マッピングを保存。不一致は停止し、商品再作成しない。
7. **取得と確認**：在庫画面で対象3VariationのIN_STOCKをPOST counts/batch-retrieveで取得し、観測値/時刻をD1へ保存。実数量を表示し、5個とは仮定しない。初回の注文一覧表示では既存コードが空のordersテーブルとidx_orders_status_createdを作成するため、この初期化もD1変更の承認範囲に含む。架空注文はリモートに投入しない。注文本文を調査目的で取得しない。

READ_ONLYはSquare外部書込禁止で、D1/R2全体の読み取り専用ではない。上記6/7の内部保存も承認対象。

デプロイ時の固定コマンド（承認前は実行しない）：

```sh
node validation/prepare-management.mjs check
XDG_CONFIG_HOME=/tmp/yasoya-ready-wrangler WRANGLER_LOG_PATH=/tmp/yasoya-ready-deploy.log WRANGLER_SEND_METRICS=false ./worker/node_modules/.bin/wrangler deploy --config validation/wrangler-management.local.json
```

API認証は認証済みCodespacesでCLOUDFLARE_API_TOKENを使用。現Codex環境には同トークンがない。無指定deploy、--env、--name、--yes、本番用packageのdeployスクリプトは使わない。現在のトークンで失敗した操作は自動再試行/自動権限拡大しない。Workers編集権限は同一アカウントの本番にも及び得るため、固定設定とレビューはIAM分離の代わりではない。

Custom Domainの対象はvalidation.awaiaune.comだけ。既存の同Workerへの設定なら維持する。未設定などDNS/TLS変更が必要なら、対象レコード/Custom Domain・TLSへの影響を示して、その操作の個別承認を得るまでデプロイも実行しない（deploy自体がDNS/TLS登録を伴い得る）。既存の別の公開先を上書きする競合は停止。他のDNS、Accessポリシー、本番Worker/D1/DOへは触れない。workers.dev/Previewはfalse、Assetsはrun_worker_first=trueを維持する。

## Codespacesへの取得

今回のコミット後、既存の認証済みCodespacesで次を実行する。対象ブランチ以外では停止する。ローカル変更の強制破棄やリセットはしない。

```sh
test "$(git branch --show-current)" = "dev/local-isolation" && git pull --ff-only origin dev/local-isolation
```

認証済みCodespacesをこのCodexから遠隔操作できるとは扱わない。Codexで続行する場合は、環境Secretとapi.cloudflare.com通信許可の反映が必要。トークンをチャットやリポジトリへ渡さない。

## Androidで使う画面

1. https://validation.awaiaune.com/admin/ をChromeで開く。
2. 既存Accessの許可Gmailでサインイン。その後、検証用管理者トークンで管理画面へログインする。Accessと管理者認証の両方を維持する。
3. 商品→既存3商品の取り込み。各商品を開き、連携操作の折りたたみを展開して「既存Sandbox IDを関連付け」を押す。公開は押さない。
4. 在庫→「取得元：Square Sandbox（読み取り専用）」、取得時刻、実在庫を確認。在庫操作ボタンは無効。商品編集では「既存ID照合済み」と表示。
5. 写真追加・下書き保存・閉じて再表示・再読み込みを確認。これらは検証D1/R2だけへ保存する。価格を下書き編集してもSquare価格やホームページ公開版は変わらない。

管理データは下書きなので検証ホームページの商品公開は別工程。Square同期/公開API、決済、在庫更新、メール、Cron有効化は今回の承認に含めない。

## 復旧と期限

独立SQLバックアップなしで進めるリスクを明示する。Time Travelは確認済みの保持期間内だけ有効で、ブックマークは無期限バックアップではない。実行者の記録した取得日時・有効期限を使い、期限内に適用する。日時が不明/期限切れなら適用前に新しい復旧地点を確保し、その実時刻と有効期限を記録する。Freeは通常7日、Paidは通常30日だが、契約/実画面の確認済み範囲を優先する。

Time Travel復元はD1だけを巻き戻し、R2オブジェクト・Worker・DO・Squareには効かない。R2内に孤立画像が残り得る。後続データの消失もあるため自動復元しない。失敗時はREAD_ONLY/購入停止/メール停止を維持し、後続操作を止め、エラーコードと対象だけ記録する。管理画面が未準備なら開かずに止める。安全機構のない旧Workerへ無条件に戻さない。ロック削除、DB/DOの再作成、在庫再初期化、権限緩和で復旧しない。
