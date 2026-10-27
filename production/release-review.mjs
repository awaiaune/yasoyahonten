// Offline release inventory, not a deployer. Never reads local credentials/configuration.
import {readFile,writeFile,mkdir,readdir,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {CHECKOUT_CONTRACT,CHECKOUT_RELEASE} from '../worker/src/checkout-contract.js';
async function sourceFiles(){
 const files=['checkout.html','thanks.html','worker/wrangler.jsonc'];
 async function walk(dir){for(const name of await readdir(new URL('../'+dir+'/',import.meta.url))){if(name.startsWith('.')||name.includes('.local.')||name==='node_modules')continue;const relative=dir+'/'+name,stat=await lstat(new URL('../'+relative,import.meta.url));if(stat.isSymbolicLink())throw Error('Symlink in release sources');if(stat.isDirectory())await walk(relative);else if(/\.(?:js|mjs|css|sql)$/.test(name)||name.endsWith('.example.jsonc'))files.push(relative);}}
 for(const dir of ['worker/src','worker/migrations-production','validation','production','js','css'])await walk(dir);return files.sort();
}
export async function releaseInventory(){
 const sourceHashes={};for(const f of await sourceFiles())sourceHashes[f]=createHash('sha256').update(await readFile(new URL('../'+f,import.meta.url))).digest('hex');
 return {baseGitCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:new URL('../',import.meta.url),encoding:'utf8'}).trim(),release:CHECKOUT_RELEASE,contract:CHECKOUT_CONTRACT,supportedContracts:[1],sourceHashes,worker:'yasoya-honten-payments',purchaseClass:'PurchaseCoordinator',purchaseBinding:'PURCHASE_COORDINATOR',purchaseObjectName:'yasoya-honten-global-purchase-lock',purchaseStateFormatChanged:false,automaticMigration:false,checkoutInitiallyPaused:true};
}
export function reviewAgainstBaseline(previous,current){
 if(!Array.isArray(previous.supportedContracts)||!previous.supportedContracts.every(v=>current.supportedContracts.includes(v)))throw Error('Published API contract removed');
 for(const key of ['worker','purchaseClass','purchaseBinding','purchaseObjectName'])if(previous[key]!==current[key])throw Error('Purchase identity changed');
 if(current.purchaseStateFormatChanged||current.automaticMigration)throw Error('State/migration compatibility requires a separate review');
 for(const [file,hash] of Object.entries(previous.sourceHashes||{}))if((file==='js/checkout.js'||/^js\/checkout-v[0-9][^/]*\.js$/.test(file))&&current.sourceHashes[file]!==hash)throw Error('Published checkout asset must be retained unchanged; add a new filename');
 return true;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const command=process.argv[2];if(!['prepare','check','compare'].includes(command))throw Error();const current=await releaseInventory(),file=new URL('./.generated/release-review.json',import.meta.url);
 if(command==='compare')reviewAgainstBaseline(JSON.parse(await readFile(new URL('./.generated/known-good-release.json',import.meta.url),'utf8')),current);
 else if(command==='prepare'){await mkdir(new URL('./.generated/',import.meta.url),{recursive:true});await writeFile(file,JSON.stringify(current,null,2)+'\n');}else if(JSON.stringify(JSON.parse(await readFile(file,'utf8')))!==JSON.stringify(current))throw Error();
 console.log('Offline release inventory '+(command==='prepare'?'prepared':'verified')+'; deployment, credentials, remote bindings and production state NOT verified.');
 }catch{console.error('Release review refused; inspect the sources and re-review before preparing a new inventory.');process.exitCode=1;}
}
