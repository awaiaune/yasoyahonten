// Offline design artifact + static preview only. No Worker, credentials or APIs.
import {readFile,writeFile,mkdir,realpath} from 'node:fs/promises';
import {createServer} from 'node:http';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
export const site=fileURLToPath(new URL('../staging/site/',import.meta.url));
export const output='/tmp/yasoya-tea-preview';
export const policy="default-src 'none'; img-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
const safeConfig="window.YASOYA_STORE_CONFIG=Object.freeze({environment:'preview',workerBaseUrl:location.origin,currency:'JPY'});window.fetch=async()=>new Response(JSON.stringify({error:{message:'表示専用プレビューです。外部APIには接続しません。'}}),{status:503,headers:{'Content-Type':'application/json'}});";
export async function buildPreview(){
 await mkdir(output,{recursive:true});let html=await readFile(path.join(site,'index.html'),'utf8');
 // A focused TEA artifact stays small enough to download on a phone. The server's
 // root still serves the complete, unchanged homepage structure and product links.
 const head=html.match(/<head>[\s\S]*?<\/head>/i)[0];
 const tea=html.match(/<section aria-label="お茶のイメージギャラリー"[\s\S]*?<\/section>/)[0];
 html='<!DOCTYPE html><html lang="ja">'+head+'<body>'+tea+'<script src="js/editorial-v23.js"></script></body></html>';
 for(const match of [...html.matchAll(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/g)]){
  const css=(await readFile(path.join(site,match[1]),'utf8')).replace(/@import\s+url\([^)]*\)\s*;/g,'');
  html=html.replace(match[0],'<style>'+css+'</style>');
 }
 for(const match of [...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*>\s*<\/script>/g)]){
  const js=match[1]==='js/store-config.js'?safeConfig:await readFile(path.join(site,match[1]),'utf8');
  html=html.replace(match[0],'<script>'+js.replace(/<\/script/gi,'<\\/script')+'</script>');
 }
 for(const match of [...html.matchAll(/<img\b[^>]*\bsrc="(images\/[^"]+)"[^>]*>/g)]){
  const bytes=await readFile(path.join(site,match[1]));const mime=/\.png$/i.test(match[1])?'image/png':/\.webp$/i.test(match[1])?'image/webp':'image/jpeg';
  html=html.replace(match[0],match[0].replace('src="'+match[1]+'"','src="data:'+mime+';base64,'+bytes.toString('base64')+'"'));
 }
 html=html.replace(/<head>/i,'<head><meta http-equiv="Content-Security-Policy" content="'+policy+'">');
 await writeFile(output+'/preview.html',html);
 return output+'/preview.html';
}
export function previewServer(){
 return createServer(async(req,res)=>{
  try{
   if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
   const pathname=decodeURIComponent(new URL(req.url,'http://preview.local').pathname);
   if(pathname.startsWith('/api/')||pathname.startsWith('/admin')||pathname==='/checkout.html'){res.writeHead(403,{'Content-Type':'text/plain;charset=utf-8'});return res.end('表示専用プレビューです。購入・管理APIは利用できません。');}
   let file=pathname==='/preview.html'?output+'/preview.html':path.resolve(site,'.'+(pathname==='/'?'/index.html':pathname));
   if(pathname!='/preview.html'&&(!(await realpath(file)).startsWith(site)||!/^\/(?:index\.html|[a-z0-9-]+\.html|products\/[a-z0-9-]+\.html|(?:images|css|js)\/[a-zA-Z0-9_.-]+)$/.test(pathname==='/'?'/index.html':pathname))){res.writeHead(404);return res.end();}
   const type=file.endsWith('.html')?'text/html;charset=utf-8':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'image/jpeg';
   let data=await readFile(file);if(pathname==='/js/store-config.js')data=Buffer.from(safeConfig);
   res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store','Content-Security-Policy':policy,'X-Robots-Tag':'noindex, nofollow'});res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404);res.end('Not found');}
 });
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 const file=await buildPreview();console.log('Offline preview: '+file);
 if(process.argv.includes('--serve')){const server=previewServer();server.listen(8789,'0.0.0.0',()=>console.log('Local preview: http://localhost:8789/preview.html#teaStage'));}
}
