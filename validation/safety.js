import { CATALOG } from '../worker/src/catalog.js';
import { SANDBOX_CATALOG } from './catalog.js';
const PRODUCTION = {
    worker: 'yasoya-honten-payments', database: '442fa9fd-25d3-4c01-bcc3-04be7b420cf5',
    location: 'LQ693S4H2NBZ8', app: 'sq0idp-JYrGicMfKr-ILhZeLS9Xsw'
};
export const WORKER = 'yasoya-payments-validation';
export const DATABASE = 'yasoya-validation-orders';
function requireSafe(condition, message) { if (!condition) throw new Error(`Sandbox safety: ${message}`); }
function filled(value) { return typeof value === 'string' && value.length > 0 && !/REPLACE|CHANGEME/i.test(value); }
export function assertManifest(m) {
    const allowed = ['workerName','accountId','workerOrigin','databaseName','databaseId','instanceId','squareApplicationId','squareLocationId','variations','notificationEmail','resendFrom','accessTeamDomain','accessAudience'];
    requireSafe(Object.keys(m).every(key => allowed.includes(key)), 'unknown field (never put secrets in manifest)');
    requireSafe(m.workerName === WORKER && m.databaseName === DATABASE, 'dedicated validation resource names required');
    requireSafe(/^[a-f0-9]{32}$/.test(m.accountId), 'validation account ID required');
    requireSafe(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(m.databaseId) && m.databaseId !== PRODUCTION.database, 'dedicated D1 ID required');
    requireSafe(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(m.instanceId) && m.instanceId !== m.databaseId, 'unique instance marker required');
    const origin = new URL(m.workerOrigin);
    requireSafe(origin.origin === m.workerOrigin && origin.protocol === 'https:' && !origin.username && !origin.password && origin.hostname.startsWith(WORKER + '.') && origin.hostname.endsWith('.workers.dev'), 'dedicated workers.dev origin required');
    requireSafe(filled(m.squareApplicationId) && m.squareApplicationId.startsWith('sandbox-sq0idb-'), 'Sandbox Application ID required');
    requireSafe(filled(m.squareLocationId) && /^[A-Z0-9]{8,64}$/.test(m.squareLocationId) && m.squareLocationId !== PRODUCTION.location, 'Sandbox Location ID required');
    requireSafe(m.variations && Object.keys(m.variations).sort().join() === Object.keys(SANDBOX_CATALOG).sort().join(), 'exactly the three Sandbox product IDs must be mapped');
    const values = Object.values(m.variations);
    const forbidden = Object.values(CATALOG).map(p => p.squareVariationId);
    requireSafe(new Set(values).size === values.length && values.every(v => filled(v) && /^[A-Z0-9]{8,64}$/.test(v) && !forbidden.includes(v)), 'distinct Sandbox Variation IDs required; production IDs forbidden');
    requireSafe(filled(m.accessTeamDomain) && /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.cloudflareaccess\.com$/.test(m.accessTeamDomain), 'dedicated Access team domain required');
    requireSafe(filled(m.accessAudience) && /^[a-f0-9]{64}$/.test(m.accessAudience), 'Access application audience required');
    requireSafe(filled(m.notificationEmail) && /^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(m.notificationEmail), 'single test recipient required');
    requireSafe(filled(m.resendFrom) && /^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(m.resendFrom), 'test sender required');
    return m;
}
export function environmentVars(m) {
    assertManifest(m);
    return { RUNTIME_TIER: 'sandbox-validation', SQUARE_ENVIRONMENT: 'sandbox', SQUARE_LOCATION_ID: m.squareLocationId,
        SQUARE_API_VERSION: '2026-07-15', SQUARE_VARIATION_IDS: JSON.stringify(m.variations),
        ALLOWED_ORIGINS: m.workerOrigin, SITE_URL: m.workerOrigin,
        RESEND_FROM_EMAIL: m.resendFrom, ORDER_NOTIFICATION_EMAIL: m.notificationEmail, REPLY_TO_EMAIL: m.notificationEmail,
        ACCESS_TEAM_DOMAIN: m.accessTeamDomain, ACCESS_AUDIENCE: m.accessAudience, VALIDATION_MANIFEST: JSON.stringify(m), VALIDATION_INSTANCE_ID: m.instanceId };
}
export function assertRuntime(env) {
    requireSafe(env.RUNTIME_TIER === 'sandbox-validation' && env.SQUARE_ENVIRONMENT === 'sandbox', 'Sandbox runtime required');
    const m = assertManifest(JSON.parse(env.VALIDATION_MANIFEST || '{}'));
    const vars = environmentVars(m);
    for (const [key,value] of Object.entries(vars)) requireSafe(env[key] === value, `binding mismatch: ${key}`);
    requireSafe(!env.LOCAL_SQUARE && !env.LOCAL_RESEND && !env.LOCAL_TEST_MODE, 'local fault doubles are forbidden in remote validation');
    requireSafe(env.ORDERS_DB && env.PURCHASE_COORDINATOR, 'dedicated D1 and DO bindings required');
    requireSafe(!env.SQUARE_ACCESS_TOKEN && !env.RESEND_API_KEY && !env.ADMIN_TOKEN, 'generic/production secret bindings forbidden');
    for (const key of ['SQUARE_SANDBOX_ACCESS_TOKEN','RESEND_VALIDATION_API_KEY','VALIDATION_ADMIN_TOKEN']) {
        requireSafe(filled(env[key]) && !['fake-local-test-only','local-test-not-a-secret','local-development-only'].includes(env[key]), `separate secret required: ${key}`);
    }
    requireSafe(env.VALIDATION_ADMIN_TOKEN.length >= 32, 'separate random validation admin token required');
    return m;
}
export async function assertDatabase(env) {
    const m = assertRuntime(env);
    const row = await env.ORDERS_DB.prepare('SELECT instance_id FROM validation_environment WHERE id=1').first();
    requireSafe(row?.instance_id === m.instanceId, 'validation D1 marker missing or mismatched');
}
export function assertSquareDestination(env, target) {
    if (env.RUNTIME_TIER !== 'sandbox-validation') return;
    assertRuntime(env);
    const u = new URL(target);
    requireSafe(u.protocol === 'https:' && u.hostname === 'connect.squareupsandbox.com' && !u.port && !u.username && !u.password && u.pathname.startsWith('/v2/'), 'production/unknown Square destination refused');
}
export function assertTestEmail(env, payload) {
    if (env.RUNTIME_TIER !== 'sandbox-validation') return;
    const m = assertRuntime(env);
    requireSafe(payload.from === m.resendFrom && Array.isArray(payload.to) && payload.to.length === 1 && payload.to[0] === m.notificationEmail && !payload.cc && !payload.bcc && (!payload.reply_to || payload.reply_to === m.notificationEmail), 'email must target only the approved test recipient');
}
export function assertConfig(config, m) {
    assertManifest(m);
    const allowed = ['name','account_id','main','compatibility_date','workers_dev','preview_urls','routes','assets','vars','d1_databases','durable_objects','migrations'];
    requireSafe(Object.keys(config).every(k => allowed.includes(k)), 'unknown Wrangler field');
    requireSafe(config.name === WORKER && config.account_id === m.accountId && config.main === './sandbox-worker.js' && config.compatibility_date === '2026-08-04', 'worker/account/entry mismatch');
    requireSafe(config.workers_dev === true && config.preview_urls === false && JSON.stringify(config.routes) === '[]', 'custom/production routes forbidden');
    requireSafe(JSON.stringify(config.vars) === JSON.stringify(environmentVars(m)), 'vars differ from reviewed manifest; secrets must be Dashboard Secrets');
    requireSafe(JSON.stringify(config.d1_databases) === JSON.stringify([{binding:'ORDERS_DB',database_name:DATABASE,database_id:m.databaseId}]), 'D1 binding mismatch');
    requireSafe(JSON.stringify(config.durable_objects) === JSON.stringify({bindings:[{name:'PURCHASE_COORDINATOR',class_name:'SandboxPurchaseCoordinator'}]}), 'external/production DO binding forbidden');
    requireSafe(JSON.stringify(config.migrations) === JSON.stringify([{tag:'v1-validation',new_sqlite_classes:['SandboxPurchaseCoordinator']}]), 'validation DO migration required');
    requireSafe(JSON.stringify(config.assets) === JSON.stringify({directory:'./.generated/site',binding:'ASSETS',run_worker_first:true}), 'dedicated assets required');
}
