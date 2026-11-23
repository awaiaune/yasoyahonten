# 八草屋本店 統合検証記録（2026-11-23）

## 結果
本番は未変更。Cloudflareのメール・専用パスワード認証で、画面に `API Request Failed: post https://dash.cloudflare.com/api/v4/login (403)` が表示された。誤パスワードとは断定していない。認証情報は記録していない。稼働バージョン、全静的ASSETS、実際の配信経路・ビルド設定・接続ブランチは取得できていない。ユーザーの停止条件に従いデプロイしない。

## ブランチ・重複照合
検証した統合コミット: `a9c78e162a6ade179422d1354619f8627d24dbe1`（fix/home-images-20261123）。
- PR #9: 未マージ・ドラフト。比較元は fix/staging-d1-idle-reads-20261115。
- PR #10: 統合元へマージ済み（b145a9d）。画像同梱と固定パス参照を撤回。画像は管理画面から登録する。
- PR #11: 統合元へマージ済み（a9c78e1）。中央の小さなHTML植物名と説明文を追加。
- fix/home-shop-description-20261123 の説明文はPR #11に取り込み済み。重複追加なし。
- mainと統合元は389ファイル相違、main側21／統合元側97コミットの分岐。全体マージ禁止。
- 統合元とPR #9比較元との差分は下記14ファイル。今回はアプリケーションコードを追加変更していない。

| 内容 | 判定 |
| --- | --- |
| 管理画面によるトップ画像選択、解除、詳細ギャラリーからの除外 | 既存実装済み（本番未確認） |
| 明度filter、疑似要素の幕、巨大文字の削除 | 既存実装済み（本番未確認） |
| 中央HTML植物名、11〜15px、スライドと商品リンク | 既存実装済み（本番未確認） |
| PACKAGE/DETAIL/IMAGE等の削除、画像切替ドット保持 | 既存実装済み（本番未確認） |
| 指定の本文説明文 | 既存実装済み・別ブランチ案は重複 |
| 旧PR #9説明の「画像2枚を同梱」 | PR #10で撤回済み。PR説明を更新 |
| 現行本番ソースとの一致、稼働バージョン、復旧先確定 | 未確認 |
| 本番配信・Search Consoleの検証 | 未実施 |

## 変更済みの14ファイル
- admin/index.html
- js/admin-management.js
- worker/src/management/domain.js
- worker/src/management/presentation-images.js
- worker/src/management/storefront.js
- worker/src/management/v53-render.js
- production/site/index.html
- staging/site/index.html
- staging/site/css/editorial-v41-home.css
- staging/site/js/product-experience.js
- staging/site/products/lemonbalm.html
- staging/site/products/yomogi.html
- staging/site/products/goldenrod.html
- dev/home-presentation.test.mjs

goldenrodテンプレートの変更は共通の画像表示ラベル削除のみ。販売終了・検索方針のロジックを変更していない。Square、D1、DO、在庫、注文、Secrets、購入受付フラグ、DNS、Accessに本番変更なし。

## 実行した検証
- production/prepare-v53.mjs: ローカル生成成功。
- 画像分離、旧データ互換、管理UI、実HTMLRewriter出力: 13件成功。
- 拡張した関連テスト全体: 44件中41件成功、3件失敗（親テストの集計失敗を含む）。
- Production v53の模擬ライフサイクル、注文保持、在庫・再送制御、商品公開、バリエーション等: 成功。外部サービスは模擬、実課金なし。
- 失敗理由1: production/payment-rc-manifest.jsonの承認済みハッシュと現コードが不一致。今回のUI変更に加え、staging/worker.js等には比較元から存在する不一致もある。承認ハッシュを機械的に書き換えていない。
- 失敗理由2: スマホブラウザテストのChromium起動で socket() Operation not permitted。実画面のスマホ／PC操作は未検証。起動制限の回避は試みていない。
- 差分の空白エラーなし。
- 公開トップ、robots.txt、sitemap.xmlの取得はいずれもHTTP 403。この環境での結果であり、Googlebotへの拒否やサイト停止とは断定しない。

## SEOのローカル確認と未確認事項
- 指定本文はproductionトップに1回だけ存在する。stagingにも1回。重複なし。
- 生成された商品一覧・レモンバーム・ヨモギはcanonicalとJSON-LDあり、noindexなし。
- 生成されたトップはtitle「八草屋本店」とmeta descriptionがある一方、canonicalとJSON-LDの挿入先がない。renderV53は既存要素の書換えのみなので、実際に配信するASSETSに要素がなければ追加されない。現行本番を取得後に要否を判断する。
- prepare-v53の生成物にはsitemap.xmlがない。ルートにはサイトマップがあるが、実際の配信元を確認するまで統合・書換えしない。
- ルートと生成物のrobots.txtが異なる。生成物には/admin/と/api/の除外があり、ルートのSitemap宣言は引き継がれない。本番を取得して採用元を確認する。
- ルートの既存サイトマップにgoldenrodが含まれる。販売終了・検索方針を推測して変更していない。
- Search Consoleは「本番反映後」の指定に従い、URL検査・登録リクエストとも未実施。サイトマップ再送信なし。

## 復旧・再開
今回は本番変更がないため復旧操作は不要。以前の資料のバージョンIDを現行とみなさない。
再開時はCloudflareで本番の現在のバージョンID、配信ルート、全ASSETSのマニフェスト、ビルド・接続ブランチを読み取り確認する。取得した元バージョンとASSETSを保持し、その元バージョンへ戻す具体的な操作・対象を記録した後に差分を適用する。現在それらを確定した復旧手順は作成できていない。

## 画像登録手順（本番反映後）
1. 既存の管理画面で「商品」からレモンバームの「編集」を開く。
2. 「写真を追加」でトップ用画像を登録する。商品詳細用の写真は残す。
3. 「写真の順序・トップページ表示用を編集」を開き、新しい画像の「トップページ表示用」を押す。
4. 「下書きを保存」後、既存の公開ボタンで公開する。
5. トップに選択画像が表示され、商品詳細にその画像が出ず、商品写真の切替ができることを確認する。
6. ヨモギも同じ操作を行う。選び直す場合は別画像の「トップページ表示用」、解除する場合は「トップページ表示用を解除」を使う。
現行本番の管理画面でこの新表記が使えるとはまだ確認していない。
