// Order notifications are independent of payment/stock completion. Private DO
// storage contains frozen messages, never API keys. Resend retains keys for 24h;
// use 23h locally, including network/clock margin. Never create a replacement key.
export const MAIL_RETRY_WINDOW_MS = 23 * 60 * 60 * 1000;
const terminal = t => ['accepted', 'delivered', 'manual_review'].includes(t.state);
export class OrderMailOutbox {
    constructor(storage, services, now = () => Date.now()) { this.storage = storage; this.services = services; this.now = now; }
    key(id) { return `order-mail:${id}`; }
    async arm(at) {
        const old = await this.storage.getAlarm();
        if (!old || old <= this.now() || at < old) await this.storage.setAlarm(at);
    }
    pending(r) { return !r.prepared || Object.values(r.tasks).some(t => !terminal(t)); }
    async write(r, record) {
        // Install a heartbeat BEFORE writing: a crash cannot strand a saved task.
        if (this.pending(r)) await this.arm(this.now() + 60_000);
        await this.storage.put({ [this.key(r.id)]: r, [`order-mail-ref:${r.orderReference}`]: r.id,
            [`mail-pending:${r.id}`]: this.pending(r), [`mail-create:${r.id}`]:false,
            ...(record ? {[`attempt:${record.id}`]:record} : {}) });
        if (this.pending(r)) await this.arm(this.due(r));
    }
    due(r) { return r.prepared ? Math.min(...Object.values(r.tasks).filter(t => !terminal(t)).map(t => t.nextDue)) : r.nextDue; }
    async ensure(record) {
        let r = await this.storage.get(this.key(record.id));
        if (r) {
            if (record.orderMailVersion !== 1) {
                await this.write(r, {...record, emailAttempted:true, orderMailVersion:1});
                record.emailAttempted = true; record.orderMailVersion = 1;
            } else await this.storage.put(`mail-create:${record.id}`, false);
            return r;
        }
        if (record.phase !== 'paid' || record.projection !== 'stored') return;
        r = { version: 1, id: record.id, orderReference: record.orderReference, prepared: false,
            // Legacy waitUntil/emailAttempted has no per-recipient acceptance proof.
            // Preserve it as unknown; never risk sending those old emails again.
            legacyUnknown: Boolean(record.emailAttempted || record.emailQueued), tasks: {}, nextDue: this.now() };
        // Legacy binaries must not start their old waitUntil sender on rollback.
        // This marker means "owned by outbox", never "accepted/delivered".
        await this.write(r, {...record, emailAttempted:true, orderMailVersion:1});
        record.emailAttempted = true; record.orderMailVersion = 1;
        return r;
    }
    async prepare(r) {
        const record = await this.storage.get(`attempt:${r.id}`);
        if (!record || record.phase !== 'paid' || record.projection !== 'stored') {
            r.reason = 'order_record_unavailable'; r.nextDue = this.now() + 300_000;
            await this.write(r); return;
        }
        try {
            const messages = await this.services.prepare(record);
            for (const recipient of ['admin', 'customer']) {
                const message = messages[recipient];
                if (!message?.body || !message?.key) throw Error('Incomplete mail configuration');
                r.tasks[recipient] = { body: message.body, key: message.key,
                    state: r.legacyUnknown ? 'manual_review' : 'pending',
                    reason: r.legacyUnknown ? 'legacy_delivery_unknown' : null,
                    firstAttemptAt: null, attempts: 0, nextDue: this.now(), providerId: null };
            }
            r.prepared = true; r.reason = null;
        } catch { r.tasks = {}; r.reason = 'mail_configuration_required'; r.nextDue = this.now() + 300_000; }
        await this.write(r);
    }
    async process(id) {
        let r = await this.storage.get(this.key(id));
        if (!r) return;
        if (!r.prepared) { if (r.nextDue > this.now()) return; await this.prepare(r); }
        if (!r.prepared) return;
        for (const recipient of ['admin', 'customer']) {
            const task = r.tasks[recipient];
            if (terminal(task) || task.nextDue > this.now()) continue;
            if (task.firstAttemptAt !== null && this.now() >= task.firstAttemptAt + MAIL_RETRY_WINDOW_MS) {
                task.state = 'manual_review'; task.reason = 'idempotency_window_expired';
                await this.write(r); continue;
            }
            task.firstAttemptAt ??= this.now();
            task.attempts++;
            task.state = 'unknown'; task.reason = 'acceptance_unconfirmed';
            task.nextDue = Math.min(task.firstAttemptAt + MAIL_RETRY_WINDOW_MS,
                this.now() + Math.min(1800_000, 15_000 * 2 ** Math.min(task.attempts, 7)));
            await this.write(r); // immutable request/key + intent MUST precede network
            if (this.now() >= task.firstAttemptAt + MAIL_RETRY_WINDOW_MS) {
                task.state = 'manual_review'; task.reason = 'idempotency_window_expired';
                await this.write(r); continue;
            }
            let receipt;
            try {
                // Without a receipt ID Resend has no lookup-by-key endpoint.
                // Replaying the SAME key/body within its window reconciles an
                // unknown result without generating another email.
                receipt = task.providerId && this.services.lookup
                    ? await this.services.lookup(task) : await this.services.send(task);
                if (!receipt?.id || !/^[a-zA-Z0-9_-]{1,128}$/.test(receipt.id)) throw Error('No acceptance receipt');
            } catch (error) {
                const allowed = ['resend_unavailable','resend_rate_limited','resend_request_rejected','resend_key_conflict','resend_not_configured'];
                task.reason = allowed.includes(error.code) ? error.code : 'acceptance_unconfirmed';
                if (error.permanent) task.state = 'manual_review';
                await this.write(r); continue;
            }
            task.providerId = receipt.id;
            task.state = 'accepted'; // acceptance is NOT evidence of delivery
            task.reason = null; task.acceptedAt = new Date(this.now()).toISOString();
            // Do not catch storage failure as a transport failure. After a crash
            // the durable unknown intent is reconciled with its original key.
            await this.write(r);
        }
    }
    publicState(r) {
        if (!r) return { admin: {state:'unrecorded'}, customer: {state:'unrecorded'} };
        const result = {};
        for (const recipient of ['admin', 'customer']) {
            const t = r.tasks[recipient];
            result[recipient] = t ? {state:t.state, reason:t.reason, attempts:t.attempts,
                acceptedAt:t.acceptedAt || null, nextAttemptAt:terminal(t)?null:new Date(t.nextDue).toISOString(),
                retryUntil:t.firstAttemptAt===null?null:new Date(t.firstAttemptAt+MAIL_RETRY_WINDOW_MS).toISOString()}
                : {state:'pending', reason:r.reason || 'preparing'};
        }
        return result; // no addresses, body, API key or provider response
    }
    async status(orderReference) {
        const id = await this.storage.get(`order-mail-ref:${orderReference}`);
        return this.publicState(id ? await this.storage.get(this.key(id)) : null);
    }
    async alarm() {
        let startAfter; const entries = [];
        for (;;) {
            const page = await this.storage.list({prefix:'mail-pending:', limit:128, ...(startAfter?{startAfter}:{})});
            entries.push(...page.entries());
            if (page.size < 128) break;
            startAfter = [...page.keys()].at(-1);
        }
        const cursor = await this.storage.get('mail-alarm-cursor') || '';
        const ordered = [...entries.filter(([key])=>key>cursor), ...entries.filter(([key])=>key<=cursor)];
        let processed = false;
        for (const [key, pending] of ordered) {
            try {
                if (!pending) continue;
                let r = await this.storage.get(this.key(key.slice(13)));
                if (!r || !this.pending(r)) continue;
                await this.arm(this.now() + 60_000);
                if (!processed && this.due(r) <= this.now()) {
                    processed = true;
                    await this.storage.put('mail-alarm-cursor', key);
                    await this.process(r.id);
                    r = await this.storage.get(this.key(r.id));
                }
                if (this.pending(r)) await this.arm(Math.max(this.now()+1000, this.due(r)));
            } catch { await this.arm(this.now() + 60_000); }
        }
        // Never delete an alarm: the purchase ledger and management share it.
        // They may have scheduled work earlier/later than this outbox.
    }
}
