// Packaging only. No authentication, remote D1, deployment or external API.
import {cp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url),out=new URL('.generated/v53/',import.meta.url);
execFileSync(process.execPath,[new URL('../staging/prepare.mjs',import.meta.url).pathname],{stdio:'pipe'});
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});await cp(new URL('../staging/.generated/site/',import.meta.url),out,{recursive:true});
// Base v53 package; live-compatible Production templates are overlaid below.
async function visit(dir){const {readdir}=await import('node:fs/promises');for(const e of await readdir(dir,{withFileTypes:true})){const p=new URL(e.name+(e.isDirectory()?'/':''),dir);if(e.isDirectory())await visit(p);else if(e.name.endsWith('.html')){let html=await readFile(p,'utf8');html=html.replaceAll('八草屋本店 | ボタニカル・エディトリアル デザイン試作','八草屋本店').replaceAll('八草屋本店のトップページデザイン比較用試作。','自然を、そのまま届ける。一草一茶。').replaceAll('https://sandbox.web.squarecdn.com','https://web.squarecdn.com').replace('Square Web Payments SDK / Sandbox','Square Web Payments SDK / Production').replace('<script async src="https://web.squarecdn.com/v1/square.js"','<script src="https://web.squarecdn.com/v1/square.js"');if(!p.pathname.includes('/admin/')&&!/\/(?:checkout|thanks)\.html$/.test(p.pathname))html=html.replace(/<meta\b(?=[^>]*name=["']robots["'])[^>]*>/gi,'');await writeFile(p,html);}}}
await visit(out);
// Transaction templates are the captured live v56 design. The homepage is its
// pre-render V57 source, never the D1-rendered public response.
await cp(new URL('site/',import.meta.url),out,{recursive:true});
await writeFile(new URL('js/store-config.js',out),'throw new Error("Production runtime configuration must be served by the Worker");');
await writeFile(new URL('robots.txt',out),'User-agent: *\nDisallow: /admin/\nDisallow: /api/\n');
console.log('Production v53 assets packaged; no deployment or remote calls.');
