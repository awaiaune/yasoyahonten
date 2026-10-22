import {createServer} from 'node:http';
import {readFile,realpath} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
export const root=fileURLToPath(new URL('../',import.meta.url)).replace(/\/$/,'');
export const CSP="default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";
export function runtimeOptions(script,persist=false){
    // No wrangler config, .dev.vars, .env or inherited process credentials.
    return {name:'yasoya-local-only',modules:true,script,compatibilityDate:'2026-08-04',host:'127.0.0.1',port:0,
        outboundService:()=>new Response('Local development: outbound network denied',{status:503}),
        bindings:{LOCAL_TEST_MODE:'1',SQUARE_ACCESS_MODE:'READ_ONLY',VALIDATION_CHECKOUT_ENABLED:'0',VALIDATION_MAIL_ENABLED:'0',VALIDATION_CRON_ENABLED:'0',SQUARE_ENVIRONMENT:'sandbox',SQUARE_LOCATION_ID:'local-not-a-square-location',ALLOWED_ORIGINS:'http://127.0.0.1:8000',SITE_URL:'http://127.0.0.1:8000',ADMIN_TOKEN:'local-development-only'},
        d1Databases:{ORDERS_DB:'yasoya-isolated-local-orders'},
        durableObjects:{PURCHASE_COORDINATOR:{className:'PurchaseCoordinator',useSQLite:true}},
        d1Persist:persist&&path.join(persist,'d1'),durableObjectsPersist:persist&&path.join(persist,'do')};
}
export async function createRuntime(persist=false){
    const result=await build({entryPoints:[path.join(root,'worker/src/index.js')],bundle:true,write:false,format:'esm',platform:'browser'});
    const mf=new Miniflare(runtimeOptions(result.outputFiles[0].text,persist));await mf.ready;return mf;
}
export const localConfig="window.YASOYA_STORE_CONFIG=Object.freeze({environment:'sandbox',squareApplicationId:'',squareLocationId:'',workerBaseUrl:location.origin,currency:'JPY'});";
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.ico':'image/x-icon'};
export function createLocalServer(mf){return createServer(async(req,res)=>{
    const headers={'Content-Security-Policy':CSP,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
    const send=(status,body,type='text/plain; charset=utf-8')=>{res.writeHead(status,{...headers,'Content-Type':type});res.end(body);};
    try{
        if(req.headers.host!==`127.0.0.1:${res.socket.localPort}`)return send(403,'Local host only');
        if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`)return send(403,'Local origin only');
        const url=new URL(req.url,'http://127.0.0.1');
        if(url.pathname.startsWith('/api/')){
            const chunks=[];let size=0;
            for await(const chunk of req){size+=chunk.length;if(size>24000)return send(413,'Body too large');chunks.push(chunk);}
            const r=await mf.dispatchFetch(`http://${req.headers.host}${url.pathname}${url.search}`,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});
            return send(r.status,Buffer.from(await r.arrayBuffer()),r.headers.get('content-type')||'application/json');
        }
        if(!['GET','HEAD'].includes(req.method))return send(405,'Read only');
        if(url.pathname==='/js/store-config.js')return send(200,localConfig,types['.js']);
        let relative=decodeURIComponent(url.pathname).replace(/^\/+/, '');
        if(!relative||relative.endsWith('/'))relative+='index.html';
        if(!/^(?:[^/]+\.html|(?:admin|products)\/[^/]+\.html|(?:js|css|images)\/[\w./-]+)$/.test(relative)||relative.split('/').some(p=>p.startsWith('.')))return send(404,'Not found');
        const file=await realpath(path.join(root,relative));
        if(!file.startsWith(root+path.sep)||!types[path.extname(file)])return send(404,'Not found');
        let content=await readFile(file);
        if(file.endsWith('.html')){
            content=content.toString().replace(/<script\b[^>]*src=["']https:\/\/(?:web|sandbox)\.squarecdn\.com[^"']*["'][^>]*>\s*<\/script>/gi,'');
            content=content.replace(/<head\b[^>]*>/i,'$&<script src="/js/store-config.js"></script>');
        }
        send(200,req.method==='HEAD'?'':content,types[path.extname(file)]);
    }catch{send(404,'Local resource unavailable');}
});}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
    const mf=await createRuntime(path.join(root,'dev/.state'));const server=createLocalServer(mf);
    server.on('error',async error=>{console.error(error.message);await mf.dispose();process.exitCode=1;});
    server.listen(8000,'127.0.0.1',()=>console.log('Isolated local site: port 8000. Payments/email/external inventory disabled.'));
    for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{server.close();await mf.dispose();process.exit(0);});
}
