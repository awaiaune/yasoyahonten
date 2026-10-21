// Local development only. Never import this module into the deployed Worker.
export const localOrigin = 'http://127.0.0.1:8000';
export function managementAccess(environment = {}) {
    let forwardedOrigin;
    if (environment.CODESPACES === 'true') {
        const name = environment.CODESPACE_NAME;
        // One public GitHub Codespaces instance and one port; no wildcard/custom host input.
        if (environment.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN !== 'app.github.dev' ||
            typeof name !== 'string' || !/^[a-z0-9](?:[a-z0-9-]{0,56}[a-z0-9])?$/.test(name)) {
            throw new Error('Invalid Codespaces forwarding configuration; refusing to start.');
        }
        forwardedOrigin = `https://${name}-8000.app.github.dev`;
    }
    const origins = [localOrigin, ...(forwardedOrigin ? [forwardedOrigin] : [])];
    const hosts = origins.map(value => new URL(value).host);
    if (forwardedOrigin) hosts.push('localhost:8000'); // Codespaces may rewrite Host to its loopback backend.
    return Object.freeze({
        origins: Object.freeze(origins),
        siteOrigin: forwardedOrigin || localOrigin,
        requestUrl(headers, target) {
            if (!hosts.includes(headers.host) || (headers.origin !== undefined && !origins.includes(headers.origin))) {
                throw new Error('Local host/origin denied');
            }
            // Ignore all forwarded host/protocol headers. Only a relative request target is accepted.
            if (typeof target !== 'string' || !target.startsWith('/') || target.startsWith('//') || target.includes('\\')) {
                throw new Error('Invalid local request target');
            }
            const url = new URL(target, forwardedOrigin || localOrigin);
            if (url.origin !== (forwardedOrigin || localOrigin)) throw new Error('Invalid local request target');
            return url.href;
        }
    });
}

// Explicit, additive UI fixtures: no purchase call, payment, stock mutation or real customer data.
// Runtime is supplied by management-server only, never by Wrangler or a remote D1 configuration.
export async function seedLocalOrders({mf, db}) {
    const check = await mf.dispatchFetch(localOrigin + '/api/admin/orders', {
        headers: {Authorization: 'Bearer local-development-only'}
    });
    if (!check.ok) throw new Error('Local order schema initialization failed');
    await check.arrayBuffer();
    const contact = JSON.stringify({familyName: '架空', givenName: '確認用のお客様', email: 'local-order@example.invalid',
        phone: '00000000000', postalCode: '0000000', state: 'テスト県', city: '架空市', addressLines: ['検証専用住所（発送しないでください）'], countryCode: 'JP'});
    const items = JSON.stringify([{id: 'lemonbalm-10g', name: '【架空注文】乾燥レモンバーム 10g', price: 980, quantity: 1, lineTotal: 980}]);
    return db.batch(['pending', 'shipped'].map(status => db.prepare(`INSERT INTO orders
        (order_reference,payment_id,created_at,status,subtotal,shipping,total,items_json,contact_json,inventory_adjusted,shipping_method,tracking_number,shipped_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(order_reference) DO NOTHING`)
        .bind(`LOCAL-DEMO-${status.toUpperCase()}-001`, `local-demo-payment-${status}-001`, '2026-10-21T00:00:00.000Z', status,
            980, 350, 1330, items, contact, 0, status === 'shipped' ? '検証用（実発送なし）' : null, null,
            status === 'shipped' ? '2026-10-21T01:00:00.000Z' : null)));
}
