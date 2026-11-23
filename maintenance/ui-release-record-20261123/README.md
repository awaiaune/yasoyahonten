# 八草屋本店：2026-11-23 UI・管理画面・説明文の本番反映

本番反映済み。GitHub Actions経由で、実稼働Workerのソースから必要な表示差分だけを作成・検証・公開した。Cloudflareのブラウザーログインは使用していない。mainやPR #9全体をマージしていない。

## 1. 重複と採用範囲

| 対象 | 照合結果 | 今回の扱い |
| --- | --- | --- |
| PR #10 | PR #9の統合元ブランチに実装済み | 管理画面から画像を登録する方針を採用。画像ファイル追加なし |
| PR #11 | PR #9に統合済み | 小さな中央HTML植物名と日本語説明文を採用 |
| fix/home-shop-description-20261123 | 上記説明文と重複 | 説明文は1段落だけ追加 |
| 稼働中の代表画像選択・保存・公開 | 既存実装済み | 既存featuredImageIdと既存APIを維持。表記と詳細ギャラリーへの適用だけ変更 |
| トップの幕・暗化・巨大文字 | 修正が必要 | 暗化・疑似要素の幕を無効化、中央11px/15pxの白いHTML名へ |
| 商品詳細の画像キャプション | 修正が必要 | caption/currentを除去。写真・ドット操作・購入欄は維持 |
| 指定のショップ説明文 | 本番では未実装 | botanicals.付近へ自然な本文として1回だけ追加 |
| title/meta/canonical/JSON-LD/robots/sitemap/販売終了商品の扱い | 本番で既存実装済み | 現行SEOを保持。商品メタ画像だけ詳細用写真を選択するよう整合 |

`fix/home-images-20261123` とmainの389ファイル差分は、不要ファイル389個という意味ではない。ブランチの分岐や未統合の実装を含むため、削除も一括マージも行っていない。本番基準の差分適用と配信結果をこの記録で特定した。

## 2. ソース・ブランチ・実変更

リリースブランチ：`release/live-ui-20261123`（main `d61f549b1e0e8cf65eaa85e38c951708321b133e`を起点に保守用ファイルだけを追加）。

- 検証コミット：`d4812c9c531eeba52d00a8920e01b94e5c7cb878`
- 未公開版照合コミット：`7d67c0ebdcea635eab7bf055d4c5f3fbf2f12fa8`
- 本番反映コミット：`d408afb9b6c33aa9a71367216fdff2e78c5bf5d7`
- 変更計画：`maintenance/ui-release-20261123/patch-plan.json`
- 適用と検証：同フォルダーの`apply-patch.py`、`live-ui.test.mjs`
- 未公開版保存：`maintenance/ui-stage-20261123.py`
- 公開・復旧：`maintenance/ui-deploy-20261123.py`
- 本番ブラウザー確認：`maintenance/ui-production-browser-20261123.mjs`
- 対応する3本のActions定義：`.github/workflows/live-ui-{verify,stage,deploy}.yml`

実際の配信変更は次の4対象。

1. `yasoya-honten-payments/storefront-worker.js`：トップのHTML名・説明文、商品詳細画像の選別・キャプション削除、対象静的ファイルだけへの表示差分。
2. `yasoya-honten-admin/admin-worker.js`：既存のAccess署名検証とOrigin検証の後に、管理画面の表記差分だけを適用。
3. `/js/admin-management.js`：「トップページ表示用」の選択・解除・写真削除時の選択解除。写真配列順は変えず、並べ替え矢印を維持。
4. `/css/editorial-v41-home.css`：暗化と幕を除去、小さな中央文字と本文のスタイル。

静的ASSETS一式をアップロードし直す方式ではない。元のASSETSを引き継ぎ、対象JS/CSSの元ハッシュが一致した200のGET応答だけを差し替える。未確認の変更があれば元応答へ戻す。公開するWorkerの全バインディングと互換設定を照合した。

このフォルダーの`baseline/`と`deployed/`には、実際に照合・公開したWorkerモジュールを保存した。通常のソースツリー一式が現在の本番と一致する、と解釈しないこと。次の作業では稼働バージョンを再確認し、このチェックポイントを起点にする。

## 3. 検証結果

- [候補検証](https://github.com/awaiaune/yasoyahonten/actions/runs/45131236331)：6件成功、失敗0、スキップ0。Worker構文検査も成功。
- 決済・Durable Object・注文・在庫など31個の保護区画が元のソースとバイト単位で同じことを確認。
- 実稼働ソースを使った模擬商品で、トップ指定除外、順序維持、未指定・指定画像のみのケース、下書き入力検証、選択・解除・再選択・並べ替え、商品写真切り替え、カート追加を検証。
- 管理Workerの実装を使い、署名あり/なしJWTとOrigin検証、API転送、認証後のJS・HTML表記変更を検証。テスト用の鍵とモックは本番コードに入れていない。
- Chromium 390×844と1440×900で、白文字11px/15px、中央位置、filter:none、幕なし、スライド・リンク・画像失敗時のHTML名を確認。
- 本番の管理アカウントでの保存・公開操作は行っていない。実画像アップロード、Square決済、注文・在庫の更新も行っていない。

## 4. Cloudflare公開結果・復旧

[未公開版照合成功](https://github.com/awaiaune/yasoyahonten/actions/runs/45131496559)。
[本番公開・実サイト検証成功](https://github.com/awaiaune/yasoyahonten/actions/runs/45131739699)。

公開日時：2026-11-23 16:32 JST。両Workerとも新バージョン100%。

| Worker | 変更前・復旧先 | 現行稼働版 |
| --- | --- | --- |
| yasoya-honten-payments | 4b6bd7d0-cf2a-43d4-887e-5fac0529eadf | d467c29a-1e83-4362-b446-6f0df34b752a |
| yasoya-honten-admin | 027b2201-4955-4856-9e9d-b380bcfff23e | d181d5ab-36ea-44aa-9e26-502fbcccd3cb |

公開前に、稼働版が記録した変更前IDと一致し、最新版が照合済み候補IDであることを確認。43個/6個のバインディング、互換日・フラグ、DOのexports/migration tag、スクリプト設定が同じことを確認。すべて既存接続を継承した。Secretsの内容は取得・記録していない。

D1、R2画像、在庫、注文、DO、Square、購入受付フラグ、既存Secrets、DNS、Accessを変更・初期化していない。現行のCustom Domain配信はPages直配信ではなく、上記2Workerと既存ASSETS。

復旧手順：

1. 他のWorkによる後続公開がないことを現在の稼働IDで確認する。
2. Cloudflare Workersの各Workerのバージョン/デプロイ画面から、表の「変更前・復旧先」を100%にする。または既存の認証済みActions環境から、`POST /accounts/{account}/workers/scripts/{worker}/deployments`へ `{"strategy":"percentage","versions":[{"version_id":"記録した復旧先ID","percentage":100}]}` を送る。
3. 管理Worker→公開Workerの両方を対象とし、トップ・商品・カート・robots/sitemapと稼働IDを再確認する。
4. `ui-deploy-20261123.py --rollback`も、候補・元スナップショット・deployment-receiptを指定すると利用できる。自分の候補が稼働中の場合だけ戻す。他の後続版を上書きしない。

デプロイ処理と公開後ブラウザー検証の両方に自動復旧を用意したが、今回は成功したため復旧は未実行。証跡は`production-receipt.json`、候補・元ソースハッシュは`patch-receipt.json`。Actions画像・元ASSETSの読み取りスナップショットは30日保存のため、永続コードの根拠にはこのフォルダーのモジュールとハッシュも使用する。

## 5. 本番サイトでの確認

- `/`、`/products`、`/products/lemonbalm10.html`、`/products/yomogi10.html`を200で確認。
- トップの中央白文字、元画像の色、幕なし、植物スライドからヨモギへのリンク、写真切り替え、画像読み込み失敗時のHTML名をスマホ・PC両方で確認。
- 説明文は1回だけ表示。title/canonical/JSON-LD/CSPを保持。
- 商品購入欄のHTMLは公開直前と同一。robots.txt、sitemap.xml、cart.js、checkout.htmlも公開直前とバイト単位で同一。
- 本番ブラウザーでは対象商品の購入ボタンが無効だったため、実サイトでのカート追加はスキップ。模擬商品でのカート追加は成功。実課金・在庫操作は行っていない。
- 新しいトップ画像2枚は未登録。現在の登録済み写真で明るさと文字表示を確認した。

## 6. Google Search Console

Search Consoleを開いたがGoogleアカウントのログインが必要。安全な認証入力のリクエストは時間切れとなり、新しいタブで認証後の状態を確認してもログイン前の案内画面だった。URL検査・インデックス登録リクエストは未実施。サイトマップ再送信もしていない。サイト側のSEO確認とGoogle側の登録状態は別として扱う。

ログイン後の検査対象は上記の実URL4件。`/products.html`は`/products`へ転送、古い`/products/lemonbalm.html`・`/products/yomogi.html`は404だったため検査対象にしない。

## 7. 画像2枚を登録する手順

1. 管理画面 `https://admin.awaiaune.com/admin/` の商品一覧からレモンバームを編集する。
2. 「＋ 写真を追加」でレモンバームの新画像を追加する。商品詳細に見せたい既存写真も残す。
3. 「写真の順序・トップページ表示用を編集」を開き、新画像の「トップページ表示用」を押す。
4. 「下書き保存」→「公開する」。公開完了の表示を確認する。新画像はトップ等の植物表示に使われ、商品詳細ギャラリーからは除外される。
5. ヨモギも同じ手順で登録する。最後にトップと各商品ページを再読み込みして確認する。

選び直す場合は別の登録済み写真の「トップページ表示用」を押す。解除は「トップページ表示用を解除」。解除すると先頭の商品写真をトップでも共用する。写真の並べ替えは前/後の矢印で行う。トップ掲載商品自体の設定は今回変更していない。
