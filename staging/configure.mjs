// Creates only an ignored local config from non-secret deployment parameters.
import {readFile,writeFile} from 'node:fs/promises';
const file=new URL('./wrangler.jsonc',import.meta.url),config=JSON.parse(await readFile(file,'utf8'));
const names=['STAGING_DATABASE_ID','STAGING_INSTANCE_ID','SQUARE_LOCATION_ID','SQUARE_SANDBOX_APPLICATION_ID','ACCESS_TEAM_DOMAIN','ACCESS_AUDIENCE','STAGING_ADMIN_EMAIL'];
for(const name of names){const value=process.env[name];if(!value||/REPLACE|CHANGEME/.test(value))throw Error('Missing non-secret staging setting: '+name);config.vars[name]=value;}
if(!/^[a-f0-9-]{36}$/.test(config.vars.STAGING_DATABASE_ID)||config.vars.STAGING_DATABASE_ID==='442fa9fd-25d3-4c01-bcc3-04be7b420cf5'||config.vars.SQUARE_LOCATION_ID==='LQ693S4H2NBZ8'||!config.vars.SQUARE_SANDBOX_APPLICATION_ID.startsWith('sandbox-sq0idb-'))throw Error('Production identifiers or invalid staging values');
config.d1_databases[0].database_id=config.vars.STAGING_DATABASE_ID;
await writeFile(new URL('./wrangler.local.jsonc',import.meta.url),JSON.stringify(config,null,2)+'\n');
console.log('Dedicated staging config prepared. No secret values read or written.');
