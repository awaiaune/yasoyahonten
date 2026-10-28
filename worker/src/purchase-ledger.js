// DO is the durable purchase journal; D1 remains a retryable projection.
const RETRY_WINDOW_MS = 60 * 60 * 1000;
const MAX_RECOVERY_ATTEMPTS = 8;
export class PurchaseError extends Error {
    constructor(status, message) { super(message); this.status = status; }
}
export class PurchaseLedger {
    constructor(storage, services) { this.storage = storage; this.services = services; }
    now() { return this.services.now?.() ?? Date.now(); }
    key(id) { return `attempt:${id}`; }
    read(id) { return this.storage.get(this.key(id)); }
    closed(r) { return r.phase === 'declined' || (r.phase === 'paid' && r.inventory === 'applied' && r.projection === 'stored'); }
    stockKeys(r) { return r.stockKeys || this.services.stockKeys?.(r.quote) || r.quote.items.map(item => item.id); }
    holdsStock(r) { return r.phase !== 'declined' && r.inventory !== 'applied'; }
    async entries(prefix) {
        const result = []; let startAfter;
        for (;;) {
            const page = await this.storage.list({ prefix, limit: 128, ...(startAfter ? { startAfter } : {}) });
            result.push(...page.entries());
            if (page.size < 128) return result;
            startAfter = [...page.keys()].at(-1);
        }
    }
    async arm(at) {
        const current = await this.storage.getAlarm();
        if (!current || current <= this.now() || at < current) await this.storage.setAlarm(at);
    }
    async initialize() {
        if (this.initialized) return;
        // One-time additive upgrade of legacy global-barrier records, including
        // records that predate the pending index. Preserve all existing orders.
        if (!(await this.storage.get('sku-index-v2'))) {
            for (const [, r] of await this.entries('attempt:')) await this.write(r);
            await this.storage.put('sku-index-v2', true);
        }
        this.initialized = true;
    }
    scheduled(r) {
        return !this.closed(r) && (!r.manual || (!r.notificationSent && r.notificationState !== 'expired') ||
            r.phase === 'paid' && r.projection !== 'stored' && (r.projectionAttempts || 0) < MAX_RECOVERY_ATTEMPTS);
    }
    async write(r) {
        const holds = await this.storage.get('sku-holds') || {};
        for (const [sku, ids] of Object.entries(holds)) {
            holds[sku] = ids.filter(id => id !== r.id);
            if (!holds[sku].length) delete holds[sku];
        }
        if (this.holdsStock(r)) for (const sku of this.stockKeys(r)) holds[sku] = [...new Set([...(holds[sku] || []), r.id])];
        r.updatedAt = new Date(this.now()).toISOString();
        r.nextDue ??= this.now() + 30_000;
        // Single atomic storage.put: journal, locks and recovery index agree even after a crash.
        await this.storage.put({ [this.key(r.id)]: r, 'sku-holds': holds, [`pending:${r.id}`]: !this.closed(r) });
        if (this.scheduled(r)) await this.arm(r.nextDue);
    }
    async submit(body) {
        await this.initialize();
        const input = this.services.validate(body);
        const fingerprint = await digest(JSON.stringify({ quote: input.quote, contact: input.contact }));
        let r = await this.read(body.attemptId);
        if (r) {
            if (r.fingerprint !== fingerprint) throw new PurchaseError(409, '同じ注文番号の内容を変更できません。処理状況を確認してください。');
            return this.recover(r.id, true);
        }
        const holds = await this.storage.get('sku-holds') || {};
        if (this.stockKeys(input).some(sku => holds[sku]?.length)) throw new PurchaseError(503, 'この商品の在庫を確認中です。他の商品はご購入いただけます。');
        await this.services.stock(input.quote);
        r = { id: body.attemptId, fingerprint, ...input,
            orderReference: this.services.reference(), paymentKey: crypto.randomUUID(),
            createdAt: new Date(this.now()).toISOString(), phase: 'prepared', inventory: 'pending',
            projection: 'pending', recoveryAttempts: 0, warning: null };
        await this.write(r); // intent and SKU holds precede the external charge
        r.phase = 'submitting'; await this.write(r);
        try {
            const payment = await this.services.charge(r, body.sourceId);
            this.verifyPayment(r, payment);
            r.payment = paymentSnapshot(payment);
            r.phase = payment.status === 'COMPLETED' ? 'paid' : 'unknown';
        } catch {
            r.phase = 'unknown'; r.warning = 'payment_result_unknown';
        }
        await this.write(r);
        return this.recover(r.id, true);
    }
    verifyPayment(r, p) {
        if (!p?.id || p.reference_id !== r.orderReference || Number(p.amount_money?.amount) !== r.quote.total ||
            p.amount_money?.currency !== r.quote.currency || p.location_id !== this.services.location) {
            throw new PurchaseError(409, 'Square決済と注文の内容が一致しません。管理者の確認が必要です。');
        }
    }
    summary(r) {
        return { attemptId: r.id, orderReference: r.orderReference, paymentId: r.payment?.id || '',
            ok: r.phase === 'paid' && r.projection === 'stored', status: r.phase === 'paid' ? 'COMPLETED' : r.phase,
            amount: r.quote.total, inventoryAdjusted: r.inventory === 'applied',
            phase: r.phase, inventoryState: r.inventory, orderState: r.projection,
            recoveryRequired: !this.closed(r), warning: r.warning, manualReview: Boolean(r.manual),
            pausedVariations: this.holdsStock(r) ? this.stockKeys(r) : [],
            notificationState: r.notificationState || 'not_required', emailQueued: Boolean(r.emailQueued) };
    }
    async recover(id, force = false) {
        await this.initialize();
        const r = await this.read(id);
        if (!r) throw new PurchaseError(404, '注文処理はまだ開始されていません。');
        if (this.closed(r)) return this.summary(r);
        if (!force && r.nextDue > this.now()) return this.summary(r);
        if (r.manual) {
            // An authenticated operator can request another read-only payment
            // reconciliation after an outage. It can never submit a new charge.
            if (force && r.phase !== 'paid') {
                try {
                    const payment = await this.services.lookup(r);
                    if (payment) {
                        this.verifyPayment(r, payment);
                        if (['COMPLETED', 'FAILED', 'CANCELED'].includes(payment.status)) {
                            r.payment = paymentSnapshot(payment);
                            r.phase = payment.status === 'COMPLETED' ? 'paid' : 'declined';
                            r.manual = false; r.recoveryAttempts = 0; r.warning = null;
                            r.nextDue = this.now(); await this.write(r);
                            return this.closed(r) ? this.summary(r) : this.recover(id, true);
                        }
                    }
                } catch { /* Keep the existing manual-review hold. */ }
            }
            if (r.phase === 'paid' && r.projection !== 'stored' && ((r.projectionAttempts || 0) < MAX_RECOVERY_ATTEMPTS || force)) {
                r.projectionAttempts = (r.projectionAttempts || 0) + 1;
                try { await this.services.project(r); r.projection = 'stored'; } catch { r.projection = 'retry_required'; }
                r.nextDue = this.now() + 60_000; await this.write(r);
            }
            await this.notify(r); return this.summary(r);
        }
        if (r.recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) return this.manual(r, 'manual_review_required');
        r.recoveryAttempts++;
        r.nextDue = this.now() + Math.min(3600_000, 15_000 * 2 ** r.recoveryAttempts);
        await this.write(r);
        if (r.phase !== 'paid') {
            let payment;
            try { payment = await this.services.lookup(r); }
            catch { r.warning = 'payment_reconciliation_required'; await this.write(r); return this.summary(r); }
            if (!payment) { r.phase = 'unknown'; r.warning = 'payment_not_confirmed'; await this.write(r); return this.summary(r); }
            try { this.verifyPayment(r, payment); }
            catch { return this.manual(r, 'payment_mismatch'); }
            r.payment = paymentSnapshot(payment);
            if (['FAILED', 'CANCELED'].includes(payment.status)) {
                r.phase = 'declined'; r.warning = 'payment_not_completed'; await this.write(r); return this.summary(r);
            }
            if (payment.status !== 'COMPLETED') { r.phase = 'unknown'; r.warning = 'payment_not_completed'; await this.write(r); return this.summary(r); }
            r.phase = 'paid'; r.warning = null; await this.write(r);
        }
        if (r.inventory !== 'applied') {
            if (!r.inventoryOperation) {
                r.inventoryOperation = { key: `yh-inventory-${r.payment.id}`.slice(0, 128), occurredAt: new Date(this.now()).toISOString() };
                await this.write(r);
            }
            if (this.now() - Date.parse(r.inventoryOperation.occurredAt) > RETRY_WINDOW_MS) {
                r.inventory = 'manual_review'; r.manual = true; r.warning = 'inventory_retry_window_expired';
            } else {
                try { await this.services.decrement(r); r.inventory = 'applied'; r.warning = null; }
                catch (error) {
                    r.inventory = 'retry_required'; r.warning = 'inventory_recovery_required';
                    if (error.permanent) { r.manual = true; r.warning = 'inventory_conflict'; }
                }
            }
            await this.write(r);
        }
        try { await this.services.project(r); r.projection = 'stored'; }
        catch { r.projection = 'retry_required'; if (!r.manual) r.warning = 'order_projection_required'; }
        await this.write(r); // releases only this order's locks once inventory is confirmed
        if (r.projection === 'stored' && !r.emailAttempted) {
            r.emailAttempted = true; await this.write(r);
            r.emailQueued = Boolean(await this.services.email(r)); await this.write(r);
        }
        if (r.manual) await this.notify(r);
        return this.summary(r);
    }
    async manual(r, warning) {
        r.manual = true; r.warning = warning; await this.write(r); await this.notify(r); return this.summary(r);
    }
    async notify(r) {
        if (r.notificationSent || r.notificationState === 'expired') return;
        r.notificationStartedAt ??= this.now();
        // Stable Resend key; do not blindly replay beyond the local safety window.
        if (this.now() - r.notificationStartedAt > RETRY_WINDOW_MS) {
            r.notificationState = 'expired'; await this.write(r); return;
        }
        r.notificationState = 'pending'; await this.write(r);
        try {
            if (!await this.services.notify?.(r)) throw new Error('Notification not configured');
            r.notificationSent = true; r.notificationState = 'sent';
        } catch { r.notificationState = 'retry_required'; }
        r.nextDue = this.now() + 300_000; await this.write(r);
    }
    async warnings() {
        await this.initialize(); const records = [];
        for (const [key, pending] of await this.entries('pending:')) {
            if (pending) { const r = await this.read(key.slice(8)); if (r && !this.closed(r)) records.push(this.summary(r)); }
        }
        return records;
    }
    async alarm() {
        await this.initialize();
        // Safety heartbeat survives an exception while scanning or saving a single order.
        await this.storage.setAlarm(this.now() + 60_000);
        let next = Infinity; let processed = false;
        const cursor = await this.storage.get('alarm-cursor') || '';
        const entries = await this.entries('pending:');
        const ordered = [...entries.filter(([key]) => key > cursor), ...entries.filter(([key]) => key <= cursor)];
        for (const [key, pending] of ordered) {
            if (!pending) continue;
            try {
                const id = key.slice(8); let r = await this.read(id);
                // One external recovery per alarm invocation: yield the global DO
                // queue to healthy purchases between jobs instead of monopolizing it.
                if (!processed && r.nextDue <= this.now() && this.scheduled(r)) {
                    processed = true; await this.storage.put('alarm-cursor', key);
                    await this.recover(id);
                }
                r = await this.read(id);
                if (this.scheduled(r)) next = Math.min(next, r.nextDue);
            } catch { next = Math.min(next, this.now() + 60_000); }
        }
        if (Number.isFinite(next)) await this.storage.setAlarm(Math.max(this.now() + 1000, next));
        else await this.storage.deleteAlarm();
    }
}
async function digest(value) {
    return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(b => b.toString(16).padStart(2, '0')).join('');
}
function paymentSnapshot(payment) {
    const { id, status, reference_id, amount_money, location_id, created_at } = payment;
    return { id, status, reference_id, amount_money, location_id, created_at };
}
