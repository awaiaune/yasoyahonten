import worker, { PurchaseCoordinator } from '../worker/src/index.js';
import { assertAccess, AccessDenied } from './access.js';
import { assertRuntime, assertDatabase } from './safety.js';
export function guardBusinessServices(env, services) {
    const guarded = { ...services };
    for (const name of ['stock','charge','lookup','decrement','project','notify','email']) {
        const action = services[name];
        guarded[name] = async (...args) => {
            await assertDatabase(env);
            return action(...args);
        };
    }
    return guarded;
}
export class SandboxPurchaseCoordinator extends PurchaseCoordinator {
    constructor(ctx, env) {
        assertRuntime(env);
        super(ctx, env);
        this.ledger.services = guardBusinessServices(env, this.ledger.services);
        ctx.blockConcurrencyWhile(() => assertDatabase(env));
    }
    serialize(action,options) {
        return super.serialize(async () => {
            // Covers both internal fetch and Alarm, including already-running DOs.
            await assertDatabase(this.env);
            return action();
        },options);
    }
}
export default {
    async scheduled(event,env,ctx) {
        await assertDatabase(env);
        return worker.scheduled(event,env,ctx);
    },
    async fetch(request, env, ctx) {
        try {
            const m = assertRuntime(env);
            if (new URL(request.url).origin !== m.workerOrigin) return new Response('Validation host mismatch', {status:403});
            await assertAccess(request, env);
            await assertDatabase(env);
            const url = new URL(request.url);
            if (url.pathname.startsWith('/api/')) {
                if (request.method === 'POST' && url.pathname === '/api/payments') {
                    const body = await request.clone().json();
                    if (body.contact?.email !== m.notificationEmail) return new Response('Use the approved test recipient', {status:400});
                }
                return worker.fetch(request, env, ctx);
            }
            if (!['GET','HEAD'].includes(request.method) || !env.ASSETS) return new Response('Unavailable', {status:503});
            const managedPage=env.MANAGEMENT_ENABLED==='1' && (['/','/index.html','/products.html'].includes(url.pathname)||/^\/products\/[a-z0-9-]+\.html$/.test(url.pathname));
            const response = managedPage ? await worker.fetch(request,env,ctx) : await env.ASSETS.fetch(request);
            const headers = new Headers(response.headers);
            headers.set('Cache-Control','no-store');
            headers.set('Content-Security-Policy', `default-src 'self'; script-src 'self' 'unsafe-inline' https://sandbox.web.squarecdn.com; connect-src 'self' https://*.squareupsandbox.com https://sandbox.web.squarecdn.com; frame-src https://*.squareupsandbox.com https://sandbox.web.squarecdn.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:${env.MANAGEMENT_ENABLED==='1'?' blob:':''}; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`);
            headers.set('X-Robots-Tag','noindex, nofollow');
            return new Response(response.body, {status:response.status, headers});
        } catch (error) {
            if (error instanceof AccessDenied) return new Response('Validation sign-in required', {status:401,headers:{'Cache-Control':'no-store'}});
            return new Response('Sandbox configuration rejected; check durable order state before retrying', {status:503});
        }
    }
};
