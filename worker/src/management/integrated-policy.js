import {production,productionGrant} from '../production-policy.js';
export const integratedPublication=env=>env.RUNTIME_TIER==='staging'||production(env)&&env.PRODUCTION_UNIFIED_PUBLISH_ENABLED==='1'&&env.PRODUCTION_STOREFRONT_PUBLISH_ENABLED==='1';
export function integratedGrant(env){if(production(env))productionGrant(env,'catalog');}
