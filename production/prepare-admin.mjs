// Offline public UI packaging only. No API calls, credentials, settings or customer data.
import {readFile,writeFile,mkdir,lstat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url)),dest=fileURLToPath(new URL('./.generated/admin/',import.meta.url));
for(const file of ['admin/index.html','css/admin.css','js/admin-ui.js','js/admin.js','js/admin-management.js']){
 if(!(await lstat(path.join(root,file))).isFile())throw Error('Regular public UI file required');
 await mkdir(path.dirname(path.join(dest,file)),{recursive:true});await writeFile(path.join(dest,file),await readFile(path.join(root,file)));
}
console.log('Production admin UI packaged locally; no deployment, migration or network access.');
