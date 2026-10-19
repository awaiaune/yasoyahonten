import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { root, runtimeOptions } from './server.mjs';
import { PurchaseLedger } from '../worker/src/purchase-ledger.js';

const contact = { givenName: '試験', familyName: '購入者', email: 'test@example.invalid', phone: '09012345678', addressLines: ['テスト1'], city: 'テスト市', state: '東京都', postalCode: '1000001', countryCode: 'JP' };
const body = () => ({ attemptId: crypto.randomUUID(), sourceId: 'local-card-token-not-real', items: [{ id: 'lemonbalm-10g', quantity: 1 }], contact });

// Local service binding, never a network proxy or real Square credential.
class FakeSquare {
    stock = 20; stocks = new Map(); charges = new Map(); operations = new Map(); chargeCalls = 0; debitCalls = 0;
    afterCharge = null; chargeResponseLost = false; lookupUnavailable = false; debitFails = false; debitResponseLost = false;
    async fetch(request) {
        const url = new URL(request.url);
        if (url.pathname.endsWith('/counts/batch-retrieve')) {
            const data = await request.json();
            return Response.json({ counts: data.catalog_object_ids.map(id => ({ state: 'IN_STOCK', location_id: 'test-location', catalog_object_id: id, quantity: String(id === 'RRTIT6N4QLIYPUW633WDBG36' ? this.stock : this.stocks.get(id) ?? 20) })) });
        }
        if (url.pathname === '/v2/payments' && request.method === 'POST') {
            this.chargeCalls++;
            const data = await request.json();
            let p = this.charges.get(data.idempotency_key);
            if (!p) { p = { id: `payment-${this.charges.size + 1}`, status: 'COMPLETED', reference_id: data.reference_id, amount_money: data.amount_money, location_id: data.location_id }; this.charges.set(data.idempotency_key, p); }
            if (this.afterCharge) { this.afterCharge(); this.afterCharge = null; }
            if (this.chargeResponseLost) throw new Error('Lost Square response after charge');
            return Response.json({ payment: p });
        }
        if (url.pathname.startsWith('/v2/payments')) {
            if (this.lookupUnavailable) return new Response('unavailable', { status: 503 });
            const payments = [...this.charges.values()];
            return Response.json(url.pathname === '/v2/payments' ? { payments } : { payment: payments.find(p => url.pathname.endsWith(p.id)) });
        }
        if (url.pathname.endsWith('/changes/batch-create')) {
            this.debitCalls++;
            if (this.debitFails) return new Response('unavailable', { status: 503 });
            const data = await request.json();
            const previous = this.operations.get(data.idempotency_key);
            if (previous) assert.deepEqual(data, previous, 'inventory retry must preserve all fields');
            else {
                for (const {adjustment:a} of data.changes) if ((a.catalog_object_id === 'RRTIT6N4QLIYPUW633WDBG36' ? this.stock : this.stocks.get(a.catalog_object_id) ?? 20) < Number(a.quantity)) return new Response('stock changed externally', {status:409});
                this.operations.set(data.idempotency_key, data);
                for (const {adjustment:a} of data.changes) {
                    if (a.catalog_object_id === 'RRTIT6N4QLIYPUW633WDBG36') this.stock -= Number(a.quantity);
                    else this.stocks.set(a.catalog_object_id, (this.stocks.get(a.catalog_object_id) ?? 20) - Number(a.quantity));
                }
            }
            if (this.debitResponseLost) throw new Error('Inventory applied but response lost');
            return Response.json({ counts: [] });
        }
        throw new Error('Unexpected local Square operation: ' + url.pathname);
    }
}
async function fixture(t, notifications = false) {
    const fake = new FakeSquare();
    const state = await mkdtemp(path.join(tmpdir(), 'yasoya-payment-test-'));
    const bundle = await build({ entryPoints: [path.join(root, 'worker/src/index.js')], bundle: true, write: false, format: 'esm', platform: 'browser' });
    const options = runtimeOptions(bundle.outputFiles[0].text, state);
    Object.assign(options.bindings, { LOCAL_TEST_MODE: '1', SQUARE_LOCATION_ID: 'test-location', SQUARE_ACCESS_TOKEN: 'fake-local-test-only' });
    const mail = { attempts: 0, messages: new Map(), lostResponse: false };
    options.serviceBindings = { LOCAL_SQUARE: request => fake.fetch(request) };
    if (notifications) {
        Object.assign(options.bindings, { RESEND_API_KEY: 'local-test-not-a-secret', RESEND_FROM_EMAIL: 'sender@example.invalid', ORDER_NOTIFICATION_EMAIL: 'admin@example.invalid' });
        options.serviceBindings.LOCAL_RESEND = async request => {
            const data = await request.json(); const key = request.headers.get('Idempotency-Key');
            if (data.subject.startsWith('【要確認】')) mail.attempts++;
            const previous = mail.messages.get(key);
            if (previous) assert.deepEqual(previous, data);
            mail.messages.set(key, data);
            if (mail.lostResponse && data.subject.startsWith('【要確認】')) throw new Error('Mail accepted, response lost');
            return Response.json({ id: key });
        };
    }
    let mf = new Miniflare(options); await mf.ready;
    t.after(() => mf.dispose());
    const api = async (route, data, admin = false) => {
        const response = await mf.dispatchFetch('http://127.0.0.1:8000' + route, {
            method: data === undefined ? 'GET' : 'POST',
            headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:8000', ...(admin ? { Authorization: 'Bearer local-development-only' } : {}) },
            body: data === undefined ? undefined : JSON.stringify(data)
        });
        return { status: response.status, data: await response.json() };
    };
    return { fake, mail, api, getDb: () => mf.getD1Database('ORDERS_DB'), db: await mf.getD1Database('ORDERS_DB'), restart: async () => { await mf.dispose(); mf = new Miniflare(options); await mf.ready; } };
}

test('concurrent duplicate requests and restart return one charge and one debit', async t => {
    const { api, fake, restart } = await fixture(t); const b = body();
    const results = await Promise.all([api('/api/payments', b), api('/api/payments', b)]);
    assert(results.every(r => r.status === 200 && r.data.ok));
    assert.equal(results[0].data.paymentId, results[1].data.paymentId);
    await restart();
    const retry = await api('/api/payments', { ...b, sourceId: 'different-token-after-reload' });
    assert.equal(retry.data.paymentId, results[0].data.paymentId);
    assert.equal(fake.chargeCalls, 1); assert.equal(fake.operations.size, 1);
    assert.equal((await api('/api/payments', { ...b, attemptId: b.attemptId.toUpperCase() })).data.ok, true);
    assert.equal(fake.chargeCalls, 1);
    const conflict = await api('/api/payments', { ...b, contact: { ...contact, city: '別の市' } });
    assert.equal(conflict.status, 409);
});

test('charge response lost: reconcile without another payment submission', async t => {
    const { api, fake } = await fixture(t); const b = body();
    fake.chargeResponseLost = true;
    const result = await api('/api/payments', b);
    assert.equal(result.status, 200); assert.equal(result.data.ok, true);
    // Also simulate the browser never receiving this completed response.
    const retry = await api('/api/payments/status', { attemptId: b.attemptId });
    assert.equal(retry.data.paymentId, result.data.paymentId);
    assert.equal(fake.chargeCalls, 1); assert.equal(fake.operations.size, 1);
});

test('unknown payment pauses its SKU; repeated recovery only reconciles', async t => {
    const { api, fake } = await fixture(t); const b = body();
    fake.chargeResponseLost = true; fake.lookupUnavailable = true;
    assert.equal((await api('/api/payments', b)).status, 202);
    assert.equal((await api('/api/payments', b)).status, 202);
    assert.equal((await api('/api/payments', body())).status, 503);
    assert.equal(fake.chargeCalls, 1);
    assert.equal((await api('/api/admin/payment-attempts')).status, 401);
    assert.equal((await api('/api/admin/payment-attempts', undefined, true)).data.attempts.length, 1);
    fake.lookupUnavailable = false;
    const recovery = await api(`/api/admin/payment-attempts/${b.attemptId}/recover`, {}, true);
    assert.equal(recovery.data.ok, true); assert.equal(fake.operations.size, 1);
    assert.equal((await api(`/api/admin/payment-attempts/${b.attemptId}/recover`, {}, true)).data.ok, true);
    assert.equal(fake.chargeCalls, 1); assert.equal(fake.debitCalls, 1);
});

test('D1 write failure after payment recovers after restart and preserves old orders', async t => {
    const { api, fake, db, restart, getDb } = await fixture(t);
    const first = await api('/api/payments', body()); assert.equal(first.data.ok, true);
    // Test-only trigger in this fresh isolated DB; no existing application DB touched.
    await db.exec("CREATE TRIGGER test_fail_insert BEFORE INSERT ON orders BEGIN SELECT RAISE(FAIL, 'simulated D1 failure'); END;");
    const b = body(); const pending = await api('/api/payments', b);
    assert.equal(pending.status, 202); assert.equal(pending.data.warning, 'order_projection_required');
    assert.equal(fake.charges.size, 2); assert.equal(fake.operations.size, 2);
    await restart();
    await (await getDb()).exec('DROP TRIGGER test_fail_insert;');
    const recovered = await api(`/api/admin/payment-attempts/${b.attemptId}/recover`, {}, true); assert.equal(recovered.data.ok, true);
    const orders = (await api('/api/admin/orders', undefined, true)).data.orders;
    assert.equal(orders.length, 2); assert(orders.some(o => o.payment_id === first.data.paymentId));
    assert.equal(fake.chargeCalls, 2); assert.equal(fake.debitCalls, 2);
});

test('inventory failure and lost response use identical retry payload, update D1 flag', async t => {
    const { api, fake } = await fixture(t); const b = body();
    fake.debitFails = true;
    const pending = await api('/api/payments', b); assert.equal(pending.data.inventoryAdjusted, false);
    assert.equal(pending.data.ok, true); // Charged order remains visible to existing administration.
    assert.equal((await api('/api/payments', body())).status, 503);
    fake.debitFails = false; fake.debitResponseLost = true;
    await api(`/api/admin/payment-attempts/${b.attemptId}/recover`, {}, true);
    assert.equal(fake.stock, 19);
    fake.debitResponseLost = false;
    await Promise.all([api(`/api/admin/payment-attempts/${b.attemptId}/recover`, {}, true), api(`/api/admin/payment-attempts/${b.attemptId}/recover`, {}, true)]);
    assert.equal(fake.stock, 19); assert.equal(fake.operations.size, 1); assert.equal(fake.chargeCalls, 1);
    const orders = (await api('/api/admin/orders', undefined, true)).data.orders;
    assert.equal(orders[0].inventoryAdjusted, true);
    assert.equal((await api('/api/admin/payment-attempts', undefined, true)).data.attempts.length, 0);
});

test('last item: serialized different orders cannot both pay', async t => {
    const { api, fake } = await fixture(t); fake.stock = 1;
    const results = await Promise.all([api('/api/payments', body()), api('/api/payments', body())]);
    assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
    assert.equal(fake.chargeCalls, 1); assert.equal(fake.stock, 0);
});

class MemoryStorage {
    values = new Map(); fail = null;
    async get(k) { return structuredClone(this.values.get(k)); }
    async put(key, value) {
        const entries = typeof key === 'string' ? [[key, value]] : Object.entries(key);
        if (this.fail?.(entries)) throw new Error('simulated durable storage failure');
        for (const [k, v] of entries) this.values.set(k, structuredClone(v));
    }
    alarmTime = null;
    async getAlarm() { return this.alarmTime; }
    async setAlarm(at) { this.alarmTime = at; }
    async deleteAlarm() { this.alarmTime = null; }
    async list({prefix,limit=128,startAfter=''}) { return new Map([...this.values].filter(([k]) => k.startsWith(prefix) && k > startAfter).sort(([a],[b]) => a.localeCompare(b)).slice(0,limit)); }
}
function domainFixture() {
    const storage = new MemoryStorage(); let payment; let charges = 0; let debits = 0;
    const services = { location: 'test', reference: () => 'order-1', validate: () => ({ quote: { total: 1330, currency: 'JPY', items: [{ id: 'lemonbalm-10g' }] }, contact }), stock: async () => {},
        charge: async r => { charges++; payment = { id: 'pay-1', status: 'COMPLETED', reference_id: r.orderReference, amount_money: { amount: 1330, currency: 'JPY' }, location_id: 'test' }; return payment; },
        lookup: async () => payment, decrement: async () => { debits++; }, project: async () => {}, email: async () => {} };
    return { storage, services, ledger: () => new PurchaseLedger(storage, services), count: () => ({ charges, debits }) };
}

test('no charge before durable intent; crash after charge recovers from durable submitting record', async () => {
    const f = domainFixture(); const b = body();
    f.storage.fail = entries => entries.some(([k]) => k.startsWith('attempt:'));
    await assert.rejects(f.ledger().submit(b)); assert.equal(f.count().charges, 0);
    f.storage.fail = entries => entries.some(([, v]) => v?.phase === 'paid');
    await assert.rejects(f.ledger().submit(b)); assert.equal(f.count().charges, 1);
    assert.equal((await f.storage.get('attempt:' + b.attemptId)).phase, 'submitting');
    f.storage.fail = null;
    assert.equal((await f.ledger().recover(b.attemptId, true)).ok, true); assert.equal(f.count().charges, 1);
    assert(!JSON.stringify([...f.storage.values]).includes(b.sourceId), 'card source must not be persisted');
});

test('unknown absent payment never recharges; mismatched payment requires review', async () => {
    const f = domainFixture(); const b = body();
    f.services.charge = async () => { throw new Error('unknown'); }; f.services.lookup = async () => null;
    const result = await f.ledger().submit(b); assert.equal(result.warning, 'payment_not_confirmed');
    f.services.charge = async () => { throw new Error('must not be called again'); };
    await f.ledger().submit(b);
    f.services.lookup = async () => ({ id: 'wrong-payment', reference_id: 'wrong-order' });
    assert.equal((await f.ledger().recover(b.attemptId, true)).warning, 'payment_mismatch');
    assert.equal(f.count().debits, 0);
});

test('external stock change after charge is recorded and pauses its SKU', async t => {
    const { api, fake } = await fixture(t); fake.stock = 1; fake.afterCharge = () => { fake.stock = 0; };
    const b = body(); const paid = await api('/api/payments', b);
    assert.equal(paid.data.ok, true); assert.equal(paid.data.inventoryAdjusted, false);
    assert.equal(paid.data.warning, 'inventory_conflict');
    assert.equal((await api('/api/payments', body())).status, 503);
    assert.equal(fake.chargeCalls, 1); assert.equal(fake.stock, 0);
});

test('expired ambiguous inventory operation and exhausted retries require manual review', async () => {
    const f = domainFixture(); const b = body();
    f.services.decrement = async () => { throw new Error('inventory down'); };
    await f.ledger().submit(b);
    const r = await f.storage.get('attempt:' + b.attemptId);
    r.inventoryOperation.occurredAt = new Date(Date.now() - 2 * 3600_000).toISOString();
    await f.storage.put('attempt:' + b.attemptId, r);
    assert.equal((await f.ledger().recover(b.attemptId, true)).warning, 'inventory_retry_window_expired');
    for (let i = 0; i < 10; i++) await f.ledger().recover(b.attemptId);
    assert.equal((await f.ledger().warnings())[0].manualReview, true);
    assert.equal(f.count().charges, 1);
});

test('projection retry preserves shipping status and tracking fields', async t => {
    const { api, fake, db } = await fixture(t); const b = body(); fake.debitFails = true;
    const r = await api('/api/payments', b);
    await db.prepare("UPDATE orders SET status='shipped', shipping_method='試験便', tracking_number='1234', shipped_at='2026-01-01' WHERE order_reference=?").bind(r.data.orderReference).run();
    fake.debitFails = false;
    await api(`/api/admin/payment-attempts/${b.attemptId}/recover`, {}, true);
    const result = await db.prepare('SELECT * FROM orders WHERE order_reference=?').bind(r.data.orderReference).first();
    assert.equal(result.status, 'shipped'); assert.equal(result.tracking_number, '1234'); assert.equal(result.inventory_adjusted, 1);
});

test('alarm resumes a durable pending projection without recharging', async () => {
    const f = domainFixture(); const b = body(); let dbFailed = true;
    f.services.project = async () => { if (dbFailed) throw new Error('D1 unavailable'); };
    assert.equal((await f.ledger().submit(b)).orderState, 'retry_required');
    dbFailed = false; f.services.now = () => Date.now() + 120000;
    await f.ledger().alarm(); await f.ledger().alarm();
    assert.equal((await f.ledger().recover(b.attemptId, true)).ok, true);
    assert.deepEqual(f.count(), { charges: 1, debits: 1 });
});

test('confirmed declined payment releases barrier but never retries that order', async () => {
    const f = domainFixture(); const b = body();
    f.services.charge = async r => ({ id: 'declined', status: 'FAILED', reference_id: r.orderReference, amount_money: { amount: 1330, currency: 'JPY' }, location_id: 'test' });
    f.services.lookup = f.services.charge;
    const result = await f.ledger().submit(b);
    assert.equal(result.status, 'declined'); assert.equal(result.recoveryRequired, false);
    assert.deepEqual(await f.storage.get('sku-holds'), {});
    assert.equal((await f.ledger().submit(b)).status, 'declined'); assert.equal(f.count().debits, 0);
});

const orderFor = (...ids) => ({ ...body(), items: ids.map(id => ({ id, quantity: 1 })) });

test('unknown payment holds only its variations across restart; other last-item purchases continue', async t => {
    const { api, fake, restart } = await fixture(t);
    fake.chargeResponseLost = true; fake.lookupUnavailable = true;
    const pending = body(); assert.equal((await api('/api/payments', pending)).status, 202);
    await restart(); fake.chargeResponseLost = false;
    const variation = 'F7X4UHYUAI7PSGURVQ4LEROY'; fake.stocks.set(variation, 1);
    const results = await Promise.all([
        api('/api/payments', body()),
        api('/api/payments', orderFor('yomogi-10g')),
        api('/api/payments', orderFor('yomogi-10g')),
        api('/api/payments', orderFor('goldenrod-leaf-10g'))
    ]);
    assert.deepEqual(results.map(r => r.status), [503, 200, 409, 200]);
    assert.equal(fake.charges.size, 3); assert.equal(fake.stocks.get(variation), 0);
    fake.lookupUnavailable = false;
    assert.equal((await api(`/api/admin/payment-attempts/${pending.attemptId}/recover`, {}, true)).data.ok, true);
    assert.equal(fake.charges.size, 3); assert.equal(fake.operations.size, 3);
});

test('D1-only failure releases all SKU holds while that order stays pending', async t => {
    const { api, fake, db } = await fixture(t);
    await api('/api/admin/orders', undefined, true);
    await db.exec("CREATE TRIGGER test_fail_insert BEFORE INSERT ON orders BEGIN SELECT RAISE(FAIL, 'D1 offline'); END;");
    const a = body(); assert.equal((await api('/api/payments', a)).status, 202);
    await db.exec('DROP TRIGGER test_fail_insert;');
    const b = await api('/api/payments', body()); assert.equal(b.status, 200);
    const warnings = (await api('/api/admin/payment-attempts', undefined, true)).data.attempts;
    assert.equal(warnings.length, 1); assert.deepEqual(warnings[0].pausedVariations, []);
    assert.equal((await api(`/api/admin/payment-attempts/${a.attemptId}/recover`, {}, true)).data.ok, true);
    assert.equal(fake.chargeCalls, 2); assert.equal(fake.operations.size, 2);
});

test('multiple pending orders are listed; recovery never releases another order hold', async t => {
    const { api, fake } = await fixture(t); fake.debitFails = true;
    const a = body(); const b = orderFor('yomogi-10g');
    assert.equal((await api('/api/payments', a)).data.inventoryAdjusted, false);
    assert.equal((await api('/api/payments', b)).data.inventoryAdjusted, false);
    assert.equal((await api('/api/admin/payment-attempts', undefined, true)).data.attempts.length, 2);
    fake.debitFails = false;
    await api(`/api/admin/payment-attempts/${a.attemptId}/recover`, {}, true);
    assert.equal((await api('/api/payments', orderFor('yomogi-10g'))).status, 503);
    assert.equal((await api('/api/payments', body())).status, 200);
    assert.equal((await api('/api/payments', orderFor('goldenrod-leaf-stem-20g'))).status, 200);
});

test('mixed cart holds every affected variation but not its sibling variation', async t => {
    const { api, fake } = await fixture(t); fake.debitFails = true;
    const a = orderFor('lemonbalm-10g', 'goldenrod-leaf-10g');
    assert.equal((await api('/api/payments', a)).data.inventoryAdjusted, false);
    fake.debitFails = false;
    assert.equal((await api('/api/payments', body())).status, 503);
    assert.equal((await api('/api/payments', orderFor('goldenrod-leaf-10g'))).status, 503);
    assert.equal((await api('/api/payments', orderFor('goldenrod-leaf-stem-20g'))).status, 200);
    assert.equal((await api('/api/payments', orderFor('yomogi-10g'))).status, 200);
});

test('only manual-review orders notify; lost mail response retries same key and survives restart', async t => {
    const { api, fake, mail, restart } = await fixture(t, true);
    fake.chargeResponseLost = true; fake.lookupUnavailable = true;
    const a = body(); await api('/api/payments', a);
    assert.equal(mail.attempts, 0);
    mail.lostResponse = true;
    for (let i = 0; i < 8; i++) await api(`/api/admin/payment-attempts/${a.attemptId}/recover`, {}, true);
    assert.equal(mail.attempts, 1);
    await restart(); mail.lostResponse = false;
    const result = await api(`/api/admin/payment-attempts/${a.attemptId}/recover`, {}, true);
    assert.equal(result.data.notificationState, 'sent');
    await api(`/api/admin/payment-attempts/${a.attemptId}/recover`, {}, true);
    const notices = [...mail.messages.values()].filter(m => m.subject.startsWith('【要確認】'));
    assert.equal(mail.attempts, 2); assert.equal(notices.length, 1);
    assert(!JSON.stringify(notices).includes(contact.email));
    fake.chargeResponseLost = false;
    assert.equal((await api('/api/payments', orderFor('yomogi-10g'))).status, 200);
    assert.equal((await api('/api/payments', body())).status, 503);
});

test('real DO alarm recovers after restart without browser or recovery requests', { timeout: 55000 }, async t => {
    const { api, fake, restart, getDb } = await fixture(t);
    fake.chargeResponseLost = true; fake.lookupUnavailable = true;
    const a = body(); assert.equal((await api('/api/payments', a)).status, 202);
    await restart(); fake.lookupUnavailable = false;
    // No user requests until after the alarm has independently updated the DB.
    const deadline = Date.now() + 45000;
    let row;
    while (Date.now() < deadline) {
        const db = await getDb();
        try { row = await db.prepare('SELECT * FROM orders').first(); } catch {}
        if (row) break;
        await new Promise(resolve => setTimeout(resolve, 250));
    }
    assert(row, 'background alarm must project the order without a client request');
    assert.equal(row.inventory_adjusted, 1); assert.equal(fake.chargeCalls, 1); assert.equal(fake.operations.size, 1);
});

test('legacy global-barrier record is reindexed without losing its SKU hold or recharge protection', async () => {
    const f = domainFixture(); const a = body(); f.services.lookup = async () => null; f.services.charge = async () => { throw new Error('unknown'); };
    await f.ledger().submit(a);
    const record = await f.storage.get('attempt:' + a.attemptId);
    f.storage.values.clear(); await f.storage.put({ ['attempt:' + a.attemptId]: record, barrier: a.attemptId });
    f.services.stockKeys = quote => quote.items.map(i => 'location:variation:' + i.id);
    const migrated = f.ledger(); assert.equal((await migrated.warnings()).length, 1);
    assert.deepEqual((await migrated.warnings())[0].pausedVariations, ['location:variation:lemonbalm-10g']);
    await assert.rejects(migrated.submit(body()), e => e.status === 503);
    assert.equal((await f.storage.get('attempt:' + a.attemptId)).paymentKey, record.paymentKey);
});

test('scheduler scans multiple pages and one failing job does not starve other jobs', async () => {
    const f = domainFixture(); let now = Date.now(); f.services.now = () => now;
    f.services.charge = async () => { throw new Error('lost'); }; f.services.lookup = async () => null;
    const a = body(); await f.ledger().submit(a);
    const template = await f.storage.get('attempt:' + a.attemptId);
    for (let i = 0; i < 140; i++) {
        const r = structuredClone(template); r.id = crypto.randomUUID(); r.nextDue = now; r.quote.items[0].id = `sku-${i}`;
        await f.ledger().write(r);
    }
    now += 60000;
    let lookups = 0; f.services.lookup = async () => { lookups++; throw new Error('one job failed'); };
    for (let i = 0; i < 141; i++) await f.ledger().alarm(); assert.equal(lookups, 141);
    assert.equal((await f.ledger().warnings()).length, 141); assert(await f.storage.getAlarm() > now);
});

test('manual inventory issue does not prevent independent D1 recovery or another SKU sale', async () => {
    const f = domainFixture(); let failDb = true;
    let now = Date.now(); f.services.now = () => now;
    f.services.decrement = async () => { const error = new Error('stock conflict'); error.permanent = true; throw error; };
    f.services.project = async () => { if (failDb) throw new Error('DB outage'); };
    let alerts = 0; f.services.notify = async () => { alerts++; return true; };
    const a = body(); const pending = await f.ledger().submit(a);
    assert.equal(pending.manualReview, true); assert.equal(alerts, 1);
    failDb = false; now += 600000;
    await f.ledger().alarm();
    const r = await f.ledger().read(a.attemptId);
    assert.equal(r.projection, 'stored'); assert.equal(r.inventory, 'retry_required'); assert.equal(alerts, 1);
});

test('notification expiry is durable, does not release holds, and never sends after safe window', async () => {
    const f = domainFixture(); let now = Date.now(); f.services.now = () => now;
    let notices = 0; f.services.notify = async () => { notices++; throw new Error('mail down'); };
    f.services.charge = async () => { throw new Error('unknown'); }; f.services.lookup = async () => ({ id: 'mismatch' });
    const a = body(); await f.ledger().submit(a); assert.equal(notices, 1);
    now += 3600001;
    await f.ledger().alarm();
    assert.equal((await f.ledger().warnings())[0].notificationState, 'expired');
    assert.equal(notices, 1); await assert.rejects(f.ledger().submit(body()), e => e.status === 503);
});

test('operator can reconcile after manual-review limit without a new charge', async t => {
    const { api, fake } = await fixture(t);
    fake.chargeResponseLost = true; fake.lookupUnavailable = true;
    const a = body(); await api('/api/payments', a);
    for (let i = 0; i < 8; i++) await api(`/api/admin/payment-attempts/${a.attemptId}/recover`, {}, true);
    assert.equal((await api('/api/admin/payment-attempts', undefined, true)).data.attempts[0].manualReview, true);
    fake.lookupUnavailable = false;
    const result = await api(`/api/admin/payment-attempts/${a.attemptId}/recover`, {}, true);
    assert.equal(result.data.ok, true); assert.equal(result.data.inventoryAdjusted, true);
    assert.equal(fake.chargeCalls, 1); assert.equal(fake.operations.size, 1);
});
