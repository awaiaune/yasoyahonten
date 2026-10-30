// Offline packaging only. Never creates resources or deploys.
import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';
const base=new URL('../',import.meta.url),out=new URL('./.generated/site/',import.meta.url);
await mkdir(out,{recursive:true});await cp(new URL('./site/',import.meta.url),out,{recursive:true});
for(const path of ['admin/index.html','css/admin.css','js/admin.js','js/admin-ui.js','js/admin-management.js','js/checkout-v1.js','js/managed-storefront.js']){
 const dest=new URL(path,out);await mkdir(new URL('./',dest),{recursive:true});await cp(new URL(path,base),dest);
}
// Always fetched from the Access-protected staging Worker; no Production fallback.
await writeFile(new URL('js/store-config.js',out),'window.YASOYA_STORE_CONFIG=Object.freeze({environment:"sandbox",workerBaseUrl:location.origin,currency:"JPY"});');
for(const file of ['index.html','products.html','checkout.html','project.html','contact.html','privacy-policy.html','tokushoho.html','thanks.html','products/lemonbalm.html','products/yomogi.html','products/goldenrod.html']){
 let text;try{text=await readFile(new URL(file,out),'utf8');}catch{continue;}
 text=text.replace(/<head\b[^>]*>/i,'$&<script src="/js/store-config.js"></script><meta name="robots" content="noindex,nofollow,noarchive">')
  .replaceAll('https://web.squarecdn.com','https://sandbox.web.squarecdn.com');
 if(file==='checkout.html')text=text.replace('Square Web Payments SDK / Production','Square Web Payments SDK / Sandbox').replace('<script src="https://sandbox.web.squarecdn.com/v1/square.js"></script>','<script async src="https://sandbox.web.squarecdn.com/v1/square.js" onerror="window.YASOYA_SQUARE_SDK_LOAD_FAILED=true"></script>').replace('<div id="card-container"></div>','<p id="cardInitializationStatus" role="status" aria-live="polite">カード入力フォームの準備を開始しています…</p><div id="card-container"></div>').replace(/src=["'](?:\.\.\/)?js\/checkout\.js(?:\?[^"']*)?["']/,'src="/js/checkout-v1.js" onerror="document.getElementById(\'cardInitializationStatus\').textContent=\'購入画面のスクリプトを読み込めません。通信・CSPを確認し再読み込みしてください。\'"').replace('</form>','<button type="button" id="checkPaymentStatus">処理状況を確認</button><button type="button" id="refreshCheckout">購入画面を更新</button></form>');
 await writeFile(new URL(file,out),text);
}
for(const file of ['shop-gallery-v33.js','shop-gallery-v34.js','shop-image-tap-v46.js']){
 const path=new URL('js/'+file,out);let s=await readFile(path,'utf8');
 s=s.replace(/(?:const urls|const links)=\['products\/lemonbalm.html','products\/yomogi.html','products\/goldenrod.html'\]/,m=>m.startsWith('const urls')?"const urls=[...root.querySelectorAll('.v33-scene')].map(e=>e.dataset.productHref)":"const links=[...root.querySelectorAll('.v33-scene')].map(e=>e.dataset.productHref)");
 // An empty catalog has no gallery selection.
 s=s.replace("const root=document.querySelector('.v33-shop');if(!root)return;","const root=document.querySelector('.v33-shop');if(!root||!root.querySelector('.v33-scene'))return;");
 await writeFile(path,s);
}
await writeFile(new URL('robots.txt',out),'User-agent: *\nDisallow: /\n');
console.log('v53 + existing admin + checkout v1 packaged locally. No production changes.');
