// Read-only preview; no live checkout, Square SDK, payments, inventory or management APIs.
import {createServer} from 'node:http';
import {readFile,realpath} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const dir=fileURLToPath(new URL('../staging/site/',import.meta.url)),port=8791;
const csp="default-src 'none'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'none'; script-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'";
function decorate(html,isCheckout){
 html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
 html=html.replace(/(<button\b[^>]*\bid="cartTrigger"[^>]*)>/,'$1 disabled>');
 html=html.replace(/(<body\b[^>]*>)/i,'$1<div role="status" style="position:fixed;right:10px;bottom:10px;z-index:5000;padding:8px 12px;background:#293d30;color:#fff;font:11px Arial,sans-serif;pointer-events:none">DESIGN PREVIEW · 決済不可</div>');
 if(isCheckout){
  html=html.replace('<div id="card-container"></div>','<div id="card-container" style="display:grid;place-items:center;border:1px dashed #849184;min-height:106px;color:#647567;font:12px sans-serif">カード入力フォーム：デザイン確認用</div>');
  html=html.replace(/(<button\b[^>]*\bid="paymentButton")\s+type="submit"/,'$1 disabled type="button"');
  html=html.replace('<div id="checkoutSummaryItems"></div>','<div id="checkoutSummaryItems"><div class="checkout-summary-line"><span>乾燥ハーブ 10g（表示サンプル）</span><strong>¥980</strong></div></div>');
  html=html.replace(/(id="checkoutSubtotal">\s*)—/,'$1¥980').replace(/(id="checkoutShipping">\s*)—/,'$1¥350').replace(/(id="checkoutTotal">\s*)—/,'$1¥1,330');
 }
 return html.replace('</head>','<meta name="robots" content="noindex,nofollow"></head>');
}
const types={css:'text/css;charset=utf-8',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',svg:'image/svg+xml'};
const server=createServer(async(req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const target=pathname==='/'?'/checkout.html':pathname;
  if(!/^\/(?:checkout\.html|thanks\.html|favicon\.png|css\/[a-zA-Z0-9_.-]+\.css)$/.test(target)){res.writeHead(404);return res.end('Not found');}
  const p=path.resolve(dir,'.'+target),safe=await realpath(p);
  if(!safe.startsWith(dir)){res.writeHead(404);return res.end('Not found');}
  const ext=safe.split('.').at(-1),isHtml=ext==='html';
  const bytes=isHtml?Buffer.from(decorate(await readFile(safe,'utf8'),target==='/checkout.html'),'utf8'):await readFile(safe);
  res.writeHead(200,{'Content-Type':isHtml?'text/html;charset=utf-8':types[ext]||'application/octet-stream','Cache-Control':'no-store','Content-Security-Policy':csp,'X-Robots-Tag':'noindex,nofollow'});
  res.end(req.method==='HEAD'?undefined:bytes);
 }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(port,'0.0.0.0',()=>console.log('Read-only checkout/thanks preview: http://localhost:'+port+'/checkout.html (PORTS '+port+', Private)'));
