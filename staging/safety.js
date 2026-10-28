// Independent remote staging boundary; never accepts a production binding.
export function assertStaging(env){
 const need=(v,m)=>{if(!v)throw Error('Staging configuration rejected: '+m);};
 need(env.RUNTIME_TIER==='staging'&&env.SQUARE_ENVIRONMENT==='sandbox','Sandbox only');
 need(env.STAGING_WORKER_NAME==='yasoya-v53-staging','dedicated Worker');
 need(env.SITE_URL==='https://staging.awaiaune.com'&&env.ALLOWED_ORIGINS===env.SITE_URL,'dedicated origin');
 need(/^[a-f0-9-]{36}$/.test(env.STAGING_DATABASE_ID||'')&&env.STAGING_DATABASE_ID!=='442fa9fd-25d3-4c01-bcc3-04be7b420cf5','dedicated D1');
 need(/^[a-f0-9-]{36}$/.test(env.STAGING_INSTANCE_ID||'')&&env.STAGING_INSTANCE_ID!==env.STAGING_DATABASE_ID,'instance marker');
 need(env.SQUARE_LOCATION_ID&&env.SQUARE_LOCATION_ID!=='LQ693S4H2NBZ8'&&!env.SQUARE_LOCATION_ID.includes('REPLACE'),'Sandbox Location');
 need(env.SQUARE_SANDBOX_APPLICATION_ID?.startsWith('sandbox-sq0idb-'),'Sandbox application');
 for(const name of ['SQUARE_ACCESS_TOKEN','RESEND_API_KEY','ADMIN_TOKEN','PRODUCTION_MANAGEMENT_SQUARE_TOKEN','LOCAL_SQUARE','LOCAL_TEST_MODE'])need(!env[name],'production/local bindings forbidden');
 need(env.SQUARE_SANDBOX_ACCESS_TOKEN&&env.VALIDATION_ADMIN_TOKEN,'dedicated Sandbox and admin secrets');
 need(env.ACCESS_TEAM_DOMAIN?.endsWith('.cloudflareaccess.com')&&/^[a-f0-9]{64}$/.test(env.ACCESS_AUDIENCE||''),'Access configuration');
 need(/^[^\s@]+@[^\s@]+$/.test(env.STAGING_ADMIN_EMAIL||''),'approved administrator');
 need(env.VALIDATION_MAIL_ENABLED==='0'&&env.VALIDATION_CRON_ENABLED==='0','mail/cron off');
 need(env.ORDERS_DB&&env.PURCHASE_COORDINATOR,'staging bindings');
 return {workerOrigin:env.SITE_URL,notificationEmail:env.STAGING_ADMIN_EMAIL,accessTeamDomain:env.ACCESS_TEAM_DOMAIN,accessAudience:env.ACCESS_AUDIENCE,instanceId:env.STAGING_INSTANCE_ID};
}
export async function assertStagingDatabase(env){
 const m=assertStaging(env);const row=await env.ORDERS_DB.prepare('SELECT instance_id,database_id FROM staging_environment WHERE id=1').first();
 if(row?.instance_id!==m.instanceId||row?.database_id!==env.STAGING_DATABASE_ID)throw Error('Staging D1 marker mismatch');
 return m;
}
