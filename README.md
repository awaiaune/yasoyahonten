# YASOYA HONTEN ONLINE STORE

静的HTML + Vanilla JS + Square Web Payments SDK + Cloudflare Workerで動く、八草屋本店用ECスターターです。

## 重要

- `SQUARE_ACCESS_TOKEN` はHTML、JavaScript、GitHubへ絶対に書かないでください。
- Sandboxでは実在する個人情報や本物のカード情報を使わないでください。
- 商品価格は `worker/src/catalog.js` が最終的な正解です。フロント側の価格は表示用です。
- 初期価格・送料は仮値です。公開前に必ず変更してください。

## フォルダ

```text
css/
  cart.css
  checkout.css

js/
  store-config.js
  cart.js
  cart-drawer.js
  checkout.js

products/
  goldenrod.html

checkout.html
thanks.html

worker/
  src/
    index.js
    catalog.js
  wrangler.jsonc
  .dev.vars.example
  .gitignore
```

## STEP 1：商品情報を決める

次の2ファイルで、商品IDを必ず一致させます。

- 商品ページの `data-product-id`
- `worker/src/catalog.js` のキー

例：

```html
data-product-id="goldenrod-10g"
```

```js
"goldenrod-10g": {
  name: "乾燥セイタカアワダチソウ",
  price: 980
}
```

価格・在庫・購入上限はWorker側を正とします。

## STEP 2：既存ページへカート共通部品を追加

各ページの `</body>` 直前へ以下を追加します。

```html
<link rel="stylesheet" href="../css/cart.css">

<script src="../js/store-config.js"></script>
<script src="../js/cart.js"></script>
<script src="../js/cart-drawer.js"></script>
```

ルート直下ページなら `../` を外してください。

ヘッダー内には次を追加します。

```html
<button class="cart-trigger" id="cartTrigger" type="button" aria-label="カートを開く">
  CART
  <span class="cart-count" id="cartCount">0</span>
</button>
```

`products/goldenrod.html` の実装例は同梱済みです。

## STEP 3：Cloudflare WorkerをSandboxで公開

Cloudflare Dashboardだけでもできますが、Wranglerを使う場合：

```bash
cd worker
npm create cloudflare@latest
```

既存ファイルを使う場合はWranglerをインストールして：

```bash
npm install
npx wrangler login
```

`worker/wrangler.jsonc` の以下を変更します。

- `ALLOWED_ORIGINS`
- `SQUARE_LOCATION_ID`
- 必要ならWorker名

SandboxアクセストークンをSecret登録：

```bash
npx wrangler secret put SQUARE_ACCESS_TOKEN
```

表示された入力欄にSandbox Access Tokenを貼ります。

公開：

```bash
npx wrangler deploy
```

表示されたWorker URLを控えます。

## STEP 4：フロント設定

`js/store-config.js` に以下を設定します。

```js
window.YASOYA_STORE_CONFIG = {
  environment: "sandbox",
  squareApplicationId: "あなたのSandbox Application ID",
  squareLocationId: "あなたのSandbox Location ID",
  workerBaseUrl: "https://あなたのWorker.workers.dev"
};
```

Application IDとLocation IDは公開情報としてブラウザ側に置けます。
Access Tokenは置けません。

## STEP 5：Sandboxテスト

`checkout.html` をHTTPサーバー経由で開きます。
HTMLを直接ダブルクリックした `file://` では、Square SDKやCORSの検証が正常に進まない場合があります。

GitHub Pagesへ仮公開するか、VS Code Live Serverなどを使用してください。

SandboxではSquare公式のテストカードだけを使います。本物のカードは使用できません。

成功すると：

1. Square Web Payments SDKがカードをトークン化
2. Workerへ商品ID・数量・トークンを送信
3. Workerが価格を再計算
4. WorkerがSquare Payments APIへ送信
5. `thanks.html` へ移動

## STEP 6：本番切替

本番前に必ず以下を変更します。

### `js/store-config.js`

```js
environment: "production",
squareApplicationId: "Production Application ID",
squareLocationId: "Production Location ID",
workerBaseUrl: "本番Worker URL"
```

### `worker/wrangler.jsonc`

```json
"SQUARE_ENVIRONMENT": "production",
"SQUARE_LOCATION_ID": "Production Location ID",
"ALLOWED_ORIGINS": "https://あなたの独自ドメイン"
```

本番アクセストークンをSecretへ上書き：

```bash
npx wrangler secret put SQUARE_ACCESS_TOKEN
```

再公開：

```bash
npx wrangler deploy
```

SandboxとProductionのApplication ID、Location ID、Access Tokenを混在させないでください。

## STEP 7：公開前チェック

- 商品名・内容量・税込価格
- Workerの商品価格
- 送料ルール
- 在庫切れ時の挙動
- 購入上限
- 特商法表示
- プライバシーポリシー
- 返品・キャンセル規定
- 注文確認方法
- スマートフォン表示
- Sandbox決済成功
- Sandbox決済失敗
- 二重クリック防止
- 独自ドメインだけCORS許可
- Productionで少額の実決済と返金テスト

## 現在の仕様

- localStorageカート
- 右側スライド式カート
- 商品数量変更
- Worker側価格再計算
- 固定送料
- Squareカード決済
- 決済ボタン二重送信防止
- Sandbox / Production切替
- 許可ドメイン限定CORS
