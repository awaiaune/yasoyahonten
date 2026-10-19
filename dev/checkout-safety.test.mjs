import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const code = await readFile(new URL('../js/checkout.js', import.meta.url), 'utf8');
async function browser() {
    const elements = new Map(); const values = new Map(); let init; let submit;
    const state = { tokens: 0, requests: [], payments: 0, cleared: 0, lostResponse: false, tokenGate: null, saved: null };
    const el = id => {
        if (!elements.has(id)) elements.set(id, { value: id === 'email' ? 'test@example.invalid' : 'test', textContent: '', reportValidity: () => true, addEventListener: (name, fn) => { if (name === 'submit') submit = fn; } });
        return elements.get(id);
    };
    const storage = { getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) };
    const context = {
        console: { error() {} }, crypto, localStorage: storage, location: { href: '' },
        document: { getElementById: el, addEventListener: (_, fn) => { init = fn; } },
        window: { YASOYA_STORE_CONFIG: { workerBaseUrl: 'http://local.invalid', squareApplicationId: 'test', squareLocationId: 'test' },
            YasoyaCart: { read: () => [{ id: 'lemonbalm-10g', quantity: 1 }], clear: () => { state.cleared++; } },
            Square: { payments: () => ({ card: async () => ({ attach: async () => {}, tokenize: async () => { state.tokens++; if (state.tokenGate) await state.tokenGate; return { status: 'OK', token: 'fake-local-card-token' }; } }) }) } },
        fetch: async (url, options) => {
            state.requests.push(url);
            if (url.endsWith('/api/quote')) return Response.json({ total: 1330, subtotal: 980, shipping: 350, items: [] });
            if (url.endsWith('/api/payments/status')) return state.saved ? Response.json(state.saved) : Response.json({ error: { message: 'not started' } }, { status: 404 });
            if (url.endsWith('/api/payments')) {
                state.payments++;
                assert.match(JSON.parse(options.body).attemptId, /^[a-f0-9-]{36}$/);
                state.saved = { ok: true, paymentId: 'test-payment', orderReference: 'test-order' };
                if (state.lostResponse) throw new Error('Browser response disconnected');
                return Response.json(state.saved);
            }
            throw new Error('Unexpected request');
        }
    };
    vm.runInNewContext(code, context); await init();
    return { state, storage, context, click: () => submit({ preventDefault() {}, currentTarget: el('paymentForm') }) };
}
test('payment button double tap tokenizes and sends only once', async () => {
    const b = await browser(); let release; b.state.tokenGate = new Promise(resolve => { release = resolve; });
    const first = b.click(); const second = b.click();
    await new Promise(resolve => setImmediate(resolve)); assert.equal(b.state.tokens, 1);
    release(); await Promise.all([first, second]);
    assert.equal(b.state.payments, 1); assert.equal(b.state.cleared, 1);
    await b.click(); assert.equal(b.state.tokens, 1); assert.equal(b.state.payments, 1);
});
test('browser response lost: retry reconciles persisted attempt without tokenizing again', async () => {
    const b = await browser(); b.state.lostResponse = true;
    await b.click(); const id = b.storage.getItem('yasoya_checkout_attempt_v1'); assert(id);
    assert.equal(b.state.cleared, 0);
    await b.click(); assert.equal(b.state.tokens, 1); assert.equal(b.state.payments, 1); assert.equal(b.state.cleared, 1);
    assert.equal(b.storage.getItem('yasoya_checkout_attempt_v1'), null);
});
test('pending reconciliation keeps cart and attempt, never creates another charge', async () => {
    const b = await browser(); b.storage.setItem('yasoya_checkout_attempt_v1', crypto.randomUUID());
    b.state.saved = { ok: false, status: 'unknown' };
    await b.click(); await b.click();
    assert.equal(b.state.tokens, 0); assert.equal(b.state.payments, 0); assert.equal(b.state.cleared, 0);
    assert(b.storage.getItem('yasoya_checkout_attempt_v1'));
});
