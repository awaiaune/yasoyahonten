var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker/src/square-error-codes.js
var SQUARE_ERROR_CODES = [
  "INTERNAL_SERVER_ERROR",
  "UNAUTHORIZED",
  "ACCESS_TOKEN_EXPIRED",
  "ACCESS_TOKEN_REVOKED",
  "CLIENT_DISABLED",
  "FORBIDDEN",
  "INSUFFICIENT_SCOPES",
  "APPLICATION_DISABLED",
  "V1_APPLICATION",
  "V1_ACCESS_TOKEN",
  "CARD_PROCESSING_NOT_ENABLED",
  "MERCHANT_SUBSCRIPTION_NOT_FOUND",
  "BAD_REQUEST",
  "MISSING_REQUIRED_PARAMETER",
  "INCORRECT_TYPE",
  "INVALID_TIME",
  "INVALID_TIME_RANGE",
  "INVALID_VALUE",
  "INVALID_CURSOR",
  "UNKNOWN_QUERY_PARAMETER",
  "CONFLICTING_PARAMETERS",
  "EXPECTED_JSON_BODY",
  "INVALID_SORT_ORDER",
  "VALUE_REGEX_MISMATCH",
  "VALUE_TOO_SHORT",
  "VALUE_TOO_LONG",
  "VALUE_TOO_LOW",
  "VALUE_TOO_HIGH",
  "VALUE_EMPTY",
  "ARRAY_LENGTH_TOO_LONG",
  "ARRAY_LENGTH_TOO_SHORT",
  "ARRAY_EMPTY",
  "EXPECTED_BOOLEAN",
  "EXPECTED_INTEGER",
  "EXPECTED_FLOAT",
  "EXPECTED_STRING",
  "EXPECTED_OBJECT",
  "EXPECTED_ARRAY",
  "EXPECTED_MAP",
  "EXPECTED_BASE64_ENCODED_BYTE_ARRAY",
  "INVALID_ARRAY_VALUE",
  "INVALID_ENUM_VALUE",
  "INVALID_CONTENT_TYPE",
  "INVALID_FORM_VALUE",
  "CUSTOMER_NOT_FOUND",
  "ONE_INSTRUMENT_EXPECTED",
  "NO_FIELDS_SET",
  "TOO_MANY_MAP_ENTRIES",
  "MAP_KEY_LENGTH_TOO_SHORT",
  "MAP_KEY_LENGTH_TOO_LONG",
  "CUSTOMER_MISSING_NAME",
  "CUSTOMER_MISSING_EMAIL",
  "INVALID_PAUSE_LENGTH",
  "INVALID_DATE",
  "UNSUPPORTED_COUNTRY",
  "UNSUPPORTED_CURRENCY",
  "APPLE_TTP_PIN_TOKEN",
  "CARD_EXPIRED",
  "INVALID_EXPIRATION",
  "INVALID_EXPIRATION_YEAR",
  "INVALID_EXPIRATION_DATE",
  "UNSUPPORTED_CARD_BRAND",
  "UNSUPPORTED_ENTRY_METHOD",
  "INVALID_ENCRYPTED_CARD",
  "INVALID_CARD",
  "PAYMENT_AMOUNT_MISMATCH",
  "GENERIC_DECLINE",
  "CVV_FAILURE",
  "ADDRESS_VERIFICATION_FAILURE",
  "INVALID_ACCOUNT",
  "CURRENCY_MISMATCH",
  "INSUFFICIENT_FUNDS",
  "INSUFFICIENT_PERMISSIONS",
  "CARDHOLDER_INSUFFICIENT_PERMISSIONS",
  "INVALID_LOCATION",
  "TRANSACTION_LIMIT",
  "VOICE_FAILURE",
  "PAN_FAILURE",
  "EXPIRATION_FAILURE",
  "CARD_NOT_SUPPORTED",
  "READER_DECLINED",
  "INVALID_PIN",
  "MISSING_PIN",
  "MISSING_ACCOUNT_TYPE",
  "INVALID_POSTAL_CODE",
  "INVALID_FEES",
  "MANUALLY_ENTERED_PAYMENT_NOT_SUPPORTED",
  "PAYMENT_LIMIT_EXCEEDED",
  "GIFT_CARD_AVAILABLE_AMOUNT",
  "ACCOUNT_UNUSABLE",
  "BUYER_REFUSED_PAYMENT",
  "DELAYED_TRANSACTION_EXPIRED",
  "DELAYED_TRANSACTION_CANCELED",
  "DELAYED_TRANSACTION_CAPTURED",
  "DELAYED_TRANSACTION_FAILED",
  "CARD_TOKEN_EXPIRED",
  "CARD_TOKEN_USED",
  "AMOUNT_TOO_HIGH",
  "AMOUNT_TOO_LOW",
  "UNSUPPORTED_INSTRUMENT_TYPE",
  "REFUND_AMOUNT_INVALID",
  "REFUND_ALREADY_PENDING",
  "PAYMENT_NOT_REFUNDABLE",
  "PAYMENT_NOT_REFUNDABLE_DUE_TO_DISPUTE",
  "REFUND_ERROR_PAYMENT_NEEDS_COMPLETION",
  "REFUND_DECLINED",
  "INSUFFICIENT_PERMISSIONS_FOR_REFUND",
  "INVALID_CARD_DATA",
  "SOURCE_USED",
  "SOURCE_EXPIRED",
  "UNSUPPORTED_LOYALTY_REWARD_TIER",
  "LOCATION_MISMATCH",
  "ORDER_UNPAID_NOT_RETURNABLE",
  "PARTIAL_PAYMENT_DELAY_CAPTURE_NOT_SUPPORTED",
  "IDEMPOTENCY_KEY_REUSED",
  "UNEXPECTED_VALUE",
  "SANDBOX_NOT_SUPPORTED",
  "INVALID_EMAIL_ADDRESS",
  "INVALID_PHONE_NUMBER",
  "CHECKOUT_EXPIRED",
  "BAD_CERTIFICATE",
  "INVALID_SQUARE_VERSION_FORMAT",
  "API_VERSION_INCOMPATIBLE",
  "CARD_PRESENCE_REQUIRED",
  "UNSUPPORTED_SOURCE_TYPE",
  "CARD_MISMATCH",
  "PLAID_ERROR",
  "PLAID_ERROR_ITEM_LOGIN_REQUIRED",
  "PLAID_ERROR_RATE_LIMIT",
  "PLAID_ERROR_INVALID_ACCESS_TOKEN",
  "PLAID_ERROR_INVALID_ACCOUNT_ID",
  "PLAID_ERROR_NO_ACCOUNTS",
  "PLAID_ERROR_ITEM_NOT_FOUND",
  "PLAID_ERROR_INSUFFICIENT_CREDENTIALS",
  "PLAID_ERROR_ITEM_NOT_SUPPORTED",
  "PLAID_ERROR_PRODUCT_NOT_READY",
  "PAYMENT_SOURCE_NOT_ENABLED_FOR_TARGET",
  "CARD_DECLINED",
  "VERIFY_CVV_FAILURE",
  "VERIFY_AVS_FAILURE",
  "CARD_DECLINED_CALL_ISSUER",
  "CARD_DECLINED_VERIFICATION_REQUIRED",
  "BAD_EXPIRATION",
  "CHIP_INSERTION_REQUIRED",
  "ALLOWABLE_PIN_TRIES_EXCEEDED",
  "RESERVATION_DECLINED",
  "UNKNOWN_BODY_PARAMETER",
  "CART_INELIGIBLE_FOR_EBT",
  "NOT_FOUND",
  "APPLE_PAYMENT_PROCESSING_CERTIFICATE_HASH_NOT_FOUND",
  "METHOD_NOT_ALLOWED",
  "NOT_ACCEPTABLE",
  "REQUEST_TIMEOUT",
  "CONFLICT",
  "GONE",
  "REQUEST_ENTITY_TOO_LARGE",
  "UNSUPPORTED_MEDIA_TYPE",
  "UNPROCESSABLE_ENTITY",
  "RATE_LIMITED",
  "NOT_IMPLEMENTED",
  "BAD_GATEWAY",
  "SERVICE_UNAVAILABLE",
  "TEMPORARY_ERROR",
  "GATEWAY_TIMEOUT"
];
var SQUARE_ERROR_CATEGORIES = [
  "API_ERROR",
  "AUTHENTICATION_ERROR",
  "INVALID_REQUEST_ERROR",
  "RATE_LIMIT_ERROR",
  "PAYMENT_METHOD_ERROR",
  "REFUND_ERROR",
  "MERCHANT_SUBSCRIPTION_ERROR",
  "EXTERNAL_VENDOR_ERROR"
];

// worker/src/payment-failure.js
var CODES = new Set(SQUARE_ERROR_CODES);
var CATEGORIES = new Set(SQUARE_ERROR_CATEGORIES);
var observations = /* @__PURE__ */ new WeakMap();
var list = /* @__PURE__ */ __name((value) => Array.isArray(value) ? value : [], "list");
var known = /* @__PURE__ */ __name((values, allowed) => [...new Set(list(values).filter((v) => allowed.has(v)))], "known");
function classifyPaymentFailure(codes2) {
  if (codes2.includes("CARD_DECLINED_VERIFICATION_REQUIRED")) return "three_ds_required";
  if (codes2.some((c) => ["UNAUTHORIZED", "FORBIDDEN", "ACCESS_TOKEN_EXPIRED", "ACCESS_TOKEN_REVOKED", "INSUFFICIENT_SCOPES", "INSUFFICIENT_PERMISSIONS", "APPLICATION_DISABLED"].includes(c))) return "authentication";
  if (codes2.some((c) => ["INVALID_LOCATION", "LOCATION_MISMATCH", "CARD_PROCESSING_NOT_ENABLED"].includes(c))) return "location";
  if (codes2.some((c) => ["CARD_TOKEN_EXPIRED", "CARD_TOKEN_USED", "SOURCE_USED", "SOURCE_EXPIRED"].includes(c))) return "token_invalid";
  if (codes2.some((c) => ["CARD_EXPIRED", "INVALID_CARD", "INVALID_CARD_DATA", "INVALID_EXPIRATION", "INVALID_EXPIRATION_YEAR", "INVALID_EXPIRATION_DATE", "CVV_FAILURE", "VERIFY_CVV_FAILURE", "VERIFY_AVS_FAILURE", "ADDRESS_VERIFICATION_FAILURE", "PAN_FAILURE", "EXPIRATION_FAILURE", "INVALID_POSTAL_CODE"].includes(c))) return "card_invalid";
  if (codes2.some((c) => ["CARD_DECLINED", "GENERIC_DECLINE", "CARD_DECLINED_CALL_ISSUER", "INSUFFICIENT_FUNDS", "CARD_NOT_SUPPORTED", "TRANSACTION_LIMIT", "PAYMENT_LIMIT_EXCEEDED"].includes(c))) return "card_declined";
  if (codes2.some((c) => ["INTERNAL_SERVER_ERROR", "SERVICE_UNAVAILABLE", "TEMPORARY_ERROR", "GATEWAY_TIMEOUT", "BAD_GATEWAY", "RATE_LIMITED", "REQUEST_TIMEOUT"].includes(c))) return "provider_unavailable";
  if (codes2.some((c) => ["BAD_REQUEST", "INVALID_VALUE", "MISSING_REQUIRED_PARAMETER", "CURRENCY_MISMATCH", "PAYMENT_AMOUNT_MISMATCH", "INVALID_PHONE_NUMBER", "INVALID_EMAIL_ADDRESS", "IDEMPOTENCY_KEY_REUSED"].includes(c))) return "request_invalid";
  return "unknown";
}
__name(classifyPaymentFailure, "classifyPaymentFailure");
function paymentFailureEvidence(status, result, source = "create") {
  const errors = [...list(result?.errors), ...list(result?.payment?.card_details?.errors)];
  const codes2 = known(errors.map((e) => e?.code), CODES);
  const categories = known(errors.map((e) => e?.category), CATEGORIES);
  const httpStatus = Number.isInteger(status) && status >= 100 && status <= 599 ? status : null;
  return {
    httpStatus,
    codes: codes2,
    categories,
    classification: classifyPaymentFailure(codes2),
    unrecognizedCode: errors.some((e) => typeof e?.code === "string" && !CODES.has(e.code)),
    source: ["create", "lookup", "payment", "legacy"].includes(source) ? source : "legacy",
    // Request rejection is never proof that no earlier charge exists.
    outcome: [400, 401, 402, 403, 422].includes(httpStatus) && codes2.length && !codes2.includes("IDEMPOTENCY_KEY_REUSED") ? "rejected" : "unknown"
  };
}
__name(paymentFailureEvidence, "paymentFailureEvidence");
function withPaymentDiagnostics(payment, status, response, source = "create") {
  if (payment && typeof payment === "object") observations.set(payment, paymentFailureEvidence(status, response, source));
  return payment;
}
__name(withPaymentDiagnostics, "withPaymentDiagnostics");
function diagnosticsForPayment(payment) {
  if (payment?.status === "COMPLETED") return null;
  return observations.get(payment) || paymentFailureEvidence(null, { payment }, "payment");
}
__name(diagnosticsForPayment, "diagnosticsForPayment");
function mergePaymentFailure(previous, current) {
  if (!previous) return current;
  const first = previous.source === "create" || !previous.source ? previous : current;
  const codes2 = known([...list(previous.codes), ...list(current.codes)], CODES);
  const categories = known([...list(previous.categories), ...list(current.categories)], CATEGORIES);
  return {
    ...current,
    httpStatus: Number.isInteger(first.httpStatus) && first.httpStatus >= 100 && first.httpStatus <= 599 ? first.httpStatus : current.httpStatus,
    source: ["create", "lookup", "payment", "legacy"].includes(first.source) ? first.source : "legacy",
    codes: codes2,
    categories,
    classification: classifyPaymentFailure(codes2),
    unrecognizedCode: previous.unrecognizedCode === true || current.unrecognizedCode === true,
    outcome: previous.outcome === "rejected" || current.outcome === "rejected" ? "rejected" : "unknown"
  };
}
__name(mergePaymentFailure, "mergePaymentFailure");
var SquarePaymentFailure = class extends Error {
  static {
    __name(this, "SquarePaymentFailure");
  }
  constructor(status, result) {
    super("Square payment response requires reconciliation");
    this.evidence = paymentFailureEvidence(status, result);
  }
};

// worker/src/payment-alerts.js
var CODES2 = new Set(SQUARE_ERROR_CODES);
var PREFIX = "payment-alert-v1:";
var WINDOW = 3e5;
var EXPIRY = 36e5;
var RETENTION = 7 * 864e5;
var valid = /* @__PURE__ */ __name((id) => typeof id === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id), "valid");
var priority = /* @__PURE__ */ new Set(["authentication_required", "payment_unknown", "manual_review"]);
var PaymentAlerts = class {
  static {
    __name(this, "PaymentAlerts");
  }
  constructor(storage, services, now2 = () => Date.now()) {
    this.s = storage;
    this.services = services;
    this.now = now2;
  }
  async arm(at) {
    const old = await this.s.getAlarm();
    if (!old || at < old) await this.s.setAlarm(at);
  }
  async save(t) {
    await this.s.put({ [PREFIX + t.id]: t, ["payment-alert-due:" + t.id]: ["pending", "sending"].includes(t.state) });
    if (t.state === "pending") await this.arm(t.due);
  }
  safe(id, r) {
    return { id, attemptId: id, createdAt: this.now(), expiresAt: this.now() + EXPIRY, retainUntil: this.now() + RETENTION, amount: Number.isSafeInteger(r?.quote?.total) && r.quote.total >= 0 ? r.quote.total : null, currency: r?.quote?.currency === "JPY" ? "JPY" : null, state: "watching", attempts: 0, codes: [], httpStatus: null };
  }
  async observe(id, event, record) {
    if (!valid(id) || !event || event.source === "browser") return;
    let t = await this.s.get(PREFIX + id);
    if (event.stage === "square_send") {
      if (!t) {
        t = this.safe(id, record);
        t.sendAttempted = true;
        await this.save(t);
      }
      return;
    }
    if (!t?.sendAttempted) return;
    if (event.stage === "square_response") {
      t.httpStatus = Number.isInteger(event.httpStatus) ? event.httpStatus : null;
      t.codes = [...new Set((event.codes || []).filter((c) => CODES2.has(c)))].slice(0, 8);
      if (t.httpStatus >= 200 && event.squareStatus !== "COMPLETED" && t.codes.includes("CARD_DECLINED_VERIFICATION_REQUIRED")) return this.queue(t, "authentication_required");
      const classification = classifyPaymentFailure(t.codes);
      if (["card_declined", "card_invalid"].includes(classification) && (t.httpStatus >= 400 && t.httpStatus < 500 || ["FAILED", "CANCELED"].includes(event.squareStatus))) {
        if (t.state !== "watching") return;
        t.kind = "decline";
        t.state = "grouped";
        await this.save(t);
        const id2 = "declines-" + Math.floor(this.now() / WINDOW), key = PREFIX + id2;
        let group = await this.s.get(key);
        group ||= { id: id2, kind: "decline_summary", state: "pending", createdAt: this.now(), due: (Math.floor(this.now() / WINDOW) + 1) * WINDOW, expiresAt: this.now() + EXPIRY, retainUntil: this.now() + RETENTION, attempts: 0, ids: [] };
        group.count = (group.count || group.ids.length) + 1;
        if (group.ids.length < 100) group.ids.push(t.attemptId);
        await this.save(group);
        return;
      }
      if (t.httpStatus >= 500) return this.queue(t, "payment_unknown");
      await this.save(t);
      return;
    }
    if (event.stage === "square_unknown" || event.stage === "payment_unknown") {
      if (t.state === "grouped" || t.kind === "authentication_required") return;
      return this.queue(t, "payment_unknown");
    }
    if (event.stage === "payment_paid" && t.state === "watching") await this.s.delete(PREFIX + id);
  }
  async queue(t, kind) {
    if (["accepted", "expired", "failed"].includes(t.state)) return true;
    if (priority.has(t.kind)) return true;
    t.kind = kind;
    t.state = "pending";
    t.due = this.now();
    await this.save(t);
    return true;
  }
  async manual(r) {
    if (!valid(r?.id)) return false;
    let t = await this.s.get(PREFIX + r.id);
    if (r.notificationSent && !t) return true;
    t ||= this.safe(r.id, r);
    if (t.kind === "decline" && t.state === "accepted") t = { ...t, id: "manual-" + r.id, state: "watching", kind: null, attempts: 0, createdAt: this.now(), expiresAt: this.now() + EXPIRY, retainUntil: this.now() + RETENTION };
    return this.queue(t, "manual_review");
  }
  text(t) {
    const labels = { authentication_required: "\u672C\u4EBA\u8A8D\u8A3C\u8981\u6C42\uFF08\u8981\u7167\u5408\uFF09", payment_unknown: "\u6C7A\u6E08\u9001\u4FE1\u8A66\u884C\u5F8C\u306E\u7D50\u679C\u4E0D\u660E\uFF08\u8981\u7167\u5408\u30FB\u672A\u8AB2\u91D1\u3068\u65AD\u5B9A\u4E0D\u53EF\uFF09", manual_review: "\u6CE8\u6587\u30FB\u5728\u5EAB\u51E6\u7406\u306E\u624B\u52D5\u78BA\u8A8D\u304C\u5FC5\u8981", decline_summary: "\u4E00\u822C\u30AB\u30FC\u30C9\u62D2\u5426\u306E\u96C6\u7D04" };
    return `\u516B\u8349\u5C4B\u672C\u5E97 \u7BA1\u7406\u901A\u77E5
\u65E5\u6642: ${new Date(t.createdAt).toISOString()}
\u533A\u5206: ${labels[t.kind]}
${t.attemptId ? "\u533F\u540D\u8A66\u884CID: " + t.attemptId + "\n" : ""}${t.ids ? "\u4EF6\u6570: " + (t.count || t.ids.length) + "\n\u533F\u540D\u8A66\u884CID: " + t.ids.join(", ") + "\n" : ""}HTTP: ${t.httpStatus ?? "\u672A\u78BA\u8A8D"}
\u30B3\u30FC\u30C9: ${(t.codes || []).join(", ") || "\u672A\u78BA\u8A8D"}
${t.amount !== null && t.amount !== void 0 ? "\u91D1\u984D: " + t.amount + " " + (t.currency || "") + "\n" : ""}\u691C\u51FA\u6642\u70B9\u306E\u72B6\u614B\u3067\u3059\u3002\u6B63\u898F\u306E\u7BA1\u7406\u753B\u9762\u3067\u73FE\u5728\u306E\u6CE8\u6587\u30FB\u672A\u89E3\u6C7A\u6C7A\u6E08\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u518D\u8AB2\u91D1\u30FB\u5C65\u6B74\u524A\u9664\u3092\u884C\u308F\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002`;
  }
  async status() {
    const rows = await this.s.list({ prefix: PREFIX, limit: 200 }), counts = {};
    for (const r of rows.values()) if (["watching", "grouped", "pending", "sending", "accepted", "failed", "expired", "suppressed"].includes(r?.state)) counts[r.state] = (counts[r.state] || 0) + 1;
    return { counts, truncated: rows.size >= 200, retentionDays: 7, deliveryVerified: false };
  }
  async prepareNext() {
    const now2 = this.now();
    let ready = [];
    const due = await this.s.list({ prefix: "payment-alert-due:", limit: 1e3 });
    const rows = [];
    for (const [key, active] of due) {
      if (!active) {
        await this.s.delete(key);
        continue;
      }
      const id = key.slice("payment-alert-due:".length), t2 = await this.s.get(PREFIX + id);
      if (t2) rows.push([PREFIX + id, t2]);
      else await this.s.delete(key);
    }
    const cursor = await this.s.get("payment-alert-cleanup-cursor") || "";
    const old = await this.s.list({ prefix: PREFIX, startAfter: cursor, limit: 64 });
    for (const [key, t2] of old) if (t2?.retainUntil <= now2 && !["pending", "sending"].includes(t2.state)) {
      await this.s.delete(key);
      await this.s.delete("payment-alert-due:" + t2.id);
    }
    await this.s.put("payment-alert-cleanup-cursor", old.size === 64 ? [...old.keys()].at(-1) : "");
    if (due.size === 1e3) await this.arm(now2 + 1e3);
    for (const [key, t2] of rows) {
      if (t2.retainUntil <= now2) {
        await this.s.delete(key);
        continue;
      }
      if (t2.state === "sending" && t2.leaseUntil > now2) {
        await this.arm(t2.leaseUntil);
        continue;
      }
      if (t2.state === "sending") {
        t2.state = "pending";
        t2.due = now2;
      }
      if (t2.state !== "pending") continue;
      if (now2 >= t2.expiresAt || t2.attempts >= 3) {
        t2.state = "expired";
        await this.save(t2);
        continue;
      }
      if (t2.due <= now2) ready.push(t2);
      else await this.arm(t2.due);
    }
    ready.sort((a, b) => Number(priority.has(b.kind)) - Number(priority.has(a.kind)) || a.createdAt - b.createdAt);
    const t = ready[0];
    if (!t) return;
    if (t.kind === "decline_summary" && !t.body) {
      const children = [];
      for (const id of t.ids) {
        const row = await this.s.get(PREFIX + id);
        if (row?.kind === "decline" && row.state === "grouped") children.push(row);
      }
      t.count = (t.count || t.ids.length) - t.ids.length + children.length;
      t.ids = children.map((r) => r.attemptId);
      if (t.count < 3) {
        t.state = "suppressed";
        await this.save(t);
        return;
      }
      t.codes = [...new Set(children.flatMap((r) => r.codes))].slice(0, 8);
      t.httpStatus = null;
    }
    const rateKey = PREFIX + "rate";
    let rate = await this.s.get(rateKey) || { start: now2, count: 0 };
    if (now2 - rate.start >= 6e5) rate = { start: now2, count: 0 };
    if (rate.count >= 10) {
      t.due = rate.start + 6e5;
      await this.save(t);
      return;
    }
    try {
      t.state = "sending";
      t.attempts++;
      t.key ??= "yh-payment-alert-v1-" + t.id;
      if (!t.body) t.body = this.services.prepare(this.text(t), t.kind);
      t.leaseUntil = now2 + 1e4;
      await this.s.put(rateKey, { ...rate, count: rate.count + 1 });
      await this.save(t);
      await this.arm(t.leaseUntil);
      if (ready.length > 1) await this.arm(now2 + 1e3);
      return structuredClone(t);
    } catch (error) {
      t.state = t.attempts >= 3 ? "expired" : "pending";
      t.due = now2 + [6e4, 3e5, 9e5][Math.min(2, t.attempts - 1)];
      await this.save(t);
      return null;
    }
  }
  async deliver(t) {
    let timer;
    try {
      const result = await Promise.race([this.services.send(t.body, t.key), new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("Alert acceptance unconfirmed")), 4500);
      })]);
      if (typeof result?.id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(result.id)) throw Error("Alert acceptance unconfirmed");
      return { providerId: result.id };
    } catch (error) {
      return { unconfirmed: true, permanent: error?.permanent === true };
    } finally {
      clearTimeout(timer);
    }
  }
  async complete(job, outcome) {
    const t = await this.s.get(PREFIX + job.id);
    if (!t || t.state !== "sending" || t.attempts !== job.attempts) return;
    if (outcome.providerId) {
      t.providerId = outcome.providerId;
      t.state = "accepted";
    } else {
      t.state = outcome.permanent ? "failed" : t.attempts >= 3 ? "expired" : "pending";
      t.due = this.now() + [6e4, 3e5, 9e5][Math.min(2, t.attempts - 1)];
    }
    delete t.leaseUntil;
    await this.save(t);
    if (t.kind === "decline_summary" && t.state === "accepted") for (const id of t.ids) {
      const row = await this.s.get(PREFIX + id);
      if (row?.state === "grouped") {
        row.state = "accepted";
        await this.save(row);
      }
    }
  }
  async process() {
    if (this.processing) return this.processing;
    this.processing = (async () => {
      const t = await this.prepareNext();
      if (t) await this.complete(t, await this.deliver(t));
    })();
    try {
      return await this.processing;
    } finally {
      this.processing = null;
    }
  }
};

// worker/src/payment-trace.js
var TRACE_RETENTION_MS = 7 * 24 * 60 * 60 * 1e3;
var MAX_TRACES = 200;
var MAX_EVENTS = 64;
var clientStages = /* @__PURE__ */ new Set(["pay_click", "sdk_start", "sdk_ok", "sdk_failed", "csp_blocked", "payment_dispatch"]);
var serverStages = /* @__PURE__ */ new Set(["square_send", "square_response", "square_unknown", "payment_paid", "payment_declined", "payment_unknown", "inventory_applied", "inventory_pending", "order_stored", "order_pending", "mail_state"]);
var directives = /* @__PURE__ */ new Set(["frame-src", "child-src", "form-action", "connect-src", "script-src", "script-src-elem", "font-src"]);
var codes = new Set(SQUARE_ERROR_CODES);
var mailStates = /* @__PURE__ */ new Set(["unrecorded", "pending", "unknown", "accepted", "delivered", "manual_review"]);
var validTraceId = /* @__PURE__ */ __name((id) => typeof id === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id), "validTraceId");
function sanitize(event, source) {
  if (!event || !(source === "browser" ? clientStages : serverStages).has(event.stage)) return null;
  const out = { stage: event.stage, source };
  if (source === "browser") {
    if (Number.isInteger(event.sequence) && event.sequence > 0 && event.sequence <= 100) out.sequence = event.sequence;
    if (["pay_click", "sdk_start"].includes(event.stage) && typeof event.activation === "boolean") out.activation = event.activation;
    if (event.stage === "csp_blocked" && directives.has(event.directive)) out.directive = event.directive;
  } else {
    if (Number.isInteger(event.httpStatus) && event.httpStatus >= 100 && event.httpStatus <= 599) out.httpStatus = event.httpStatus;
    if (typeof event.requestId === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(event.requestId)) out.requestId = event.requestId;
    if (Array.isArray(event.codes)) out.codes = [...new Set(event.codes.filter((c) => codes.has(c)))].slice(0, 8);
    for (const recipient of ["admin", "customer"]) if (mailStates.has(event[recipient])) out[recipient] = event[recipient];
  }
  return out;
}
__name(sanitize, "sanitize");
var PaymentTrace = class {
  static {
    __name(this, "PaymentTrace");
  }
  constructor(storage, now2 = () => Date.now()) {
    this.storage = storage;
    this.now = now2;
  }
  async prune() {
    const all = await this.storage.list({ prefix: "payment-trace:", limit: MAX_TRACES + 1 });
    for (const [key, r] of all) if (!Number.isFinite(r.expiresAt) || r.expiresAt <= this.now()) {
      await this.storage.delete(key);
      all.delete(key);
    }
    const rows = [...all.entries()].sort((a, b) => Number(a[1].events.some((e) => e.source === "server")) - Number(b[1].events.some((e) => e.source === "server")) || a[1].createdAt - b[1].createdAt);
    while (rows.length > MAX_TRACES) {
      const [key] = rows.shift();
      await this.storage.delete(key);
    }
    if (rows.length) {
      const at = Math.min(...rows.map(([, r]) => r.expiresAt)), old = await this.storage.getAlarm();
      if (!old || old <= this.now() || at < old) await this.storage.setAlarm(Math.max(this.now() + 1e3, at));
    }
    return rows.map(([, r]) => r);
  }
  async append(id, events, source = "server") {
    if (!validTraceId(id) || !Array.isArray(events) || events.length > 16) return;
    const safe = events.map((e) => sanitize(e, source)).filter(Boolean);
    if (!safe.length) return;
    const key = "payment-trace:" + id, now2 = this.now();
    let record = await this.storage.get(key);
    if (source === "browser" && (!record || record.expiresAt <= now2)) {
      const existing = await this.storage.list({ prefix: "payment-trace:", limit: MAX_TRACES + 1 });
      if ([...existing.values()].filter((r) => r.expiresAt > now2).length >= MAX_TRACES) return;
    }
    if (!record || record.expiresAt <= now2) record = { attemptId: id, serverRelease: "payment-auth-activation-20261105", createdAt: now2, expiresAt: now2 + TRACE_RETENTION_MS, events: [] };
    for (const event of safe) {
      if (source === "browser" && record.events.filter((e) => e.source === "browser").length >= 24) continue;
      if (source === "browser" && record.events.some((e) => e.source === "browser" && e.sequence === event.sequence && e.stage === event.stage)) continue;
      if (source === "server" && JSON.stringify({ ...record.events.at(-1), at: void 0 }) === JSON.stringify({ ...event, at: void 0 })) continue;
      record.events.push({ ...event, at: now2 });
    }
    record.events = record.events.slice(-MAX_EVENTS);
    await this.storage.put(key, record);
    await this.prune();
  }
  async list() {
    const rows = await this.storage.list({ prefix: "payment-trace:", limit: MAX_TRACES });
    return [...rows.values()].filter((r) => r.expiresAt > this.now()).sort((a, b) => b.createdAt - a.createdAt);
  }
};

// worker/src/checkout-contract.js
var CHECKOUT_RELEASE = "checkout-v1-20261027";
var CheckoutContractError = class extends Error {
  static {
    __name(this, "CheckoutContractError");
  }
  constructor(code, message, status = 409) {
    super(message);
    this.code = code;
    this.status = status;
  }
};
function checkoutRoute(request) {
  const url = new URL(request.url), originalPath = url.pathname;
  const match = url.pathname.match(/^\/api\/v([^/]+)\/(.*)$/);
  if (!match) return { request, originalPath, version: null };
  if (match[1] !== "1" || !["payments", "payments/status", "quote", "inventory", "checkout-capabilities", "payment-diagnostics"].includes(match[2])) throw new CheckoutContractError("CHECKOUT_CONTRACT_UNSUPPORTED", "\u8CFC\u5165\u753B\u9762\u306E\u66F4\u65B0\u304C\u5FC5\u8981\u3067\u3059\u3002\u518D\u6C7A\u6E08\u305B\u305A\u6700\u65B0\u306E\u753B\u9762\u3092\u958B\u3044\u3066\u304F\u3060\u3055\u3044\u3002", 426);
  url.pathname = "/api/" + match[2];
  return { request: new Request(url, request), originalPath, version: 1 };
}
__name(checkoutRoute, "checkoutRoute");
function productionCheckoutEnabled(env) {
  const value = env.PRODUCTION_CHECKOUT_ENABLED ?? "0";
  if (!["0", "1"].includes(value)) return false;
  return value === "1";
}
__name(productionCheckoutEnabled, "productionCheckoutEnabled");
function checkoutCapabilities(env, policy) {
  const enabled2 = policy.checkout && !policy.readOnly && (env.RUNTIME_TIER !== "production" || env.PRODUCTION_PURCHASE_PROTOCOL === "durable-v1");
  return { contractVersion: 1, supportedContracts: [1], release: CHECKOUT_RELEASE, checkoutEnabled: enabled2, maintenance: !enabled2, statusAvailable: true, legacyStableIdAlias: true };
}
__name(checkoutCapabilities, "checkoutCapabilities");

// worker/src/production-policy.js
var ProductionError = class extends Error {
  static {
    __name(this, "ProductionError");
  }
  constructor(code, message, status = 503) {
    super(message);
    this.code = code;
    this.status = status;
  }
};
var production = /* @__PURE__ */ __name((env) => env.RUNTIME_TIER === "production", "production");
var fail = /* @__PURE__ */ __name((code, message, status) => {
  throw new ProductionError(code, message, status);
}, "fail");
var flag = /* @__PURE__ */ __name((env, key) => {
  const v = env[key] ?? "0";
  if (!["0", "1"].includes(v)) fail("PRODUCTION_CONFIG_INVALID", "\u672C\u756A\u7BA1\u7406\u8A2D\u5B9A\u304C\u4E0D\u6B63\u3067\u3059\u3002");
  return v === "1";
}, "flag");
function productionIdentity(env) {
  if (!production(env) || env.SQUARE_ENVIRONMENT !== "production" || env.SQUARE_LOCATION_ID !== "LQ693S4H2NBZ8" || env.PRODUCTION_WORKER_NAME !== "yasoya-honten-payments" || env.LOCAL_TEST_MODE || env.LOCAL_SQUARE || env.LOCAL_RESEND || env.SQUARE_SANDBOX_ACCESS_TOKEN) fail("PRODUCTION_CONFIG_INVALID", "\u672C\u756A\u3068\u691C\u8A3C\u74B0\u5883\u306E\u5206\u96E2\u8A2D\u5B9A\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
}
__name(productionIdentity, "productionIdentity");
function productionPolicy(env) {
  productionIdentity(env);
  const grants = Object.fromEntries(["READ", "DRAFT", "IMAGES", "CATALOG", "INVENTORY"].map((k) => [k.toLowerCase(), flag(env, "PRODUCTION_MANAGEMENT_" + k + "_ENABLED")]));
  if (grants.read && env.MANAGEMENT_ENABLED !== "1") fail("PRODUCTION_CONFIG_INVALID", "\u672C\u756A\u7BA1\u7406\u306E\u6709\u52B9\u8A2D\u5B9A\u304C\u5FC5\u8981\u3067\u3059\u3002");
  if ((grants.draft || grants.images || grants.catalog || grants.inventory) && !grants.read) fail("PRODUCTION_CONFIG_INVALID", "\u7BA1\u7406\u95B2\u89A7\u6A29\u9650\u304C\u5FC5\u8981\u3067\u3059\u3002");
  if ((grants.catalog || grants.inventory) && env.PRODUCTION_MANAGEMENT_SCHEMA_READY !== "1") fail("PRODUCTION_CONFIG_INVALID", "\u672C\u756A\u7BA1\u7406\u30B9\u30AD\u30FC\u30DE\u306E\u6E96\u5099\u78BA\u8A8D\u304C\u5FC5\u8981\u3067\u3059\u3002");
  if (grants.catalog && env.PRODUCTION_CATALOG_CUTOVER_APPROVAL !== "verified-storefront-and-pricing-v1") fail("PRODUCTION_CONFIG_INVALID", "\u5546\u54C1\u516C\u958B\u3068\u8CFC\u5165\u6642\u4FA1\u683C\u306E\u5207\u66FF\u627F\u8A8D\u304C\u5FC5\u8981\u3067\u3059\u3002");
  if (grants.inventory && env.PRODUCTION_INVENTORY_WRITER_APPROVAL !== "shared-purchase-do-single-writer-v1") fail("PRODUCTION_CONFIG_INVALID", "\u8CFC\u5165DO\u3068\u5916\u90E8\u5728\u5EAB\u5909\u66F4\u7D4C\u8DEF\u306E\u6392\u4ED6\u627F\u8A8D\u304C\u5FC5\u8981\u3067\u3059\u3002");
  return grants;
}
__name(productionPolicy, "productionPolicy");
function productionGrant(env, key) {
  if (!production(env)) return;
  const p = productionPolicy(env);
  if (!p[key]) fail("PRODUCTION_MANAGEMENT_DENIED", "\u3053\u306E\u672C\u756A\u7BA1\u7406\u64CD\u4F5C\u306F\u7121\u52B9\u3067\u3059\u3002", 403);
}
__name(productionGrant, "productionGrant");
async function productionDatabase(env) {
  productionPolicy(env);
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(env.PRODUCTION_INSTANCE_ID || "") || env.PRODUCTION_DATABASE_ID !== "442fa9fd-25d3-4c01-bcc3-04be7b420cf5" || !env.ORDERS_DB || !env.PURCHASE_COORDINATOR) fail("PRODUCTION_CONFIG_INVALID", "\u672C\u756A\u5C02\u7528DB\u30FBDO\u306E\u8B58\u5225\u8A2D\u5B9A\u304C\u5FC5\u8981\u3067\u3059\u3002");
  const row = await env.ORDERS_DB.prepare("SELECT instance_id,database_id,location_id FROM production_environment WHERE id=1").first();
  if (row?.instance_id !== env.PRODUCTION_INSTANCE_ID || row?.database_id !== env.PRODUCTION_DATABASE_ID || row?.location_id !== env.SQUARE_LOCATION_ID) fail("PRODUCTION_MARKER_MISMATCH", "\u672C\u756ADB\u8B58\u5225\u30DE\u30FC\u30AB\u30FC\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002");
}
__name(productionDatabase, "productionDatabase");
function productionSquareRequest(env, target, method = "GET", scope = "purchase") {
  if (scope === "management") productionPolicy(env);
  else productionIdentity(env);
  const u = new URL(target);
  if (u.origin !== "https://connect.squareup.com" || u.username || u.password || u.hash) fail("PRODUCTION_DESTINATION_DENIED", "\u672C\u756ASquare\u4EE5\u5916\u3078\u306E\u63A5\u7D9A\u306F\u7981\u6B62\u3067\u3059\u3002");
  const read = method === "GET" && (/^\/v2\/catalog\/(list|object\/[A-Z0-9]+)$/.test(u.pathname) || u.pathname === "/v2/locations" || scope === "purchase" && /^\/v2\/payments(?:\/[A-Za-z0-9_-]+)?$/.test(u.pathname)) || method === "POST" && u.pathname === "/v2/inventory/counts/batch-retrieve";
  if (scope === "purchase" && method === "POST" && u.pathname === "/v2/payments" && !productionCheckoutEnabled(env)) fail("CHECKOUT_DISABLED", "\u65B0\u898F\u8CFC\u5165\u306F\u4E00\u6642\u505C\u6B62\u4E2D\u3067\u3059\u3002\u6CE8\u6587\u306E\u72B6\u614B\u78BA\u8A8D\u306F\u7D99\u7D9A\u3067\u304D\u307E\u3059\u3002", 503);
  if (scope === "management") {
    productionGrant(env, "read");
    if (read) return;
    if (method === "POST" && ["/v2/catalog/batch-upsert", "/v2/catalog/images"].includes(u.pathname)) return productionGrant(env, "catalog");
    if (method === "POST" && u.pathname === "/v2/inventory/changes/batch-create") return productionGrant(env, "inventory");
  } else if (read || method === "POST" && ["/v2/payments", "/v2/inventory/changes/batch-create"].includes(u.pathname)) return;
  fail("PRODUCTION_OPERATION_DENIED", "\u8A31\u53EF\u3055\u308C\u3066\u3044\u306A\u3044\u672C\u756ASquare\u64CD\u4F5C\u3067\u3059\u3002", 403);
}
__name(productionSquareRequest, "productionSquareRequest");
function adaptProductionPurchase(request, body, env) {
  productionIdentity(env);
  const supplied = body.attemptId ?? request.headers.get("Idempotency-Key");
  if (typeof supplied !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(supplied)) fail("PURCHASE_CLIENT_UPGRADE_REQUIRED", "\u6C7A\u6E08\u306F\u5B9F\u884C\u3057\u3066\u3044\u307E\u305B\u3093\u3002\u8CFC\u5165\u753B\u9762\u3092\u66F4\u65B0\u3057\u3066\u304F\u3060\u3055\u3044\u3002", 409);
  if (body.attemptId && request.headers.has("Idempotency-Key") && body.attemptId.toLowerCase() !== request.headers.get("Idempotency-Key").toLowerCase()) fail("PURCHASE_ID_CONFLICT", "\u6CE8\u6587\u756A\u53F7\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002", 409);
  if (env.PRODUCTION_PURCHASE_PROTOCOL !== "durable-v1") fail("PURCHASE_COMPATIBILITY_UNVERIFIED", "\u8CFC\u5165API\u306E\u4E92\u63DB\u6027\u78BA\u8A8D\u304C\u5B8C\u4E86\u3057\u3066\u3044\u307E\u305B\u3093\u3002", 503);
  return { ...body, attemptId: supplied.toLowerCase() };
}
__name(adaptProductionPurchase, "adaptProductionPurchase");
function adaptProductionPurchaseResponse(result, status, path = "/api/payments") {
  if (path !== "/api/payments") return { status, body: result };
  if (status >= 200 && status < 300 && !result?.ok) return { status: 409, body: { ...result, error: { code: "PURCHASE_PENDING", message: "\u51E6\u7406\u72B6\u6CC1\u3092\u78BA\u8A8D\u4E2D\u3067\u3059\u3002\u540C\u3058\u6CE8\u6587\u756A\u53F7\u3067\u7167\u4F1A\u3057\u3001\u518D\u6C7A\u6E08\u3057\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002" } } };
  return { status, body: result };
}
__name(adaptProductionPurchaseResponse, "adaptProductionPurchaseResponse");

// production/access.js
async function assertProductionAdmin(request, env, { fetcher = fetch, now: now2 = Date.now() } = {}) {
  const deny2 = /* @__PURE__ */ __name(() => {
    throw new ProductionError("PRODUCTION_ADMIN_DENIED", "\u7BA1\u7406\u8005\u8A8D\u8A3C\u304C\u5FC5\u8981\u3067\u3059\u3002", 401);
  }, "deny");
  try {
    const host = env.PRODUCTION_ADMIN_ORIGIN, team = env.PRODUCTION_ACCESS_TEAM_DOMAIN, aud = env.PRODUCTION_ACCESS_AUDIENCE, email = env.PRODUCTION_ADMIN_EMAIL;
    if (!/^https:\/\/[a-z0-9-]+\.awaiaune\.com$/.test(host || "") || ["https://validation.awaiaune.com", "https://yasoyahonten.awaiaune.com"].includes(host) || !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(team || "") || !/^[a-f0-9]{64}$/.test(aud || "") || !email) deny2();
    const origin = request.headers.get("Origin");
    if (origin && origin !== host) deny2();
    if (!["GET", "HEAD"].includes(request.method) && origin !== host) deny2();
    const token = request.headers.get("Cf-Access-Jwt-Assertion");
    if (!token || token.length > 16384) deny2();
    const parts = token.split(".");
    if (parts.length !== 3) deny2();
    const decode = /* @__PURE__ */ __name((s) => {
      if (!/^[A-Za-z0-9_-]+$/.test(s)) deny2();
      return Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - s.length % 4) % 4)), (c) => c.charCodeAt(0));
    }, "decode");
    const header = JSON.parse(new TextDecoder().decode(decode(parts[0]))), claims = JSON.parse(new TextDecoder().decode(decode(parts[1]))), seconds = Math.floor(now2 / 1e3), issuer = "https://" + team;
    if (header.alg !== "RS256" || typeof header.kid !== "string" || header.kid.length > 256 || claims.iss !== issuer || claims.email !== email || !(Array.isArray(claims.aud) ? claims.aud : [claims.aud]).includes(aud) || !Number.isFinite(claims.exp) || claims.exp <= seconds || !Number.isFinite(claims.iat) || claims.iat > seconds + 60 || claims.nbf !== void 0 && (!Number.isFinite(claims.nbf) || claims.nbf > seconds)) deny2();
    const response = await fetcher(issuer + "/cdn-cgi/access/certs", { redirect: "manual", signal: AbortSignal.timeout(5e3) });
    if (response.status !== 200) deny2();
    const raw = await response.text();
    if (raw.length > 65536) deny2();
    const keys = JSON.parse(raw).keys;
    if (!Array.isArray(keys) || keys.length > 10) deny2();
    const match = keys.filter((k) => k.kid === header.kid && k.kty === "RSA" && (!k.alg || k.alg === "RS256") && (!k.use || k.use === "sig"));
    if (match.length !== 1) deny2();
    const key = await crypto.subtle.importKey("jwk", match[0], { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    if (!await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, decode(parts[2]), new TextEncoder().encode(parts[0] + "." + parts[1]))) deny2();
  } catch {
    deny2();
  }
}
__name(assertProductionAdmin, "assertProductionAdmin");

// worker/src/external-policy.js
var ExternalPolicyError = class extends Error {
  static {
    __name(this, "ExternalPolicyError");
  }
  constructor(code, message) {
    super(message);
    this.status = 503;
    this.code = code;
  }
};
var deny = /* @__PURE__ */ __name((code, message) => {
  throw new ExternalPolicyError(code, message);
}, "deny");
function externalPolicy(env) {
  if (production(env)) {
    productionIdentity(env);
    return { readOnly: false, managementOnly: false, checkout: productionCheckoutEnabled(env), mail: true, cron: false, source: "square-production" };
  }
  const local = env.LOCAL_TEST_MODE === "1" && env.SQUARE_ENVIRONMENT === "sandbox";
  const invalid = /* @__PURE__ */ __name(() => deny("EXTERNAL_POLICY_INVALID", "\u5916\u90E8\u63A5\u7D9A\u306E\u5B89\u5168\u8A2D\u5B9A\u304C\u672A\u6307\u5B9A\u307E\u305F\u306F\u4E0D\u6B63\u3067\u3059\u3002"), "invalid");
  if (!["READ_ONLY", "READ_WRITE", "SANDBOX_MANAGEMENT"].includes(env.SQUARE_ACCESS_MODE)) return invalid();
  if (env.SQUARE_ENVIRONMENT !== "sandbox" || !local && !["sandbox-validation", "staging"].includes(env.RUNTIME_TIER)) return invalid();
  for (const k of ["VALIDATION_CHECKOUT_ENABLED", "VALIDATION_MAIL_ENABLED", "VALIDATION_CRON_ENABLED"]) if (!["0", "1"].includes(env[k])) return invalid();
  if (env.MANAGEMENT_ENABLED === "1" && (!["disabled", "single-writer"].includes(env.MANAGEMENT_STOCK_WRITES) || !["0", "1"].includes(env.MANAGEMENT_CHECKOUT_PAUSED))) return invalid();
  const readOnly = env.SQUARE_ACCESS_MODE === "READ_ONLY";
  const managementOnly = env.SQUARE_ACCESS_MODE === "SANDBOX_MANAGEMENT";
  if (managementOnly) {
    if (env.VALIDATION_MANAGEMENT_WRITE_APPROVAL !== "sandbox-management-single-writer-v1" || env.MANAGEMENT_ENABLED !== "1" || env.MANAGEMENT_STOCK_WRITES !== "single-writer" || env.MANAGEMENT_CHECKOUT_PAUSED !== "1") return invalid();
    if (["VALIDATION_CHECKOUT_ENABLED", "VALIDATION_MAIL_ENABLED", "VALIDATION_CRON_ENABLED"].some((k) => env[k] !== "0")) return invalid();
    if (!local && (env.SITE_URL !== "https://validation.awaiaune.com" || env.ALLOWED_ORIGINS !== env.SITE_URL)) return invalid();
  } else if (env.VALIDATION_MANAGEMENT_WRITE_APPROVAL !== void 0) return invalid();
  if (!readOnly && local && !env.LOCAL_SQUARE) return invalid();
  if (readOnly && (env.VALIDATION_CHECKOUT_ENABLED !== "0" || env.VALIDATION_MAIL_ENABLED !== "0" || env.MANAGEMENT_STOCK_WRITES === "single-writer")) return invalid();
  if (env.VALIDATION_CHECKOUT_ENABLED === "1" && env.MANAGEMENT_CHECKOUT_PAUSED === "1") return invalid();
  return { readOnly, managementOnly, checkout: env.VALIDATION_CHECKOUT_ENABLED === "1", mail: !readOnly && env.VALIDATION_MAIL_ENABLED === "1", cron: env.VALIDATION_CRON_ENABLED === "1", source: local ? "local-mock" : "square-sandbox" };
}
__name(externalPolicy, "externalPolicy");
function assertSquareWrite(env, kind = "catalog") {
  if (production(env)) return productionGrant(env, kind);
  if (externalPolicy(env).readOnly) deny("SQUARE_READ_ONLY", "\u8AAD\u307F\u53D6\u308A\u5C02\u7528\u306E\u305F\u3081Square\u3078\u306E\u66F8\u304D\u8FBC\u307F\u306F\u505C\u6B62\u4E2D\u3067\u3059\u3002");
}
__name(assertSquareWrite, "assertSquareWrite");
function assertCheckout(env) {
  const p = externalPolicy(env);
  if (p.readOnly || !p.checkout) deny("CHECKOUT_DISABLED", "\u65B0\u898F\u8CFC\u5165\u306F\u505C\u6B62\u4E2D\u3067\u3059\u3002");
}
__name(assertCheckout, "assertCheckout");
function assertMail(env) {
  const p = externalPolicy(env);
  if (p.source === "local-mock" && !env.LOCAL_RESEND) deny("LOCAL_MAIL_TRANSPORT_MISSING", "\u30ED\u30FC\u30AB\u30EB\u30E1\u30FC\u30EB\u4EE3\u66FF\u51E6\u7406\u304C\u672A\u8A2D\u5B9A\u3067\u3059\u3002");
  if (!p.mail) deny("MAIL_DISABLED", "\u691C\u8A3C\u30E1\u30FC\u30EB\u9001\u4FE1\u306F\u505C\u6B62\u4E2D\u3067\u3059\u3002");
}
__name(assertMail, "assertMail");
function assertSquareRequest(env, target, method = "GET") {
  if (production(env)) return productionSquareRequest(env, target, method);
  const p = externalPolicy(env), u = new URL(target);
  if (p.source === "local-mock" && !env.LOCAL_SQUARE) deny("LOCAL_SQUARE_TRANSPORT_MISSING", "\u30ED\u30FC\u30AB\u30EBSquare\u4EE3\u66FF\u51E6\u7406\u304C\u672A\u8A2D\u5B9A\u3067\u3059\u3002");
  if (u.origin !== "https://connect.squareupsandbox.com" || u.username || u.password) deny("SQUARE_DESTINATION_DENIED", "Sandbox\u4EE5\u5916\u306ESquare\u63A5\u7D9A\u306F\u7981\u6B62\u3067\u3059\u3002");
  const read = method === "GET" && (/^\/v2\/catalog\/(list|object\/[A-Z0-9]+)$/.test(u.pathname) || u.pathname === "/v2/locations" || /^\/v2\/payments(?:\/[A-Za-z0-9_-]+)?$/.test(u.pathname)) || method === "POST" && u.pathname === "/v2/inventory/counts/batch-retrieve";
  if (p.readOnly && !read) assertSquareWrite(env);
  if (p.managementOnly && !read && !(method === "POST" && ["/v2/catalog/batch-upsert", "/v2/catalog/images", "/v2/inventory/changes/batch-create"].includes(u.pathname))) deny("MANAGEMENT_WRITE_DENIED", "\u7BA1\u7406\u7528Catalog\u30FB\u753B\u50CF\u30FB\u5728\u5EAB\u4EE5\u5916\u3078\u306E\u66F8\u304D\u8FBC\u307F\u306F\u7981\u6B62\u3067\u3059\u3002");
}
__name(assertSquareRequest, "assertSquareRequest");

// worker/src/catalog.js
var CATALOG = Object.freeze({
  "lemonbalm-10g": Object.freeze({
    name: "\u4E7E\u71E5\u30EC\u30E2\u30F3\u30D0\u30FC\u30E0 10g",
    price: 980,
    active: true,
    maxQuantity: 10,
    squareVariationId: "RRTIT6N4QLIYPUW633WDBG36"
  }),
  "yomogi-10g": Object.freeze({
    name: "\u4E7E\u71E5\u30E8\u30E2\u30AE 10g",
    price: 980,
    active: true,
    maxQuantity: 10,
    squareVariationId: "F7X4UHYUAI7PSGURVQ4LEROY"
  }),
  "goldenrod-leaf-10g": Object.freeze({
    name: "\u4E7E\u71E5\u30BB\u30A4\u30BF\u30AB\u30A2\u30EF\u30C0\u30C1\u30BD\u30A6 \u8449 10g",
    price: 980,
    active: true,
    maxQuantity: 10,
    squareVariationId: "U4T4IF6YCH2K2CGSG7IPWV5J"
  }),
  "goldenrod-leaf-stem-20g": Object.freeze({
    name: "\u4E7E\u71E5\u30BB\u30A4\u30BF\u30AB\u30A2\u30EF\u30C0\u30C1\u30BD\u30A6 \u8449\u3068\u830E 20g",
    price: 980,
    active: true,
    maxQuantity: 10,
    squareVariationId: "CHYZVEADNVDMKAMR7XTYWJLP"
  })
});
var SHIPPING = Object.freeze({
  flatRate: 350,
  freeThreshold: 1500
});
function calculateShipping(subtotal) {
  return subtotal >= SHIPPING.freeThreshold ? 0 : SHIPPING.flatRate;
}
__name(calculateShipping, "calculateShipping");

// staging/safety.js
var StagingSetupError = class extends Error {
  static {
    __name(this, "StagingSetupError");
  }
  constructor(code) {
    super(code);
    this.code = code;
  }
};
function assertStaging(env) {
  const need2 = /* @__PURE__ */ __name((v, m) => {
    if (!v) throw new StagingSetupError("SETUP_" + m.toUpperCase().replace(/[^A-Z0-9]+/g, "_"));
  }, "need");
  need2(env.RUNTIME_TIER === "staging" && env.SQUARE_ENVIRONMENT === "sandbox", "Sandbox only");
  need2(env.STAGING_WORKER_NAME === "yasoya-v53-staging", "dedicated Worker");
  need2(env.SITE_URL === "https://staging.awaiaune.com" && env.ALLOWED_ORIGINS === env.SITE_URL, "dedicated origin");
  need2(/^[a-f0-9-]{36}$/.test(env.STAGING_DATABASE_ID || "") && env.STAGING_DATABASE_ID !== "442fa9fd-25d3-4c01-bcc3-04be7b420cf5", "dedicated D1");
  need2(/^[a-f0-9-]{36}$/.test(env.STAGING_INSTANCE_ID || "") && env.STAGING_INSTANCE_ID !== env.STAGING_DATABASE_ID, "instance marker");
  need2(env.SQUARE_LOCATION_ID && env.SQUARE_LOCATION_ID !== "LQ693S4H2NBZ8" && !env.SQUARE_LOCATION_ID.includes("REPLACE"), "Sandbox Location");
  need2(env.SQUARE_SANDBOX_APPLICATION_ID?.startsWith("sandbox-sq0idb-"), "Sandbox application");
  for (const name of ["SQUARE_ACCESS_TOKEN", "RESEND_API_KEY", "ADMIN_TOKEN", "PRODUCTION_MANAGEMENT_SQUARE_TOKEN", "LOCAL_SQUARE", "LOCAL_TEST_MODE"]) need2(!env[name], "production/local bindings forbidden");
  need2(env.SQUARE_SANDBOX_ACCESS_TOKEN && env.VALIDATION_ADMIN_TOKEN, "dedicated Sandbox and admin secrets");
  need2(env.ACCESS_TEAM_DOMAIN?.endsWith(".cloudflareaccess.com") && /^[a-f0-9]{64}$/.test(env.ACCESS_AUDIENCE || ""), "Access configuration");
  need2(/^[^\s@]+@[^\s@]+$/.test(env.STAGING_ADMIN_EMAIL || ""), "approved administrator");
  need2(env.VALIDATION_MAIL_ENABLED === "0" && env.VALIDATION_CRON_ENABLED === "0", "mail/cron off");
  need2(env.ORDERS_DB && env.PURCHASE_COORDINATOR, "staging bindings");
  return { workerOrigin: env.SITE_URL, notificationEmail: env.STAGING_ADMIN_EMAIL, accessTeamDomain: env.ACCESS_TEAM_DOMAIN, accessAudience: env.ACCESS_AUDIENCE, instanceId: env.STAGING_INSTANCE_ID };
}
__name(assertStaging, "assertStaging");
async function assertStagingDatabase(env) {
  const m = assertStaging(env);
  const row = await env.ORDERS_DB.prepare("SELECT instance_id,database_id FROM staging_environment WHERE id=1").first();
  if (row?.instance_id !== m.instanceId || row?.database_id !== env.STAGING_DATABASE_ID) throw new StagingSetupError("D1_MARKER_MISMATCH");
  return m;
}
__name(assertStagingDatabase, "assertStagingDatabase");

// validation/catalog.js
var SANDBOX_CATALOG = Object.freeze(Object.fromEntries([
  "lemonbalm-10g",
  "yomogi-10g",
  "goldenrod-leaf-10g"
].map((id) => [id, Object.freeze({
  ...CATALOG[id],
  name: id === "goldenrod-leaf-10g" ? "\u30BB\u30A4\u30BF\u30AB\u30A2\u30EF\u30C0\u30C1\u30BD\u30A6 \u8449 10g" : CATALOG[id].name
})])));

// validation/safety.js
var PRODUCTION = {
  worker: "yasoya-honten-payments",
  database: "442fa9fd-25d3-4c01-bcc3-04be7b420cf5",
  location: "LQ693S4H2NBZ8",
  app: "sq0idp-JYrGicMfKr-ILhZeLS9Xsw"
};
var WORKER = "yasoya-payments-validation";
var DATABASE = "yasoya-validation-orders";
var VALIDATION_HOST = "validation.awaiaune.com";
var VALIDATION_ORIGIN = `https://${VALIDATION_HOST}`;
function requireSafe(condition, message) {
  if (!condition) throw new Error(`Sandbox safety: ${message}`);
}
__name(requireSafe, "requireSafe");
function filled(value) {
  return typeof value === "string" && value.length > 0 && !/REPLACE|CHANGEME/i.test(value);
}
__name(filled, "filled");
function assertManifest(m) {
  const allowed = ["workerName", "accountId", "workerOrigin", "databaseName", "databaseId", "instanceId", "squareApplicationId", "squareLocationId", "variations", "notificationEmail", "resendFrom", "accessTeamDomain", "accessAudience"];
  requireSafe(Object.keys(m).every((key) => allowed.includes(key)), "unknown field (never put secrets in manifest)");
  requireSafe(m.workerName === WORKER && m.databaseName === DATABASE, "dedicated validation resource names required");
  requireSafe(/^[a-f0-9]{32}$/.test(m.accountId), "validation account ID required");
  requireSafe(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(m.databaseId) && m.databaseId !== PRODUCTION.database, "dedicated D1 ID required");
  requireSafe(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(m.instanceId) && m.instanceId !== m.databaseId, "unique instance marker required");
  const origin = new URL(m.workerOrigin);
  requireSafe(origin.origin === m.workerOrigin && origin.protocol === "https:" && !origin.username && !origin.password && (origin.origin === VALIDATION_ORIGIN || origin.hostname.startsWith(WORKER + ".") && origin.hostname.endsWith(".workers.dev")), "only the exact validation domain or dedicated workers.dev origin is allowed");
  requireSafe(filled(m.squareApplicationId) && m.squareApplicationId.startsWith("sandbox-sq0idb-"), "Sandbox Application ID required");
  requireSafe(filled(m.squareLocationId) && /^[A-Z0-9]{8,64}$/.test(m.squareLocationId) && m.squareLocationId !== PRODUCTION.location, "Sandbox Location ID required");
  requireSafe(m.variations && Object.keys(m.variations).sort().join() === Object.keys(SANDBOX_CATALOG).sort().join(), "exactly the three Sandbox product IDs must be mapped");
  const values = Object.values(m.variations);
  const forbidden = Object.values(CATALOG).map((p) => p.squareVariationId);
  requireSafe(new Set(values).size === values.length && values.every((v) => filled(v) && /^[A-Z0-9]{8,64}$/.test(v) && !forbidden.includes(v)), "distinct Sandbox Variation IDs required; production IDs forbidden");
  requireSafe(filled(m.accessTeamDomain) && /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.cloudflareaccess\.com$/.test(m.accessTeamDomain), "dedicated Access team domain required");
  requireSafe(filled(m.accessAudience) && /^[a-f0-9]{64}$/.test(m.accessAudience), "Access application audience required");
  requireSafe(filled(m.notificationEmail) && /^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(m.notificationEmail), "single test recipient required");
  requireSafe(filled(m.resendFrom) && /^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(m.resendFrom), "test sender required");
  return m;
}
__name(assertManifest, "assertManifest");
function environmentVars(m) {
  assertManifest(m);
  return {
    SQUARE_ACCESS_MODE: "READ_ONLY",
    VALIDATION_CHECKOUT_ENABLED: "0",
    VALIDATION_MAIL_ENABLED: "0",
    VALIDATION_CRON_ENABLED: "0",
    RUNTIME_TIER: "sandbox-validation",
    SQUARE_ENVIRONMENT: "sandbox",
    SQUARE_LOCATION_ID: m.squareLocationId,
    SQUARE_API_VERSION: "2026-07-15",
    SQUARE_VARIATION_IDS: JSON.stringify(m.variations),
    ALLOWED_ORIGINS: m.workerOrigin,
    SITE_URL: m.workerOrigin,
    RESEND_FROM_EMAIL: m.resendFrom,
    ORDER_NOTIFICATION_EMAIL: m.notificationEmail,
    REPLY_TO_EMAIL: m.notificationEmail,
    ACCESS_TEAM_DOMAIN: m.accessTeamDomain,
    ACCESS_AUDIENCE: m.accessAudience,
    VALIDATION_MANIFEST: JSON.stringify(m),
    VALIDATION_INSTANCE_ID: m.instanceId
  };
}
__name(environmentVars, "environmentVars");
function assertRuntime(env) {
  if (env.RUNTIME_TIER === "staging") return assertStaging(env);
  requireSafe(env.RUNTIME_TIER === "sandbox-validation" && env.SQUARE_ENVIRONMENT === "sandbox", "Sandbox runtime required");
  const m = assertManifest(JSON.parse(env.VALIDATION_MANIFEST || "{}"));
  const vars = environmentVars(m);
  for (const [key, value] of Object.entries(vars)) if (!["SQUARE_ACCESS_MODE", "VALIDATION_CHECKOUT_ENABLED", "VALIDATION_MAIL_ENABLED", "VALIDATION_CRON_ENABLED"].includes(key)) requireSafe(env[key] === value, `binding mismatch: ${key}`);
  const policy = externalPolicy(env);
  if (policy.managementOnly) {
    const links = JSON.parse(env.SQUARE_EXISTING_LINKS || "{}");
    requireSafe(Object.keys(links).sort().join() === Object.keys(m.variations).sort().join(), "existing Sandbox links required for management writes");
    for (const [id, ref] of Object.entries(links)) requireSafe(ref && Object.keys(ref).sort().join() === ["itemId", "sku", "variationId"].sort().join() && /^[A-Z0-9]{8,64}$/.test(ref.itemId) && ref.variationId === m.variations[id] && ref.sku === "yasoya-sandbox-v1:" + id, "existing management Item/Variation/SKU mismatch");
    requireSafe(new Set(Object.values(links).map((r) => r.itemId)).size === 3, "distinct existing Sandbox Items required");
  }
  requireSafe(!env.LOCAL_SQUARE && !env.LOCAL_RESEND && !env.LOCAL_TEST_MODE, "local fault doubles are forbidden in remote validation");
  requireSafe(env.ORDERS_DB && env.PURCHASE_COORDINATOR, "dedicated D1 and DO bindings required");
  requireSafe(!env.SQUARE_ACCESS_TOKEN && !env.RESEND_API_KEY && !env.ADMIN_TOKEN && !env.CLOUDFLARE_API_TOKEN && !env.CLOUDFLARE_API_KEY, "generic/production secret bindings forbidden");
  const requiredSecrets = ["SQUARE_SANDBOX_ACCESS_TOKEN", "VALIDATION_ADMIN_TOKEN"];
  if (externalPolicy(env).mail || env.RESEND_VALIDATION_API_KEY !== void 0) requiredSecrets.push("RESEND_VALIDATION_API_KEY");
  for (const key of requiredSecrets) {
    requireSafe(filled(env[key]) && !["fake-local-test-only", "local-test-not-a-secret", "local-development-only"].includes(env[key]), `separate secret required: ${key}`);
  }
  requireSafe(env.VALIDATION_ADMIN_TOKEN.length >= 32, "separate random validation admin token required");
  return m;
}
__name(assertRuntime, "assertRuntime");
async function assertDatabase(env) {
  if (env.RUNTIME_TIER === "staging") return assertStagingDatabase(env);
  const m = assertRuntime(env);
  const row = await env.ORDERS_DB.prepare("SELECT instance_id FROM validation_environment WHERE id=1").first();
  requireSafe(row?.instance_id === m.instanceId, "validation D1 marker missing or mismatched");
}
__name(assertDatabase, "assertDatabase");
function assertSquareDestination(env, target) {
  if (!["sandbox-validation", "staging"].includes(env.RUNTIME_TIER)) return;
  assertRuntime(env);
  const u = new URL(target);
  requireSafe(u.protocol === "https:" && u.hostname === "connect.squareupsandbox.com" && !u.port && !u.username && !u.password && u.pathname.startsWith("/v2/"), "production/unknown Square destination refused");
}
__name(assertSquareDestination, "assertSquareDestination");
function assertTestEmail(env, payload) {
  if (!["sandbox-validation", "staging"].includes(env.RUNTIME_TIER)) return;
  const m = assertRuntime(env);
  requireSafe(payload.from === m.resendFrom && Array.isArray(payload.to) && payload.to.length === 1 && payload.to[0] === m.notificationEmail && !payload.cc && !payload.bcc && (!payload.reply_to || payload.reply_to === m.notificationEmail), "email must target only the approved test recipient");
}
__name(assertTestEmail, "assertTestEmail");

// worker/src/management/domain.js
var ManagementError = class extends Error {
  static {
    __name(this, "ManagementError");
  }
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
function need(ok, message, status = 400) {
  if (!ok) throw new ManagementError(status, message);
}
__name(need, "need");
function enabled(env) {
  return env.MANAGEMENT_ENABLED === "1";
}
__name(enabled, "enabled");
async function guard(env) {
  externalPolicy(env);
  need(enabled(env), "\u5546\u54C1\u7BA1\u7406\u306F\u7121\u52B9\u3067\u3059\u3002", 404);
  if (production(env)) {
    productionGrant(env, "read");
    await productionDatabase(env);
    return;
  }
  need(env.SQUARE_ENVIRONMENT === "sandbox", "\u5546\u54C1\u7BA1\u7406\u306FSandbox\u5C02\u7528\u3067\u3059\u3002", 503);
  if (["sandbox-validation", "staging"].includes(env.RUNTIME_TIER)) await assertDatabase(env);
  else need(env.LOCAL_TEST_MODE === "1" && env.LOCAL_SQUARE, "\u5916\u90E8\u63A5\u7D9A\u3092\u8A31\u53EF\u3057\u306A\u3044\u30ED\u30FC\u30AB\u30EB\u69CB\u6210\u304C\u5FC5\u8981\u3067\u3059\u3002", 503);
  need(env.ORDERS_DB, "\u7BA1\u7406DB\u304C\u672A\u8A2D\u5B9A\u3067\u3059\u3002", 503);
}
__name(guard, "guard");
function text(value, max, required = true) {
  need(typeof value === "string" && value.length <= max && (!required || value.trim()), "\u5165\u529B\u6587\u5B57\u6570\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
  return value.trim();
}
__name(text, "text");
function integer(value, min, max) {
  need(Number.isSafeInteger(value) && value >= min && value <= max, "\u6570\u5024\u306E\u7BC4\u56F2\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
  return value;
}
__name(integer, "integer");
function identifier(v) {
  need(typeof v === "string" && /^[a-z0-9][a-z0-9-]{0,79}$/.test(v), "\u8B58\u5225\u5B50\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002");
  return v;
}
__name(identifier, "identifier");
function operation(v) {
  need(typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(v), "\u64CD\u4F5CID\u304C\u5FC5\u8981\u3067\u3059\u3002");
  return v;
}
__name(operation, "operation");
function squareId(v, env) {
  need(typeof v === "string" && /^[A-Z0-9]{8,64}$/.test(v) && (production(env || {}) || !Object.values(CATALOG).some((p) => p.squareVariationId === v)), "Sandbox\u5C02\u7528\u306ESquare ID\u304C\u5FC5\u8981\u3067\u3059\u3002");
  return v;
}
__name(squareId, "squareId");
async function digest(value) {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value))))].map((v) => v.toString(16).padStart(2, "0")).join("");
}
__name(digest, "digest");
function draft(input) {
  need(input && Array.isArray(input.variants) && input.variants.length > 0 && input.variants.length <= 20, "1\u301C20\u4EF6\u306E\u30D0\u30EA\u30A8\u30FC\u30B7\u30E7\u30F3\u304C\u5FC5\u8981\u3067\u3059\u3002");
  const variants = input.variants.map((v) => ({ id: identifier(v.id), name: text(v.name, 120), price: integer(v.price, 1, 1e7), amount: text(v.amount || "", 120, false), maxQuantity: integer(v.maxQuantity ?? 10, 1, 10), active: v.active !== false }));
  need(new Set(variants.map((v) => v.id)).size === variants.length, "\u30D0\u30EA\u30A8\u30FC\u30B7\u30E7\u30F3ID\u304C\u91CD\u8907\u3057\u3066\u3044\u307E\u3059\u3002");
  const images = input.images || [];
  need(Array.isArray(images) && images.length <= 10 && images.every((i) => /^[a-f0-9]{64}$/.test(i)) && new Set(images).size === images.length, "\u753B\u50CF\u306E\u6307\u5B9A\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002");
  const featuredImageId = input.featuredImageId ?? null;
  need(featuredImageId === null || typeof featuredImageId === "string" && images.includes(featuredImageId), "\u690D\u7269\u306E\u4EE3\u8868\u5199\u771F\u306F\u5546\u54C1\u5199\u771F\u306E\u4E2D\u304B\u3089\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
  return { name: text(input.name, 120), description: text(input.description || "", 8e3, false), variants, images, ...featuredImageId ? { featuredImageId } : {}, alt: text(input.alt || input.name, 200), sortOrder: integer(input.sortOrder ?? 0, 0, 1e5) };
}
__name(draft, "draft");
var now = /* @__PURE__ */ __name(() => (/* @__PURE__ */ new Date()).toISOString(), "now");
var json = /* @__PURE__ */ __name((value) => JSON.stringify(value), "json");

// production/existing-products.json
var existing_products_default = {
  source: "Production Catalog GET 2026-10-30T22:10:31Z; reverify read-only before import",
  locationId: "LQ693S4H2NBZ8",
  products: [
    {
      id: "lemonbalm",
      slug: "lemonbalm",
      variantId: "lemonbalm-10g",
      itemId: "UZOOEE2GWR6QQIYNZESTIIKN",
      variationId: "RRTIT6N4QLIYPUW633WDBG36",
      sku: "315102D",
      name: "\u4E7E\u71E5\u30EC\u30E2\u30F3\u30D0\u30FC\u30E0\u300010g",
      variationName: "\u901A\u5E38",
      price: 980,
      currency: "JPY",
      retired: false,
      amount: "10g"
    },
    {
      id: "yomogi",
      slug: "yomogi",
      variantId: "yomogi-10g",
      itemId: "ZHPJRFPKMNHDXJ4WFKWXESDE",
      variationId: "F7X4UHYUAI7PSGURVQ4LEROY",
      sku: "827330F",
      name: "\u4E7E\u71E5\u30E8\u30E2\u30AE\u300010g",
      variationName: "\u901A\u5E38",
      price: 980,
      currency: "JPY",
      retired: false,
      amount: "10g"
    },
    {
      id: "goldenrod-leaf",
      slug: "goldenrod-leaf",
      variantId: "goldenrod-leaf-10g",
      itemId: "VFBUEWXR77OYU44XN3KBI6AO",
      variationId: "U4T4IF6YCH2K2CGSG7IPWV5J",
      sku: "F838089",
      name: "\u4E7E\u71E5\u30BB\u30A4\u30BF\u30AB\u30A2\u30EF\u30C0\u30C1\u30BD\u30A6\u300010g",
      variationName: "\u901A\u5E38",
      price: 980,
      currency: "JPY",
      retired: true,
      amount: "10g"
    },
    {
      id: "goldenrod-leaf-stem",
      slug: "goldenrod-leaf-stem",
      variantId: "goldenrod-leaf-stem-20g",
      itemId: "JWLMZFTF3KBBREWDGXIOTTK7",
      variationId: "CHYZVEADNVDMKAMR7XTYWJLP",
      sku: "G932452",
      name: "\u4E7E\u71E5\u30BB\u30A4\u30BF\u30AB\u30A2\u30EF\u30C0\u30C1\u30BD\u30A6\uFF08\u8449\u3001\u830E\uFF09\u300020g",
      variationName: "\u901A\u5E38",
      price: 980,
      currency: "JPY",
      retired: true,
      amount: "20g"
    }
  ]
};

// worker/src/management/existing-production.js
var existingProductionProduct = /* @__PURE__ */ __name((id) => existing_products_default.products.find((p) => p.variantId === id), "existingProductionProduct");

// worker/src/management/integrated-policy.js
var integratedPublication = /* @__PURE__ */ __name((env) => env.RUNTIME_TIER === "staging" || production(env) && env.PRODUCTION_UNIFIED_PUBLISH_ENABLED === "1" && env.PRODUCTION_STOREFRONT_PUBLISH_ENABLED === "1", "integratedPublication");
function integratedGrant(env) {
  if (production(env)) productionGrant(env, "catalog");
}
__name(integratedGrant, "integratedGrant");

// worker/src/management/storefront-selection.js
var selectionEnabled = /* @__PURE__ */ __name((env) => env.RUNTIME_TIER === "staging" || production(env) && env.STOREFRONT_FEATURED_ENABLED === "1", "selectionEnabled");
var retirementEnabled = /* @__PURE__ */ __name((env) => env.RUNTIME_TIER === "staging" || env.STOREFRONT_RETIRE_GOLDENROD === "1", "retirementEnabled");
var retiredIds = /* @__PURE__ */ new Set(["goldenrod", "goldenrod-leaf", "goldenrod-leaf-stem", "goldenrod-leaf-10g", "goldenrod-leaf-stem-20g"]);
function retiredProduct(env, p) {
  if (!retirementEnabled(env)) return false;
  const data = p.draft || p;
  const name = String(data.name || "").normalize("NFKC").replace(/\s/g, "").toLowerCase();
  return retiredIds.has(p.id) || retiredIds.has(p.slug) || (data.variants || []).some((v) => retiredIds.has(v.id)) || name.includes("\u30BB\u30A4\u30BF\u30AB\u30A2\u30EF\u30C0\u30C1\u30BD\u30A6") || name.includes("goldenrod");
}
__name(retiredProduct, "retiredProduct");
var eligibleProduct = /* @__PURE__ */ __name((p) => p.status === "published" && p.variants.some((v) => v.active !== false), "eligibleProduct");
async function featuredSettings(store) {
  const row = await store.one("SELECT id,detail_json FROM mg_audit WHERE resource_id='storefront' AND action='home_featured_saved' ORDER BY rowid DESC LIMIT 1");
  return { version: row?.id || null, productIds: row ? JSON.parse(row.detail_json).productIds : [] };
}
__name(featuredSettings, "featuredSettings");
async function featuredProducts(store) {
  const settings = await featuredSettings(store), products = await store.publicProducts();
  return settings.productIds.slice(0, 3).map((id) => products.find((p) => p.id === id && eligibleProduct(p))).filter(Boolean);
}
__name(featuredProducts, "featuredProducts");
async function featuredAdmin(manager, method, input, actor) {
  need(selectionEnabled(manager.env), "\u30C8\u30C3\u30D7\u30DA\u30FC\u30B8\u306E\u63B2\u8F09\u8A2D\u5B9A\u306F\u7121\u52B9\u3067\u3059\u3002", 403);
  if (production(manager.env)) productionGrant(manager.env, method === "GET" ? "read" : "draft");
  const settings = await featuredSettings(manager.s), candidates = (await manager.s.publicProducts()).filter(eligibleProduct);
  if (method === "GET") return { ...settings, selectedProductIds: settings.productIds.filter((id) => candidates.some((p) => p.id === id)), candidates: candidates.map((p) => ({ id: p.id, name: p.name, slug: p.slug })) };
  need(method === "POST", "Method not allowed", 405);
  operation(input.operationId);
  need(Array.isArray(input.productIds) && input.productIds.length <= 3 && input.productIds.every((id) => typeof id === "string") && new Set(input.productIds).size === input.productIds.length, "\u91CD\u8907\u306A\u3057\u3067\u6700\u59273\u5546\u54C1\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
  const fp = await digest(["home-featured", input.expectedVersion, input.productIds]), previous = await manager.command(input.operationId, fp);
  if (previous) return previous;
  need(input.expectedVersion === settings.version, "\u5225\u306E\u753B\u9762\u3067\u63B2\u8F09\u8A2D\u5B9A\u304C\u66F4\u65B0\u3055\u308C\u307E\u3057\u305F\u3002\u518D\u8AAD\u307F\u8FBC\u307F\u3057\u3066\u304F\u3060\u3055\u3044\u3002", 409);
  need(input.productIds.every((id) => candidates.some((p) => p.id === id)), "\u516C\u958B\u6E08\u307F\u30FB\u8CA9\u58F2\u4E2D\u306E\u5546\u54C1\u3060\u3051\u3092\u63B2\u8F09\u3067\u304D\u307E\u3059\u3002\u8A2D\u5B9A\u3092\u8AAD\u307F\u76F4\u3057\u3066\u304F\u3060\u3055\u3044\u3002", 409);
  const audit = manager.s.audit(actor, "home_featured_saved", "storefront", { productIds: input.productIds });
  const result = { ok: true, version: audit[1][0], productIds: input.productIds };
  await manager.s.batch([audit, ["INSERT INTO mg_commands VALUES(?,?,?)", [input.operationId, fp, json(result)]]]);
  return result;
}
__name(featuredAdmin, "featuredAdmin");
async function removeFeaturedStatements(store, id, actor) {
  if (!selectionEnabled(store.env)) return [];
  const settings = await featuredSettings(store);
  return settings.productIds.includes(id) ? [store.audit(actor, "home_featured_saved", "storefront", { productIds: settings.productIds.filter((n) => n !== id), reason: "product-unavailable" })] : [];
}
__name(removeFeaturedStatements, "removeFeaturedStatements");

// worker/src/management/catalog-proof.js
async function catalogProof(manager, job) {
  need(integratedPublication(manager.env), "\u7D71\u5408\u516C\u958B\u306F\u7121\u52B9\u3067\u3059\u3002", 403);
  const checks = [], versionInfo = [];
  let mappings = [];
  const check = /* @__PURE__ */ __name((label, ok) => {
    checks.push({ label, ok: Boolean(ok) });
  }, "check");
  try {
    need(["publish", "state"].includes(job.kind) && job.body_json, "\u4FDD\u5B58\u6E08\u307F\u5546\u54C1\u30EA\u30AF\u30A8\u30B9\u30C8\u304C\u3042\u308A\u307E\u305B\u3093\u3002", 409);
    const body = JSON.parse(job.body_json), payload = JSON.parse(job.payload_json), sent = body.batches?.[0]?.objects?.[0];
    need(body.idempotency_key === job.id && body.batches.length === 1 && body.batches[0].objects.length === 1 && sent?.type === "ITEM", "\u4FDD\u5B58\u6E08\u307F\u30EA\u30AF\u30A8\u30B9\u30C8\u306E\u8A3C\u8DE1\u304C\u4E0D\u5B8C\u5168\u3067\u3059\u3002", 409);
    const known2 = job.result_json ? JSON.parse(job.result_json).mappings : payload.maps;
    const item = known2?.length ? await manager.square.object(known2[0].item_id) : sent.id.startsWith("#") ? await manager.square.findCreatedItem(body) : await manager.square.object(sent.id);
    check("Item\u7A2E\u5225", item?.type === "ITEM");
    check("\u524A\u9664\u72B6\u614B", !item?.is_deleted && (item?.item_data?.variations || []).every((v) => !v.is_deleted));
    check("\u5546\u54C1ID", sent.id.startsWith("#") || item?.id === sent.id);
    check("\u5546\u54C1\u540D", item?.item_data?.name === sent.item_data.name);
    check("\u8AAC\u660E", (item?.item_data?.description || "") === (sent.item_data.description || ""));
    check("\u753B\u50CF", JSON.stringify(item?.item_data?.image_ids || []) === JSON.stringify(sent.item_data.image_ids || []));
    versionInfo.push({ type: "Item", stored: known2?.[0]?.item_version ?? null, requested: sent.version ?? null, current: item?.version ?? null });
    for (const desired of sent.item_data.variations || []) {
      const candidates = (item?.item_data?.variations || []).filter((v) => v.item_variation_data?.sku === desired.item_variation_data?.sku);
      check("SKU\u306E\u4E00\u610F\u6027", candidates.length === 1);
      const current = candidates.length === 1 ? candidates[0] : null;
      check("Variation ID\u30FB\u89AA\u5B50\u95A2\u4FC2", Boolean(current) && current.item_variation_data.item_id === item.id && (desired.id.startsWith("#") || current.id === desired.id));
      check("Variation\u540D\u30FB\u4FA1\u683C\u30FB\u5728\u5EAB\u8FFD\u8DE1", Boolean(current) && current.item_variation_data.name === desired.item_variation_data.name && current.item_variation_data.price_money?.currency === desired.item_variation_data.price_money?.currency && Number(current.item_variation_data.price_money?.amount) === Number(desired.item_variation_data.price_money?.amount) && current.item_variation_data.track_inventory === desired.item_variation_data.track_inventory);
      const old = known2?.find((m) => m.variation_id === current?.id);
      versionInfo.push({ type: "Variation", stored: old?.variation_version ?? null, requested: desired.version ?? null, current: current?.version ?? null });
    }
    check("\u30D0\u30FC\u30B8\u30E7\u30F3\u306E\u6709\u52B9\u6027", versionInfo.every((v) => Number.isSafeInteger(v.current) && v.current > 0 && (v.requested === null || Number.isSafeInteger(v.requested) && v.current >= v.requested)));
    const alignedRelease = payload.releaseSite === true && job.kind === "publish";
    check(alignedRelease ? "\u516C\u958B\u8981\u6C42\u30D0\u30FC\u30B8\u30E7\u30F3\u3068\u306E\u6574\u5408" : "\u9001\u4FE1\u5F8C\u306E\u30D0\u30FC\u30B8\u30E7\u30F3\u66F4\u65B0", versionInfo.every((v) => v.requested === null || v.current > v.requested || alignedRelease && v.current === v.requested));
    try {
      mappings = manager.square.verifyCatalog(item, payload.data, sent.item_data.image_ids, payload.targetStatus, sent.item_data.variations);
      check("\u5546\u54C1\u5185\u5BB9\u30FBLocation\u30FB\u8CA9\u58F2\u72B6\u614B", true);
      check("\u65E2\u5B58ID\u306E\u7DAD\u6301", (known2 || []).every((old) => mappings.some((m) => m.variation_id === old.variation_id && m.item_id === old.item_id)));
    } catch {
      check("\u5546\u54C1\u5185\u5BB9\u30FBLocation\u30FB\u8CA9\u58F2\u72B6\u614B", false);
    }
    const present = /* @__PURE__ */ __name((o) => Boolean((o?.present_at_all_locations || o?.present_at_location_ids?.includes(manager.env.SQUARE_LOCATION_ID)) && !o?.absent_at_location_ids?.includes(manager.env.SQUARE_LOCATION_ID)), "present");
    const adoptionMappings = [];
    const adoptionAvailable = !production(manager.env) && job.kind === "publish" && job.state === "review" && known2?.length === sent.item_data.variations.length && item?.item_data?.variations?.length === sent.item_data.variations.length && !sent.id.startsWith("#") && item?.id === sent.id && !item.is_deleted && !item.item_data.is_archived && present(item) && Number.isSafeInteger(sent.version) && Number.isSafeInteger(item.version) && item.version > sent.version && sent.item_data.variations.every((desired) => {
      const current = item.item_data.variations.find((v) => v.id === desired.id), d = current?.item_variation_data, old = known2.find((m) => m.variation_id === desired.id && m.item_id === item.id);
      const safe = old && !desired.id.startsWith("#") && d?.item_id === item.id && d.sku === desired.item_variation_data.sku && d.track_inventory === true && d.price_money?.currency === "JPY" && Number.isSafeInteger(Number(d.price_money.amount)) && Number(d.price_money.amount) > 0 && !current.is_deleted && d.sellable !== false && present(current) && Number.isSafeInteger(desired.version) && Number.isSafeInteger(current.version) && current.version > desired.version;
      if (safe) adoptionMappings.push({ ...old, item_version: item.version, variation_version: current.version });
      return Boolean(safe);
    });
    const matched = checks.length > 0 && checks.every((c) => c.ok);
    return { state: matched ? "matched" : "mismatch", checks, versionInfo, message: matched ? "\u4FDD\u5B58\u6E08\u307F\u30EA\u30AF\u30A8\u30B9\u30C8\u3068\u73FE\u5728\u306E\u5546\u54C1\u72B6\u614B\u304C\u4E00\u81F4\u3057\u3066\u3044\u307E\u3059\u3002\u518D\u9001\u305B\u305A\u7167\u5408\u5B8C\u4E86\u3092\u8A18\u9332\u3067\u304D\u307E\u3059\u3002" : "\u4FDD\u5B58\u6E08\u307F\u30EA\u30AF\u30A8\u30B9\u30C8\u3068\u73FE\u5728\u5024\u306B\u4E0D\u4E00\u81F4\u304C\u3042\u308A\u307E\u3059\u3002\u5B8C\u4E86\u6271\u3044\u30FB\u30ED\u30C3\u30AF\u89E3\u9664\u30FB\u518D\u9001\u306F\u884C\u3044\u307E\u305B\u3093\u3002", mappings: matched ? mappings : [], adoption: { available: Boolean(adoptionAvailable), reason: adoptionAvailable ? "\u5143\u306E\u66F4\u65B0\u5BFE\u8C61\u3059\u3079\u3066\u306E\u30D0\u30FC\u30B8\u30E7\u30F3\u304C\u9032\u3093\u3067\u304A\u308A\u3001\u65E7\u30EA\u30AF\u30A8\u30B9\u30C8\u306F\u518D\u9069\u7528\u3067\u304D\u307E\u305B\u3093\u3002\u73FE\u5728\u5024\u3092\u63A1\u7528\u3057\u3066\u65E7\u540C\u671F\u3092\u53D6\u6D88\u3067\u304D\u307E\u3059\u3002" : "\u672A\u78BA\u5B9A\u51E6\u7406\u306E\u5B89\u5168\u306A\u53D6\u6D88\u6761\u4EF6\u3092\u6E80\u305F\u3057\u3066\u3044\u307E\u305B\u3093\u3002\u30ED\u30C3\u30AF\u3092\u4FDD\u6301\u3057\u307E\u3059\u3002" }, adoptionMappings: adoptionAvailable ? adoptionMappings : [] };
  } catch (error) {
    return { state: "unavailable", checks, versionInfo, message: error.status ? error.message : "\u8AAD\u307F\u53D6\u308A\u7167\u5408\u3092\u5B8C\u4E86\u3067\u304D\u307E\u305B\u3093\u3002\u30ED\u30C3\u30AF\u3092\u4FDD\u6301\u3057\u3066\u3044\u307E\u3059\u3002", mappings: [], httpStatus: error.upstreamStatus || null, squareCode: error.squareCode || null };
  }
}
__name(catalogProof, "catalogProof");

// worker/src/management/release.js
function releaseStatements(manager, job, payload) {
  if (!integratedPublication(manager.env) || !payload.releaseSite) return [];
  return [
    ["UPDATE mg_products SET published_revision=?,status=CASE WHEN status IN ('stopped','archived') AND version>? THEN status ELSE 'published' END,sort_order=?,version=version+1,updated_at=? WHERE id=?", [payload.revision, payload.expectedVersion, payload.data.sortOrder, now(), job.resource_id]],
    manager.s.audit("authenticated-admin", "release_published", job.resource_id, { job: job.id, revision: payload.revision })
  ];
}
__name(releaseStatements, "releaseStatements");
async function release(manager, id, input, actor) {
  need(integratedPublication(manager.env), "\u7D71\u5408\u516C\u958B\u306F\u7121\u52B9\u3067\u3059\u3002", 403);
  integratedGrant(manager.env);
  operation(input.operationId);
  const product = await manager.s.product(id);
  need(product, "\u5546\u54C1\u304C\u3042\u308A\u307E\u305B\u3093\u3002", 404);
  need(!retiredProduct(manager.env, product) && !(await manager.s.retiredProductIds()).has(id), "\u3053\u306E\u5546\u54C1\u306F\u8CA9\u58F2\u7D42\u4E86\u3067\u3059\u3002Square ID\u30FB\u5C65\u6B74\u3092\u7DAD\u6301\u3057\u3001\u518D\u516C\u958B\u3057\u307E\u305B\u3093\u3002", 409);
  const existing = await manager.s.one("SELECT * FROM mg_jobs WHERE id=?", [input.operationId]);
  if (existing) {
    need(existing.kind === "publish" && existing.resource_id === id && JSON.parse(existing.payload_json).releaseSite && JSON.parse(existing.payload_json).expectedVersion === input.expectedVersion, "\u64CD\u4F5CID\u304C\u5225\u306E\u51E6\u7406\u306B\u4F7F\u308F\u308C\u3066\u3044\u307E\u3059\u3002", 409);
    return resumeRelease(manager, existing);
  }
  const p = await manager.s.product(id);
  need(p, "\u5546\u54C1\u304C\u3042\u308A\u307E\u305B\u3093\u3002", 404);
  const locks = await manager.s.locked(p.draft.variants.map((v) => v.id));
  if (locks.length) {
    const ids = [...new Set(locks.map((l) => l.job_id))];
    need(ids.length === 1, "\u8907\u6570\u306E\u4FDD\u7559\u51E6\u7406\u304C\u3042\u308A\u307E\u3059\u3002\u8A73\u7D30\u3067\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002", 409);
    const job = await manager.s.one("SELECT * FROM mg_jobs WHERE id=?", [ids[0]]);
    need(job?.kind === "publish" && JSON.parse(job.payload_json).releaseSite, "\u65E2\u5B58\u306E\u540C\u671F\u30FB\u5728\u5EAB\u51E6\u7406\u304C\u4FDD\u7559\u4E2D\u3067\u3059\u3002\u5148\u306B\u540C\u3058\u51E6\u7406\u3092\u78BA\u8A8D\u30FB\u518D\u958B\u3057\u3066\u304F\u3060\u3055\u3044\u3002", 409);
    return resumeRelease(manager, job);
  }
  const previous = await manager.s.one("SELECT * FROM mg_jobs WHERE resource_id=? AND kind='publish' AND state='done' ORDER BY rowid DESC LIMIT 1", [id]);
  if (previous && JSON.parse(previous.payload_json).releaseSite && JSON.parse(previous.payload_json).revision === p.published_revision && p.published_revision === p.draft_revision && p.status === "published") {
    const proof = await catalogProof(manager, previous);
    need(proof.state !== "unavailable", "Square\u73FE\u5728\u5024\u3092\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093\u3002\u516C\u958B\u5B8C\u4E86\u3068\u5224\u65AD\u305B\u305A\u3001\u540C\u3058\u64CD\u4F5C\u3092\u518D\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002", 503);
    if (proof.state === "matched") return manager.job(previous.id);
  }
  return manager.publish(id, { ...input, releaseSite: true }, actor);
}
__name(release, "release");
async function resumeRelease(manager, job) {
  if (job.state === "done" || job.state === "cancelled") return manager.job(job.id);
  const proof = job.body_json ? await catalogProof(manager, job) : null;
  if (proof?.state === "matched") return manager.reconcile(job.id);
  if (job.state === "review" && !job.body_json && Date.now() - Date.parse(job.created_at) < 36e5 && job.attempts < 8) {
    await manager.s.run("UPDATE mg_jobs SET state='retry' WHERE id=?", [job.id]);
    job.state = "retry";
  }
  if (job.state !== "review") {
    await manager.run(job.id);
    await manager.schedule();
  }
  return manager.job(job.id);
}
__name(resumeRelease, "resumeRelease");
async function prepareReleaseMappings(manager, maps) {
  if (!maps.length) return maps;
  need(new Set(maps.map((m) => m.item_id)).size === 1, "\u8907\u6570\u306ESquare Item\u304C\u6DF7\u5728\u3057\u3066\u3044\u307E\u3059\u3002\u81EA\u52D5\u5909\u66F4\u305B\u305A\u505C\u6B62\u3057\u307E\u3057\u305F\u3002", 409);
  const item = await manager.square.object(maps[0].item_id);
  need(item?.type === "ITEM" && !item.is_deleted && item.item_data.variations.every((v) => maps.some((m) => m.variation_id === v.id)), "\u672A\u7BA1\u7406\u307E\u305F\u306F\u524A\u9664\u3055\u308C\u305FVariation\u304C\u3042\u308A\u307E\u3059\u3002\u81EA\u52D5\u524A\u9664\u305B\u305A\u505C\u6B62\u3057\u307E\u3057\u305F\u3002", 409);
  const result = [];
  for (const m of maps) {
    const v = item.item_data.variations.find((v2) => v2.id === m.variation_id);
    need(v?.item_variation_data?.sku === m.sku && !v.is_deleted && Number.isSafeInteger(item.version) && Number.isSafeInteger(v.version) && item.version >= m.item_version && v.version >= m.variation_version, "\u65E2\u5B58ID\u30FBSKU\u30FB\u30D0\u30FC\u30B8\u30E7\u30F3\u3092\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093\u3002\u65B0\u898F\u4F5C\u6210\u305B\u305A\u505C\u6B62\u3057\u307E\u3057\u305F\u3002", 409);
    const completed = await manager.s.one("SELECT j.* FROM mg_jobs j JOIN mg_variants known ON known.product_id=j.resource_id WHERE known.id=? AND j.kind='publish' AND j.state='done' ORDER BY j.rowid DESC LIMIT 1", [m.variant_id]);
    if (completed?.body_json) {
      const saved = JSON.parse(completed.body_json), data = JSON.parse(completed.payload_json).data, index = data.variants.findIndex((v2) => v2.id === m.variant_id);
      need(saved.batches[0].objects[0].item_data.variations[index]?.item_variation_data?.sku === m.sku, "\u65E2\u5B58SKU\u304C\u5909\u66F4\u3055\u308C\u3066\u3044\u307E\u3059\u3002\u81EA\u52D5\u63A1\u7528\u305B\u305A\u505C\u6B62\u3057\u307E\u3057\u305F\u3002", 409);
    }
    await manager.square.assertUniqueSku(v.id, m.sku);
    result.push({ ...m, item_version: item.version, variation_version: v.version, item_image_ids: item.item_data.image_ids || [] });
  }
  return result;
}
__name(prepareReleaseMappings, "prepareReleaseMappings");

// worker/src/management/sales-catalog-check.js
function salesCatalogCheck(env, mapping, object, variant) {
  const d = object?.item_variation_data;
  const values = { price: { saved: variant.unitPrice, current: d?.price_money?.amount ?? null }, currency: { saved: "JPY", current: d?.price_money?.currency ?? null }, name: { saved: variant.name, current: d?.name ?? null }, version: { saved: mapping.variation_version ?? null, current: object?.version ?? null }, tracking: { saved: true, current: d?.track_inventory ?? null }, location: { saved: env.SQUARE_LOCATION_ID, current: object?.absent_at_location_ids?.includes(env.SQUARE_LOCATION_ID) ? "excluded" : "not-excluded" } };
  const checks = { data: Boolean(d), price: Boolean(d) && Number(d.price_money?.amount) === variant.unitPrice, currency: d?.price_money?.currency === "JPY", name: d?.name === variant.name, version: object?.version === mapping.variation_version, tracking: d?.track_inventory === true, location: !object?.absent_at_location_ids?.includes(env.SQUARE_LOCATION_ID) };
  const labels = { data: "Variation\u60C5\u5831", price: "\u4FA1\u683C", currency: "\u901A\u8CA8", name: "Variation\u540D", version: "Variation\u30D0\u30FC\u30B8\u30E7\u30F3", tracking: "\u5728\u5EAB\u8FFD\u8DE1", location: "Location\u8CA9\u58F2\u8A2D\u5B9A" };
  return { ok: Object.values(checks).every(Boolean), mismatches: Object.keys(checks).filter((k) => !checks[k]).map((key) => ({ key, label: labels[key], ...values[key] || {} })), values };
}
__name(salesCatalogCheck, "salesCatalogCheck");

// worker/src/management/sales-version-proof.js
var salesCatalogVerificationEnabled = /* @__PURE__ */ __name((env) => production(env) ? env.MANAGEMENT_ENABLED === "1" && env.PRODUCTION_MANAGEMENT_READ_ENABLED === "1" && env.PRODUCTION_MANAGEMENT_SCHEMA_READY === "1" : integratedPublication(env), "salesCatalogVerificationEnabled");
async function inspectSalesCatalog(manager, mapping, object, variant) {
  need(salesCatalogVerificationEnabled(manager.env), "\u8CFC\u5165\u7528\u306E\u5546\u54C1\u8AAD\u53D6\u7167\u5408\u306F\u7121\u52B9\u3067\u3059\u3002", 403);
  const check = salesCatalogCheck(manager.env, mapping, object, variant);
  const fail2 = /* @__PURE__ */ __name((label) => ({ ...check, ok: false, mismatches: [{ key: "salesProof", label }], nextAction: production(manager.env) && manager.env.PRODUCTION_MANAGEMENT_CATALOG_ENABLED !== "1" ? "\u516C\u958B\u30EA\u30D3\u30B8\u30E7\u30F3\u30FB\u672C\u756A\u5BFE\u5FDC\u8868\u30FBSquare\u73FE\u5728\u5024\u3092\u7BA1\u7406\u8005\u304C\u8AAD\u53D6\u7167\u5408\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u8CFC\u5165\u3092\u6B62\u3081\u3001Catalog\u518D\u9001\u30FB\u5728\u5EAB\u4E0A\u66F8\u304D\u306F\u884C\u308F\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002" : "\u300C\u516C\u958B\u3059\u308B\u300D\u3067\u65E2\u5B58ID\u3092\u7DAD\u6301\u3057\u305F\u516C\u958B\u51E6\u7406\u3092\u5B9F\u884C\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u4FDD\u7559\u51E6\u7406\u304C\u3042\u308B\u5834\u5408\u306F\u540C\u3058\u51E6\u7406\u3092\u78BA\u8A8D\u30FB\u518D\u958B\u3057\u3066\u304F\u3060\u3055\u3044\u3002" }), "fail");
  if (production(manager.env) && !(await manager.s.publicProducts()).some((p) => p.status === "published" && p.variants.some((v) => v.id === variant.id && v.active))) return fail2("\u516C\u958B\u4E2D\u30FB\u6709\u52B9\u306A\u8CFC\u5165\u5BFE\u8C61\u3067\u306F\u3042\u308A\u307E\u305B\u3093");
  if (check.mismatches.some((m) => m.key !== "version")) return check;
  if (production(manager.env)) {
    try {
      const verified = await manager.square.verified(mapping.variation_id);
      need(verified.variant_id === variant.id && verified.item_id === mapping.item_id && verified.sku === mapping.sku, "\u5BFE\u5FDC\u4E0D\u4E00\u81F4", 409);
    } catch {
      return fail2("\u672C\u756A\u306E\u5B9F\u7167\u5408\u6E08\u307F\u5BFE\u5FDCID\u30FBSKU\u30FBinstance\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093");
    }
  }
  const job = await manager.s.one("SELECT j.* FROM mg_jobs j JOIN mg_variants v ON v.product_id=j.resource_id WHERE v.id=? AND j.kind='publish' AND j.state='done' AND j.result_json IS NOT NULL ORDER BY j.rowid DESC LIMIT 1", [variant.id]);
  let expected, record;
  if (!job && production(manager.env)) {
    try {
      record = await manager.square.verified(mapping.variation_id);
      expected = { item_variation_data: { sku: record.sku } };
    } catch {
      return fail2("\u672C\u756A\u5546\u54C1\u306E\u5B9F\u7167\u5408\u6E08\u307F\u5BFE\u5FDC\u8868\u3092\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093");
    }
  } else if (!job) return fail2("SKU\u3068\u5546\u54C1ID\u3092\u7D50\u3073\u4ED8\u3051\u308B\u5B8C\u4E86\u8A18\u9332\u304C\u3042\u308A\u307E\u305B\u3093");
  else try {
    const payload = JSON.parse(job.payload_json), body = JSON.parse(job.body_json), result = JSON.parse(job.result_json);
    const index = payload.data.variants.findIndex((v) => v.id === variant.id), sent = body.batches[0].objects[0];
    need(index >= 0 && body.idempotency_key === job.id && sent.type === "ITEM", "\u8A18\u9332\u4E0D\u8DB3", 409);
    expected = sent.item_data.variations[index];
    record = result.mappings.find((m) => m.variant_id === variant.id);
    need(record && expected?.item_variation_data?.sku && record.item_id === mapping.item_id && record.variation_id === mapping.variation_id && (sent.id.startsWith("#") || sent.id === record.item_id) && (expected.id.startsWith("#") || expected.id === record.variation_id), "\u8A18\u9332\u4E0D\u8DB3", 409);
  } catch {
    return fail2("\u5B8C\u4E86\u8A18\u9332\u306E\u56FA\u5B9AID\u30FBSKU\u3092\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093");
  }
  const item = await manager.square.object(mapping.item_id), d = object?.item_variation_data;
  const present = /* @__PURE__ */ __name((o) => Boolean((o?.present_at_all_locations || o?.present_at_location_ids?.includes(manager.env.SQUARE_LOCATION_ID)) && !o?.absent_at_location_ids?.includes(manager.env.SQUARE_LOCATION_ID)), "present");
  if (mapping.environment !== (production(manager.env) ? "production" : "sandbox") || mapping.location_id !== manager.env.SQUARE_LOCATION_ID || item?.type !== "ITEM" || item.id !== mapping.item_id || item.is_deleted || item.item_data?.is_archived || !present(item) || object?.type !== "ITEM_VARIATION" || object.id !== mapping.variation_id || object.is_deleted || d?.item_id !== item.id || d?.sku !== expected.item_variation_data.sku || d.sellable === false || !present(object)) return fail2("\u56FA\u5B9AID\u30FBSKU\u30FB\u524A\u9664\u72B6\u614B\u30FBLocation\u8CA9\u58F2\u8A2D\u5B9A\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093");
  const nested = item.item_data.variations?.find((v) => v.id === object.id);
  if (!nested || nested.version !== object.version || ["item_id", "sku", "name", "track_inventory", "sellable"].some((k) => nested.item_variation_data?.[k] !== d[k]) || nested.item_variation_data?.price_money?.currency !== d.price_money?.currency || Number(nested.item_variation_data?.price_money?.amount) !== Number(d.price_money?.amount)) return fail2("\u7167\u5408\u4E2D\u306BSquare\u5546\u54C1\u304C\u66F4\u65B0\u3055\u308C\u307E\u3057\u305F\u3002\u518D\u5EA6\u516C\u958B\u72B6\u6CC1\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044");
  const overrides = d.location_overrides || [];
  if (overrides.some((o) => o.location_id === manager.env.SQUARE_LOCATION_ID && (o.track_inventory === false || o.price_money && (o.price_money.currency !== "JPY" || Number(o.price_money.amount) !== variant.unitPrice)))) return fail2("Location\u5225\u4FA1\u683C\u30FB\u5728\u5EAB\u8FFD\u8DE1\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093");
  if (![mapping.item_version, mapping.variation_version, record.item_version, record.variation_version, item.version, object.version].every((v) => Number.isSafeInteger(v) && v > 0) || item.version < Math.max(mapping.item_version, record.item_version) || object.version < Math.max(mapping.variation_version, record.variation_version)) return fail2("\u5546\u54C1\u30D0\u30FC\u30B8\u30E7\u30F3\u306E\u5F8C\u9000\u307E\u305F\u306F\u8A18\u9332\u4E0D\u8DB3\u3092\u691C\u51FA\u3057\u307E\u3057\u305F");
  try {
    await manager.square.assertUniqueSku(object.id, d.sku);
  } catch {
    return fail2("SKU\u306E\u4E00\u610F\u6027\u3092\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093");
  }
  return { ...check, ok: true, mismatches: [], versionRevalidated: object.version !== mapping.variation_version, proof: { state: "matched", jobId: job?.id || null, source: job ? "completed-job" : "verified-production-mapping" }, nextAction: "\u516C\u958B\u4FA1\u683C\u30FB\u56FA\u5B9AID\u30FBSKU\u30FB\u8CA9\u58F2\u8A2D\u5B9A\u3092\u8AAD\u53D6\u7167\u5408\u6E08\u307F\u3002\u8AAC\u660E\u30FB\u753B\u50CF\u30FB\u5728\u5EAB\u66F4\u65B0\u306F\u8CFC\u5165\u7528\u306E\u5BFE\u5FDC\u8A18\u9332\u3092\u7121\u52B9\u306B\u3057\u307E\u305B\u3093\u3002" };
}
__name(inspectSalesCatalog, "inspectSalesCatalog");

// worker/src/management/store.js
var Store = class {
  static {
    __name(this, "Store");
  }
  constructor(env) {
    this.db = env.ORDERS_DB;
    this.env = env;
  }
  stmt(sql, args = []) {
    return this.db.prepare(sql).bind(...args);
  }
  async one(sql, args = []) {
    return this.stmt(sql, args).first();
  }
  async all(sql, args = []) {
    return (await this.stmt(sql, args).all()).results || [];
  }
  async run(sql, args = []) {
    return this.stmt(sql, args).run();
  }
  async batch(items) {
    return this.db.batch(items.map(([sql, args]) => this.stmt(sql, args)));
  }
  audit(actor, action, id, detail) {
    return ["INSERT INTO mg_audit VALUES(?,?,?,?,?,?)", [crypto.randomUUID(), actor, action, id, JSON.stringify(detail), now()]];
  }
  async product(id) {
    const p = await this.one("SELECT * FROM mg_products WHERE id=?", [id]);
    if (!p) return null;
    const r = await this.one("SELECT data_json FROM mg_revisions WHERE product_id=? AND revision=?", [id, p.draft_revision]);
    return { ...p, draft: JSON.parse(r.data_json) };
  }
  async products() {
    const rows = await this.all("SELECT p.*,r.data_json FROM mg_products p JOIN mg_revisions r ON r.product_id=p.id AND r.revision=p.draft_revision ORDER BY p.sort_order,p.id");
    return rows.map((p) => {
      const { data_json, ...row } = p;
      return { ...row, draft: JSON.parse(data_json) };
    });
  }
  async retiredProductIds() {
    if (!retirementEnabled(this.env)) return /* @__PURE__ */ new Set();
    const rows = await this.all("SELECT p.id,p.slug,r.data_json FROM mg_products p JOIN mg_revisions r ON r.product_id=p.id WHERE r.revision=p.published_revision OR (r.revision=p.draft_revision AND p.status='archived') OR EXISTS(SELECT 1 FROM mg_audit a WHERE a.resource_id=p.id AND a.action IN ('site_published','release_published') AND json_extract(a.detail_json,'$.revision')=r.revision)");
    return new Set(rows.filter((p) => retiredProduct(this.env, { id: p.id, slug: p.slug, ...JSON.parse(p.data_json) })).map((p) => p.id));
  }
  async retiredVariantIds() {
    if (!retirementEnabled(this.env)) return [];
    const ids = await this.retiredProductIds();
    return [.../* @__PURE__ */ new Set(["goldenrod-leaf-10g", "goldenrod-leaf-stem-20g", ...(await this.products()).filter((p) => ids.has(p.id)).flatMap((p) => p.draft.variants.map((v) => v.id))])];
  }
  async publicProducts() {
    const rows = await this.all("SELECT p.*,r.data_json FROM mg_products p JOIN mg_revisions r ON r.product_id=p.id AND r.revision=p.published_revision WHERE p.status IN ('published','stopped') ORDER BY p.sort_order,p.id");
    const mappings = production(this.env) || this.env.RUNTIME_TIER === "staging" ? await this.all("SELECT variant_id FROM mg_mappings") : null;
    const retired = await this.retiredProductIds();
    return rows.filter((p) => !retired.has(p.id)).map((p) => ({ id: p.id, slug: p.slug, status: p.status, revision: p.published_revision, ...JSON.parse(p.data_json), ...mappings ? { checkoutVariantIds: JSON.parse(p.data_json).variants.filter((v) => mappings.some((m) => m.variant_id === v.id)).map((v) => v.id) } : {} }));
  }
  async catalog() {
    const products = await this.publicProducts(), maps = await this.all("SELECT * FROM mg_mappings");
    const byId = new Map(maps.map((m) => [m.variant_id, m]));
    const result = {};
    for (const p of products) for (const v of p.variants) {
      const m = byId.get(v.id);
      if (!m && (this.env.RUNTIME_TIER === "staging" || production(this.env) && !CATALOG[v.id])) continue;
      need(m?.environment === (production(this.env) ? "production" : "sandbox") && m.location_id === this.env.SQUARE_LOCATION_ID, "\u516C\u958B\u5546\u54C1\u306ESquare\u5BFE\u5FDC\u8868\u304C\u3042\u308A\u307E\u305B\u3093\u3002", 503);
      result[v.id] = { ...v, active: p.status === "published" && v.active, squareVariationId: m.variation_id, revision: p.revision };
    }
    return result;
  }
  async locked(ids) {
    if (!ids.length) return [];
    const rows = await this.all("SELECT * FROM mg_locks");
    return rows.filter((r) => ids.includes(r.variant_id));
  }
  async assertUnlocked(ids) {
    need(!(await this.locked(ids)).length, "\u3053\u306E\u5546\u54C1\u306F\u540C\u671F\u30FB\u5728\u5EAB\u78BA\u8A8D\u4E2D\u3067\u3059\u3002", 409);
  }
};
async function loadCatalog(env) {
  if (production(env)) await productionDatabase(env);
  const store = new Store(env), catalog = await store.catalog();
  if (production(env)) {
    const legacy = env.PRODUCTION_MANAGED_CHECKOUT_ENABLED === "1" ? Object.fromEntries(Object.entries(CATALOG).map(([id, p]) => [id, { ...p, active: false }])) : CATALOG;
    env.MANAGED_CATALOG = { ...legacy, ...catalog };
    if (retirementEnabled(env)) for (const id of ["goldenrod-leaf-10g", "goldenrod-leaf-stem-20g"]) env.MANAGED_CATALOG[id] = { ...env.MANAGED_CATALOG[id], active: false };
    for (const p of await store.products()) if (p.status === "archived") {
      for (const v of p.draft.variants) if (env.MANAGED_CATALOG[v.id]) env.MANAGED_CATALOG[v.id] = { ...env.MANAGED_CATALOG[v.id], active: false };
    }
  } else env.MANAGED_CATALOG = catalog;
  return env.MANAGED_CATALOG;
}
__name(loadCatalog, "loadCatalog");

// worker/src/management/images.js
var MAX = 8 * 1024 * 1024;
function inspectImage(bytes, mime) {
  need(bytes.length > 16 && bytes.length <= MAX, "\u753B\u50CF\u306F8MB\u4EE5\u4E0B\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002", 413);
  const d = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width, height, ext;
  if (bytes.length >= 24 && mime === "image/png" && [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v) && new TextDecoder().decode(bytes.slice(12, 16)) === "IHDR") {
    width = d.getUint32(16);
    height = d.getUint32(20);
    ext = "png";
  } else if (mime === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216 && bytes.at(-2) === 255 && bytes.at(-1) === 217) {
    let p = 2;
    while (p + 9 < bytes.length) {
      if (bytes[p++] !== 255) break;
      const mark = bytes[p++];
      if (mark === 217 || mark === 218) break;
      const length = d.getUint16(p);
      need(length >= 2 && p + length <= bytes.length, "JPEG\u304C\u7834\u640D\u3057\u3066\u3044\u307E\u3059\u3002");
      if ([192, 193, 194].includes(mark)) {
        height = d.getUint16(p + 3);
        width = d.getUint16(p + 5);
        break;
      }
      p += length;
    }
    ext = "jpg";
  } else if (mime === "image/webp" && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP") {
    const type = new TextDecoder().decode(bytes.slice(12, 16));
    if (type === "VP8X" && bytes.length >= 30) {
      need(!(bytes[20] & 2), "\u30A2\u30CB\u30E1\u30FC\u30B7\u30E7\u30F3\u753B\u50CF\u306F\u4F7F\u7528\u3067\u304D\u307E\u305B\u3093\u3002");
      width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
      height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    } else if (type === "VP8L" && bytes.length >= 25 && bytes[20] === 47) {
      const bits = d.getUint32(21, true);
      width = (bits & 16383) + 1;
      height = (bits >>> 14 & 16383) + 1;
    } else if (type === "VP8 " && bytes.length >= 30 && bytes[23] === 157 && bytes[24] === 1 && bytes[25] === 42) {
      width = d.getUint16(26, true) & 16383;
      height = d.getUint16(28, true) & 16383;
    }
    ext = "webp";
  }
  need(ext && Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0 && width <= 12e3 && height <= 12e3 && width * height <= 4e7, "JPEG/PNG/WebP\u306E\u9759\u6B62\u753B\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
  return { mime, ext, width, height };
}
__name(inspectImage, "inspectImage");
async function uploadImage(request, env) {
  await guard(env);
  productionGrant(env, "images");
  need(env.PRODUCT_IMAGES, "\u753B\u50CF\u30B9\u30C8\u30EC\u30FC\u30B8\u304C\u672A\u8A2D\u5B9A\u3067\u3059\u3002", 503);
  const mime = (request.headers.get("Content-Type") || "").split(";")[0];
  need(["image/jpeg", "image/png", "image/webp"].includes(mime), "\u672A\u5BFE\u5FDC\u306E\u753B\u50CF\u5F62\u5F0F\u3067\u3059\u3002", 415);
  const reader = request.body?.getReader();
  need(reader, "\u753B\u50CF\u304C\u3042\u308A\u307E\u305B\u3093\u3002");
  const chunks = [];
  let size = 0;
  for (; ; ) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX) {
      await reader.cancel();
      need(false, "\u753B\u50CF\u306F8MB\u4EE5\u4E0B\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002", 413);
    }
    chunks.push(value);
  }
  let bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const info = inspectImage(bytes, mime);
  bytes = stripImageMetadata(bytes, mime);
  const id = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((v) => v.toString(16).padStart(2, "0")).join("");
  const key = (production(env) ? "production/" : "sandbox/") + id + "." + info.ext;
  await env.PRODUCT_IMAGES.put(key, bytes, { httpMetadata: { contentType: mime } });
  await new Store(env).run("INSERT OR IGNORE INTO mg_images VALUES(?,?,?,?,?,?,?)", [id, key, mime, bytes.length, info.width, info.height, now()]);
  return { id, ...info, bytes: bytes.length, previewUrl: "/api/admin/images/" + id };
}
__name(uploadImage, "uploadImage");
async function serveImage(id, env, admin = false) {
  await guard(env);
  need(/^[a-f0-9]{64}$/.test(id), "\u753B\u50CFID\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002", 404);
  const s = new Store(env);
  if (!admin) need((await s.publicProducts()).some((p) => p.images.includes(id)), "\u753B\u50CF\u304C\u3042\u308A\u307E\u305B\u3093\u3002", 404);
  const row = await s.one("SELECT * FROM mg_images WHERE id=?", [id]);
  need(row && env.PRODUCT_IMAGES, "\u753B\u50CF\u304C\u3042\u308A\u307E\u305B\u3093\u3002", 404);
  const obj = await env.PRODUCT_IMAGES.get(row.object_key);
  need(obj, "\u753B\u50CF\u304C\u3042\u308A\u307E\u305B\u3093\u3002", 404);
  return new Response(obj.body, { headers: { "Content-Type": row.mime, "Content-Security-Policy": "default-src 'none'; sandbox", "X-Content-Type-Options": "nosniff", "Cache-Control": admin ? "no-store" : "public, max-age=300" } });
}
__name(serveImage, "serveImage");
function stripImageMetadata(bytes, mime) {
  const parts = [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (mime === "image/jpeg") {
    parts.push(bytes.slice(0, 2));
    let p2 = 2;
    while (p2 < bytes.length) {
      need(bytes[p2] === 255 && p2 + 1 < bytes.length, "JPEG\u5F62\u5F0F\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002");
      const mark = bytes[p2 + 1];
      if (mark === 218 || mark === 217) {
        parts.push(bytes.slice(p2));
        break;
      }
      need(p2 + 4 <= bytes.length, "JPEG\u304C\u5207\u308C\u3066\u3044\u307E\u3059\u3002");
      const n = view.getUint16(p2 + 2) + 2;
      need(n >= 4 && p2 + n <= bytes.length, "JPEG\u304C\u5207\u308C\u3066\u3044\u307E\u3059\u3002");
      if (![225, 226, 237, 254].includes(mark)) parts.push(bytes.slice(p2, p2 + n));
      p2 += n;
    }
  } else if (mime === "image/png") {
    parts.push(bytes.slice(0, 8));
    let p2 = 8, ended = false, idat = false;
    while (p2 + 12 <= bytes.length) {
      const n = view.getUint32(p2) + 12;
      need(n >= 12 && p2 + n <= bytes.length, "PNG\u304C\u5207\u308C\u3066\u3044\u307E\u3059\u3002");
      const type = new TextDecoder().decode(bytes.slice(p2 + 4, p2 + 8));
      if (!["eXIf", "tEXt", "zTXt", "iTXt"].includes(type)) parts.push(bytes.slice(p2, p2 + n));
      if (type === "IDAT") idat = true;
      p2 += n;
      if (type === "IEND") {
        ended = true;
        break;
      }
    }
    need(ended && idat && p2 === bytes.length, "PNG\u753B\u50CF\u30C7\u30FC\u30BF\u304C\u3042\u308A\u307E\u305B\u3093\u3002");
  } else if (mime === "image/webp") {
    need(view.getUint32(4, true) === bytes.length - 8, "WebP\u304C\u5207\u308C\u3066\u3044\u307E\u3059\u3002");
    let p2 = 12;
    while (p2 + 8 <= bytes.length) {
      const n2 = view.getUint32(p2 + 4, true), size = 8 + n2 + n2 % 2;
      need(p2 + size <= bytes.length, "WebP\u304C\u5207\u308C\u3066\u3044\u307E\u3059\u3002");
      const type = new TextDecoder().decode(bytes.slice(p2, p2 + 4));
      need(!["ANIM", "ANMF"].includes(type), "\u30A2\u30CB\u30E1\u30FC\u30B7\u30E7\u30F3\u306F\u4F7F\u7528\u3067\u304D\u307E\u305B\u3093\u3002");
      if (!["EXIF", "XMP ", "ICCP"].includes(type)) {
        const chunk = bytes.slice(p2, p2 + size);
        if (type === "VP8X") chunk[8] &= ~44;
        parts.push(chunk);
      }
      p2 += size;
    }
    need(p2 === bytes.length, "WebP\u5F62\u5F0F\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002");
    const n = parts.reduce((s, p3) => s + p3.length, 0);
    const header = new Uint8Array(12);
    header.set(new TextEncoder().encode("RIFF"));
    new DataView(header.buffer).setUint32(4, n + 4, true);
    header.set(new TextEncoder().encode("WEBP"), 8);
    parts.unshift(header);
  } else return bytes;
  const out = new Uint8Array(parts.reduce((n, p2) => n + p2.length, 0));
  let p = 0;
  for (const part of parts) {
    out.set(part, p);
    p += part.length;
  }
  return out;
}
__name(stripImageMetadata, "stripImageMetadata");

// worker/src/management/importer.js
var strip = /* @__PURE__ */ __name((s) => s.replace(/<br\s*\/?\s*>/gi, "\n").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/[ \t]+/g, " ").trim(), "strip");
async function importLegacy(manager, actor) {
  need(manager.env.ASSETS && manager.env.PRODUCT_IMAGES, "Assets\u3068\u753B\u50CF\u30B9\u30C8\u30EC\u30FC\u30B8\u304C\u5FC5\u8981\u3067\u3059\u3002", 503);
  const result = [];
  for (const slug of ["lemonbalm", "yomogi", "goldenrod"]) {
    if (await manager.s.product(slug)) {
      result.push({ id: slug, state: "exists" });
      continue;
    }
    const response = await manager.env.ASSETS.fetch(new Request("https://assets.internal/products/" + slug + ".html"));
    need(response.ok, "\u65E2\u5B58\u306E\u5546\u54C1HTML\u304C\u3042\u308A\u307E\u305B\u3093\u3002", 409);
    const html = await response.text();
    const docs = [...html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    const ld = docs.find((d) => ["Product", "ProductGroup"].includes(d["@type"]));
    need(ld, "\u5546\u54C1\u5B9A\u7FA9\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3002", 409);
    const variants = Object.entries(SANDBOX_CATALOG).filter(([id]) => id.startsWith(slug === "goldenrod" ? "goldenrod-leaf-10g" : slug + "-")).map(([id, v]) => ({ id, name: v.name, price: v.price, amount: "10g", maxQuantity: v.maxQuantity, active: true }));
    need(variants.length === 1, "\u691C\u8A3C\u5BFE\u8C61\u306E\u5546\u54C1\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002", 409);
    const schema = ld["@type"] === "ProductGroup" ? ld.hasVariant.find((v) => v.sku === variants[0].id) : ld;
    need(Number(schema?.offers?.price) === variants[0].price && schema?.offers?.priceCurrency === "JPY", "\u65E2\u5B58\u4FA1\u683C\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002", 409);
    const imagePath = new URL(Array.isArray(ld.image) ? ld.image[0] : ld.image, "https://assets.internal").pathname;
    need(/^\/images\/[a-z0-9_.-]+\.(jpg|png|webp)$/i.test(imagePath), "\u753B\u50CF\u30D1\u30B9\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002", 409);
    const image3 = await manager.env.ASSETS.fetch(new Request("https://assets.internal" + imagePath));
    need(image3.ok, "\u65E2\u5B58\u753B\u50CF\u304C\u3042\u308A\u307E\u305B\u3093\u3002", 409);
    const mime = imagePath.endsWith(".png") ? "image/png" : imagePath.endsWith(".webp") ? "image/webp" : "image/jpeg";
    const saved = await uploadImage(new Request("https://upload.internal/", { method: "POST", headers: { "Content-Type": mime }, body: image3.body, duplex: "half" }), manager.env);
    const main = html.match(/<p\s+class="product-description"[^>]*>([\s\S]*?)<\/p>/)?.[1] || ld.description || "", data = html.match(/<dl\s+class="product-data"[^>]*>([\s\S]*?)<\/dl>/)?.[1] || "", handling = html.match(/<div\s+class="product-handling-body"[^>]*>([\s\S]*?)<\/div>/)?.[1] || "";
    await manager.save(slug, { operationId: crypto.randomUUID(), expectedVersion: 0, slug, name: variants[0].name, description: [strip(main), strip(data), strip(handling)].filter(Boolean).join("\n\n"), alt: variants[0].name, sortOrder: result.length, images: [saved.id], variants }, actor);
    result.push({ id: slug, state: "draft_imported" });
  }
  return { products: result };
}
__name(importLegacy, "importLegacy");

// worker/src/management/site-publication.js
var independentPublication = /* @__PURE__ */ __name((env) => env.RUNTIME_TIER === "staging" || production(env) && env.PRODUCTION_STOREFRONT_PUBLISH_ENABLED === "1", "independentPublication");
var commercialVariants = /* @__PURE__ */ __name((data) => (data?.variants || []).map((v) => [v.id, v.name?.trim(), v.price, v.maxQuantity ?? 10, v.active !== false]).sort((a, b) => a[0].localeCompare(b[0])), "commercialVariants");
var sameVariants = /* @__PURE__ */ __name((a, b) => JSON.stringify(commercialVariants(a)) === JSON.stringify(commercialVariants(b)), "sameVariants");
function siteGrant(env) {
  if (env.RUNTIME_TIER === "staging") {
    need(env.MANAGEMENT_ENABLED === "1", "\u30B5\u30A4\u30C8\u516C\u958B\u306F\u7121\u52B9\u3067\u3059\u3002", 403);
    return;
  }
  need(production(env) && env.PRODUCTION_STOREFRONT_PUBLISH_ENABLED === "1", "\u30B5\u30A4\u30C8\u516C\u958B\u306F\u7121\u52B9\u3067\u3059\u3002", 403);
  productionGrant(env, "draft");
}
__name(siteGrant, "siteGrant");
async function publishSite(manager, id, input, actor) {
  siteGrant(manager.env);
  operation(input.operationId);
  const status = input.status || "published";
  need(["published", "stopped", "archived"].includes(status), "\u516C\u958B\u72B6\u614B\u304C\u4E0D\u6B63\u3067\u3059\u3002");
  const fp = await digest(["site-publication", id, input]);
  const previous = await manager.command(input.operationId, fp);
  if (previous) return previous;
  const p = await manager.s.product(id);
  need(p && p.version === input.expectedVersion, "\u5546\u54C1\u304C\u66F4\u65B0\u3055\u308C\u3066\u3044\u307E\u3059\u3002\u518D\u8AAD\u8FBC\u3057\u3066\u304F\u3060\u3055\u3044\u3002", 409);
  if (status === "published") need(!retiredProduct(manager.env, p) && !(await manager.s.retiredProductIds()).has(id), "\u3053\u306E\u5546\u54C1\u306F\u8CA9\u58F2\u7D42\u4E86\u3067\u3059\u3002\u518D\u516C\u958B\u3067\u304D\u307E\u305B\u3093\u3002", 409);
  if (manager.env.RUNTIME_TIER === "staging") return publishStagingSite(manager, p, input, actor, fp, status);
  await manager.s.assertUnlocked(p.draft.variants.map((v) => v.id));
  if (status === "published") {
    const maps = await manager.s.all("SELECT m.* FROM mg_mappings m JOIN mg_variants v ON v.id=m.variant_id WHERE v.product_id=?", [id]);
    for (const v of p.draft.variants) {
      const m = maps.find((m2) => m2.variant_id === v.id);
      if (!m && !CATALOG[v.id]) continue;
      need(m, "Square\u5BFE\u5FDC\u3092\u7167\u5408\u3057\u3066\u304B\u3089\u516C\u958B\u3057\u3066\u304F\u3060\u3055\u3044\u3002", 409);
      need(m.environment === "production" && m.location_id === manager.env.SQUARE_LOCATION_ID, "Square\u306E\u74B0\u5883\u30FBLocation\u5BFE\u5FDC\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002", 409);
      await manager.square.verified(m.variation_id);
      const o = await manager.square.object(m.variation_id), d = o?.item_variation_data;
      need(o && !o.is_deleted && d?.item_id === m.item_id && d.sku === m.sku && d.name === v.name && d.track_inventory === true && d.sellable !== false && d.price_money?.currency === "JPY" && Number(d.price_money.amount) === v.price, "Square\u306E\u5546\u54C1\u30FBSKU\u30FB\u4FA1\u683C\u30FB\u5728\u5EAB\u8FFD\u8DE1\u3068\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002", 409);
      need((o.present_at_all_locations || o.present_at_location_ids?.includes(manager.env.SQUARE_LOCATION_ID)) && !o.absent_at_location_ids?.includes(manager.env.SQUARE_LOCATION_ID), "\u5BFE\u8C61Location\u3067\u8CA9\u58F2\u3067\u304D\u307E\u305B\u3093\u3002", 409);
      if (CATALOG[v.id] && manager.env.PRODUCTION_MANAGED_CHECKOUT_ENABLED !== "1") need(v.price === CATALOG[v.id].price, "\u65E2\u5B58\u8CFC\u5165\u4FA1\u683C\u3092\u7DAD\u6301\u3057\u3066\u304F\u3060\u3055\u3044\u3002", 409);
    }
  }
  const result = { ok: true, state: "done", siteOnly: true, status };
  await manager.s.batch([
    ...status !== "published" ? await removeFeaturedStatements(manager.s, id, actor) : [],
    ["UPDATE mg_products SET published_revision=?,status=?,sort_order=?,version=version+1,updated_at=? WHERE id=?", [status === "published" ? p.draft_revision : p.published_revision, status, p.draft.sortOrder, now(), id]],
    ["INSERT INTO mg_commands VALUES(?,?,?)", [input.operationId, fp, json(result)]],
    manager.s.audit(actor, "site_" + status, id, { revision: p.draft_revision, squareWrite: false })
  ]);
  return result;
}
__name(publishSite, "publishSite");
async function publishStagingSite(manager, p, input, actor, fp, status) {
  const row = p.published_revision ? await manager.s.one("SELECT data_json FROM mg_revisions WHERE product_id=? AND revision=?", [p.id, p.published_revision]) : null;
  const previous = row ? JSON.parse(row.data_json) : null;
  let data = p.draft, revision = p.draft_revision;
  const warnings = [], statements = [];
  if (status === "published" && !sameVariants(previous, p.draft)) {
    try {
      const maps = await manager.s.all("SELECT m.* FROM mg_mappings m JOIN mg_variants v ON v.id=m.variant_id WHERE v.product_id=?", [p.id]);
      await manager.s.assertUnlocked(maps.map((m) => m.variant_id));
      await manager.assertNoPurchaseHold(maps.map((m) => m.variant_id));
      for (const v of p.draft.variants) {
        const m = maps.find((m2) => m2.variant_id === v.id);
        if (!m) continue;
        need(m.environment === "sandbox" && m.location_id === manager.env.SQUARE_LOCATION_ID, "Square\u306E\u74B0\u5883\u30FBLocation\u5BFE\u5FDC\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002", 409);
        const o = await manager.square.object(m.variation_id), d = o?.item_variation_data;
        need(o && !o.is_deleted && d?.item_id === m.item_id && d.name === v.name && d.track_inventory === true && d.sellable !== false && d.price_money?.currency === "JPY" && Number(d.price_money.amount) === v.price && (o.present_at_all_locations || o.present_at_location_ids?.includes(manager.env.SQUARE_LOCATION_ID)) && !o.absent_at_location_ids?.includes(manager.env.SQUARE_LOCATION_ID), "Square\u306E\u4FA1\u683C\u30FB\u8CA9\u58F2\u8A2D\u5B9A\u30FB\u5728\u5EAB\u8FFD\u8DE1\u3068\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002", 409);
      }
    } catch (error) {
      if (!previous) throw error;
      data = { ...p.draft, variants: previous.variants };
      warnings.push("\u8868\u793A\u60C5\u5831\u306E\u307F\u516C\u958B\u3057\u307E\u3057\u305F\u3002\u4FA1\u683C\u30FB\u30D0\u30EA\u30A8\u30FC\u30B7\u30E7\u30F3\u30FB\u8CA9\u58F2\u8A2D\u5B9A\u306F\u524D\u56DE\u516C\u958B\u5024\u3092\u7DAD\u6301\u3057\u3066\u3044\u307E\u3059\u3002" + (error instanceof ManagementError ? error.message : "Square\u7167\u5408\u7D50\u679C\u3092\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093\u3002"));
    }
  }
  if (status === "published" && data !== p.draft) {
    revision = (await manager.s.one("SELECT MAX(revision) AS revision FROM mg_revisions WHERE product_id=?", [p.id])).revision + 1;
    statements.push(["INSERT INTO mg_revisions VALUES(?,?,?,?)", [p.id, revision, json(data), now()]]);
  }
  if (status !== "published") statements.push(...await removeFeaturedStatements(manager.s, p.id, actor));
  const result = { ok: true, state: "done", siteOnly: true, status, warnings };
  statements.push(
    ["UPDATE mg_products SET published_revision=?,status=?,sort_order=?,version=version+1,updated_at=? WHERE id=?", [status === "published" ? revision : p.published_revision, status, p.draft.sortOrder, now(), p.id]],
    ["INSERT INTO mg_commands VALUES(?,?,?)", [input.operationId, fp, json(result)]],
    manager.s.audit(actor, "site_" + status, p.id, { revision, status, squareWrite: false, warnings })
  );
  await manager.s.batch(statements);
  return result;
}
__name(publishStagingSite, "publishStagingSite");

// worker/src/management/sync-diagnostics.js
async function inspectSync(manager, id) {
  need(salesCatalogVerificationEnabled(manager.env), "\u5546\u54C1\u8AAD\u53D6\u8A3A\u65AD\u306F\u7121\u52B9\u3067\u3059\u3002", 403);
  const p = await manager.s.product(id);
  need(p, "\u5546\u54C1\u304C\u3042\u308A\u307E\u305B\u3093\u3002", 404);
  const locks = await manager.s.locked(p.draft.variants.map((v) => v.id));
  const jobs = [];
  for (const jobId of new Set(locks.map((l) => l.job_id))) {
    const row = await manager.s.one("SELECT * FROM mg_jobs WHERE id=?", [jobId]);
    jobs.push(row ? { ...await manager.job(jobId), hasSavedRequest: Boolean(row.body_json), hasSuccessEvidence: Boolean(row.result_json), nextAction: row.state === "done" ? "\u6210\u529F\u8A3C\u8DE1\u3092\u78BA\u8A8D\u3057\u3066\u6B8B\u5B58\u30ED\u30C3\u30AF\u3092\u89E3\u9664" : row.state === "review" ? "\u65B0\u898F\u540C\u671F\u30FB\u518D\u9001\u3092\u305B\u305A\u3001\u540C\u671F\u7D50\u679C\u3092\u8AAD\u307F\u53D6\u308A\u7167\u5408" : row.state === "retry" ? "\u65B0\u898F\u64CD\u4F5C\u3092\u4F5C\u3089\u305A\u3001\u540C\u3058\u30B8\u30E7\u30D6\u306E\u7D50\u679C\u30FB\u518D\u8A66\u884C\u671F\u9650\u3092\u78BA\u8A8D" : "\u5B9F\u884C\u7D50\u679C\u3092\u5F85\u3064\u3002\u9577\u6642\u9593\u5909\u5316\u3057\u306A\u3044\u5834\u5408\u306F\u540C\u671F\u4E00\u89A7\u3092\u78BA\u8A8D" } : { id: jobId, state: "missing", nextAction: "\u51E6\u7406\u8A18\u9332\u304C\u306A\u3044\u305F\u3081\u81EA\u52D5\u89E3\u9664\u3067\u304D\u307E\u305B\u3093\u3002\u30ED\u30C3\u30AF\u3092\u4FDD\u6301\u3057\u3066\u500B\u5225\u78BA\u8A8D" });
  }
  const report = { environment: production(manager.env) ? "production" : "sandbox", productId: id, checkedAt: (/* @__PURE__ */ new Date()).toISOString(), connection: { ok: false }, jobs, variants: [], inventory: null };
  try {
    const locations = await manager.square.request("/v2/locations");
    const location = locations.locations?.find((l) => l.id === manager.env.SQUARE_LOCATION_ID);
    report.connection = { ok: true, locationFound: Boolean(location), locationActive: location?.status === "ACTIVE", currency: location?.currency || null };
  } catch (error) {
    report.connection = { ok: false, httpStatus: error.upstreamStatus || null, squareCode: error.squareCode || null, nextAction: error.upstreamStatus === 401 ? production(manager.env) ? "Production\u7BA1\u7406\u7528\u30C8\u30FC\u30AF\u30F3\u306E\u6709\u52B9\u6027\u3092\u78BA\u8A8D" : "Sandbox Access Token\u306E\u6709\u52B9\u6027\u3092Square\u5074\u3067\u78BA\u8A8D" : error.upstreamStatus === 403 ? "Sandbox\u30C8\u30FC\u30AF\u30F3\u306EMERCHANT_PROFILE_READ\u6A29\u9650\u3092\u78BA\u8A8D" : "\u63A5\u7D9A\u7D50\u679C\u3092\u78BA\u8A8D\u3002\u65B0\u898F\u540C\u671F\u3084\u5728\u5EAB\u66F4\u65B0\u306F\u884C\u308F\u306A\u3044" };
    return report;
  }
  const maps = await manager.s.all("SELECT m.* FROM mg_mappings m JOIN mg_variants v ON v.id=m.variant_id WHERE v.product_id=?", [id]);
  const skuCounts = /* @__PURE__ */ new Map(), seenCursors = /* @__PURE__ */ new Set();
  let cursor, skuComplete = false;
  try {
    for (let page = 0; page < 100; page++) {
      const data = await manager.square.request("/v2/catalog/list?types=ITEM_VARIATION" + (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""));
      for (const o of data.objects || []) if (!o.is_deleted && o.item_variation_data?.sku) {
        const sku = o.item_variation_data.sku;
        skuCounts.set(sku, (skuCounts.get(sku) || 0) + 1);
      }
      if (!data.cursor) {
        skuComplete = true;
        break;
      }
      if (typeof data.cursor !== "string" || seenCursors.has(data.cursor)) break;
      seenCursors.add(data.cursor);
      cursor = data.cursor;
    }
  } catch {
  }
  report.skuCheck = { complete: skuComplete };
  for (const job of jobs) if (["publish", "state"].includes(job.kind) && job.hasSavedRequest) {
    const row = await manager.s.one("SELECT * FROM mg_jobs WHERE id=?", [job.id]);
    const { mappings, adoptionMappings, ...proof } = await catalogProof(manager, row);
    job.proof = proof;
    job.nextAction = proof.state === "matched" ? "\u518D\u9001\u305B\u305A\u7167\u5408\u5B8C\u4E86\u3092\u8A18\u9332" : proof.message;
  }
  const published = (await manager.s.publicProducts()).find((n) => n.id === id);
  const discovered = [];
  if (!maps.length) {
    for (const job of jobs) if (job.hasSavedRequest) {
      const row = await manager.s.one("SELECT body_json,payload_json FROM mg_jobs WHERE id=?", [job.id]);
      try {
        const body = JSON.parse(row.body_json), payload = JSON.parse(row.payload_json), item = await manager.square.findCreatedItem(body);
        for (const v of payload.data?.variants || []) {
          const sent = body.batches[0].objects[0].item_data.variations.find((o) => o.item_variation_data.sku === v.id), objects = item.item_data.variations.filter((o) => o.item_variation_data?.sku === sent?.item_variation_data.sku);
          if (objects.length === 1) discovered.push({ variant_id: v.id, item_id: item.id, variation_id: objects[0].id, environment: production(manager.env) ? "production" : "sandbox", location_id: manager.env.SQUARE_LOCATION_ID });
        }
      } catch (error) {
        report.discovery = { complete: false, reason: error.status ? error.message : "\u4F5C\u6210\u6E08\u307FItem\u306E\u8AAD\u307F\u53D6\u308A\u7167\u5408\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002", nextAction: "\u518D\u9001\u3084\u30ED\u30C3\u30AF\u89E3\u9664\u3092\u305B\u305A\u3001\u3053\u306E\u8A3A\u65AD\u7D50\u679C\u3067\u500B\u5225\u78BA\u8A8D" };
      }
    }
  }
  for (const v of p.draft.variants) {
    const stored = maps.find((m2) => m2.variant_id === v.id), m = stored || discovered.find((m2) => m2.variant_id === v.id);
    if (!m) {
      report.variants.push({ variantId: v.id, mapped: false, nextAction: locks.length ? "\u65E2\u5B58\u30B8\u30E7\u30D6\u3092\u8AAD\u307F\u53D6\u308A\u7167\u5408\u3057\u3001\u4F5C\u6210\u6E08\u307FItem\u3092\u78BA\u8A8D" : "\u672A\u9023\u643A\u3002\u65B0\u898F\u540C\u671F\u306E\u524D\u306B\u65E2\u5B58\u30B8\u30E7\u30D6\u30FBSKU\u91CD\u8907\u3092\u78BA\u8A8D" });
      continue;
    }
    try {
      const object = await manager.square.object(m.variation_id), item = await manager.square.object(m.item_id), d = object?.item_variation_data;
      const overrides = d?.location_overrides?.find((o) => o.location_id === manager.env.SQUARE_LOCATION_ID);
      const present = /* @__PURE__ */ __name((o) => Boolean((o?.present_at_all_locations || o?.present_at_location_ids?.includes(manager.env.SQUARE_LOCATION_ID)) && !o?.absent_at_location_ids?.includes(manager.env.SQUARE_LOCATION_ID)), "present");
      const publicVariant = published?.variants.find((n) => n.id === v.id);
      const checkout = stored && publicVariant ? await inspectSalesCatalog(manager, m, object, { id: v.id, name: publicVariant.name, unitPrice: publicVariant.price }) : null;
      report.variants.push({ checkout, variantId: v.id, mapped: Boolean(stored), discovered: !stored, itemId: m.item_id, variationId: m.variation_id, sku: d?.sku || null, checks: { environment: m.environment === (production(manager.env) ? "production" : "sandbox"), location: m.location_id === manager.env.SQUARE_LOCATION_ID, itemId: item?.id === m.item_id, variationId: object?.id === m.variation_id, parent: d?.item_id === m.item_id, skuPresent: Boolean(d?.sku), skuUnique: skuComplete ? skuCounts.get(d?.sku) === 1 : null, notDeleted: !object?.is_deleted && !item?.is_deleted, name: d?.name === v.name, price: d?.price_money?.currency === "JPY" && Number(d.price_money.amount) === v.price, tracking: (overrides?.track_inventory ?? d?.track_inventory) === true, sellable: d?.sellable !== false, present: present(item) && present(object), catalogVersion: Number.isSafeInteger(m.item_version) && Number.isSafeInteger(m.variation_version) ? object?.version === m.variation_version && item?.version === m.item_version : null }, versions: { item: { stored: m.item_version ?? null, current: item?.version ?? null }, variation: { stored: m.variation_version ?? null, current: object?.version ?? null }, reason: !Number.isSafeInteger(m.item_version) || !Number.isSafeInteger(m.variation_version) ? "\u30ED\u30FC\u30AB\u30EB\u672A\u8A18\u9332\uFF08\u540C\u671F\u5931\u6557\u3068\u306F\u5224\u5B9A\u3057\u307E\u305B\u3093\uFF09" : object?.version !== m.variation_version || item?.version !== m.item_version ? "Square\u73FE\u5728\u5024\u304C\u4FDD\u5B58\u6E08\u307F\u5BFE\u5FDC\u8868\u3068\u7570\u306A\u308A\u307E\u3059\u3002\u4FDD\u5B58\u6E08\u307F\u30EA\u30AF\u30A8\u30B9\u30C8\u306E\u5185\u5BB9\u7167\u5408\u3067\u5224\u5B9A\u3057\u307E\u3059\u3002" : "\u4FDD\u5B58\u6E08\u307F\u5BFE\u5FDC\u8868\u3068\u4E00\u81F4" }, expected: { name: v.name, price: v.price, currency: "JPY", tracking: true }, actual: { name: d?.name || null, price: d?.price_money?.amount ?? null, currency: d?.price_money?.currency || null, tracking: overrides?.track_inventory ?? d?.track_inventory ?? null } });
    } catch (error) {
      report.variants.push({ variantId: v.id, mapped: Boolean(stored), discovered: !stored, itemId: m.item_id, variationId: m.variation_id, httpStatus: error.upstreamStatus || null, squareCode: error.squareCode || null, nextAction: "ID\u307E\u305F\u306FITEMS_READ\u6A29\u9650\u3092\u78BA\u8A8D\u3002\u65E2\u5B58\u5BFE\u5FDC\u8868\u306F\u5909\u66F4\u3057\u306A\u3044" });
    }
  }
  try {
    const inventoryMaps = [...maps, ...discovered];
    const counts = await manager.square.count(inventoryMaps.map((m) => m.variation_id));
    report.inventory = inventoryMaps.map((m) => ({ variantId: m.variant_id, quantity: counts.get(m.variation_id) ?? null }));
  } catch (error) {
    report.inventory = { available: false, httpStatus: error.upstreamStatus || null, squareCode: error.squareCode || null, nextAction: error.upstreamStatus === 403 ? "INVENTORY_READ\u6A29\u9650\u3092\u78BA\u8A8D" : "\u5728\u5EAB\u306F\u672A\u78BA\u8A8D\u3067\u3059\u30020\u4EF6\u3068\u3057\u3066\u6271\u308F\u305A\u63A5\u7D9A\u7D50\u679C\u3092\u78BA\u8A8D" };
  }
  report.recentOperations = (await manager.s.all("SELECT id,kind,resource_id,state,updated_at FROM mg_jobs WHERE resource_id=? OR resource_id IN (SELECT id FROM mg_variants WHERE product_id=?) ORDER BY updated_at DESC LIMIT 10", [id, id])).map((j) => ({ id: j.id, kind: j.kind, state: j.state, updatedAt: j.updated_at }));
  return report;
}
__name(inspectSync, "inspectSync");

// worker/src/management/square.js
var squareDescription = /* @__PURE__ */ __name((d) => d.description + (d.variants.some((v) => v.amount) ? "\n\n" + d.variants.filter((v) => v.amount).map((v) => v.name + "\uFF1A" + v.amount).join("\n") : ""), "squareDescription");
var Square = class {
  static {
    __name(this, "Square");
  }
  constructor(env) {
    this.env = env;
  }
  baseUrl() {
    return production(this.env) ? "https://connect.squareup.com" : "https://connect.squareupsandbox.com";
  }
  token() {
    return production(this.env) ? this.env.PRODUCTION_MANAGEMENT_SQUARE_TOKEN || this.env.SQUARE_ACCESS_TOKEN : ["sandbox-validation", "staging"].includes(this.env.RUNTIME_TIER) ? this.env.SQUARE_SANDBOX_ACCESS_TOKEN : this.env.SQUARE_ACCESS_TOKEN;
  }
  async verified(id) {
    const row = await this.env.ORDERS_DB.prepare("SELECT * FROM mg_mappings WHERE variation_id=?").bind(id).first();
    need(row?.environment === "production" && row.location_id === this.env.SQUARE_LOCATION_ID && row.instance_id === this.env.PRODUCTION_INSTANCE_ID && typeof row.sku === "string" && row.sku.length > 0 && row.verified_at, "\u5B9F\u7167\u5408\u6E08\u307F\u306E\u672C\u756A\u5BFE\u5FDC\u8868\u304C\u5FC5\u8981\u3067\u3059\u3002", 409);
    return row;
  }
  async request(path, method = "GET", body) {
    await guard(this.env);
    need(/^\/v2\/(locations|catalog\/(list(?:\?[^#]*)?|batch-upsert|object\/[A-Z0-9]+)|inventory\/(counts\/batch-retrieve|changes\/batch-create))$/.test(path), "\u8A31\u53EF\u3055\u308C\u3066\u3044\u306A\u3044Square\u64CD\u4F5C\u3067\u3059\u3002", 503);
    const url = this.baseUrl() + path;
    if (production(this.env)) productionSquareRequest(this.env, url, method, "management");
    else assertSquareRequest(this.env, url, method);
    if ((production(this.env) || externalPolicy(this.env).managementOnly) && method !== "GET" && path !== "/v2/inventory/counts/batch-retrieve") {
      await this.assertWritableLocation();
      if (path === "/v2/inventory/changes/batch-create") need(body?.changes?.length === 1 && body.changes[0].type === "PHYSICAL_COUNT" && body.changes[0].physical_count?.location_id === this.env.SQUARE_LOCATION_ID && body.changes[0].physical_count.state === "IN_STOCK", "\u7BA1\u7406\u5728\u5EAB\u306F\u5BFE\u8C61Location\u306E\u68DA\u5378\u3057\u78BA\u5B9A\u3060\u3051\u3092\u8A31\u53EF\u3057\u307E\u3059\u3002", 409);
      if (production(this.env) && path === "/v2/inventory/changes/batch-create") {
        const id = body.changes[0].physical_count.catalog_object_id, m = await this.verified(id), v = await this.object(id);
        need(v?.item_variation_data?.sku === m.sku && v.item_variation_data.item_id === m.item_id && v.item_variation_data.track_inventory === true, "\u5728\u5EAB\u64CD\u4F5C\u524D\u306B\u672C\u756AID\u30FBSKU\u304C\u5909\u308F\u3063\u3066\u3044\u307E\u3059\u3002", 409);
      }
      if (path === "/v2/catalog/batch-upsert") {
        const items = body?.batches?.flatMap((b) => b.objects) || [];
        need(items.length === 1 && items[0].type === "ITEM" && items.every((item) => [item, ...item.item_data?.variations || []].every((o) => o.present_at_all_locations === false && [...o.present_at_location_ids || [], ...o.absent_at_location_ids || []].every((id) => id === this.env.SQUARE_LOCATION_ID))), "Catalog\u306E\u516C\u958B\u5148\u306F\u5BFE\u8C61Sandbox Location\u3060\u3051\u306B\u9650\u5B9A\u3057\u307E\u3059\u3002", 409);
      }
    }
    if (path === "/v2/catalog/batch-upsert") {
      this.assertExistingBody(body);
      if (production(this.env)) for (const item of body.batches.flatMap((b) => b.objects)) for (const v of item.item_data.variations) {
        if (v.id.startsWith("#")) continue;
        const old = await this.verified(v.id);
        need(old.item_id === item.id && old.sku === v.item_variation_data.sku && v.item_variation_data.item_id === item.id, "\u65E2\u5B58\u306E\u672C\u756AItem\u30FBVariation\u30FBSKU\u3092\u5909\u66F4\u3067\u304D\u307E\u305B\u3093\u3002", 409);
      }
    }
    const token = this.token();
    need(token, "Square\u8A8D\u8A3CSecret\u304C\u672A\u8A2D\u5B9A\u3067\u3059\u3002", 503);
    const options = { method, redirect: "manual", signal: AbortSignal.timeout(8e3), headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", "Square-Version": "2026-07-15" }, ...body ? { body: JSON.stringify(body) } : {} };
    const r = this.env.LOCAL_SQUARE ? await this.env.LOCAL_SQUARE.fetch(new Request(url, options)) : await fetch(url, options);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const conflict = r.status === 409 || data.errors?.some((e) => ["VERSION_MISMATCH", "CATALOG_VERSION_MISMATCH"].includes(e.code));
      const error = new ManagementError(conflict ? 409 : r.status >= 400 && r.status < 500 && r.status !== 429 ? 422 : 503, conflict ? "Square\u5074\u304C\u5909\u66F4\u3055\u308C\u3066\u3044\u307E\u3059\u3002\u81EA\u52D5\u4E0A\u66F8\u304D\u3092\u505C\u6B62\u3057\u307E\u3057\u305F\u3002" : "Square\u540C\u671F\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002");
      error.upstreamStatus = r.status;
      error.squareCode = /^[A-Z0-9_]{1,80}$/.test(data.errors?.[0]?.code || "") ? data.errors[0].code : "UNKNOWN";
      throw error;
    }
    return data;
  }
  async assertUniqueSku(id, sku) {
    need(typeof sku === "string" && sku.length > 0, "\u5B9FSKU\u304C\u5FC5\u8981\u3067\u3059\u3002", 409);
    let cursor;
    const seen = /* @__PURE__ */ new Set();
    let found = 0;
    for (let page = 0; page < 100; page++) {
      const data = await this.request("/v2/catalog/list?types=ITEM_VARIATION" + (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""));
      for (const o of data.objects || []) if (!o.is_deleted && o.item_variation_data?.sku === sku) {
        need(o.id === id, "Square SKU\u304C\u91CD\u8907\u3057\u3066\u3044\u307E\u3059\u3002", 409);
        found++;
      }
      if (!data.cursor) {
        need(found === 1, "Square SKU\u304C\u6B20\u843D\u307E\u305F\u306F\u91CD\u8907\u3057\u3066\u3044\u307E\u3059\u3002", 409);
        return;
      }
      need(typeof data.cursor === "string" && !seen.has(data.cursor), "SKU\u7167\u5408\u306E\u4E00\u89A7\u53D6\u5F97\u304C\u4E0D\u5B8C\u5168\u3067\u3059\u3002", 409);
      cursor = data.cursor;
      seen.add(cursor);
    }
    need(false, "SKU\u7167\u5408\u306E\u4E0A\u9650\u3092\u8D85\u3048\u307E\u3057\u305F\u3002", 409);
  }
  async assertWritableLocation() {
    const data = await this.request("/v2/locations");
    const matches = (data.locations || []).filter((l) => l.id === this.env.SQUARE_LOCATION_ID);
    need(matches.length === 1 && matches[0].status === "ACTIVE" && matches[0].country === "JP" && matches[0].currency === "JPY", "Sandbox Location\u306E\u72B6\u614B\u30FB\u56FD\u30FB\u901A\u8CA8\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002\u66F8\u304D\u8FBC\u307F\u3092\u505C\u6B62\u3057\u307E\u3057\u305F\u3002", 409);
  }
  async assertNewSkusAvailable(product, maps) {
    if (!production(this.env) && !externalPolicy(this.env).managementOnly && this.env.RUNTIME_TIER !== "staging") return;
    const missing = product.variants.filter((v) => !maps.some((m) => m.variant_id === v.id));
    if (!missing.length) return;
    const skus = new Set(missing.map((v) => v.id)), seen = /* @__PURE__ */ new Set();
    let cursor;
    for (let page = 0; page < 100; page++) {
      const data = await this.request("/v2/catalog/list?types=ITEM_VARIATION" + (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""));
      need(!(data.objects || []).some((o) => !o.is_deleted && skus.has(o.item_variation_data?.sku)), "\u540C\u3058SKU\u306E\u5546\u54C1\u304CSquare\u306B\u5B58\u5728\u3057\u307E\u3059\u3002\u65B0\u898F\u767B\u9332\u305B\u305A\u5BFE\u5FDC\u8868\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002", 409);
      if (!data.cursor) return;
      need(typeof data.cursor === "string" && !seen.has(data.cursor), "Square\u5546\u54C1\u4E00\u89A7\u306E\u30DA\u30FC\u30B8\u53D6\u5F97\u304C\u4E0D\u5B8C\u5168\u3067\u3059\u3002", 409);
      cursor = data.cursor;
      seen.add(cursor);
    }
    need(false, "Square\u5546\u54C1\u4E00\u89A7\u306E\u78BA\u8A8D\u4E0A\u9650\u3092\u8D85\u3048\u307E\u3057\u305F\u3002", 409);
  }
  assertExistingBody(body) {
    if (!["sandbox-validation", "staging"].includes(this.env.RUNTIME_TIER)) return;
    for (const id of Object.keys(JSON.parse(this.env.SQUARE_VARIATION_IDS || "{}"))) {
      const ref = this.expectedLink(id);
      need(ref, "\u65E2\u5B58Item\u30FBVariation\u30FBSKU\u306E\u5BFE\u5FDC\u8868\u304C\u5FC5\u8981\u3067\u3059\u3002", 409);
      for (const item of body?.batches?.flatMap((b) => b.objects) || []) {
        const variations = item.item_data?.variations || [];
        const touched = item.id === ref.itemId || variations.some((v) => v.id === ref.variationId || [id, ref.sku].includes(v.item_variation_data?.sku));
        if (touched) need(item.id === ref.itemId && variations.some((v) => v.id === ref.variationId && v.item_variation_data?.item_id === ref.itemId && v.item_variation_data?.sku === ref.sku), "\u65E2\u5B58Square ID\u30FBSKU\u3092\u5909\u3048\u308B\u9001\u4FE1\u672C\u6587\u306F\u518D\u9001\u3067\u304D\u307E\u305B\u3093\u3002", 409);
      }
    }
  }
  expectedLink(id) {
    if (this.env.RUNTIME_TIER !== "sandbox-validation") return null;
    let links;
    try {
      links = JSON.parse(this.env.SQUARE_EXISTING_LINKS || "{}");
    } catch {
      need(false, "\u65E2\u5B58Square\u5BFE\u5FDC\u8868\u304C\u4E0D\u6B63\u3067\u3059\u3002", 503);
    }
    const ref = links[id];
    if (!ref) return null;
    need(ref.sku === "yasoya-sandbox-v1:" + id, "\u65E2\u5B58SKU\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002", 409);
    squareId(ref.itemId);
    squareId(ref.variationId);
    need(typeof ref.sku === "string" && ref.sku.length > 0 && ref.sku.length <= 255, "\u65E2\u5B58SKU\u304C\u4E0D\u6B63\u3067\u3059\u3002", 503);
    const ids = JSON.parse(this.env.SQUARE_VARIATION_IDS || "{}");
    need(ids[id] === ref.variationId, "\u65E2\u5B58Variation ID\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002", 409);
    return ref;
  }
  async preserveMappings(maps) {
    if ((production(this.env) || externalPolicy(this.env).managementOnly) && maps.length) {
      need(new Set(maps.map((m) => m.item_id)).size === 1, "\u5546\u54C1\u5BFE\u5FDC\u8868\u304C\u8907\u6570Item\u306B\u5206\u304B\u308C\u3066\u3044\u307E\u3059\u3002", 409);
      const item = await this.object(maps[0].item_id), known2 = new Set(maps.map((m) => m.variation_id));
      need(item?.type === "ITEM" && !item.is_deleted && item.item_data?.variations?.every((v) => known2.has(v.id)), "Square\u5074\u306B\u672A\u7BA1\u7406\u306E\u30D0\u30EA\u30A8\u30FC\u30B7\u30E7\u30F3\u304C\u3042\u308A\u307E\u3059\u3002\u4E0A\u66F8\u304D\u305B\u305A\u7167\u5408\u3057\u3066\u304F\u3060\u3055\u3044\u3002", 409);
    }
    return Promise.all(maps.map(async (m) => {
      const ref = this.expectedLink(m.variant_id), o = await this.object(m.variation_id), d = o?.item_variation_data;
      need(o?.id === m.variation_id && d?.item_id === m.item_id && typeof d.sku === "string" && d.sku.length > 0, "Square ID\u30FBSKU\u3092\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093\u3002", 409);
      if (["sandbox-validation", "staging"].includes(this.env.RUNTIME_TIER) && JSON.parse(this.env.SQUARE_VARIATION_IDS || "{}")[m.variant_id]) need(ref && ref.itemId === m.item_id && ref.variationId === m.variation_id && ref.sku === d.sku, "\u65E2\u5B58Square\u5BFE\u5FDC\u8868\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002", 409);
      if (production(this.env)) {
        const verified = await this.verified(m.variation_id);
        need(verified.item_id === m.item_id && verified.variant_id === m.variant_id && verified.sku === d.sku, "\u5B9F\u7167\u5408\u5F8C\u306B\u672C\u756AID\u30FBSKU\u304C\u5909\u308F\u3063\u3066\u3044\u307E\u3059\u3002", 409);
      }
      return { ...m, sku: d.sku };
    }));
  }
  async count(ids) {
    if (!ids.length) return /* @__PURE__ */ new Map();
    for (const id of ids) {
      squareId(id, this.env);
      if (production(this.env)) await this.verified(id);
    }
    if (ids.length > 100) {
      const counts = /* @__PURE__ */ new Map();
      for (let start = 0; start < ids.length; start += 100) for (const [id, n] of await this.count(ids.slice(start, start + 100))) counts.set(id, n);
      return counts;
    }
    const data = await this.request("/v2/inventory/counts/batch-retrieve", "POST", { catalog_object_ids: ids, location_ids: [this.env.SQUARE_LOCATION_ID], states: ["IN_STOCK"] });
    need(!data.cursor, "\u5728\u5EAB\u5FDC\u7B54\u304C\u4E0D\u5B8C\u5168\u3067\u3059\u3002", 503);
    const result = new Map(ids.map((id) => [id, 0]));
    for (const c of data.counts || []) if (ids.includes(c.catalog_object_id) && c.location_id === this.env.SQUARE_LOCATION_ID && c.state === "IN_STOCK") {
      const n = Number(c.quantity);
      need(Number.isSafeInteger(n) && n >= 0, "\u5728\u5EAB\u6570\u3092\u5B89\u5168\u306B\u6271\u3048\u307E\u305B\u3093\u3002", 409);
      result.set(c.catalog_object_id, n);
    }
    return result;
  }
  async findCreatedItem(body) {
    const sent = body?.batches?.[0]?.objects?.[0], skus = sent?.item_data?.variations?.map((v) => v.item_variation_data?.sku);
    need(sent?.id?.startsWith("#") && skus?.length && skus.every(Boolean) && new Set(skus).size === skus.length, "\u4F5C\u6210\u6642\u306ESKU\u8A3C\u8DE1\u304C\u3042\u308A\u307E\u305B\u3093\u3002\u81EA\u52D5\u7167\u5408\u3067\u304D\u307E\u305B\u3093\u3002", 409);
    const matches = /* @__PURE__ */ new Map(), seen = /* @__PURE__ */ new Set();
    let cursor;
    for (let page = 0; page < 100; page++) {
      const data = await this.request("/v2/catalog/list?types=ITEM" + (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""));
      for (const item of data.objects || []) if (!item.is_deleted && item.type === "ITEM" && item.item_data?.variations?.some((v) => skus.includes(v.item_variation_data?.sku))) matches.set(item.id, item);
      if (!data.cursor) {
        need(matches.size === 1, "\u4F5C\u6210\u6E08\u307FItem\u3092\u4E00\u610F\u306B\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093\u3002SKU\u306E\u6B20\u843D\u30FB\u91CD\u8907\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002", 409);
        return [...matches.values()][0];
      }
      need(typeof data.cursor === "string" && !seen.has(data.cursor), "Square\u4E00\u89A7\u306E\u7167\u5408\u304C\u4E0D\u5B8C\u5168\u3067\u3059\u3002", 503);
      seen.add(data.cursor);
      cursor = data.cursor;
    }
    need(false, "Square\u4E00\u89A7\u306E\u78BA\u8A8D\u4E0A\u9650\u3092\u8D85\u3048\u307E\u3057\u305F\u3002", 503);
  }
  async object(id) {
    squareId(id, this.env);
    return (await this.request("/v2/catalog/object/" + id)).object;
  }
  catalogBody(product, maps, key, imageIds = []) {
    const existing = maps[0];
    const itemId = existing?.item_id || "#item-" + product.id;
    const item = { type: "ITEM", id: itemId, present_at_all_locations: false, present_at_location_ids: [this.env.SQUARE_LOCATION_ID], item_data: { name: product.data.name, description: squareDescription(product.data), is_archived: false, image_ids: imageIds, variations: product.data.variants.map((v) => {
      const m = maps.find((m2) => m2.variant_id === v.id);
      need(!m || typeof m.sku === "string" && m.sku.length > 0, "\u65E2\u5B58SKU\u306E\u7167\u5408\u304C\u5FC5\u8981\u3067\u3059\u3002", 409);
      return { type: "ITEM_VARIATION", id: m?.variation_id || "#var-" + v.id, ...m ? { version: m.variation_version } : {}, present_at_all_locations: false, present_at_location_ids: v.active ? [this.env.SQUARE_LOCATION_ID] : [], absent_at_location_ids: v.active ? [] : [this.env.SQUARE_LOCATION_ID], item_variation_data: { item_id: itemId, name: v.name, sku: m?.sku ?? v.id, pricing_type: "FIXED_PRICING", price_money: { amount: v.price, currency: "JPY" }, track_inventory: true } };
    }) } };
    if (existing) item.version = existing.item_version;
    return { idempotency_key: key, batches: [{ objects: [item] }] };
  }
  async publish(body, expected) {
    const data = await this.request("/v2/catalog/batch-upsert", "POST", body);
    const item = data.objects?.find((o) => o.type === "ITEM");
    const target = body.batches[0].objects[0];
    return this.verifyCatalog(item, expected, target.item_data.image_ids, target.item_data.is_archived ? "archived" : target.absent_at_location_ids?.includes(this.env.SQUARE_LOCATION_ID) ? "stopped" : "published", target.item_data.variations);
  }
  verifyCatalog(item, expected, imageIds, status = "published", sent = []) {
    need(item?.item_data?.variations?.length === expected.variants.length, "Square\u5FDC\u7B54\u306E\u78BA\u8A8D\u304C\u5FC5\u8981\u3067\u3059\u3002", 409);
    need(item.item_data.name === expected.name && (item.item_data.description || "") === squareDescription(expected), "Square\u5546\u54C1\u60C5\u5831\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002", 409);
    if (imageIds) need(JSON.stringify(item.item_data.image_ids || []) === JSON.stringify(imageIds), "Square\u753B\u50CF\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002", 409);
    squareId(item.id, this.env);
    const present = /* @__PURE__ */ __name((o) => (o.present_at_all_locations || o.present_at_location_ids?.includes(this.env.SQUARE_LOCATION_ID)) && !o.absent_at_location_ids?.includes(this.env.SQUARE_LOCATION_ID), "present");
    need(status === "published" ? present(item) && !item.item_data.is_archived : !present(item) && Boolean(item.item_data.is_archived) === (status === "archived"), "Square\u8CA9\u58F2\u72B6\u614B\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002", 409);
    const maps = expected.variants.map((v, index) => {
      const desired = sent[index], ref = this.expectedLink(v.id), sku = desired?.item_variation_data?.sku || ref?.sku || v.id;
      const candidates = item.item_data.variations.filter((o2) => o2.item_variation_data?.sku === sku);
      need(candidates.length === 1, "Square SKU\u304C\u91CD\u8907\u307E\u305F\u306F\u6B20\u843D\u3057\u3066\u3044\u307E\u3059\u3002", 409);
      const o = candidates[0], d = o?.item_variation_data;
      need(d.item_id === item.id && (!desired || desired.id.startsWith("#") || o.id === desired.id) && (!ref || ref.itemId === item.id && ref.variationId === o.id && ref.sku === d.sku), "Square Item\u30FBVariation\u30FBSKU\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002", 409);
      need(d && d.price_money?.currency === "JPY" && Number(d.price_money.amount) === v.price && d.track_inventory === true && d.name === v.name, "Square\u306E\u5546\u54C1\u60C5\u5831\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002", 409);
      need(Boolean(present(o)) === (status === "published" && v.active), "Square\u306E\u8CA9\u58F2\u5BFE\u8C61\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002", 409);
      squareId(o.id, this.env);
      need(Number.isSafeInteger(item.version) && Number.isSafeInteger(o.version), "Square\u30D0\u30FC\u30B8\u30E7\u30F3\u304C\u4E0D\u660E\u3067\u3059\u3002", 409);
      return { variant_id: v.id, item_id: item.id, variation_id: o.id, item_version: item.version, variation_version: o.version, ...production(this.env) ? { sku: d.sku } : {} };
    });
    return maps;
  }
  async image(imageId, bytes, mime) {
    await guard(this.env);
    assertSquareWrite(this.env);
    const key = (production(this.env) ? "mg-production-image-" : "mg-image-") + imageId;
    if (production(this.env)) productionSquareRequest(this.env, this.baseUrl() + "/v2/catalog/images", "POST", "management");
    else assertSquareRequest(this.env, this.baseUrl() + "/v2/catalog/images", "POST");
    if (production(this.env) || externalPolicy(this.env).managementOnly) await this.assertWritableLocation();
    const form = new FormData();
    form.set("request", JSON.stringify({ idempotency_key: key, image: { type: "IMAGE", id: "#" + imageId, image_data: { name: imageId, caption: "\u5546\u54C1\u753B\u50CF" } } }));
    form.set("file", new Blob([bytes], { type: mime }), "product." + (mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg"));
    const token = this.token();
    need(token, "Square\u8A8D\u8A3CSecret\u304C\u672A\u8A2D\u5B9A\u3067\u3059\u3002", 503);
    const r = await (this.env.LOCAL_SQUARE ? this.env.LOCAL_SQUARE.fetch(new Request(this.baseUrl() + "/v2/catalog/images", { method: "POST", headers: { Authorization: "Bearer " + token, "Square-Version": "2026-07-15" }, body: form })) : fetch(this.baseUrl() + "/v2/catalog/images", { method: "POST", redirect: "manual", signal: AbortSignal.timeout(8e3), headers: { Authorization: "Bearer " + token, "Square-Version": "2026-07-15" }, body: form }));
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new ManagementError(r.status >= 500 || r.status === 429 ? 503 : 422, "Square\u753B\u50CF\u540C\u671F\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002");
    squareId(data.image?.id, this.env);
    return data.image.id;
  }
};

// worker/src/management/supervision.js
var WATCHDOG_MS = 6e4;
var STALLED_MS = 15 * 6e4;
var RETRY_WINDOW_MS = 36e5;
var Supervision = class {
  static {
    __name(this, "Supervision");
  }
  constructor(manager, services = {}) {
    this.m = manager;
    this.s = manager.s;
    this.storage = manager.storage;
    this.services = services;
  }
  time() {
    return this.services.now?.() ?? Date.now();
  }
  async alarmState(state) {
    try {
      await this.s.run("INSERT INTO mg_management_monitor(id,alarm_state,updated_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET alarm_state=excluded.alarm_state,updated_at=excluded.updated_at", [state, new Date(this.time()).toISOString()]);
    } catch {
      console.error("Management monitor state requires review");
    }
  }
  async arm(at = this.time() + 1e3) {
    try {
      const current = await this.storage.getAlarm();
      if (!current || current <= this.time() || at < current) await this.storage.setAlarm(at);
      await this.alarmState("ready");
      return true;
    } catch {
      await this.alarmState("failed");
      console.error("Management recovery alarm unavailable; durable jobs retained for watchdog");
      return false;
    }
  }
  async schedule() {
    try {
      const notifications = externalPolicy(this.m.env).mail ? " UNION ALL SELECT next_due AS due FROM mg_job_notifications WHERE state IN ('pending','blocked')" : "";
      const row = await this.s.one("SELECT MIN(due) AS due FROM (SELECT next_due AS due FROM mg_jobs WHERE state IN ('queued','running','retry')" + notifications + ")");
      return await this.arm(row?.due === null || row?.due === void 0 ? this.time() + WATCHDOG_MS : Math.max(this.time() + 1e3, Math.min(row.due, this.time() + WATCHDOG_MS)));
    } catch {
      await this.alarmState("failed");
      return false;
    }
  }
  async scan() {
    const at = this.time(), iso = new Date(at).toISOString();
    await this.s.run("UPDATE mg_jobs SET state='review',last_error='\u5B89\u5168\u306A\u518D\u8A66\u884C\u671F\u9650\u3092\u8D85\u3048\u307E\u3057\u305F\u3002\u7167\u5408\u304C\u5FC5\u8981\u3067\u3059\u3002',updated_at=? WHERE state IN ('queued','running','retry') AND result_json IS NULL AND (created_at<=? OR attempts>=8)", [iso, new Date(at - RETRY_WINDOW_MS).toISOString()]);
    await this.s.run("UPDATE mg_inventory_operations SET state='review' WHERE id IN (SELECT id FROM mg_jobs WHERE kind='stock' AND state='review') AND state!='review'");
    const rows = await this.s.all("SELECT id,kind,resource_id,state FROM mg_jobs j WHERE (state='review' OR (state IN ('queued','running','retry') AND created_at<=?)) AND NOT EXISTS(SELECT 1 FROM mg_job_notifications n WHERE n.job_id=j.id) ORDER BY created_at,id LIMIT 100", [new Date(at - STALLED_MS).toISOString()]);
    for (const row of rows) {
      const payload = { jobId: row.id, kind: row.kind, resourceId: row.resource_id, event: row.state === "review" ? "review" : "stalled" };
      await this.s.run("INSERT OR IGNORE INTO mg_job_notifications(job_id,payload_json,next_due,created_at) VALUES(?,?,?,?)", [row.id, JSON.stringify(payload), at, iso]);
    }
    await this.s.run("UPDATE mg_job_notifications SET state='cancelled' WHERE state IN ('pending','blocked') AND job_id IN (SELECT id FROM mg_jobs WHERE state='done')");
    await this.s.run("INSERT INTO mg_management_monitor(id,last_scan_at,updated_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET last_scan_at=excluded.last_scan_at,updated_at=excluded.updated_at", [iso, iso]);
  }
  async notify() {
    if (production(this.m.env) || !externalPolicy(this.m.env).mail) return;
    const n = await this.s.one("SELECT n.* FROM mg_job_notifications n JOIN mg_jobs j ON j.id=n.job_id WHERE n.state IN ('pending','blocked') AND n.next_due<=? AND j.state!='done' ORDER BY n.next_due,n.job_id LIMIT 1", [this.time()]);
    if (!n) return;
    if (!this.services.notify) {
      await this.s.run("UPDATE mg_job_notifications SET state='blocked',next_due=?,last_error='\u901A\u77E5\u8A2D\u5B9A\u304C\u672A\u5B8C\u4E86\u3067\u3059\u3002' WHERE job_id=?", [this.time() + 3e5, n.job_id]);
      return;
    }
    if (n.attempts >= 8 || n.first_attempt_at !== null && this.time() - n.first_attempt_at >= RETRY_WINDOW_MS) {
      await this.s.run("UPDATE mg_job_notifications SET state='expired',last_error='\u901A\u77E5\u7D50\u679C\u306F\u8981\u78BA\u8A8D\u3067\u3059\u3002\u65B0\u3057\u3044\u30AD\u30FC\u3067\u518D\u9001\u3057\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002' WHERE job_id=?", [n.job_id]);
      return;
    }
    await this.s.run("UPDATE mg_job_notifications SET state='pending',attempts=attempts+1,first_attempt_at=COALESCE(first_attempt_at,?),next_due=? WHERE job_id=?", [this.time(), this.time() + 6e4, n.job_id]);
    try {
      const accepted = await this.services.notify(JSON.parse(n.payload_json), "management-sync-" + n.job_id);
      if (!accepted) throw Error("Notification not acknowledged");
      await this.s.run("UPDATE mg_job_notifications SET state='sent',sent_at=?,last_error=NULL WHERE job_id=?", [new Date(this.time()).toISOString(), n.job_id]);
    } catch {
      await this.s.run("UPDATE mg_job_notifications SET last_error='\u901A\u77E5\u7D50\u679C\u3092\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093\u3002\u540C\u3058\u30AD\u30FC\u3067\u518D\u78BA\u8A8D\u3057\u307E\u3059\u3002',next_due=? WHERE job_id=?", [this.time() + Math.min(3e5, 15e3 * 2 ** n.attempts), n.job_id]);
    }
  }
  async status() {
    const state = await this.s.one("SELECT * FROM mg_management_monitor WHERE id=1");
    return { lastScanAt: state?.last_scan_at || null, alarmState: state?.alarm_state || "unknown", notificationAttention: (await this.s.one("SELECT COUNT(*) AS n FROM mg_job_notifications WHERE state IN ('blocked','expired')")).n };
  }
  async tick({ run = true } = {}) {
    if (externalPolicy(this.m.env).readOnly || production(this.m.env) && !productionPolicy(this.m.env).catalog && !productionPolicy(this.m.env).inventory) return;
    try {
      await this.scan();
      if (run) {
        const next = await this.s.one("SELECT id FROM mg_jobs WHERE state IN ('queued','running','retry') AND next_due<=? ORDER BY next_due,created_at LIMIT 1", [this.time()]);
        if (next) await this.m.run(next.id);
        await this.scan();
        await this.notify();
      }
    } finally {
      await this.schedule();
    }
  }
};

// worker/src/management/service.js
var Management = class {
  static {
    __name(this, "Management");
  }
  constructor(env, storage, services = {}) {
    this.env = env;
    this.storage = storage;
    this.s = new Store(env);
    this.square = new Square(env);
    this.supervision = new Supervision(this, services);
  }
  async command(id, fingerprint) {
    const previous = await this.s.one("SELECT * FROM mg_commands WHERE id=?", [id]);
    if (!previous) return null;
    need(previous.fingerprint === fingerprint, "\u540C\u3058\u64CD\u4F5CID\u306E\u5185\u5BB9\u3092\u5909\u66F4\u3067\u304D\u307E\u305B\u3093\u3002", 409);
    return JSON.parse(previous.result_json);
  }
  async save(id, input, actor) {
    productionGrant(this.env, "draft");
    identifier(id);
    operation(input.operationId);
    const data = draft(input);
    const fp = await digest(["save", id, input.expectedVersion, input.slug, data]);
    const previous = await this.command(input.operationId, fp);
    if (previous) return previous;
    const p = await this.s.product(id);
    need((p?.version || 0) === input.expectedVersion, "\u5225\u306E\u753B\u9762\u3067\u66F4\u65B0\u3055\u308C\u3066\u3044\u307E\u3059\u3002\u518D\u8AAD\u8FBC\u3057\u3066\u304F\u3060\u3055\u3044\u3002", 409);
    const slug = identifier(input.slug);
    need(!p || p.slug === slug, "\u65E2\u5B58\u5546\u54C1\u306EURL\u306F\u5909\u66F4\u3067\u304D\u307E\u305B\u3093\u3002", 409);
    const old = p?.draft.variants || [];
    need(old.every((v) => data.variants.some((n) => n.id === v.id)), "\u65E2\u5B58\u30D0\u30EA\u30A8\u30FC\u30B7\u30E7\u30F3\u306F\u524A\u9664\u305B\u305A\u8CA9\u58F2\u505C\u6B62\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
    if (!integratedPublication(this.env)) await this.s.assertUnlocked([...old, ...data.variants].map((v) => v.id));
    for (const v of data.variants) {
      const row = await this.s.one("SELECT product_id FROM mg_variants WHERE id=?", [v.id]);
      need(!row || row.product_id === id, "\u5225\u5546\u54C1\u3067\u4F7F\u7528\u4E2D\u306E\u8B58\u5225\u5B50\u3067\u3059\u3002", 409);
    }
    for (const image3 of data.images) need(await this.s.one("SELECT id FROM mg_images WHERE id=?", [image3]), "\u753B\u50CF\u3092\u5148\u306B\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
    const latest = integratedPublication(this.env) ? (await this.s.one("SELECT MAX(revision) AS revision FROM mg_revisions WHERE product_id=?", [id]))?.revision : p?.draft_revision;
    const revision = (latest || 0) + 1, version = (p?.version || 0) + 1, result = { id, version, revision };
    const at = now();
    const statements = [["INSERT INTO mg_revisions VALUES(?,?,?,?)", [id, revision, json(data), at]]];
    if (p) statements.push(["UPDATE mg_products SET draft_revision=?,version=?,updated_at=? WHERE id=?", [revision, version, at, id]]);
    else statements.push(["INSERT INTO mg_products VALUES(?,?,?,?,?,?,?,?,?)", [id, slug, data.sortOrder, "draft", version, revision, null, at, at]]);
    for (const v of data.variants) statements.push(["INSERT OR IGNORE INTO mg_variants VALUES(?,?)", [v.id, id]]);
    statements.push(["INSERT INTO mg_commands VALUES(?,?,?)", [input.operationId, fp, json(result)]], this.s.audit(actor, "draft_saved", id, { revision, version }));
    await this.s.batch(statements);
    return result;
  }
  async link(id, input, actor) {
    productionGrant(this.env, "draft");
    operation(input.operationId);
    const fp = await digest(["link", id, input]);
    const previous = await this.command(input.operationId, fp);
    if (previous) return previous;
    const p = await this.s.product(id);
    need(p, "\u5546\u54C1\u304C\u3042\u308A\u307E\u305B\u3093\u3002", 404);
    need(p.version === input.expectedVersion, "\u518D\u8AAD\u8FBC\u3057\u3066\u304F\u3060\u3055\u3044\u3002", 409);
    await this.s.assertUnlocked(p.draft.variants.map((v) => v.id));
    if (!input.mappings && this.env.RUNTIME_TIER === "sandbox-validation") {
      const ids = JSON.parse(this.env.SQUARE_VARIATION_IDS || "{}");
      input.mappings = p.draft.variants.map((v) => ({ variantId: v.id, variationId: ids[v.id] }));
    }
    need(Array.isArray(input.mappings) && input.mappings.length === p.draft.variants.length, "\u5168\u30D0\u30EA\u30A8\u30FC\u30B7\u30E7\u30F3\u306E\u5BFE\u5FDC\u8868\u304C\u5FC5\u8981\u3067\u3059\u3002");
    const maps = [];
    for (const v of p.draft.variants) {
      need(!await this.s.one("SELECT variant_id FROM mg_mappings WHERE variant_id=?", [v.id]), "\u5BFE\u5FDC\u6E08\u307FID\u306F\u5909\u66F4\u3067\u304D\u307E\u305B\u3093\u3002", 409);
      const ref = input.mappings.find((m) => m.variantId === v.id);
      squareId(ref?.variationId, this.env);
      const variation = await this.square.object(ref.variationId), d = variation?.item_variation_data;
      need(variation?.type === "ITEM_VARIATION" && d?.price_money?.currency === "JPY" && Number(d.price_money.amount) === v.price && d.name === v.name && d.track_inventory === true, "Sandbox\u306E\u5546\u54C1\u5185\u5BB9\u3068\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002", 409);
      if (production(this.env)) {
        await this.square.assertWritableLocation();
        await this.square.assertUniqueSku(variation.id, d.sku);
      }
      const expected = this.square.expectedLink(v.id);
      if (this.env.RUNTIME_TIER === "sandbox-validation" && JSON.parse(this.env.SQUARE_VARIATION_IDS || "{}")[v.id]) need(expected && expected.variationId === variation.id && expected.itemId === d.item_id && expected.sku === d.sku && !variation.is_deleted && (variation.present_at_all_locations || variation.present_at_location_ids?.includes(this.env.SQUARE_LOCATION_ID)) && !variation.absent_at_location_ids?.includes(this.env.SQUARE_LOCATION_ID), "\u65E2\u5B58Item\u30FBVariation\u30FBSKU\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002", 409);
      if (production(this.env) && integratedPublication(this.env)) {
        const known2 = existingProductionProduct(v.id);
        if (known2) need(variation.id === known2.variationId && d.item_id === known2.itemId && d.sku === known2.sku, "\u65E2\u5B58\u672C\u756A\u5546\u54C1\u306EItem\u30FBVariation\u30FBSKU\u304C\u78BA\u8A8D\u6E08\u307F\u5BFE\u5FDC\u8868\u3068\u7570\u306A\u308A\u307E\u3059\u3002", 409);
      }
      need(variation.id === ref.variationId, "Variation ID\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002", 409);
      const item = await this.square.object(d.item_id);
      need(item?.id === d.item_id, "Item ID\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002", 409);
      need(item?.type === "ITEM" && Number.isSafeInteger(item.version) && Number.isSafeInteger(variation.version), "Square\u306E\u5546\u54C1\u304C\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093\u3002", 409);
      need((item.present_at_all_locations || item.present_at_location_ids?.includes(this.env.SQUARE_LOCATION_ID)) && !item.absent_at_location_ids?.includes(this.env.SQUARE_LOCATION_ID), "Location\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002", 409);
      maps.push({ variant_id: v.id, item_id: item.id, variation_id: variation.id, item_version: item.version, variation_version: variation.version, ...production(this.env) ? { sku: d.sku } : {} });
    }
    need(new Set(maps.map((m) => m.item_id)).size === 1, "\u5546\u54C1\u304C\u8907\u6570\u306ESquare Item\u3078\u5206\u304B\u308C\u3066\u3044\u307E\u3059\u3002", 409);
    await this.s.batch([...maps.map((m) => this.mappingInsert(m)), ["UPDATE mg_products SET version=version+1 WHERE id=?", [id]], ["INSERT INTO mg_commands VALUES(?,?,?)", [input.operationId, fp, json({ ok: true })]], this.s.audit(actor, production(this.env) ? "production_linked" : "sandbox_linked", id, { variants: maps.map((m) => m.variant_id) })]);
    return { ok: true };
  }
  mappingInsert(m) {
    if (production(this.env)) {
      need(typeof m.sku === "string" && m.sku.length > 0, "\u5B9F\u7167\u5408\u3057\u305FSKU\u304C\u5FC5\u8981\u3067\u3059\u3002", 409);
      return ["INSERT INTO mg_mappings(variant_id,environment,location_id,item_id,variation_id,item_version,variation_version,sku,instance_id,verified_at) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(variant_id) DO UPDATE SET item_version=excluded.item_version,variation_version=excluded.variation_version,verified_at=excluded.verified_at WHERE item_id=excluded.item_id AND variation_id=excluded.variation_id AND sku=excluded.sku", [m.variant_id, "production", this.env.SQUARE_LOCATION_ID, m.item_id, m.variation_id, m.item_version, m.variation_version, m.sku, this.env.PRODUCTION_INSTANCE_ID, now()]];
    }
    return ["INSERT INTO mg_mappings VALUES(?,?,?,?,?,?,?) ON CONFLICT(variant_id) DO UPDATE SET item_id=excluded.item_id,variation_id=excluded.variation_id,item_version=excluded.item_version,variation_version=excluded.variation_version", [m.variant_id, "sandbox", this.env.SQUARE_LOCATION_ID, m.item_id, m.variation_id, m.item_version, m.variation_version]];
  }
  async assertSalesCatalog(quote) {
    for (const v of quote.items) {
      if (production(this.env) && !(await this.s.publicProducts()).some((p) => p.status === "published" && p.variants.some((n) => n.id === v.id && n.active))) {
        need(this.env.PRODUCTION_MANAGED_CHECKOUT_ENABLED !== "1", "\u516C\u958B\u4E2D\u30FB\u6709\u52B9\u306A\u8CFC\u5165\u5BFE\u8C61\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002", 409);
        continue;
      }
      const mapping = await this.s.one("SELECT * FROM mg_mappings WHERE variant_id=?", [v.id]);
      need(mapping, "Square\u5BFE\u5FDC\u304C\u3042\u308A\u307E\u305B\u3093\u3002", 409);
      const object = await this.square.object(mapping.variation_id), data = object?.item_variation_data;
      if (salesCatalogVerificationEnabled(this.env)) {
        const check = await inspectSalesCatalog(this, mapping, object, v);
        need(check.ok, "Square\u7167\u5408\u4E0D\u4E00\u81F4\uFF1A" + check.mismatches.map((m) => m.label + (m.key === "version" ? "\uFF08D1 " + m.saved + " \uFF0F Square " + m.current + "\uFF09" : "")).join("\u30FB") + "\u3002\u7BA1\u7406\u753B\u9762\u306E\u300C\u540C\u671F\u72B6\u6CC1\u3092\u78BA\u8A8D\uFF08\u8AAD\u53D6\u306E\u307F\uFF09\u300D\u3067\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u518D\u9001\u3084\u5728\u5EAB\u4E0A\u66F8\u304D\u306F\u3057\u3066\u3044\u307E\u305B\u3093\u3002", 409);
        continue;
      }
      need(data && Number(data.price_money?.amount) === v.unitPrice && data.price_money.currency === "JPY" && data.name === v.name && object.version === mapping.variation_version && data.track_inventory === true && !object.absent_at_location_ids?.includes(this.env.SQUARE_LOCATION_ID), "Square\u306E\u5546\u54C1\u304C\u5916\u90E8\u304B\u3089\u5909\u66F4\u3055\u308C\u3066\u3044\u307E\u3059\u3002\u518D\u540C\u671F\u3059\u308B\u307E\u3067\u8CFC\u5165\u3067\u304D\u307E\u305B\u3093\u3002", 409);
    }
  }
  async assertNoPurchaseHold(ids) {
    const holds = await this.storage.get("sku-holds") || {};
    for (const id of ids) {
      const m = await this.s.one("SELECT variation_id FROM mg_mappings WHERE variant_id=?", [id]);
      need(!m || !holds[`${this.env.SQUARE_LOCATION_ID}:${m.variation_id}`]?.length, "\u6CE8\u6587\u306E\u5728\u5EAB\u78BA\u8A8D\u4E2D\u3067\u3059\u3002\u4FDD\u7559\u3092\u89E3\u6D88\u3059\u308B\u307E\u3067\u5909\u66F4\u3067\u304D\u307E\u305B\u3093\u3002", 409);
    }
  }
  async queue(kind, id, payload, op, actor, ids, extra = []) {
    assertSquareWrite(this.env, kind === "stock" ? "inventory" : "catalog");
    operation(op);
    const fp = await digest([kind, id, payload]);
    const previous = await this.s.one("SELECT * FROM mg_jobs WHERE id=?", [op]);
    if (previous) {
      need(previous.fingerprint === fp, "\u540C\u3058\u64CD\u4F5CID\u306E\u5185\u5BB9\u3092\u5909\u66F4\u3067\u304D\u307E\u305B\u3093\u3002", 409);
      return this.job(op);
    }
    await this.s.assertUnlocked(ids);
    await this.assertNoPurchaseHold(ids);
    const at = now();
    await this.supervision.arm();
    await this.s.batch([["INSERT INTO mg_jobs(id,kind,resource_id,fingerprint,payload_json,state,next_due,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)", [op, kind, id, fp, json(payload), "queued", Date.now(), at, at]], ...ids.map((v) => ["INSERT INTO mg_locks VALUES(?,?)", [v, op]]), ...extra, this.s.audit(actor, "job_queued", id, { job: op, kind })]);
    if (await this.schedule()) await this.run(op);
    await this.schedule();
    return this.job(op);
  }
  async publish(id, input, actor) {
    assertSquareWrite(this.env);
    operation(input.operationId);
    const old = await this.s.one("SELECT * FROM mg_jobs WHERE id=?", [input.operationId]);
    if (old) {
      const q = JSON.parse(old.payload_json);
      need(old.kind === "publish" && old.resource_id === id && q.expectedVersion === input.expectedVersion, "\u64CD\u4F5CID\u304C\u5225\u306E\u5185\u5BB9\u306B\u4F7F\u308F\u308C\u3066\u3044\u307E\u3059\u3002", 409);
      return this.job(old.id);
    }
    const p = await this.s.product(id);
    need(p && p.version === input.expectedVersion, "\u5546\u54C1\u304C\u66F4\u65B0\u3055\u308C\u3066\u3044\u307E\u3059\u3002\u518D\u8AAD\u8FBC\u3057\u3066\u304F\u3060\u3055\u3044\u3002", 409);
    need(!retiredProduct(this.env, p) && !(await this.s.retiredProductIds()).has(id), "\u3053\u306E\u5546\u54C1\u306F\u8CA9\u58F2\u7D42\u4E86\u3067\u3059\u3002\u5C65\u6B74\u30FBSquare ID\u3092\u7DAD\u6301\u3057\u3001\u518D\u516C\u958B\u306F\u884C\u3044\u307E\u305B\u3093\u3002", 409);
    if (production(this.env)) for (const v of p.draft.variants) need(!CATALOG[v.id] || v.price === CATALOG[v.id].price, "\u65E2\u5B58\u516C\u958B\u30B5\u30A4\u30C8\u306E\u4FA1\u683C\u5207\u66FF\u306F\u672A\u5B9F\u88C5\u3067\u3059\u3002\u4FA1\u683C\u5909\u66F4\u3092\u516C\u958B\u3067\u304D\u307E\u305B\u3093\u3002", 409);
    if (integratedPublication(this.env)) {
      const locks = await this.s.locked(p.draft.variants.map((v) => v.id));
      need(!locks.length, "\u65E2\u5B58\u306E\u540C\u671F\u30FB\u5728\u5EAB\u30ED\u30C3\u30AF\u304C\u3042\u308A\u307E\u3059\u3002\u65B0\u3057\u3044\u540C\u671F\u306F\u958B\u59CB\u3057\u3066\u3044\u307E\u305B\u3093\u3002\u300C\u540C\u671F\u72B6\u6CC1\u3092\u78BA\u8A8D\uFF08\u8AAD\u53D6\u306E\u307F\uFF09\u300D\u3067\u5B9F\u884C\u4E2D\u30FB\u518D\u8A66\u884C\u5F85\u3061\u30FB\u8981\u78BA\u8A8D\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002", 409);
      await this.square.assertWritableLocation();
    }
    const maps = await this.s.all("SELECT m.* FROM mg_mappings m JOIN mg_variants v ON v.id=m.variant_id WHERE v.product_id=?", [id]);
    for (const v of p.draft.variants) need(!CATALOG[v.id] || maps.some((m) => m.variant_id === v.id), "\u65E2\u5B58\u5546\u54C1\u306FSandbox ID\u3092\u95A2\u9023\u4ED8\u3051\u3066\u304B\u3089\u516C\u958B\u3057\u3066\u304F\u3060\u3055\u3044\u3002", 409);
    return this.queue("publish", id, { expectedVersion: p.version, revision: p.draft_revision, data: p.draft, maps, targetStatus: "published", ...integratedPublication(this.env) && input.releaseSite ? { releaseSite: true } : {} }, input.operationId, actor, p.draft.variants.map((v) => v.id));
  }
  async state(id, input, actor) {
    assertSquareWrite(this.env);
    operation(input.operationId);
    need(["stopped", "archived"].includes(input.status), "\u8CA9\u58F2\u505C\u6B62\u307E\u305F\u306F\u30A2\u30FC\u30AB\u30A4\u30D6\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
    const previous = await this.command(input.operationId, await digest(["state", id, input]));
    if (previous) return previous;
    const p = await this.s.product(id);
    need(p && p.version === input.expectedVersion, "\u5546\u54C1\u304C\u66F4\u65B0\u3055\u308C\u3066\u3044\u307E\u3059\u3002", 409);
    await this.s.assertUnlocked(p.draft.variants.map((v) => v.id));
    const result = { ok: true, status: input.status };
    const extra = [["UPDATE mg_products SET status=?,version=version+1,updated_at=? WHERE id=?", [input.status, now(), id]], ["INSERT INTO mg_commands VALUES(?,?,?)", [input.operationId, await digest(["state", id, input]), json(result)]], this.s.audit(actor, input.status, id, {})];
    extra.push(...await removeFeaturedStatements(this.s, id, actor));
    const maps = await this.s.all("SELECT m.* FROM mg_mappings m JOIN mg_variants v ON v.id=m.variant_id WHERE v.product_id=?", [id]);
    if (maps.length && p.published_revision) {
      const r = await this.s.one("SELECT data_json FROM mg_revisions WHERE product_id=? AND revision=?", [id, p.published_revision]);
      await this.queue("state", id, { expectedVersion: p.version + 1, revision: p.published_revision, data: JSON.parse(r.data_json), maps, targetStatus: input.status }, input.operationId, actor, p.draft.variants.map((v) => v.id), extra);
    } else await this.s.batch(extra);
    return result;
  }
  async inventory() {
    const retired = await this.s.retiredProductIds(), products = (await this.s.products()).filter((p) => !retired.has(p.id)), allowed = new Set(products.flatMap((p) => p.draft.variants.map((v) => v.id))), maps = (await this.s.all("SELECT * FROM mg_mappings")).filter((m) => allowed.has(m.variant_id)), counts = await this.square.count(maps.map((m) => m.variation_id));
    const locks = await this.s.all("SELECT * FROM mg_locks"), holds = await this.storage.get("sku-holds") || {};
    const at = now();
    const rows = [], snapshots = [];
    for (const p of products) for (const v of p.draft.variants) {
      const m = maps.find((m2) => m2.variant_id === v.id), quantity = m ? counts.get(m.variation_id) : null;
      rows.push({ source: externalPolicy(this.env).source, accessMode: externalPolicy(this.env).managementOnly ? "SANDBOX_MANAGEMENT" : externalPolicy(this.env).readOnly ? "READ_ONLY" : "READ_WRITE", ...production(this.env) ? { canWriteInventory: productionPolicy(this.env).inventory } : {}, id: v.id, name: v.name, productId: p.id, productStatus: p.status, quantity, observedAt: m ? at : null, syncState: locks.find((l) => l.variant_id === v.id) ? "held" : m ? "synced" : "unmapped", held: Boolean(locks.some((l) => l.variant_id === v.id) || m && holds[`${this.env.SQUARE_LOCATION_ID}:${m.variation_id}`]?.length) });
      if (m) snapshots.push([v.id, quantity, at]);
    }
    for (let start = 0; start < snapshots.length; start += 25) {
      const batch = snapshots.slice(start, start + 25);
      await this.s.run("INSERT INTO mg_stock_snapshot VALUES " + batch.map(() => "(?,?,?)").join(",") + " ON CONFLICT(variant_id) DO UPDATE SET quantity=excluded.quantity,observed_at=excluded.observed_at", batch.flat());
    }
    return rows;
  }
  async adjust(id, input, actor) {
    assertSquareWrite(this.env, "inventory");
    operation(input.operationId);
    const old = await this.s.one("SELECT * FROM mg_jobs WHERE id=?", [input.operationId]);
    if (old) {
      need(old.kind === "stock" && old.resource_id === id && JSON.parse(old.payload_json).requestFingerprint === await digest(input), "\u64CD\u4F5CID\u304C\u5225\u306E\u5185\u5BB9\u306B\u4F7F\u308F\u308C\u3066\u3044\u307E\u3059\u3002", 409);
      return this.job(old.id);
    }
    need(this.env.MANAGEMENT_STOCK_WRITES === "single-writer", "\u5728\u5EAB\u5909\u66F4\u306B\u306F\u8CA9\u58F2\u7D4C\u8DEF\u306E\u6392\u4ED6\u65B9\u91DD\u306E\u627F\u8A8D\u304C\u5FC5\u8981\u3067\u3059\u3002", 409);
    need(["receipt", "adjustment", "count"].includes(input.kind), "\u5728\u5EAB\u64CD\u4F5C\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002");
    const quantity = integer(input.quantity, input.kind === "adjustment" ? -1e5 : 0, 1e5);
    if (input.kind === "receipt") need(quantity > 0, "\u5165\u5EAB\u6570\u306F1\u4EE5\u4E0A\u3067\u3059\u3002");
    const reason = text(input.reason, 500), m = await this.s.one("SELECT * FROM mg_mappings WHERE variant_id=?", [id]);
    need(m, "Square\u3068\u306E\u5BFE\u5FDC\u304C\u3042\u308A\u307E\u305B\u3093\u3002", 409);
    const retired = await this.s.retiredProductIds();
    if (retired.size) {
      const owner = await this.s.one("SELECT product_id FROM mg_variants WHERE id=?", [id]);
      need(!retired.has(owner?.product_id), "\u8CA9\u58F2\u7D42\u4E86\u5546\u54C1\u306E\u5728\u5EAB\u5909\u66F4\u306F\u53D7\u3051\u4ED8\u3051\u307E\u305B\u3093\u3002\u65E2\u5B58\u5728\u5EAB\u30FB\u5C65\u6B74\u3092\u7DAD\u6301\u3057\u307E\u3059\u3002", 409);
    }
    await this.s.assertUnlocked([id]);
    await this.assertNoPurchaseHold([id]);
    need(Number.isFinite(Date.parse(input.observedAt)) && Date.now() - Date.parse(input.observedAt) < 3e5 && Date.parse(input.observedAt) <= Date.now() + 5e3, "\u5728\u5EAB\u8868\u793A\u3092\u66F4\u65B0\u3057\u3066\u304F\u3060\u3055\u3044\u3002", 409);
    const current = (await this.square.count([m.variation_id])).get(m.variation_id);
    need(current === input.expectedQuantity, "\u5728\u5EAB\u304C\u5909\u66F4\u3055\u308C\u3066\u3044\u307E\u3059\u3002\u518D\u8AAD\u8FBC\u3057\u3066\u304F\u3060\u3055\u3044\u3002", 409);
    const target = input.kind === "count" ? quantity : current + quantity;
    integer(target, 0, 1e6);
    return this.queue("stock", id, { kind: input.kind, quantity, reason, before: current, target, mapping: m, requestFingerprint: await digest(input) }, input.operationId, actor, [id], [["INSERT INTO mg_inventory_operations VALUES(?,?,?,?,?,?,?,?,?,?)", [input.operationId, id, input.kind, quantity, reason, actor, current, null, "queued", now()]]]);
  }
  async job(id) {
    const r = await this.s.one("SELECT j.*,n.state AS notification_state FROM mg_jobs j LEFT JOIN mg_job_notifications n ON n.job_id=j.id WHERE j.id=?", [id]);
    need(r, "\u30B8\u30E7\u30D6\u304C\u3042\u308A\u307E\u305B\u3093\u3002", 404);
    const payload = JSON.parse(r.payload_json);
    return { release: Boolean(payload.releaseSite), submittedRevision: payload.revision ?? null, phase: r.state === "done" ? "complete" : r.result_json ? "save-and-publish" : r.body_json ? "square-confirmation" : "validation", nextAction: r.state === "done" ? "\u516C\u958B\u6E08\u307F" : r.state === "review" ? "\u540C\u3058\u51E6\u7406\u3092\u8AAD\u53D6\u7167\u5408\u3002\u65B0\u898F\u30AD\u30FC\u3067\u518D\u9001\u3057\u306A\u3044" : "\u540C\u3058\u516C\u958B\u51E6\u7406\u3092\u78BA\u8A8D\u30FB\u518D\u958B", id: r.id, kind: r.kind, resourceId: r.resource_id, state: r.state, attempts: r.attempts, error: r.last_error, updatedAt: r.updated_at, lockCount: (await this.s.one("SELECT COUNT(*) AS n FROM mg_locks WHERE job_id=?", [id])).n, notificationState: r.notification_state || "none" };
  }
  async jobs() {
    return Promise.all((await this.s.all("SELECT id FROM mg_jobs ORDER BY created_at DESC LIMIT 200")).map((r) => this.job(r.id)));
  }
  async reconcile(id) {
    if (!production(this.env) && this.env.RUNTIME_TIER !== "staging") assertSquareWrite(this.env);
    const j = await this.s.one("SELECT * FROM mg_jobs WHERE id=?", [id]);
    need(j, "\u30B8\u30E7\u30D6\u304C\u3042\u308A\u307E\u305B\u3093\u3002", 404);
    productionGrant(this.env, j.kind === "stock" ? "inventory" : "catalog");
    if (j.state === "done") {
      if (integratedPublication(this.env)) {
        const proof = j.result_json && JSON.parse(j.result_json);
        need(j.kind === "stock" ? proof?.applied === true : Array.isArray(proof?.mappings) && proof.mappings.length > 0, "\u6210\u529F\u8A3C\u8DE1\u304C\u306A\u3044\u305F\u3081\u30ED\u30C3\u30AF\u3092\u89E3\u9664\u3067\u304D\u307E\u305B\u3093\u3002", 409);
        await this.s.batch([["DELETE FROM mg_locks WHERE job_id=?", [id]], this.s.audit("authenticated-admin", "completed_lock_released", j.resource_id, { job: id })]);
      }
      return this.job(id);
    }
    need(j.state === "review" || integratedPublication(this.env) && j.kind !== "stock" && ["queued", "running", "retry"].includes(j.state), "\u8AAD\u307F\u53D6\u308A\u7167\u5408\u3067\u304D\u308B\u72B6\u614B\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002\u518D\u9001\u305B\u305A\u72B6\u614B\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002", 409);
    const p = JSON.parse(j.payload_json);
    let result;
    if (j.kind === "stock") {
      need(j.result_json, "\u5728\u5EAB\u64CD\u4F5C\u306E\u6210\u529F\u8A3C\u8DE1\u304C\u3042\u308A\u307E\u305B\u3093\u3002Square\u5074\u5C65\u6B74\u306E\u624B\u52D5\u78BA\u8A8D\u304C\u5FC5\u8981\u3067\u3059\u3002", 409);
      const count = (await this.square.count([p.mapping.variation_id])).get(p.mapping.variation_id);
      need(count === p.target, "\u5728\u5EAB\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002\u4E0A\u66F8\u304D\u305B\u305A\u505C\u6B62\u3057\u307E\u3057\u305F\u3002", 409);
      result = JSON.parse(j.result_json);
    } else if (integratedPublication(this.env)) {
      const proof = await catalogProof(this, j);
      need(proof.state === "matched", proof.message + " " + proof.checks.filter((c) => !c.ok).map((c) => c.label).join("\u30FB"), 409);
      result = { mappings: proof.mappings, evidence: { type: "saved-request-current-state-match", checks: proof.checks, versions: proof.versionInfo, checkedAt: now() } };
    } else {
      const known2 = j.result_json ? JSON.parse(j.result_json).mappings : p.maps;
      const body = j.body_json ? JSON.parse(j.body_json) : null;
      need(known2?.length || this.env.RUNTIME_TIER === "staging" && body, "Square Item ID\u304C\u4E0D\u660E\u3067\u3059\u3002\u81EA\u52D5\u7167\u5408\u3067\u304D\u307E\u305B\u3093\u3002", 409);
      const item = known2?.length ? await this.square.object(known2[0].item_id) : await this.square.findCreatedItem(body);
      const mappings = this.square.verifyCatalog(item, p.data, body?.batches[0].objects[0].item_data.image_ids, p.targetStatus, body?.batches[0].objects[0].item_data.variations);
      for (const old of known2 || []) {
        const m = mappings.find((m2) => m2.variant_id === old.variant_id);
        need(m?.variation_id === old.variation_id && (this.env.RUNTIME_TIER !== "staging" || m.item_id === old.item_id), "Square ID\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002", 409);
      }
      result = { mappings };
    }
    if (integratedPublication(this.env)) {
      const updates = j.kind === "stock" ? [
        ["UPDATE mg_inventory_operations SET after_quantity=?,state=? WHERE id=?", [p.target, "done", id]],
        ["INSERT INTO mg_stock_snapshot VALUES(?,?,?) ON CONFLICT(variant_id) DO UPDATE SET quantity=excluded.quantity,observed_at=excluded.observed_at", [j.resource_id, p.target, now()]]
      ] : result.mappings.map((m) => this.mappingInsert(m));
      updates.push(...releaseStatements(this, j, p));
      updates.push(["UPDATE mg_jobs SET result_json=?,state='done',last_error=NULL,updated_at=? WHERE id=?", [json(result), now(), id]], ["DELETE FROM mg_locks WHERE job_id=?", [id]], this.s.audit("authenticated-admin", "job_readonly_reconciled", j.resource_id, { job: id, kind: j.kind, squareWrite: false }));
      await this.s.batch(updates);
      return this.job(id);
    }
    await this.s.run("UPDATE mg_jobs SET result_json=?,state='queued' WHERE id=?", [json(result), id]);
    await this.run(id);
    await this.schedule();
    return this.job(id);
  }
  async adoptCurrent(id) {
    need(this.env.RUNTIME_TIER === "staging", "\u30B9\u30C6\u30FC\u30B8\u30F3\u30B0\u5C02\u7528\u3067\u3059\u3002", 403);
    let stage = "read-proof";
    try {
      const j = await this.s.one("SELECT * FROM mg_jobs WHERE id=?", [id]);
      if (j?.state === "cancelled" && JSON.parse(j.result_json || "{}").resolution === "version-fenced-current-state-adopted") {
        stage = "read-result";
        return await this.job(id);
      }
      need(j?.state === "review" && j.kind === "publish", "\u8981\u78BA\u8A8D\u306E\u5546\u54C1\u540C\u671F\u3060\u3051\u304C\u5BFE\u8C61\u3067\u3059\u3002", 409);
      const proof = await catalogProof(this, j);
      need(proof.adoption?.available, proof.adoption?.reason || proof.message, 409);
      const payload = JSON.parse(j.payload_json);
      stage = "check-holds";
      await this.assertNoPurchaseHold(payload.data.variants.map((v) => v.id));
      stage = "commit";
      await this.s.batch([
        ...proof.adoptionMappings.map((m) => this.mappingInsert(m)),
        ["UPDATE mg_jobs SET state='cancelled',result_json=?,last_error=?,updated_at=? WHERE id=?", [json({ resolution: "version-fenced-current-state-adopted", versions: proof.versionInfo }), "\u6210\u529F\u6271\u3044\u306B\u305B\u305A\u3001\u8AAD\u53D6\u78BA\u8A8D\u3057\u305F\u73FE\u5728\u5024\u3092\u63A1\u7528\u3057\u3066\u53D6\u6D88\u3057\u307E\u3057\u305F\u3002", now(), id]],
        ["DELETE FROM mg_locks WHERE job_id=?", [id]],
        ["UPDATE mg_job_notifications SET state='cancelled' WHERE job_id=?", [id]],
        ["UPDATE mg_products SET version=version+1 WHERE id=?", [j.resource_id]],
        this.s.audit("authenticated-admin", "job_cancelled_after_version_fence", j.resource_id, { job: id, squareWrite: false })
      ]);
      stage = "read-result";
      return await this.job(id);
    } catch (error) {
      if (error instanceof ManagementError) {
        error.code = "ADMIN_ADOPTION_REJECTED";
        error.actionStage = stage;
        throw error;
      }
      const failure = new ManagementError(503, "\u65E7\u540C\u671F\u53D6\u6D88\u306E" + { "read-proof": "\u8AAD\u307F\u53D6\u308A\u7167\u5408", "check-holds": "\u8CFC\u5165\u4FDD\u7559\u78BA\u8A8D", commit: "D1\u4FDD\u5B58", "read-result": "\u7D50\u679C\u53D6\u5F97" }[stage] + "\u3067\u51E6\u7406\u7D50\u679C\u3092\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093\u3002\u30B8\u30E7\u30D6\u72B6\u614B\u3092\u8AAD\u307F\u53D6\u308A\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
      failure.code = "ADMIN_ADOPTION_FAILED";
      failure.actionStage = stage;
      throw failure;
    }
  }
  async retry(id) {
    if (!production(this.env)) assertSquareWrite(this.env);
    const j = await this.s.one("SELECT * FROM mg_jobs WHERE id=?", [id]);
    need(j, "\u30B8\u30E7\u30D6\u304C\u3042\u308A\u307E\u305B\u3093\u3002", 404);
    productionGrant(this.env, j.kind === "stock" ? "inventory" : "catalog");
    need(j.state !== "cancelled", "\u53D6\u6D88\u6E08\u307F\u306E\u540C\u671F\u306F\u518D\u9001\u3067\u304D\u307E\u305B\u3093\u3002", 409);
    need(j.state !== "review", "\u7AF6\u5408\u30FB\u671F\u9650\u5207\u308C\u306F\u81EA\u52D5\u518D\u9001\u3067\u304D\u307E\u305B\u3093\u3002\u7167\u5408\u304C\u5FC5\u8981\u3067\u3059\u3002", 409);
    if (j.state !== "done") await this.run(id);
    await this.schedule();
    return this.job(id);
  }
  async run(id) {
    if (externalPolicy(this.env).readOnly) return;
    const j = await this.s.one("SELECT * FROM mg_jobs WHERE id=?", [id]);
    if (!j || ["done", "review", "cancelled"].includes(j.state)) return;
    if (production(this.env) && !productionPolicy(this.env)[j.kind === "stock" ? "inventory" : "catalog"]) return;
    if (!await this.schedule()) return;
    const p = JSON.parse(j.payload_json);
    let releasePhase = "\u5165\u529B\u30FB\u65E2\u5B58ID\u78BA\u8A8D";
    try {
      need(j.result_json || Date.now() - Date.parse(j.created_at) < 36e5, "\u5B89\u5168\u306A\u518D\u8A66\u884C\u671F\u9650\u3092\u8D85\u3048\u307E\u3057\u305F\u3002\u65B0\u3057\u3044\u30AD\u30FC\u3067\u518D\u9001\u3057\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002", 409);
      need(j.result_json || j.attempts < 8, "\u518D\u8A66\u884C\u56DE\u6570\u3092\u8D85\u3048\u307E\u3057\u305F\u3002", 409);
      await this.s.run("UPDATE mg_jobs SET state='running',attempts=attempts+1,updated_at=? WHERE id=?", [now(), id]);
      let body = j.body_json ? JSON.parse(j.body_json) : null, result = j.result_json ? JSON.parse(j.result_json) : null;
      if (!body) {
        if (j.kind === "stock") {
          if (production(this.env) || externalPolicy(this.env).managementOnly) need((await this.square.count([p.mapping.variation_id])).get(p.mapping.variation_id) === p.before, "\u9001\u4FE1\u524D\u306B\u5728\u5EAB\u304C\u5909\u308F\u308A\u307E\u3057\u305F\u3002\u68DA\u5378\u3057\u3067\u4E0A\u66F8\u304D\u305B\u305A\u7167\u5408\u3057\u3066\u304F\u3060\u3055\u3044\u3002", 409);
          const adjustment = { catalog_object_id: p.mapping.variation_id, location_id: this.env.SQUARE_LOCATION_ID, state: "IN_STOCK", quantity: String(p.target), occurred_at: now(), reference_id: id };
          body = { idempotency_key: id, changes: [{ type: "PHYSICAL_COUNT", physical_count: adjustment }] };
        } else {
          let preserved = await this.square.preserveMappings(p.maps);
          if (integratedPublication(this.env) && p.releaseSite) preserved = await prepareReleaseMappings(this, preserved, p);
          await this.square.assertNewSkusAvailable(p.data, p.maps);
          if (p.releaseSite) releasePhase = "\u753B\u50CF\u78BA\u8A8D";
          const imageIds = [];
          for (const imageId of p.data.images) {
            let mapping = await this.s.one("SELECT * FROM mg_image_mappings WHERE image_id=?", [imageId]);
            if (!mapping) {
              const image3 = await this.s.one("SELECT * FROM mg_images WHERE id=?", [imageId]);
              need(image3 && this.env.PRODUCT_IMAGES, "\u753B\u50CF\u30B9\u30C8\u30EC\u30FC\u30B8\u304C\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093\u3002", 503);
              const object = await this.env.PRODUCT_IMAGES.get(image3.object_key);
              need(object, "\u753B\u50CF\u304C\u3042\u308A\u307E\u305B\u3093\u3002", 409);
              const squareImageId = await this.square.image(imageId, await object.arrayBuffer(), image3.mime);
              await this.s.run("INSERT INTO mg_image_mappings VALUES(?,?,?,?)", [imageId, production(this.env) ? "production" : "sandbox", squareImageId, now()]);
              mapping = { square_image_id: squareImageId };
            }
            imageIds.push(mapping.square_image_id);
          }
          if (production(this.env) && p.releaseSite && p.maps.length && !p.data.images.length) imageIds.push(...preserved[0]?.item_image_ids || []);
          body = this.square.catalogBody({ id: j.resource_id, data: p.data }, preserved, id, imageIds);
          if (j.kind === "state") for (const item of body.batches[0].objects) {
            item.item_data.is_archived = p.targetStatus === "archived";
            item.present_at_location_ids = [];
            item.absent_at_location_ids = [this.env.SQUARE_LOCATION_ID];
            for (const v of item.item_data.variations) {
              v.present_at_location_ids = [];
              v.absent_at_location_ids = [this.env.SQUARE_LOCATION_ID];
            }
          }
        }
        await this.s.run("UPDATE mg_jobs SET body_json=? WHERE id=?", [json(body), id]);
      }
      if (!result && p.releaseSite && j.body_json) {
        const proof = await catalogProof(this, j);
        if (proof.state === "matched") result = { mappings: proof.mappings };
      }
      if (!result) {
        if (p.releaseSite) releasePhase = "Square\u9001\u4FE1\u30FB\u5FDC\u7B54\u78BA\u8A8D";
        if (j.kind === "stock") {
          await this.square.request("/v2/inventory/changes/batch-create", "POST", body);
          result = { applied: true };
        } else {
          result = { mappings: await this.square.publish(body, p.data) };
          for (const old of p.maps) {
            const mapped = result.mappings.find((m) => m.variant_id === old.variant_id);
            need(mapped?.variation_id === old.variation_id && mapped.item_id === old.item_id, "\u65E2\u5B58Square ID\u304C\u5909\u5316\u3057\u307E\u3057\u305F\u3002", 409);
          }
        }
        await this.s.run("UPDATE mg_jobs SET result_json=? WHERE id=?", [json(result), id]);
      }
      if (p.releaseSite) {
        releasePhase = "Square\u73FE\u5728\u5024\u7167\u5408";
        const proof = await catalogProof(this, { ...j, body_json: json(body), result_json: json(result) });
        need(proof.state === "matched", "\u516C\u958B\u524D\u7167\u5408\u306B\u5931\u6557\uFF1A" + proof.checks.filter((c) => !c.ok).map((c) => c.label).join("\u30FB") + "\u3002\u540C\u3058\u516C\u958B\u51E6\u7406\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002", 409);
        result = { ...result, mappings: proof.mappings };
      }
      const updates = [];
      if (j.kind === "stock") {
        const quantity = (await this.square.count([p.mapping.variation_id])).get(p.mapping.variation_id);
        need(quantity === p.target, "\u9069\u7528\u5F8C\u306B\u5916\u90E8\u5728\u5EAB\u304C\u5909\u5316\u3057\u307E\u3057\u305F\u3002\u518D\u521D\u671F\u5316\u305B\u305A\u7167\u5408\u3057\u3066\u304F\u3060\u3055\u3044\u3002", 409);
        updates.push(["UPDATE mg_inventory_operations SET after_quantity=?,state=? WHERE id=?", [quantity, "done", id]], ["INSERT INTO mg_stock_snapshot VALUES(?,?,?) ON CONFLICT(variant_id) DO UPDATE SET quantity=excluded.quantity,observed_at=excluded.observed_at", [j.resource_id, quantity, now()]]);
      } else {
        updates.push(...result.mappings.map((m) => this.mappingInsert(m)));
        if (p.releaseSite) updates.push(...releaseStatements(this, j, p));
        else if (independentPublication(this.env)) updates.push(["UPDATE mg_products SET version=version+1,updated_at=? WHERE id=?", [now(), j.resource_id]]);
        else updates.push(["UPDATE mg_products SET published_revision=?,status=?,sort_order=?,version=version+1,updated_at=? WHERE id=?", [p.revision, p.targetStatus, p.data.sortOrder, now(), j.resource_id]]);
      }
      updates.push(["UPDATE mg_jobs SET state='done',last_error=NULL,updated_at=? WHERE id=?", [now(), id]], ["DELETE FROM mg_locks WHERE job_id=?", [id]], this.s.audit("system", "job_completed", j.resource_id, { job: id, kind: j.kind }));
      if (p.releaseSite) {
        releasePhase = "D1\u8A3C\u8DE1\u4FDD\u5B58\u30FB\u30B5\u30A4\u30C8\u516C\u958B";
        updates.push(["UPDATE mg_jobs SET result_json=? WHERE id=?", [json(result), id]]);
      }
      await this.s.batch(updates);
    } catch (error) {
      const review = error.status === 409 || error.status === 422 || j.attempts >= 7;
      const state = review ? "review" : "retry";
      await this.s.run("UPDATE mg_jobs SET state=?,last_error=?,next_due=?,updated_at=? WHERE id=?", [state, (p.releaseSite ? "\uFF3B" + releasePhase + "\uFF3D" : "") + (error instanceof ManagementError ? error.message : "\u901A\u4FE1\u307E\u305F\u306F\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\u56FA\u5B9AID\u3067\u518D\u8A66\u884C\u3057\u307E\u3059\u3002"), Date.now() + Math.min(36e5, 15e3 * 2 ** j.attempts), now(), id]);
      if (j.kind === "stock") await this.s.run("UPDATE mg_inventory_operations SET state=? WHERE id=?", [state, id]);
    }
  }
  async schedule() {
    return this.supervision.schedule();
  }
  async recover() {
    return this.supervision.tick();
  }
  async productView(p) {
    const j = await this.s.one("SELECT * FROM mg_jobs WHERE resource_id=? AND kind IN ('publish','state') ORDER BY rowid DESC LIMIT 1", [p.id]);
    const maps = await this.s.all("SELECT m.variant_id FROM mg_mappings m JOIN mg_variants v ON v.id=m.variant_id WHERE v.product_id=?", [p.id]);
    const policy = externalPolicy(this.env);
    const blockingJobs = await this.s.all("SELECT DISTINCT l.job_id AS id,j.kind,j.state,j.last_error AS error,j.updated_at AS updatedAt,json_extract(j.payload_json,'$.releaseSite') AS release FROM mg_locks l JOIN mg_variants v ON v.id=l.variant_id LEFT JOIN mg_jobs j ON j.id=l.job_id WHERE v.product_id=?", [p.id]);
    const publication = await this.s.one("SELECT detail_json FROM mg_audit WHERE resource_id=? AND action IN ('site_published','release_published') ORDER BY rowid DESC LIMIT 1", [p.id]);
    return {
      ...p,
      retired: retiredProduct(this.env, p) || (await this.s.retiredProductIds()).has(p.id),
      ...integratedPublication(this.env) && j && JSON.parse(j.payload_json).releaseSite ? { releaseJob: { ...await this.job(j.id), submittedRevision: JSON.parse(j.payload_json).revision } } : {},
      siteWarnings: publication ? JSON.parse(publication.detail_json).warnings || [] : [],
      blockingJobs,
      syncState: j?.state || (p.draft.variants.every((v) => maps.some((m) => m.variant_id === v.id)) ? "linked" : "unlinked"),
      source: policy.source,
      ...this.env.RUNTIME_TIER === "staging" ? { capabilities: { draft: true, images: true, sitePublish: true, unifiedPublish: true, featuredProducts: true, catalog: !policy.readOnly, inventory: !policy.readOnly } } : {},
      ...production(this.env) ? { capabilities: { ...productionPolicy(this.env), unifiedPublish: integratedPublication(this.env) && (!production(this.env) || productionPolicy(this.env).catalog), featuredProducts: this.env.STOREFRONT_FEATURED_ENABLED === "1", sitePublish: this.env.PRODUCTION_STOREFRONT_PUBLISH_ENABLED === "1" && productionPolicy(this.env).draft } } : {},
      accessMode: production(this.env) ? productionPolicy(this.env).catalog || productionPolicy(this.env).inventory ? "PRODUCTION_MANAGEMENT" : "PRODUCTION_READ_ONLY" : policy.managementOnly ? "SANDBOX_MANAGEMENT" : policy.readOnly ? "READ_ONLY" : "READ_WRITE",
      useConfiguredLinks: this.env.RUNTIME_TIER === "sandbox-validation" && p.draft.variants.every((v) => Boolean(this.square.expectedLink(v.id)))
    };
  }
  async products() {
    return Promise.all((await this.s.products()).map((p) => this.productView(p)));
  }
  async handle(path, method, body, actor) {
    if (path === "/api/admin/storefront/featured") return featuredAdmin(this, method, body, actor);
    if (path === "/api/admin/products/import" && method === "POST") {
      need(!production(this.env), "\u672C\u756A\u306E\u65E2\u5B58\u5546\u54C1\u306F\u5B9F\u7167\u5408\u3057\u305F\u4E0B\u66F8\u304D\u3068\u5BFE\u5FDC\u8868\u3067\u5C0E\u5165\u3057\u3066\u304F\u3060\u3055\u3044\u3002", 409);
      return importLegacy(this, actor);
    }
    if (path === "/api/admin/products" && method === "GET") return { products: await this.products(), ...this.env.RUNTIME_TIER === "staging" ? { source: "square-sandbox", capabilities: { draft: true, images: true, sitePublish: true, unifiedPublish: true, featuredProducts: true, catalog: !externalPolicy(this.env).readOnly, inventory: !externalPolicy(this.env).readOnly } } : {}, ...production(this.env) ? { source: "square-production", capabilities: { ...productionPolicy(this.env), unifiedPublish: integratedPublication(this.env) && (!production(this.env) || productionPolicy(this.env).catalog), sitePublish: this.env.PRODUCTION_STOREFRONT_PUBLISH_ENABLED === "1", featuredProducts: this.env.STOREFRONT_FEATURED_ENABLED === "1" } } : {} };
    if (path === "/api/admin/inventory" && method === "GET") return { inventory: await this.inventory() };
    if (path === "/api/admin/audit" && method === "GET") return { events: await this.s.all("SELECT actor,action,resource_id,detail_json,created_at FROM mg_audit ORDER BY created_at DESC LIMIT 200") };
    if (path === "/api/admin/jobs" && method === "GET") return { jobs: await this.jobs(), orphanLocks: await this.s.all("SELECT l.variant_id AS variantId,l.job_id AS jobId FROM mg_locks l LEFT JOIN mg_jobs j ON j.id=l.job_id WHERE j.id IS NULL"), monitoring: await this.supervision.status() };
    let m = path.match(/^\/api\/admin\/products\/([a-z0-9-]+)(?:\/(publish|release|state|link|site|sync-check))?$/);
    if (m) {
      const id = identifier(m[1]);
      if (method === "GET" && !m[2]) {
        const product = await this.s.product(id);
        need(product, "\u5546\u54C1\u304C\u3042\u308A\u307E\u305B\u3093\u3002", 404);
        return { product: await this.productView(product) };
      }
      if (method === "PUT" && !m[2]) return this.save(id, body, actor);
      if (method === "POST" && m[2]) return m[2] === "release" ? release(this, id, body, actor) : m[2] === "sync-check" ? inspectSync(this, id) : m[2] === "site" ? publishSite(this, id, body, actor) : this[m[2]](id, body, actor);
    }
    m = path.match(/^\/api\/admin\/inventory\/([a-z0-9-]+)$/);
    if (m && method === "POST") return this.adjust(m[1], body, actor);
    m = path.match(/^\/api\/admin\/jobs\/([a-f0-9-]+)$/);
    if (m && method === "GET") {
      need(integratedPublication(this.env), "\u7D71\u5408\u516C\u958B\u306F\u7121\u52B9\u3067\u3059\u3002", 403);
      return { job: await this.job(operation(m[1])) };
    }
    m = path.match(/^\/api\/admin\/jobs\/([a-f0-9-]+)\/(retry|reconcile|adopt-current)$/);
    if (m && method === "POST") return this[m[2] === "adopt-current" ? "adoptCurrent" : m[2]](operation(m[1]));
    need(false, "\u7BA1\u7406API\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002", 404);
  }
};

// worker/src/management/presentation-images.js
function presentationImageId(product) {
  const gallery = Array.isArray(product?.images) ? product.images : [];
  return gallery.includes(product?.featuredImageId) ? product.featuredImageId : gallery[0] || null;
}
__name(presentationImageId, "presentationImageId");
function detailImageIds(product) { return (Array.isArray(product?.images) ? product.images : []).filter(id => id !== product?.featuredImageId); }
function presentationImageUrl(product) {
  const id = presentationImageId(product);
  return id ? "/api/media/" + id : product?.fallbackImage || "";
}
__name(presentationImageUrl, "presentationImageUrl");

// worker/src/management/storefront.js
var escape = /* @__PURE__ */ __name((s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]), "escape");
var safeJson = /* @__PURE__ */ __name((x) => JSON.stringify(x).replaceAll("<", "\\u003c"), "safeJson");
function image(p) {
  return presentationImageUrl(p);
}
__name(image, "image");
function cards(products) {
  return products.map((p) => `<a class="product-card" href="/products/${escape(p.slug)}.html">${image(p) ? `<div class="product-image"><img loading="lazy" src="${image(p)}" alt="${escape(p.alt)}"></div>` : ""}<div class="product-info"><h3>${escape(p.name)}</h3><p>${escape(p.description.slice(0, 100))}</p><p>\xA5${Math.min(...p.variants.map((v) => v.price)) || 0}</p><p>${p.status === "stopped" ? "\u8CA9\u58F2\u505C\u6B62" : "\u8CA9\u58F2\u4E2D"}</p></div></a>`).join("");
}
__name(cards, "cards");
function content(p, env) {
  return `<div class="product-detail-inner"><h1>${escape(p.name)}</h1><div class="product-main-image">${detailImageIds(p).map((id) => `<img src="/api/media/${id}" alt="${escape(p.alt)}">`).join("")}</div><div class="product-information"><h2>${escape(p.name)}</h2><p class="product-description" style="white-space:pre-line">${escape(p.description)}</p><div class="product-data">${p.variants.map((v) => `<p>${escape(v.name)} ${escape(v.amount)} \xA5${v.price.toLocaleString("ja-JP")}</p>`).join("")}</div>${p.variants.filter((v) => v.active).map((v) => `<div class="product-cart-area"><label>\u6570\u91CF<select class="product-quantity">${Array.from({ length: Math.min(v.maxQuantity, 10) }, (_, i) => `<option>${i + 1}</option>`).join("")}</select></label><button class="product-cart-button" data-product-id="${escape(v.id)}" data-product-name="${escape(v.name)}" data-product-price="${v.price}" ${p.status !== "published" || production(env) && (env.PRODUCTION_MANAGED_CHECKOUT_ENABLED !== "1" && !CATALOG[v.id] || !CATALOG[v.id] && !p.checkoutVariantIds?.includes(v.id)) ? 'disabled data-site-disabled="true"' : ""}>${p.status === "published" ? "\u30AB\u30FC\u30C8\u306B\u5165\u308C\u308B" : "\u8CA9\u58F2\u505C\u6B62"}</button></div>`).join("")}</div></div>`;
}
__name(content, "content");
async function renderPage(request, env) {
  const url = new URL(request.url), s = new Store(env);
  let products = await s.publicProducts();
  if (production(env)) {
    const leaves = products.filter((p2) => ["goldenrod-leaf", "goldenrod-leaf-stem"].includes(p2.slug));
    if (leaves.length === 2) {
      products = products.filter((p2) => !leaves.includes(p2));
      products.push({ ...leaves[0], slug: "goldenrod", name: "\u4E7E\u71E5\u30BB\u30A4\u30BF\u30AB\u30A2\u30EF\u30C0\u30C1\u30BD\u30A6", description: leaves.map((p2) => p2.name + "\n" + p2.description).join("\n\n"), images: [...new Set(leaves.flatMap((p2) => p2.images))], checkoutVariantIds: leaves.flatMap((p2) => p2.checkoutVariantIds || []), variants: leaves.flatMap((p2) => p2.variants.map((v) => ({ ...v, active: v.active && p2.status === "published" }))), status: leaves.some((p2) => p2.status === "published") ? "published" : "stopped" });
    }
  }
  const match = url.pathname.match(/^\/products\/([a-z0-9-]+)\.html$/);
  if (!match && !["/", "/index.html", "/products.html"].includes(url.pathname)) return null;
  const p = match ? products.find((p2) => p2.slug === match[1]) : null;
  if (match && !p) return production(env) ? null : new Response("\u5546\u54C1\u304C\u3042\u308A\u307E\u305B\u3093\u3002", { status: 404 });
  if (!env.ASSETS) return null;
  const template = new URL(request.url);
  if (match) template.pathname = "/products/lemonbalm.html";
  const asset = await env.ASSETS.fetch(new Request(template, { method: "GET" }));
  if (!asset.ok) return asset;
  let rewriter = new HTMLRewriter();
  if (p) {
    const title = p.name + "\uFF5C\u516B\u8349\u5C4B\u672C\u5E97", canonical = url.origin + "/products/" + p.slug + ".html";
    const data = { "@context": "https://schema.org", "@type": "ProductGroup", name: p.name, description: p.description, url: canonical, productGroupID: p.id, image: p.images.map((i) => url.origin + "/api/media/" + i), hasVariant: p.variants.filter((v) => v.active).map((v) => ({ "@type": "Product", name: v.name, sku: v.id, offers: { "@type": "Offer", price: v.price, priceCurrency: "JPY", url: canonical, ...p.status === "published" ? {} : { availability: "https://schema.org/OutOfStock" } } })) };
    rewriter = rewriter.on("title", { element: /* @__PURE__ */ __name((e) => e.setInnerContent(escape(title), { html: true }), "element") }).on('meta[name="description"]', { element: /* @__PURE__ */ __name((e) => e.setAttribute("content", p.description.replace(/<[^>]*>/g, "").slice(0, 160)), "element") }).on('link[rel="canonical"]', { element: /* @__PURE__ */ __name((e) => e.setAttribute("href", canonical), "element") }).on('script[type="application/ld+json"]', { element: /* @__PURE__ */ __name((e) => e.setInnerContent(safeJson(data), { html: true }), "element") }).on(".product-detail", { element: /* @__PURE__ */ __name((e) => e.setInnerContent(content(p, env), { html: true }), "element") }).on(".product-handling", { element: /* @__PURE__ */ __name((e) => e.remove(), "element") }).on('script[src$="inventory.js"]', { element: /* @__PURE__ */ __name((e) => e.remove(), "element") });
  } else if (production(env)) {
    const ready = products.filter((p2) => !["goldenrod-leaf", "goldenrod-leaf-stem"].includes(p2.slug));
    const paths = new Set(ready.map((p2) => "/products/" + p2.slug + ".html"));
    rewriter = rewriter.on(".product-card", { element: /* @__PURE__ */ __name((e) => {
      const href = e.getAttribute("href");
      if (href && paths.has(new URL(href, url).pathname)) e.remove();
    }, "element") }).on(".product-list", { element: /* @__PURE__ */ __name((e) => e.append(cards(ready), { html: true }), "element") });
  } else rewriter = rewriter.on(".product-list", { element: /* @__PURE__ */ __name((e) => e.setInnerContent(cards(products), { html: true }), "element") }).on(".editorial-products-count", { element: /* @__PURE__ */ __name((e) => e.setInnerContent(String(products.length) + " PRODUCTS"), "element") }).on('script[type="application/ld+json"]', { element: /* @__PURE__ */ __name((e) => e.setInnerContent(safeJson({ "@context": "https://schema.org", "@type": "ItemList", itemListElement: products.map((p2, i) => ({ "@type": "ListItem", position: i + 1, url: url.origin + "/products/" + p2.slug + ".html", name: p2.name })) }), { html: true }), "element") });
  const response = rewriter.transform(asset);
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  const html = await response.text();
  return new Response(html.replace("</body>", '<script src="/js/managed-storefront.js"><\/script></body>'), { headers });
}
__name(renderPage, "renderPage");

// worker/src/order-mail-outbox.js
var MAIL_RETRY_WINDOW_MS = 23 * 60 * 60 * 1e3;
var terminal = /* @__PURE__ */ __name((t) => ["accepted", "delivered", "manual_review"].includes(t.state), "terminal");
var OrderMailOutbox = class {
  static {
    __name(this, "OrderMailOutbox");
  }
  constructor(storage, services, now2 = () => Date.now()) {
    this.storage = storage;
    this.services = services;
    this.now = now2;
  }
  key(id) {
    return `order-mail:${id}`;
  }
  async arm(at) {
    const old = await this.storage.getAlarm();
    if (!old || old <= this.now() || at < old) await this.storage.setAlarm(at);
  }
  pending(r) {
    return !r.prepared || Object.values(r.tasks).some((t) => !terminal(t));
  }
  async write(r, record) {
    if (this.pending(r)) await this.arm(this.now() + 6e4);
    await this.storage.put({
      [this.key(r.id)]: r,
      [`order-mail-ref:${r.orderReference}`]: r.id,
      [`mail-pending:${r.id}`]: this.pending(r),
      [`mail-create:${r.id}`]: false,
      ...record ? { [`attempt:${record.id}`]: record } : {}
    });
    try {
      await this.services.observe?.(r.id, { stage: "mail_state", admin: r.tasks.admin?.state, customer: r.tasks.customer?.state });
    } catch {
    }
    if (this.pending(r)) await this.arm(this.due(r));
  }
  due(r) {
    return r.prepared ? Math.min(...Object.values(r.tasks).filter((t) => !terminal(t)).map((t) => t.nextDue)) : r.nextDue;
  }
  async ensure(record) {
    let r = await this.storage.get(this.key(record.id));
    if (r) {
      if (record.orderMailVersion !== 1) {
        await this.write(r, { ...record, emailAttempted: true, orderMailVersion: 1 });
        record.emailAttempted = true;
        record.orderMailVersion = 1;
      } else await this.storage.put(`mail-create:${record.id}`, false);
      return r;
    }
    if (record.phase !== "paid" || record.projection !== "stored") return;
    r = {
      version: 1,
      id: record.id,
      orderReference: record.orderReference,
      prepared: false,
      // Legacy waitUntil/emailAttempted has no per-recipient acceptance proof.
      // Preserve it as unknown; never risk sending those old emails again.
      legacyUnknown: Boolean(record.emailAttempted || record.emailQueued),
      tasks: {},
      nextDue: this.now()
    };
    await this.write(r, { ...record, emailAttempted: true, orderMailVersion: 1 });
    record.emailAttempted = true;
    record.orderMailVersion = 1;
    return r;
  }
  async prepare(r) {
    const record = await this.storage.get(`attempt:${r.id}`);
    if (!record || record.phase !== "paid" || record.projection !== "stored") {
      r.reason = "order_record_unavailable";
      r.nextDue = this.now() + 3e5;
      await this.write(r);
      return;
    }
    try {
      const messages = await this.services.prepare(record);
      for (const recipient of ["admin", "customer"]) {
        const message = messages[recipient];
        if (!message?.body || !message?.key) throw Error("Incomplete mail configuration");
        r.tasks[recipient] = {
          body: message.body,
          key: message.key,
          state: r.legacyUnknown ? "manual_review" : "pending",
          reason: r.legacyUnknown ? "legacy_delivery_unknown" : null,
          firstAttemptAt: null,
          attempts: 0,
          nextDue: this.now(),
          providerId: null
        };
      }
      r.prepared = true;
      r.reason = null;
    } catch {
      r.tasks = {};
      r.reason = "mail_configuration_required";
      r.nextDue = this.now() + 3e5;
    }
    await this.write(r);
  }
  async process(id) {
    let r = await this.storage.get(this.key(id));
    if (!r) return;
    if (!r.prepared) {
      if (r.nextDue > this.now()) return;
      await this.prepare(r);
    }
    if (!r.prepared) return;
    for (const recipient of ["admin", "customer"]) {
      const task = r.tasks[recipient];
      if (terminal(task) || task.nextDue > this.now()) continue;
      if (task.firstAttemptAt !== null && this.now() >= task.firstAttemptAt + MAIL_RETRY_WINDOW_MS) {
        task.state = "manual_review";
        task.reason = "idempotency_window_expired";
        await this.write(r);
        continue;
      }
      task.firstAttemptAt ??= this.now();
      task.attempts++;
      task.state = "unknown";
      task.reason = "acceptance_unconfirmed";
      task.nextDue = Math.min(
        task.firstAttemptAt + MAIL_RETRY_WINDOW_MS,
        this.now() + Math.min(18e5, 15e3 * 2 ** Math.min(task.attempts, 7))
      );
      await this.write(r);
      if (this.now() >= task.firstAttemptAt + MAIL_RETRY_WINDOW_MS) {
        task.state = "manual_review";
        task.reason = "idempotency_window_expired";
        await this.write(r);
        continue;
      }
      let receipt;
      try {
        receipt = task.providerId && this.services.lookup ? await this.services.lookup(task) : await this.services.send(task);
        if (!receipt?.id || !/^[a-zA-Z0-9_-]{1,128}$/.test(receipt.id)) throw Error("No acceptance receipt");
      } catch (error) {
        const allowed = ["resend_unavailable", "resend_rate_limited", "resend_request_rejected", "resend_key_conflict", "resend_not_configured"];
        task.reason = allowed.includes(error.code) ? error.code : "acceptance_unconfirmed";
        if (error.permanent) task.state = "manual_review";
        await this.write(r);
        continue;
      }
      task.providerId = receipt.id;
      task.state = "accepted";
      task.reason = null;
      task.acceptedAt = new Date(this.now()).toISOString();
      await this.write(r);
    }
  }
  publicState(r) {
    if (!r) return { admin: { state: "unrecorded" }, customer: { state: "unrecorded" } };
    const result = {};
    for (const recipient of ["admin", "customer"]) {
      const t = r.tasks[recipient];
      result[recipient] = t ? {
        state: t.state,
        reason: t.reason,
        attempts: t.attempts,
        acceptedAt: t.acceptedAt || null,
        nextAttemptAt: terminal(t) ? null : new Date(t.nextDue).toISOString(),
        retryUntil: t.firstAttemptAt === null ? null : new Date(t.firstAttemptAt + MAIL_RETRY_WINDOW_MS).toISOString()
      } : { state: "pending", reason: r.reason || "preparing" };
    }
    return result;
  }
  async status(orderReference) {
    const id = await this.storage.get(`order-mail-ref:${orderReference}`);
    return this.publicState(id ? await this.storage.get(this.key(id)) : null);
  }
  async alarm() {
    let startAfter;
    const entries = [];
    for (; ; ) {
      const page = await this.storage.list({ prefix: "mail-pending:", limit: 128, ...startAfter ? { startAfter } : {} });
      entries.push(...page.entries());
      if (page.size < 128) break;
      startAfter = [...page.keys()].at(-1);
    }
    const cursor = await this.storage.get("mail-alarm-cursor") || "";
    const ordered = [...entries.filter(([key]) => key > cursor), ...entries.filter(([key]) => key <= cursor)];
    let processed = false;
    for (const [key, pending] of ordered) {
      try {
        if (!pending) continue;
        let r = await this.storage.get(this.key(key.slice(13)));
        if (!r || !this.pending(r)) continue;
        await this.arm(this.now() + 6e4);
        if (!processed && this.due(r) <= this.now()) {
          processed = true;
          await this.storage.put("mail-alarm-cursor", key);
          await this.process(r.id);
          r = await this.storage.get(this.key(r.id));
        }
        if (this.pending(r)) await this.arm(Math.max(this.now() + 1e3, this.due(r)));
      } catch {
        await this.arm(this.now() + 6e4);
      }
    }
  }
};

// worker/src/purchase-ledger.js
var RETRY_WINDOW_MS2 = 60 * 60 * 1e3;
var MAX_RECOVERY_ATTEMPTS = 8;
var PurchaseError = class extends Error {
  static {
    __name(this, "PurchaseError");
  }
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
var PurchaseLedger = class {
  static {
    __name(this, "PurchaseLedger");
  }
  constructor(storage, services) {
    this.storage = storage;
    this.services = services;
    if (services.mail) this.mail = new OrderMailOutbox(storage, {
      prepare: /* @__PURE__ */ __name((record) => this.services.mail.prepare(record), "prepare"),
      send: /* @__PURE__ */ __name((task) => this.services.mail.send(task), "send"),
      observe: /* @__PURE__ */ __name((id, event) => this.services.trace?.(id, event), "observe")
    }, () => this.now());
  }
  now() {
    return this.services.now?.() ?? Date.now();
  }
  async trace(r, stage, fields = {}) {
    try {
      await this.services.trace?.(r.id, { stage, ...fields });
    } catch {
    }
  }
  key(id) {
    return `attempt:${id}`;
  }
  read(id) {
    return this.storage.get(this.key(id));
  }
  closed(r) {
    return r.phase === "declined" || r.phase === "paid" && r.inventory === "applied" && r.projection === "stored";
  }
  stockKeys(r) {
    return r.stockKeys || this.services.stockKeys?.(r.quote) || r.quote.items.map((item) => item.id);
  }
  holdsStock(r) {
    return r.phase !== "declined" && r.inventory !== "applied";
  }
  async entries(prefix) {
    const result = [];
    let startAfter;
    for (; ; ) {
      const page = await this.storage.list({ prefix, limit: 128, ...startAfter ? { startAfter } : {} });
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
    if (!await this.storage.get("sku-index-v2")) {
      for (const [, r] of await this.entries("attempt:")) await this.write(r);
      await this.storage.put("sku-index-v2", true);
    }
    if (this.mail && !await this.storage.get("order-mail-index-v1")) {
      try {
        await this.arm(this.now() + 6e4);
        let complete = true;
        for (const [, r] of await this.entries("attempt:")) {
          try {
            await this.mail.ensure(r);
          } catch {
            complete = false;
          }
        }
        if (complete) await this.storage.put("order-mail-index-v1", true);
      } catch {
      }
    }
    this.initialized = true;
  }
  scheduled(r) {
    return !this.closed(r) && (!r.manual || !r.notificationSent && r.notificationState !== "expired" || r.phase === "paid" && r.projection !== "stored" && (r.projectionAttempts || 0) < MAX_RECOVERY_ATTEMPTS);
  }
  async write(r) {
    if (this.mail && r.phase === "paid" && r.projection === "stored") {
      try {
        await this.arm(this.now() + 6e4);
      } catch {
      }
    }
    const holds = await this.storage.get("sku-holds") || {};
    for (const [sku, ids] of Object.entries(holds)) {
      holds[sku] = ids.filter((id) => id !== r.id);
      if (!holds[sku].length) delete holds[sku];
    }
    if (this.holdsStock(r)) for (const sku of this.stockKeys(r)) holds[sku] = [.../* @__PURE__ */ new Set([...holds[sku] || [], r.id])];
    r.updatedAt = new Date(this.now()).toISOString();
    r.nextDue ??= this.now() + 3e4;
    await this.storage.put({
      [this.key(r.id)]: r,
      "sku-holds": holds,
      [`pending:${r.id}`]: !this.closed(r),
      ...this.mail && r.phase === "paid" && r.projection === "stored" ? { [`mail-create:${r.id}`]: true } : {}
    });
    if (this.scheduled(r)) await this.arm(r.nextDue);
  }
  async submit(body) {
    await this.initialize();
    const input = this.services.validate(body);
    const fingerprint = await digest2(JSON.stringify({ quote: input.quote, contact: input.contact }));
    let r = await this.read(body.attemptId);
    if (r) {
      if (r.fingerprint !== fingerprint) throw new PurchaseError(409, "\u540C\u3058\u6CE8\u6587\u756A\u53F7\u306E\u5185\u5BB9\u3092\u5909\u66F4\u3067\u304D\u307E\u305B\u3093\u3002\u51E6\u7406\u72B6\u6CC1\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
      return this.recover(r.id, true);
    }
    const holds = await this.storage.get("sku-holds") || {};
    if (this.stockKeys(input).some((sku) => holds[sku]?.length)) throw new PurchaseError(503, "\u3053\u306E\u5546\u54C1\u306E\u5728\u5EAB\u3092\u78BA\u8A8D\u4E2D\u3067\u3059\u3002\u4ED6\u306E\u5546\u54C1\u306F\u3054\u8CFC\u5165\u3044\u305F\u3060\u3051\u307E\u3059\u3002");
    await this.services.stock(input.quote);
    r = {
      id: body.attemptId,
      fingerprint,
      ...input,
      orderReference: this.services.reference(),
      paymentKey: crypto.randomUUID(),
      createdAt: new Date(this.now()).toISOString(),
      phase: "prepared",
      inventory: "pending",
      projection: "pending",
      recoveryAttempts: 0,
      warning: null
    };
    await this.write(r);
    r.phase = "submitting";
    await this.write(r);
    try {
      const payment = await this.services.charge(r, body.sourceId);
      this.verifyPayment(r, payment);
      this.capturePayment(r, payment);
      r.phase = payment.status === "COMPLETED" ? "paid" : ["FAILED", "CANCELED"].includes(payment.status) ? "declined" : "unknown";
    } catch (error) {
      r.phase = "unknown";
      r.warning = "payment_result_unknown";
      if (error instanceof SquarePaymentFailure) r.paymentFailure = error.evidence;
    }
    await this.write(r);
    await this.trace(r, r.phase === "paid" ? "payment_paid" : r.phase === "declined" ? "payment_declined" : "payment_unknown");
    return this.recover(r.id, true);
  }
  verifyPayment(r, p) {
    if (!p?.id || p.reference_id !== r.orderReference || Number(p.amount_money?.amount) !== r.quote.total || p.amount_money?.currency !== r.quote.currency || p.location_id !== this.services.location) {
      throw new PurchaseError(409, "Square\u6C7A\u6E08\u3068\u6CE8\u6587\u306E\u5185\u5BB9\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093\u3002\u7BA1\u7406\u8005\u306E\u78BA\u8A8D\u304C\u5FC5\u8981\u3067\u3059\u3002");
    }
  }
  summary(r) {
    return {
      attemptId: r.id,
      orderReference: r.orderReference,
      paymentId: r.payment?.id || "",
      ok: r.phase === "paid" && r.projection === "stored",
      status: r.phase === "paid" ? "COMPLETED" : r.phase,
      amount: r.quote.total,
      inventoryAdjusted: r.inventory === "applied",
      phase: r.phase,
      inventoryState: r.inventory,
      orderState: r.projection,
      recoveryRequired: !this.closed(r),
      warning: r.warning,
      manualReview: Boolean(r.manual),
      paymentOutcome: r.phase === "paid" ? "paid" : r.phase === "declined" ? "failed" : r.paymentFailure?.outcome || "unknown",
      paymentFailure: r.phase === "paid" ? null : r.paymentFailure || null,
      squarePaymentStatus: ["APPROVED", "PENDING", "COMPLETED", "FAILED", "CANCELED"].includes(r.payment?.status) ? r.payment.status : null,
      retryAllowed: r.phase === "declined" && ["FAILED", "CANCELED"].includes(r.payment?.status),
      pausedVariations: this.holdsStock(r) ? this.stockKeys(r) : [],
      notificationState: r.notificationState || "not_required",
      emailQueued: Boolean(r.emailQueued)
    };
  }
  capturePayment(r, payment) {
    r.payment = paymentSnapshot(payment);
    if (r.payment.failure) r.paymentFailure = mergePaymentFailure(r.paymentFailure, r.payment.failure);
  }
  async recover(id, force = false) {
    await this.initialize();
    const r = await this.read(id);
    if (!r) throw new PurchaseError(404, "\u6CE8\u6587\u51E6\u7406\u306F\u307E\u3060\u958B\u59CB\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002");
    if (this.closed(r)) {
      await this.recoverMail(r);
      return this.summary(r);
    }
    if (!force && r.nextDue > this.now()) return this.summary(r);
    if (r.manual) {
      if (force && r.phase !== "paid") {
        try {
          const payment = await this.services.lookup(r);
          if (payment) {
            this.verifyPayment(r, payment);
            if (["COMPLETED", "FAILED", "CANCELED"].includes(payment.status)) {
              this.capturePayment(r, payment);
              r.phase = payment.status === "COMPLETED" ? "paid" : "declined";
              r.manual = false;
              r.recoveryAttempts = 0;
              r.warning = null;
              r.nextDue = this.now();
              await this.write(r);
              return this.closed(r) ? this.summary(r) : this.recover(id, true);
            }
          }
        } catch {
        }
      }
      if (r.phase === "paid" && r.projection !== "stored" && ((r.projectionAttempts || 0) < MAX_RECOVERY_ATTEMPTS || force)) {
        r.projectionAttempts = (r.projectionAttempts || 0) + 1;
        try {
          await this.services.project(r);
          r.projection = "stored";
        } catch {
          r.projection = "retry_required";
        }
        r.nextDue = this.now() + 6e4;
        await this.write(r);
      }
      await this.recoverMail(r);
      await this.notify(r);
      return this.summary(r);
    }
    if (r.recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) return this.manual(r, "manual_review_required");
    r.recoveryAttempts++;
    r.nextDue = this.now() + Math.min(36e5, 15e3 * 2 ** r.recoveryAttempts);
    await this.write(r);
    if (r.phase !== "paid") {
      let payment;
      try {
        payment = await this.services.lookup(r);
      } catch {
        r.warning = "payment_reconciliation_required";
        await this.write(r);
        return this.summary(r);
      }
      if (!payment) {
        r.phase = "unknown";
        r.warning = "payment_not_confirmed";
        await this.write(r);
        return this.summary(r);
      }
      try {
        this.verifyPayment(r, payment);
      } catch {
        return this.manual(r, "payment_mismatch");
      }
      this.capturePayment(r, payment);
      if (["FAILED", "CANCELED"].includes(payment.status)) {
        r.phase = "declined";
        r.warning = "payment_not_completed";
        await this.write(r);
        return this.summary(r);
      }
      if (payment.status !== "COMPLETED") {
        r.phase = "unknown";
        r.warning = "payment_not_completed";
        await this.write(r);
        return this.summary(r);
      }
      r.phase = "paid";
      r.warning = null;
      await this.write(r);
      await this.trace(r, "payment_paid");
    }
    if (r.inventory !== "applied") {
      if (!r.inventoryOperation) {
        r.inventoryOperation = { key: `yh-inventory-${r.payment.id}`.slice(0, 128), occurredAt: new Date(this.now()).toISOString() };
        await this.write(r);
      }
      if (this.now() - Date.parse(r.inventoryOperation.occurredAt) > RETRY_WINDOW_MS2) {
        r.inventory = "manual_review";
        r.manual = true;
        r.warning = "inventory_retry_window_expired";
      } else {
        try {
          await this.services.decrement(r);
          r.inventory = "applied";
          r.warning = null;
        } catch (error) {
          r.inventory = "retry_required";
          r.warning = "inventory_recovery_required";
          if (error.permanent) {
            r.manual = true;
            r.warning = "inventory_conflict";
          }
        }
      }
      await this.write(r);
      await this.trace(r, r.inventory === "applied" ? "inventory_applied" : "inventory_pending");
    }
    try {
      await this.services.project(r);
      r.projection = "stored";
    } catch {
      r.projection = "retry_required";
      if (!r.manual) r.warning = "order_projection_required";
    }
    await this.write(r);
    await this.trace(r, r.projection === "stored" ? "order_stored" : "order_pending");
    await this.recoverMail(r);
    if (r.manual) await this.notify(r);
    return this.summary(r);
  }
  async recoverMail(r) {
    if (!this.mail) return;
    try {
      await this.mail.ensure(r);
      await this.mail.process(r.id);
      const status = await this.mail.status(r.orderReference);
      await this.trace(r, "mail_state", { admin: status.admin?.state, customer: status.customer?.state });
    } catch {
      try {
        await this.arm(this.now() + 6e4);
      } catch {
      }
    }
  }
  async mailStatus(orderReference) {
    return this.mail ? this.mail.status(orderReference) : { admin: { state: "unrecorded" }, customer: { state: "unrecorded" } };
  }
  async mailAlarm() {
    if (!this.mail) return;
    await this.initialize();
    for (const [key, pending] of await this.entries("mail-create:")) {
      if (pending) {
        try {
          const r = await this.read(key.slice(12));
          if (r) await this.mail.ensure(r);
        } catch {
          await this.arm(this.now() + 6e4);
        }
      }
    }
    await this.mail.alarm();
  }
  async manual(r, warning) {
    r.manual = true;
    r.warning = warning;
    await this.write(r);
    await this.notify(r);
    return this.summary(r);
  }
  async notify(r) {
    if (r.notificationSent || r.notificationState === "expired") return;
    r.notificationStartedAt ??= this.now();
    if (this.now() - r.notificationStartedAt > RETRY_WINDOW_MS2) {
      r.notificationState = "expired";
      await this.write(r);
      return;
    }
    r.notificationState = "pending";
    await this.write(r);
    try {
      const notification = await this.services.notify?.(r);
      if (!notification) throw new Error("Notification not configured");
      r.notificationSent = true;
      r.notificationState = notification.queued === true ? "queued" : "sent";
    } catch {
      r.notificationState = "retry_required";
    }
    r.nextDue = this.now() + 3e5;
    await this.write(r);
  }
  async warnings() {
    const records = [];
    for (const [, r] of await this.entries("attempt:")) {
      if (r && !this.closed(r)) records.push(this.summary(r));
    }
    return records;
  }
  async failures() {
    const rows = (await this.entries("attempt:")).map(([, r]) => r).filter((r) => r?.phase === "declined");
    return rows.sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)).map((r) => this.summary(r));
  }
  async alarm() {
    await this.initialize();
    await this.storage.setAlarm(this.now() + 6e4);
    let next = Infinity;
    let processed = false;
    const cursor = await this.storage.get("alarm-cursor") || "";
    const entries = await this.entries("pending:");
    const ordered = [...entries.filter(([key]) => key > cursor), ...entries.filter(([key]) => key <= cursor)];
    for (const [key, pending] of ordered) {
      if (!pending) continue;
      try {
        const id = key.slice(8);
        let r = await this.read(id);
        if (!processed && r.nextDue <= this.now() && this.scheduled(r)) {
          processed = true;
          await this.storage.put("alarm-cursor", key);
          await this.recover(id);
        }
        r = await this.read(id);
        if (this.scheduled(r)) next = Math.min(next, r.nextDue);
      } catch {
        next = Math.min(next, this.now() + 6e4);
      }
    }
    if (Number.isFinite(next)) await this.storage.setAlarm(Math.max(this.now() + 1e3, next));
    else await this.storage.deleteAlarm();
  }
};
async function digest2(value) {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(digest2, "digest");
function paymentSnapshot(payment) {
  const { id, status, reference_id, amount_money, location_id, created_at } = payment;
  const failure = diagnosticsForPayment(payment);
  return {
    id,
    status: ["APPROVED", "PENDING", "COMPLETED", "FAILED", "CANCELED"].includes(status) ? status : "UNKNOWN",
    reference_id,
    amount_money: { amount: amount_money.amount, currency: amount_money.currency },
    location_id,
    created_at: typeof created_at === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(created_at) && Number.isFinite(Date.parse(created_at)) ? created_at : void 0,
    ...failure ? { failure } : {}
  };
}
__name(paymentSnapshot, "paymentSnapshot");

// worker/src/index.js
var catalogEnabled = /* @__PURE__ */ __name((env) => enabled(env) && (!production(env) || env.PRODUCTION_MANAGED_CHECKOUT_ENABLED === "1"), "catalogEnabled");
var managementEffects = /* @__PURE__ */ __name((env) => enabled(env) && (!production(env) || env.PRODUCTION_MANAGEMENT_SCHEMA_READY === "1"), "managementEffects");
var JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};
var MAX_BODY_BYTES = 24e3;
var MAX_ITEM_TYPES = 20;
var src_default = {
  async scheduled(event, env, ctx) {
    if (!enabled(env)) return;
    if (!externalPolicy(env).cron) return;
    await guard(env);
    const id = env.PURCHASE_COORDINATOR.idFromName("yasoya-honten-global-purchase-lock");
    const r = await env.PURCHASE_COORDINATOR.get(id).fetch("https://purchase.internal/management-monitor", { method: "POST", body: "{}" });
    if (!r.ok) throw Error("Management watchdog requires review");
  },
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigins = parseAllowedOrigins(production(env) && new URL(request.url).pathname.startsWith("/api/admin/") ? env.PRODUCTION_ADMIN_ORIGIN : env.ALLOWED_ORIGINS);
    if (request.method === "OPTIONS") {
      return corsResponse(null, 204, origin, allowedOrigins);
    }
    let route;
    try {
      route = checkoutRoute(request);
      request = route.request;
    } catch (error) {
      return corsJson({ error: { code: error.code, message: error.message } }, error.status || 400, origin, allowedOrigins);
    }
    const url = new URL(request.url);
    try {
      const policy = externalPolicy(env);
      if (url.pathname === "/api/checkout-capabilities" && request.method === "GET") return corsJson(checkoutCapabilities(env, policy), 200, origin, allowedOrigins);
      if (production(env) && url.pathname.startsWith("/api/admin/")) {
        await assertProductionAdmin(request, env);
        productionGrant(env, "read");
      }
      if (url.pathname === "/api/payments" && request.method === "POST") assertCheckout(env);
      if (url.pathname === "/api/payment-diagnostics" && request.method === "POST") {
        assertAllowedOrigin(origin, allowedOrigins);
        const body = await readJson(request);
        if (!validTraceId(body.attemptId) || body.clientRelease !== "checkout-auth-activation-20261105" || !Array.isArray(body.events) || body.events.length > 16) throw new HttpError(400, "\u8A3A\u65AD\u5F62\u5F0F\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002");
        const id = env.PURCHASE_COORDINATOR.idFromName("yasoya-honten-global-purchase-lock");
        const response = await env.PURCHASE_COORDINATOR.get(id).fetch("https://purchase.internal/client-trace", { method: "POST", body: JSON.stringify({ attemptId: body.attemptId, events: body.events }) });
        return corsJson({ ok: response.ok }, response.status, origin, allowedOrigins);
      }
      if (enabled(env)) {
        if (!production(env) || /^\/api\/(admin\/(products|inventory|jobs|audit|images|storefront)(\/|$)|media\/)/.test(url.pathname)) await guard(env);
        if (url.pathname.startsWith("/api/admin/images")) {
          await assertAdmin(request, env);
          if (origin && request.method !== "GET") assertAllowedOrigin(origin, allowedOrigins);
          if (request.method === "POST" && url.pathname === "/api/admin/images") return corsJson(await uploadImage(request, env), 200, origin, allowedOrigins);
          if (request.method === "GET" && /^\/api\/admin\/images\/[a-f0-9]{64}$/.test(url.pathname)) return await serveImage(url.pathname.split("/").pop(), env, true);
          throw new ManagementError(405, "Method not allowed");
        }
        if (request.method === "GET" && /^\/api\/media\/[a-f0-9]{64}$/.test(url.pathname)) return await serveImage(url.pathname.split("/").pop(), env);
        if (/^\/api\/admin\/(products|inventory|jobs|audit|storefront)(\/|$)/.test(url.pathname)) {
          await assertAdmin(request, env);
          if (origin && request.method !== "GET") assertAllowedOrigin(origin, allowedOrigins);
          if (!["GET", "PUT", "POST"].includes(request.method)) throw new ManagementError(405, "Method not allowed");
          const payload = request.method === "GET" ? {} : await readJson(request);
          const id = env.PURCHASE_COORDINATOR.idFromName("yasoya-honten-global-purchase-lock");
          const r = await env.PURCHASE_COORDINATOR.get(id).fetch("https://purchase.internal/management", { method: "POST", body: JSON.stringify({ path: url.pathname, method: request.method, body: payload, actor: "authenticated-admin" }) });
          return corsJson(await r.json(), r.status, origin, allowedOrigins);
        }
        if (catalogEnabled(env)) await loadCatalog(env);
        if (catalogEnabled(env) && request.method === "GET" && !url.pathname.startsWith("/api/")) {
          const page = await renderPage(request, env);
          if (page) return page;
        }
        if (catalogEnabled(env) && request.method === "GET" && url.pathname === "/api/catalog") return corsJson({ products: await new Store(env).publicProducts(), ...env.RUNTIME_TIER === "staging" ? { retiredVariantIds: await new Store(env).retiredVariantIds() } : {} }, 200, origin, allowedOrigins);
        if (catalogEnabled(env) && request.method === "POST" && ["/api/inventory", "/api/quote"].includes(url.pathname)) {
          assertAllowedOrigin(origin, allowedOrigins);
          const body = await readJson(request);
          const id = env.PURCHASE_COORDINATOR.idFromName("yasoya-honten-global-purchase-lock");
          const r = await env.PURCHASE_COORDINATOR.get(id).fetch("https://purchase.internal/" + (url.pathname.endsWith("quote") ? "managed-quote" : "managed-stock"), { method: "POST", body: JSON.stringify(body) });
          return corsJson(await r.json(), r.status, origin, allowedOrigins);
        }
      }
      if (request.method === "GET" && url.pathname === "/api/health") {
        return corsJson({
          ok: true,
          service: "YASOYA HONTEN PAYMENTS",
          version: "2.0.0",
          environment: env.SQUARE_ENVIRONMENT || "sandbox",
          emailConfigured: Boolean(resendKey(env) && env.RESEND_FROM_EMAIL)
        }, 200, origin, allowedOrigins);
      }
      if (request.method === "POST" && url.pathname === "/api/inventory") {
        assertAllowedOrigin(origin, allowedOrigins);
        const body = await readJson(request);
        const rawIds = Array.isArray(body.ids) ? body.ids : [];
        if (rawIds.length === 0 || rawIds.length > MAX_ITEM_TYPES) {
          throw new HttpError(400, "\u5728\u5EAB\u3092\u78BA\u8A8D\u3059\u308B\u5546\u54C1\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002");
        }
        const ids = [...new Set(rawIds.map((id) => String(id || "").trim()))];
        const items = ids.map((id) => {
          const product = catalogFor(env)[id];
          if (!product || !product.active) {
            throw new HttpError(400, "\u8CA9\u58F2\u3067\u304D\u306A\u3044\u5546\u54C1\u304C\u542B\u307E\u308C\u3066\u3044\u307E\u3059\u3002");
          }
          return { id, name: product.name, quantity: 1, price: product.price, lineTotal: product.price };
        });
        const inventory = await retrieveSquareInventory(env, { items });
        return corsJson({
          inventory: inventory.map(({ id, name, availableQuantity }) => ({
            id,
            name,
            availableQuantity
          }))
        }, 200, origin, allowedOrigins);
      }
      if (request.method === "POST" && url.pathname === "/api/quote") {
        assertAllowedOrigin(origin, allowedOrigins);
        const body = await readJson(request);
        const quote = buildQuote(body.items, env);
        const inventory = await assertSquareInventoryAvailable(env, quote);
        return corsJson({
          ...quote,
          inventory
        }, 200, origin, allowedOrigins);
      }
      if (request.method === "POST" && ["/api/payments", "/api/payments/status"].includes(url.pathname)) {
        assertAllowedOrigin(origin, allowedOrigins);
        if (url.pathname === "/api/payments" && enabled(env) && env.MANAGEMENT_CHECKOUT_PAUSED === "1") throw new HttpError(503, "\u65B0\u898F\u6CE8\u6587\u3092\u4E00\u6642\u505C\u6B62\u3057\u3066\u3044\u307E\u3059\u3002\u65E2\u5B58\u6CE8\u6587\u306E\u78BA\u8A8D\u306F\u7D99\u7D9A\u3067\u304D\u307E\u3059\u3002");
        let body = await readJson(request);
        if (route.version && body.contractVersion !== void 0 && body.contractVersion !== 1) throw new CheckoutContractError("CHECKOUT_CONTRACT_UNSUPPORTED", "\u8CFC\u5165\u753B\u9762\u3092\u66F4\u65B0\u3057\u3066\u304F\u3060\u3055\u3044\u3002", 426);
        if (production(env) && url.pathname === "/api/payments") body = adaptProductionPurchase(request, body, env);
        if (!env.PURCHASE_COORDINATOR) {
          throw new Error("PURCHASE_COORDINATOR binding is missing.");
        }
        const id = env.PURCHASE_COORDINATOR.idFromName("yasoya-honten-global-purchase-lock");
        const stub = env.PURCHASE_COORDINATOR.get(id);
        const coordinated = await stub.fetch(url.pathname.endsWith("/status") ? "https://purchase.internal/status" : "https://purchase.internal/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        const result = await coordinated.json().catch(() => ({}));
        if (!coordinated.ok) {
          throw new HttpError(coordinated.status, result?.error?.message || "\u6C7A\u6E08\u3092\u5B8C\u4E86\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002");
        }
        if (production(env)) {
          const adapted = adaptProductionPurchaseResponse(result, coordinated.status, route.originalPath);
          return corsJson(adapted.body, adapted.status, origin, allowedOrigins);
        }
        return corsJson(result, coordinated.status, origin, allowedOrigins);
      }
      if (url.pathname.startsWith("/api/admin/")) {
        await assertAdmin(request, env);
        if (url.pathname === "/api/admin/payment-attempts" || /^\/api\/admin\/payment-attempts\/[a-f0-9-]+\/recover$/.test(url.pathname)) {
          const id = env.PURCHASE_COORDINATOR.idFromName("yasoya-honten-global-purchase-lock");
          const stub = env.PURCHASE_COORDINATOR.get(id);
          const recovery = url.pathname.endsWith("/recover");
          if (recovery && request.method !== "POST" || !recovery && request.method !== "GET") throw new HttpError(405, "Method not allowed.");
          const attemptId = recovery ? url.pathname.split("/")[4] : null;
          const response = await stub.fetch(`https://purchase.internal/${recovery ? "recover" : "warnings"}`, {
            method: "POST",
            body: JSON.stringify({ attemptId, ...!recovery && url.searchParams.get("include_failed") === "1" ? { includeFailed: true, includeDiagnostics: url.searchParams.get("include_diagnostics") === "1" } : {} })
          });
          return corsJson(await response.json(), response.status, origin, allowedOrigins);
        }
        if (request.method === "GET" && url.pathname === "/api/admin/orders") {
          const status = url.searchParams.get("status") || "pending";
          return corsJson({ orders: await listOrders(env, status) }, 200, origin, allowedOrigins);
        }
        if (request.method === "GET" && /^\/api\/admin\/orders\/[^/]+\/mail-status$/.test(url.pathname)) {
          const orderReference = decodeURIComponent(url.pathname.split("/")[4]);
          if (!await getOrder(env, orderReference)) throw new HttpError(404, "\u6CE8\u6587\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002");
          const id = env.PURCHASE_COORDINATOR.idFromName("yasoya-honten-global-purchase-lock");
          const response = await env.PURCHASE_COORDINATOR.get(id).fetch("https://purchase.internal/mail-status", {
            method: "POST",
            body: JSON.stringify({ orderReference })
          });
          return corsJson(await response.json(), response.status, origin, allowedOrigins);
        }
        if (request.method === "GET" && url.pathname.startsWith("/api/admin/orders/")) {
          const ref = decodeURIComponent(url.pathname.split("/").pop());
          const order = await getOrder(env, ref);
          if (!order) throw new HttpError(404, "\u6CE8\u6587\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002");
          return corsJson({ order }, 200, origin, allowedOrigins);
        }
        if (request.method === "POST" && /\/api\/admin\/orders\/[^/]+\/ship$/.test(url.pathname)) {
          const parts = url.pathname.split("/");
          const ref = decodeURIComponent(parts[4]);
          const body = await readJson(request);
          const order = await getOrder(env, ref);
          if (!order) throw new HttpError(404, "\u6CE8\u6587\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002");
          if (order.status === "shipped") throw new HttpError(409, "\u3053\u306E\u6CE8\u6587\u306F\u767A\u9001\u6E08\u307F\u3067\u3059\u3002");
          const shippingMethod = requireString(body.shippingMethod, "\u767A\u9001\u65B9\u6CD5\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044\u3002", 80);
          const trackingNumber = String(body.trackingNumber || "").trim().slice(0, 100);
          await sendShippingEmail(env, order, shippingMethod, trackingNumber);
          await markOrderShipped(env, ref, shippingMethod, trackingNumber);
          return corsJson({ ok: true }, 200, origin, allowedOrigins);
        }
      }
      return corsJson({
        error: { message: "Not found." }
      }, 404, origin, allowedOrigins);
    } catch (error) {
      console.error(error);
      const status = error instanceof HttpError || error instanceof ManagementError || (error instanceof ExternalPolicyError || error instanceof ProductionError || error instanceof CheckoutContractError) ? error.status : 500;
      const message = error instanceof HttpError || error instanceof ManagementError || (error instanceof ExternalPolicyError || error instanceof ProductionError || error instanceof CheckoutContractError) ? error.message : "\u30B5\u30FC\u30D0\u30FC\u3067\u554F\u984C\u304C\u767A\u751F\u3057\u307E\u3057\u305F\u3002";
      return corsJson(
        { error: { message, ...error instanceof ExternalPolicyError || error instanceof ProductionError || error instanceof CheckoutContractError ? { code: error.code } : {} } },
        status,
        origin,
        allowedOrigins
      );
    }
  }
};
function catalogFor(env) {
  if (catalogEnabled(env)) {
    if (!env.MANAGED_CATALOG) throw new ManagementError(503, "\u516C\u958B\u5546\u54C1\u60C5\u5831\u304C\u672A\u8AAD\u8FBC\u3067\u3059\u3002");
    return env.MANAGED_CATALOG;
  }
  return ["sandbox-validation", "staging"].includes(env?.RUNTIME_TIER) ? SANDBOX_CATALOG : CATALOG;
}
__name(catalogFor, "catalogFor");
function buildQuote(rawItems, env) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new HttpError(400, "\u30AB\u30FC\u30C8\u304C\u7A7A\u3067\u3059\u3002");
  }
  if (rawItems.length > MAX_ITEM_TYPES) {
    throw new HttpError(400, "\u5546\u54C1\u306E\u7A2E\u985E\u304C\u591A\u3059\u304E\u307E\u3059\u3002");
  }
  const quantities = /* @__PURE__ */ new Map();
  for (const rawItem of rawItems) {
    const id = String(rawItem?.id || "").trim();
    const quantity = Number.parseInt(rawItem?.quantity, 10);
    const product = catalogFor(env)[id];
    if (!product || !product.active) {
      throw new HttpError(400, "\u8CA9\u58F2\u3067\u304D\u306A\u3044\u5546\u54C1\u304C\u542B\u307E\u308C\u3066\u3044\u307E\u3059\u3002");
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new HttpError(400, `${product.name}\u306E\u6570\u91CF\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002`);
    }
    const nextQuantity = (quantities.get(id) || 0) + quantity;
    if (nextQuantity > product.maxQuantity) {
      throw new HttpError(400, `${product.name}\u306E\u8CFC\u5165\u4E0A\u9650\u3092\u8D85\u3048\u3066\u3044\u307E\u3059\u3002`);
    }
    quantities.set(id, nextQuantity);
  }
  const items = [...quantities.entries()].map(([id, quantity]) => {
    const product = catalogFor(env)[id];
    return {
      id,
      name: product.name,
      unitPrice: product.price,
      quantity,
      lineTotal: product.price * quantity,
      ...production(env) ? { squareVariationId: product.squareVariationId } : catalogEnabled(env) ? { squareVariationId: product.squareVariationId, revision: product.revision } : {}
    };
  });
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const shipping = calculateShipping(subtotal);
  const total = subtotal + shipping;
  if (!Number.isSafeInteger(total) || total < 1) {
    throw new HttpError(400, "\u6C7A\u6E08\u91D1\u984D\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002");
  }
  return {
    currency: "JPY",
    items,
    subtotal,
    shipping,
    total,
    shippingRule: {
      flatRate: SHIPPING.flatRate,
      freeThreshold: SHIPPING.freeThreshold
    }
  };
}
__name(buildQuote, "buildQuote");
function validateContact(rawContact) {
  if (!rawContact || typeof rawContact !== "object") {
    throw new HttpError(400, "\u304A\u5C4A\u3051\u5148\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
  }
  const givenName = requireString(rawContact.givenName, "\u540D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002", 80);
  const familyName = requireString(rawContact.familyName, "\u59D3\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002", 80);
  const email = requireString(rawContact.email, "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002", 255).toLowerCase();
  const phone = requireString(rawContact.phone, "\u96FB\u8A71\u756A\u53F7\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002", 40);
  const city = requireString(rawContact.city, "\u5E02\u533A\u753A\u6751\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002", 120);
  const state = requireString(rawContact.state, "\u90FD\u9053\u5E9C\u770C\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002", 80);
  const postalCode = requireString(rawContact.postalCode, "\u90F5\u4FBF\u756A\u53F7\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002", 20);
  const countryCode = String(rawContact.countryCode || "JP").toUpperCase();
  const rawAddressLines = Array.isArray(rawContact.addressLines) ? rawContact.addressLines : [];
  const addressLines = rawAddressLines.map((line) => String(line || "").trim()).filter(Boolean).slice(0, 2);
  if (addressLines.length === 0) {
    throw new HttpError(400, "\u753A\u540D\u30FB\u756A\u5730\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9\u306E\u5F62\u5F0F\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
  }
  if (!/^[0-9０-９+()（）.\-ー―−\s]{9,30}$/.test(phone)) {
    throw new HttpError(400, "\u96FB\u8A71\u756A\u53F7\u306E\u5F62\u5F0F\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
  }
  if (countryCode !== "JP") {
    throw new HttpError(400, "\u73FE\u5728\u306F\u65E5\u672C\u56FD\u5185\u3078\u306E\u767A\u9001\u306E\u307F\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u3059\u3002");
  }
  return {
    givenName,
    familyName,
    email,
    phone,
    addressLines,
    city,
    state,
    postalCode,
    countryCode
  };
}
__name(validateContact, "validateContact");
function squareToken(env) {
  return ["sandbox-validation", "staging"].includes(env.RUNTIME_TIER) ? env.SQUARE_SANDBOX_ACCESS_TOKEN : env.SQUARE_ACCESS_TOKEN;
}
__name(squareToken, "squareToken");
function resendKey(env) {
  return ["sandbox-validation", "staging"].includes(env.RUNTIME_TIER) ? env.RESEND_VALIDATION_API_KEY : env.RESEND_API_KEY;
}
__name(resendKey, "resendKey");
function squareBaseUrl(env) {
  return (env.SQUARE_ENVIRONMENT || "sandbox") === "production" ? "https://connect.squareup.com" : "https://connect.squareupsandbox.com";
}
__name(squareBaseUrl, "squareBaseUrl");
function squareHeaders(env) {
  if (!squareToken(env)) {
    throw new Error("SQUARE_ACCESS_TOKEN is missing.");
  }
  return {
    "Authorization": `Bearer ${squareToken(env)}`,
    "Content-Type": "application/json",
    "Square-Version": env.SQUARE_API_VERSION || "2026-07-15"
  };
}
__name(squareHeaders, "squareHeaders");
function getSquareVariationId(item, env) {
  if (production(env) && item.squareVariationId) {
    squareId(item.squareVariationId, env);
    return item.squareVariationId;
  }
  if (Number.isSafeInteger(item.revision) && item.revision > 0 && item.squareVariationId && env.SQUARE_ENVIRONMENT === "sandbox") {
    squareId(item.squareVariationId);
    return item.squareVariationId;
  }
  if (catalogEnabled(env)) {
    const id = item.squareVariationId || env.MANAGED_CATALOG?.[item.id]?.squareVariationId;
    if (!id) throw new ManagementError(503, "Square\u5BFE\u5FDC\u60C5\u5831\u304C\u3042\u308A\u307E\u305B\u3093\u3002");
    return id;
  }
  const product = catalogFor(env)[item.id];
  const override = ["sandbox-validation", "staging"].includes(env?.RUNTIME_TIER) ? JSON.parse(env.SQUARE_VARIATION_IDS || "{}") : null;
  const variationId = String(override ? override[item.id] || "" : product?.squareVariationId || "").trim();
  if (!variationId || variationId.startsWith("SET_SQUARE_VARIATION_ID_")) {
    throw new Error(`Square\u5728\u5EAB\u9023\u643A\u304C\u672A\u8A2D\u5B9A\u3067\u3059: ${item.id}`);
  }
  return variationId;
}
__name(getSquareVariationId, "getSquareVariationId");
async function squareFetch(env, url, options = {}) {
  assertSquareDestination(env, url);
  assertSquareRequest(env, url, options.method || "GET");
  options = { ...options, redirect: "manual", signal: options.signal || AbortSignal.timeout(5e3) };
  if (env.LOCAL_SQUARE) {
    if (env.LOCAL_TEST_MODE !== "1" || env.SQUARE_ENVIRONMENT !== "sandbox") throw new Error("Test Square binding is not allowed here.");
    return env.LOCAL_SQUARE.fetch(url, options);
  }
  return fetch(url, options);
}
__name(squareFetch, "squareFetch");
async function lookupSquarePayment(env, record) {
  if (record.payment?.id) {
    const response = await squareFetch(env, `${squareBaseUrl(env)}/v2/payments/${encodeURIComponent(record.payment.id)}`, { headers: squareHeaders(env) });
    if (!response.ok) throw new Error("Payment lookup unavailable");
    const result = await response.json();
    return withPaymentDiagnostics(result.payment, response.status, result, "lookup");
  }
  let cursor;
  const matches = [];
  const deadline = Date.now() + 5e3;
  for (let page = 0; page < 20; page++) {
    if (Date.now() >= deadline) throw new Error("Payment reconciliation time budget exceeded");
    const query = new URLSearchParams({ begin_time: new Date(Date.parse(record.createdAt) - 3e5).toISOString(), limit: "100" });
    if (cursor) query.set("cursor", cursor);
    const response = await squareFetch(env, `${squareBaseUrl(env)}/v2/payments?${query}`, { headers: squareHeaders(env), signal: AbortSignal.timeout(Math.max(1, Math.min(2e3, deadline - Date.now()))) });
    if (!response.ok) throw new Error("Payment reconciliation unavailable");
    const result = await response.json();
    matches.push(...(result.payments || []).filter((p) => p.reference_id === record.orderReference).map((p) => withPaymentDiagnostics(p, response.status, { payment: p }, "lookup")));
    cursor = result.cursor;
    if (!cursor) {
      if (matches.length > 1) throw new Error("Multiple matching payments");
      return matches[0] || null;
    }
  }
  throw new Error("Payment reconciliation scan incomplete");
}
__name(lookupSquarePayment, "lookupSquarePayment");
async function retrieveSquareInventory(env, quote) {
  if (!env.SQUARE_LOCATION_ID) {
    throw new Error("SQUARE_LOCATION_ID is missing.");
  }
  const requested = quote.items.map((item) => ({
    item,
    variationId: getSquareVariationId(item, env)
  }));
  const response = await squareFetch(
    env,
    `${squareBaseUrl(env)}/v2/inventory/counts/batch-retrieve`,
    {
      method: "POST",
      headers: squareHeaders(env),
      body: JSON.stringify({
        catalog_object_ids: requested.map(
          ({ variationId }) => variationId
        ),
        location_ids: [env.SQUARE_LOCATION_ID],
        states: ["IN_STOCK"]
      })
    }
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("Square inventory retrieve error:", result);
    throw new HttpError(
      502,
      "\u5728\u5EAB\u60C5\u5831\u3092\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u6642\u9593\u3092\u304A\u3044\u3066\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
    );
  }
  const stockByVariationId = /* @__PURE__ */ new Map();
  for (const count of result.counts || []) {
    if (count.state === "IN_STOCK" && count.location_id === env.SQUARE_LOCATION_ID) {
      const quantity = Number(count.quantity);
      if (Number.isFinite(quantity)) {
        stockByVariationId.set(
          count.catalog_object_id,
          quantity
        );
      }
    }
  }
  return requested.map(({ item, variationId }) => ({
    id: item.id,
    name: item.name,
    requestedQuantity: item.quantity,
    availableQuantity: Math.max(
      0,
      Math.floor(
        stockByVariationId.get(variationId) || 0
      )
    ),
    squareVariationId: variationId
  }));
}
__name(retrieveSquareInventory, "retrieveSquareInventory");
async function assertSquareInventoryAvailable(env, quote) {
  const inventory = await retrieveSquareInventory(env, quote);
  for (const stock of inventory) {
    if (stock.availableQuantity < stock.requestedQuantity) {
      if (stock.availableQuantity <= 0) {
        throw new HttpError(
          409,
          `${stock.name}\u306F\u73FE\u5728\u58F2\u308A\u5207\u308C\u3067\u3059\u3002`
        );
      }
      throw new HttpError(
        409,
        `${stock.name}\u306E\u5728\u5EAB\u306F\u6B8B\u308A${stock.availableQuantity}\u70B9\u3067\u3059\u3002\u6570\u91CF\u3092\u5909\u66F4\u3057\u3066\u304F\u3060\u3055\u3044\u3002`
      );
    }
  }
  return inventory.map((stock) => ({
    id: stock.id,
    availableQuantity: stock.availableQuantity
  }));
}
__name(assertSquareInventoryAvailable, "assertSquareInventoryAvailable");
async function decrementSquareInventory({
  env,
  quote,
  orderReference,
  paymentId,
  inventoryOperation
}) {
  if (externalPolicy(env).managementOnly) assertCheckout(env);
  if (!env.SQUARE_LOCATION_ID) {
    throw new Error("SQUARE_LOCATION_ID is missing.");
  }
  const occurredAt = inventoryOperation.occurredAt;
  const changes = quote.items.map((item) => ({
    type: "ADJUSTMENT",
    adjustment: {
      reference_id: `${orderReference}:${paymentId}`.slice(0, 255),
      catalog_object_id: getSquareVariationId(item, env),
      from_state: "IN_STOCK",
      to_state: "SOLD",
      from_location_id: env.SQUARE_LOCATION_ID,
      to_location_id: env.SQUARE_LOCATION_ID,
      quantity: String(item.quantity),
      occurred_at: occurredAt
    }
  }));
  const response = await squareFetch(
    env,
    `${squareBaseUrl(env)}/v2/inventory/changes/batch-create`,
    {
      method: "POST",
      headers: squareHeaders(env),
      body: JSON.stringify({
        idempotency_key: inventoryOperation.key,
        changes
      })
    }
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok || Array.isArray(result.errors) && result.errors.length > 0) {
    console.error("Square inventory adjustment error:", result);
    const error = new Error("Square inventory adjustment failed.");
    error.permanent = response.status === 409;
    throw error;
  }
  return result;
}
__name(decrementSquareInventory, "decrementSquareInventory");
async function createSquarePayment({ env, sourceId, quote, contact, orderReference, paymentKey, trace = /* @__PURE__ */ __name(async () => {
}, "trace") }) {
  if (externalPolicy(env).managementOnly) assertCheckout(env);
  const baseUrl = squareBaseUrl(env);
  if (!squareToken(env)) {
    throw new Error("SQUARE_ACCESS_TOKEN is missing.");
  }
  if (!env.SQUARE_LOCATION_ID) {
    throw new Error("SQUARE_LOCATION_ID is missing.");
  }
  const requestBody = {
    source_id: sourceId,
    idempotency_key: paymentKey,
    amount_money: {
      amount: quote.total,
      currency: quote.currency
    },
    location_id: env.SQUARE_LOCATION_ID,
    autocomplete: true,
    reference_id: orderReference,
    note: buildPaymentNote(quote),
    buyer_email_address: contact.email,
    shipping_address: {
      first_name: contact.givenName,
      last_name: contact.familyName,
      address_line_1: contact.addressLines[0],
      ...contact.addressLines[1] ? { address_line_2: contact.addressLines[1] } : {},
      locality: contact.city,
      administrative_district_level_1: contact.state,
      postal_code: normalizePostalCode(contact.postalCode),
      country: "JP"
    }
  };
  const normalizedPhone = normalizeJapanesePhone(contact.phone);
  if (normalizedPhone) {
    requestBody.buyer_phone_number = normalizedPhone;
  }
  await trace({ stage: "square_send" });
  const response = await squareFetch(env, `${baseUrl}/v2/payments`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${squareToken(env)}`,
      "Content-Type": "application/json",
      "Square-Version": env.SQUARE_API_VERSION || "2026-07-15"
    },
    body: JSON.stringify(requestBody)
  });
  const result = await response.json().catch(() => ({}));
  const evidence = paymentFailureEvidence(response.status, result);
  await trace({ stage: "square_response", httpStatus: response.status, requestId: response.headers.get("x-request-id"), codes: evidence.codes, squareStatus: ["COMPLETED", "FAILED", "CANCELED", "APPROVED", "PENDING"].includes(result.payment?.status) ? result.payment.status : void 0 });
  if (!response.ok && !["FAILED", "CANCELED"].includes(result.payment?.status) || !result.payment) {
    throw new SquarePaymentFailure(response.status, result);
  }
  return withPaymentDiagnostics(result.payment, response.status, result);
}
__name(createSquarePayment, "createSquarePayment");
function buildOrderMessages({ env, payment, quote, contact, orderReference }) {
  if (!env.RESEND_FROM_EMAIL || !env.ORDER_NOTIFICATION_EMAIL || !contact.email) throw new Error("Mail configuration required");
  const adminEmail = env.ORDER_NOTIFICATION_EMAIL || "yasoyahonten@gmail.com";
  const replyTo = env.REPLY_TO_EMAIL || adminEmail;
  const siteUrl = env.SITE_URL || "https://yasoyahonten.awaiaune.com";
  const dateText = formatJapanDate(payment.created_at || (/* @__PURE__ */ new Date()).toISOString());
  const common = {
    paymentId: payment.id,
    orderReference,
    dateText,
    quote,
    contact,
    siteUrl
  };
  const adminMail = buildAdminEmail(common);
  const customerMail = buildCustomerEmail(common);
  return {
    admin: { key: `admin-${payment.id}`, body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [adminEmail],
      reply_to: contact.email,
      subject: `\u3010\u516B\u8349\u5C4B\u672C\u5E97\u3011\u65B0\u3057\u3044\u3054\u6CE8\u6587 ${orderReference}`,
      html: adminMail.html,
      text: adminMail.text
    }) },
    customer: { key: `customer-${payment.id}`, body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [contact.email],
      reply_to: replyTo,
      subject: `\u3054\u6CE8\u6587\u3042\u308A\u304C\u3068\u3046\u3054\u3056\u3044\u307E\u3059\uFF5C\u516B\u8349\u5C4B\u672C\u5E97 ${orderReference}`,
      html: customerMail.html,
      text: customerMail.text
    }) }
  };
}
__name(buildOrderMessages, "buildOrderMessages");
async function sendResendEmail(env, payload, idempotencyKey, frozenBody, signal) {
  assertMail(env);
  assertTestEmail(env, payload);
  if (!resendKey(env)) throw Object.assign(new Error("Mail credential is not configured"), { code: "resend_not_configured" });
  const transport = env.LOCAL_RESEND ? (url, options) => {
    if (env.LOCAL_TEST_MODE !== "1" || env.SQUARE_ENVIRONMENT !== "sandbox") throw new Error("Test Resend binding is not allowed here.");
    return env.LOCAL_RESEND.fetch(url, options);
  } : fetch;
  const response = await transport("https://api.resend.com/emails", {
    signal: AbortSignal.timeout(5e3),
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendKey(env)}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey.slice(0, 256)
    },
    body: frozenBody ?? JSON.stringify(payload),
    ...signal ? { signal } : {}
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = response.status === 429 ? "resend_rate_limited" : response.status >= 500 ? "resend_unavailable" : response.status === 409 ? "resend_key_conflict" : "resend_request_rejected";
    const concurrent = response.status === 409 && result?.name === "concurrent_idempotent_requests";
    throw Object.assign(new Error("Email acceptance not confirmed"), {
      code: concurrent ? "resend_unavailable" : code,
      permanent: response.status >= 400 && response.status < 500 && response.status !== 429 && !concurrent
    });
  }
  return result;
}
__name(sendResendEmail, "sendResendEmail");
function buildAdminEmail({ paymentId, orderReference, dateText, quote, contact }) {
  const itemsHtml = quote.items.map((item) => `
        <tr>
            <td style="padding:10px 0;border-bottom:1px solid #e7e1d6;">${escapeHtml(item.name)}</td>
            <td style="padding:10px 0;border-bottom:1px solid #e7e1d6;text-align:center;">${item.quantity}</td>
            <td style="padding:10px 0;border-bottom:1px solid #e7e1d6;text-align:right;">${formatMoney(item.lineTotal)}</td>
        </tr>
    `).join("");
  const itemsText = quote.items.map((item) => `\u30FB${item.name} \xD7 ${item.quantity}\u3000${formatMoney(item.lineTotal)}`).join("\n");
  const address = formatAddress(contact);
  return {
    html: emailShell(`
            <p style="margin:0 0 24px;font-size:18px;">\u65B0\u3057\u3044\u3054\u6CE8\u6587\u304C\u5165\u308A\u307E\u3057\u305F\u3002</p>
            <p style="margin:0 0 8px;"><strong>\u6CE8\u6587\u756A\u53F7\uFF1A</strong>${escapeHtml(orderReference)}</p>
            <p style="margin:0 0 8px;"><strong>Square Payment ID\uFF1A</strong>${escapeHtml(paymentId)}</p>
            <p style="margin:0 0 28px;"><strong>\u6CE8\u6587\u65E5\u6642\uFF1A</strong>${escapeHtml(dateText)}</p>

            <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
                <thead>
                    <tr>
                        <th style="padding:8px 0;text-align:left;border-bottom:1px solid #22231f;">\u5546\u54C1</th>
                        <th style="padding:8px 0;text-align:center;border-bottom:1px solid #22231f;">\u6570\u91CF</th>
                        <th style="padding:8px 0;text-align:right;border-bottom:1px solid #22231f;">\u91D1\u984D</th>
                    </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
            </table>

            ${totalsHtml(quote)}

            <h2 style="margin:32px 0 14px;font-size:15px;letter-spacing:.08em;">\u304A\u5C4A\u3051\u5148</h2>
            <p style="margin:0;line-height:1.9;">
                ${escapeHtml(contact.familyName)} ${escapeHtml(contact.givenName)} \u69D8<br>
                ${escapeHtml(address)}<br>
                \u96FB\u8A71\uFF1A${escapeHtml(contact.phone)}<br>
                \u30E1\u30FC\u30EB\uFF1A${escapeHtml(contact.email)}
            </p>
        `),
    text: `\u65B0\u3057\u3044\u3054\u6CE8\u6587\u304C\u5165\u308A\u307E\u3057\u305F\u3002

\u6CE8\u6587\u756A\u53F7\uFF1A${orderReference}
Square Payment ID\uFF1A${paymentId}
\u6CE8\u6587\u65E5\u6642\uFF1A${dateText}

\u3010\u5546\u54C1\u3011
${itemsText}

\u5C0F\u8A08\uFF1A${formatMoney(quote.subtotal)}
\u9001\u6599\uFF1A${formatMoney(quote.shipping)}
\u5408\u8A08\uFF1A${formatMoney(quote.total)}

\u3010\u304A\u5C4A\u3051\u5148\u3011
${contact.familyName} ${contact.givenName} \u69D8
${address}
\u96FB\u8A71\uFF1A${contact.phone}
\u30E1\u30FC\u30EB\uFF1A${contact.email}`
  };
}
__name(buildAdminEmail, "buildAdminEmail");
function buildCustomerEmail({ paymentId, orderReference, dateText, quote, contact, siteUrl }) {
  const itemsHtml = quote.items.map((item) => `
        <tr>
            <td style="padding:10px 0;border-bottom:1px solid #e7e1d6;">${escapeHtml(item.name)} \xD7 ${item.quantity}</td>
            <td style="padding:10px 0;border-bottom:1px solid #e7e1d6;text-align:right;">${formatMoney(item.lineTotal)}</td>
        </tr>
    `).join("");
  const itemsText = quote.items.map((item) => `\u30FB${item.name} \xD7 ${item.quantity}\u3000${formatMoney(item.lineTotal)}`).join("\n");
  const address = formatAddress(contact);
  return {
    html: emailShell(`
            <p style="margin:0 0 22px;line-height:2;">
                ${escapeHtml(contact.familyName)} ${escapeHtml(contact.givenName)} \u69D8<br><br>
                \u3053\u306E\u305F\u3073\u306F\u516B\u8349\u5C4B\u672C\u5E97\u3092\u3054\u5229\u7528\u3044\u305F\u3060\u304D\u3001\u3042\u308A\u304C\u3068\u3046\u3054\u3056\u3044\u307E\u3059\u3002<br>
                \u4EE5\u4E0B\u306E\u5185\u5BB9\u3067\u3054\u6CE8\u6587\u3092\u627F\u308A\u307E\u3057\u305F\u3002
            </p>

            <p style="margin:0 0 8px;"><strong>\u6CE8\u6587\u756A\u53F7\uFF1A</strong>${escapeHtml(orderReference)}</p>
            <p style="margin:0 0 26px;"><strong>\u6CE8\u6587\u65E5\u6642\uFF1A</strong>${escapeHtml(dateText)}</p>

            <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
                <tbody>${itemsHtml}</tbody>
            </table>

            ${totalsHtml(quote)}

            <h2 style="margin:32px 0 14px;font-size:15px;letter-spacing:.08em;">\u304A\u5C4A\u3051\u5148</h2>
            <p style="margin:0 0 28px;line-height:1.9;">
                ${escapeHtml(contact.familyName)} ${escapeHtml(contact.givenName)} \u69D8<br>
                ${escapeHtml(address)}
            </p>

            <p style="margin:0 0 28px;line-height:2;">
                \u767A\u9001\u6E96\u5099\u304C\u6574\u3044\u307E\u3057\u305F\u3089\u3001\u6539\u3081\u3066\u3054\u6848\u5185\u3044\u305F\u3057\u307E\u3059\u3002<br>
                \u5546\u54C1\u304C\u304A\u624B\u5143\u306B\u5C4A\u304F\u307E\u3067\u3001\u3057\u3070\u3089\u304F\u304A\u5F85\u3061\u304F\u3060\u3055\u3044\u3002
            </p>

            <p style="margin:0;color:#6d6f68;font-size:12px;line-height:1.8;">
                Square Payment ID\uFF1A${escapeHtml(paymentId)}<br>
                <a href="${escapeHtml(siteUrl)}" style="color:#22231f;">${escapeHtml(siteUrl)}</a>
            </p>
        `),
    text: `${contact.familyName} ${contact.givenName} \u69D8

\u3053\u306E\u305F\u3073\u306F\u516B\u8349\u5C4B\u672C\u5E97\u3092\u3054\u5229\u7528\u3044\u305F\u3060\u304D\u3001\u3042\u308A\u304C\u3068\u3046\u3054\u3056\u3044\u307E\u3059\u3002
\u4EE5\u4E0B\u306E\u5185\u5BB9\u3067\u3054\u6CE8\u6587\u3092\u627F\u308A\u307E\u3057\u305F\u3002

\u6CE8\u6587\u756A\u53F7\uFF1A${orderReference}
\u6CE8\u6587\u65E5\u6642\uFF1A${dateText}

\u3010\u3054\u6CE8\u6587\u5185\u5BB9\u3011
${itemsText}

\u5C0F\u8A08\uFF1A${formatMoney(quote.subtotal)}
\u9001\u6599\uFF1A${formatMoney(quote.shipping)}
\u5408\u8A08\uFF1A${formatMoney(quote.total)}

\u3010\u304A\u5C4A\u3051\u5148\u3011
${contact.familyName} ${contact.givenName} \u69D8
${address}

\u767A\u9001\u6E96\u5099\u304C\u6574\u3044\u307E\u3057\u305F\u3089\u3001\u6539\u3081\u3066\u3054\u6848\u5185\u3044\u305F\u3057\u307E\u3059\u3002
\u5546\u54C1\u304C\u304A\u624B\u5143\u306B\u5C4A\u304F\u307E\u3067\u3001\u3057\u3070\u3089\u304F\u304A\u5F85\u3061\u304F\u3060\u3055\u3044\u3002

\u516B\u8349\u5C4B\u672C\u5E97
${siteUrl}
Square Payment ID\uFF1A${paymentId}`
  };
}
__name(buildCustomerEmail, "buildCustomerEmail");
function emailShell(content2) {
  return `<!doctype html>
<html lang="ja">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f0e7;color:#22231f;font-family:'Hiragino Mincho ProN','Yu Mincho',serif;">
    <div style="max-width:640px;margin:0 auto;padding:42px 22px;">
        <div style="padding:34px 26px;background:#f8f5ee;border:1px solid #ded8cc;">
            <p style="margin:0 0 28px;text-align:center;letter-spacing:.18em;">
                <strong style="font-size:16px;">\u516B\u8349\u5C4B\u672C\u5E97</strong><br>
                <span style="font-size:10px;letter-spacing:.24em;color:#6d6f68;">YASOYA HONTEN</span>
            </p>
            ${content2}
        </div>
    </div>
</body>
</html>`;
}
__name(emailShell, "emailShell");
function totalsHtml(quote) {
  return `
        <div style="margin-left:auto;max-width:280px;">
            <p style="display:flex;justify-content:space-between;margin:8px 0;"><span>\u5C0F\u8A08</span><strong>${formatMoney(quote.subtotal)}</strong></p>
            <p style="display:flex;justify-content:space-between;margin:8px 0;"><span>\u9001\u6599</span><strong>${formatMoney(quote.shipping)}</strong></p>
            <p style="display:flex;justify-content:space-between;margin:16px 0 0;padding-top:16px;border-top:1px solid #22231f;font-size:17px;"><span>\u5408\u8A08</span><strong>${formatMoney(quote.total)}</strong></p>
        </div>
    `;
}
__name(totalsHtml, "totalsHtml");
function makeOrderReference() {
  const now2 = /* @__PURE__ */ new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now2);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const date = `${values.year}${values.month}${values.day}`;
  const random = crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  return `YH-${date}-${random}`;
}
__name(makeOrderReference, "makeOrderReference");
function buildPaymentNote(quote) {
  const itemText = quote.items.map((item) => `${item.name} x${item.quantity}`).join(" / ");
  return `YASOYA HONTEN ONLINE STORE: ${itemText}`.slice(0, 500);
}
__name(buildPaymentNote, "buildPaymentNote");
function formatAddress(contact) {
  const postal = normalizePostalCode(contact.postalCode);
  return `\u3012${postal} ${contact.state}${contact.city}${contact.addressLines.join(" ")}`;
}
__name(formatAddress, "formatAddress");
function normalizePostalCode(value) {
  return String(value).replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 65248)).trim();
}
__name(normalizePostalCode, "normalizePostalCode");
function normalizeJapanesePhone(value) {
  const ascii = String(value).replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 65248)).replace(/[^0-9+]/g, "");
  if (/^\+81\d{9,10}$/.test(ascii)) {
    return ascii;
  }
  if (/^0\d{9,10}$/.test(ascii)) {
    return `+81${ascii.slice(1)}`;
  }
  return "";
}
__name(normalizeJapanesePhone, "normalizeJapanesePhone");
function formatJapanDate(value) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
__name(formatJapanDate, "formatJapanDate");
function formatMoney(amount) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0
  }).format(amount);
}
__name(formatMoney, "formatMoney");
function requireString(value, message, maxLength) {
  const text2 = String(value || "").trim();
  if (!text2) {
    throw new HttpError(400, message);
  }
  if (text2.length > maxLength) {
    throw new HttpError(400, "\u5165\u529B\u5185\u5BB9\u304C\u9577\u3059\u304E\u307E\u3059\u3002");
  }
  return text2;
}
__name(requireString, "requireString");
async function readJson(request) {
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.includes("application/json")) {
    throw new HttpError(415, "JSON\u5F62\u5F0F\u3067\u9001\u4FE1\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
  }
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    throw new HttpError(413, "\u9001\u4FE1\u5185\u5BB9\u304C\u5927\u304D\u3059\u304E\u307E\u3059\u3002");
  }
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "\u9001\u4FE1\u5185\u5BB9\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002");
  }
}
__name(readJson, "readJson");
function parseAllowedOrigins(value = "") {
  return new Set(
    String(value).split(",").map((item) => item.trim().replace(/\/$/, "")).filter(Boolean)
  );
}
__name(parseAllowedOrigins, "parseAllowedOrigins");
function assertAllowedOrigin(origin, allowedOrigins) {
  if (!origin || !allowedOrigins.has(origin.replace(/\/$/, ""))) {
    throw new HttpError(403, "\u3053\u306E\u30B5\u30A4\u30C8\u304B\u3089\u306E\u30EA\u30AF\u30A8\u30B9\u30C8\u306F\u8A31\u53EF\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002");
  }
}
__name(assertAllowedOrigin, "assertAllowedOrigin");
function corsHeaders(origin, allowedOrigins) {
  const headers = new Headers(JSON_HEADERS);
  const normalizedOrigin = origin.replace(/\/$/, "");
  if (normalizedOrigin && allowedOrigins.has(normalizedOrigin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Idempotency-Key");
    headers.set("Access-Control-Max-Age", "86400");
  }
  return headers;
}
__name(corsHeaders, "corsHeaders");
function corsResponse(body, status, origin, allowedOrigins) {
  return new Response(body, {
    status,
    headers: corsHeaders(origin, allowedOrigins)
  });
}
__name(corsResponse, "corsResponse");
function corsJson(data, status, origin, allowedOrigins) {
  return corsResponse(
    JSON.stringify(data),
    status,
    origin,
    allowedOrigins
  );
}
__name(corsJson, "corsJson");
function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
__name(escapeHtml, "escapeHtml");
async function ensureOrdersTable(env) {
  if (production(env)) return;
  if (!env.ORDERS_DB) throw new Error("ORDERS_DB binding is missing.");
  await env.ORDERS_DB.prepare(`CREATE TABLE IF NOT EXISTS orders (
        order_reference TEXT PRIMARY KEY,
        payment_id TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        subtotal INTEGER NOT NULL,
        shipping INTEGER NOT NULL,
        total INTEGER NOT NULL,
        items_json TEXT NOT NULL,
        contact_json TEXT NOT NULL,
        inventory_adjusted INTEGER NOT NULL DEFAULT 0,
        shipping_method TEXT,
        tracking_number TEXT,
        shipped_at TEXT
    )`).run();
  await env.ORDERS_DB.prepare(`CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC)`).run();
}
__name(ensureOrdersTable, "ensureOrdersTable");
async function saveOrder(env, { payment, quote, contact, orderReference, inventoryAdjusted }) {
  await ensureOrdersTable(env);
  await env.ORDERS_DB.prepare(`INSERT OR IGNORE INTO orders
        (order_reference,payment_id,created_at,status,subtotal,shipping,total,items_json,contact_json,inventory_adjusted)
        VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(
    orderReference,
    payment.id,
    payment.created_at || (/* @__PURE__ */ new Date()).toISOString(),
    "pending",
    quote.subtotal,
    quote.shipping,
    quote.total,
    JSON.stringify(quote.items),
    JSON.stringify(contact),
    inventoryAdjusted ? 1 : 0
  ).run();
  const row = await env.ORDERS_DB.prepare("SELECT payment_id FROM orders WHERE order_reference=?").bind(orderReference).first();
  if (row?.payment_id !== payment.id) throw new Error("Order/payment projection conflict");
  await env.ORDERS_DB.prepare("UPDATE orders SET inventory_adjusted=? WHERE order_reference=? AND payment_id=?").bind(inventoryAdjusted ? 1 : 0, orderReference, payment.id).run();
}
__name(saveOrder, "saveOrder");
function rowToOrder(row) {
  if (!row) return null;
  return { ...row, items: JSON.parse(row.items_json || "[]"), contact: JSON.parse(row.contact_json || "{}"), inventoryAdjusted: Boolean(row.inventory_adjusted) };
}
__name(rowToOrder, "rowToOrder");
async function listOrders(env, status) {
  const wanted = status === "shipped" ? "shipped" : "pending";
  const { results = [] } = await env.ORDERS_DB.prepare(`SELECT * FROM orders WHERE status=? ORDER BY created_at DESC LIMIT 200`).bind(wanted).all();
  return results.map(rowToOrder);
}
__name(listOrders, "listOrders");
async function getOrder(env, ref) {
  return rowToOrder(await env.ORDERS_DB.prepare(`SELECT * FROM orders WHERE order_reference=?`).bind(ref).first());
}
__name(getOrder, "getOrder");
async function markOrderShipped(env, ref, shippingMethod, trackingNumber) {
  await ensureOrdersTable(env);
  await env.ORDERS_DB.prepare(`UPDATE orders SET status='shipped', shipping_method=?, tracking_number=?, shipped_at=? WHERE order_reference=?`).bind(shippingMethod, trackingNumber || null, (/* @__PURE__ */ new Date()).toISOString(), ref).run();
}
__name(markOrderShipped, "markOrderShipped");
async function assertAdmin(request, env) {
  const token = ["sandbox-validation", "staging"].includes(env.RUNTIME_TIER) ? env.VALIDATION_ADMIN_TOKEN : env.ADMIN_TOKEN;
  if (!token) throw new Error("ADMIN_TOKEN secret is missing.");
  const auth = request.headers.get("Authorization") || "";
  if (auth.length > 8192) throw new HttpError(401, "\u7BA1\u7406\u8005\u8A8D\u8A3C\u304C\u5FC5\u8981\u3067\u3059\u3002");
  const encode = new TextEncoder();
  const [a, b] = await Promise.all([crypto.subtle.digest("SHA-256", encode.encode(auth)), crypto.subtle.digest("SHA-256", encode.encode(`Bearer ${token}`))]);
  let mismatch = 0;
  const x = new Uint8Array(a), y = new Uint8Array(b);
  for (let i = 0; i < x.length; i++) mismatch |= x[i] ^ y[i];
  if (mismatch) throw new HttpError(401, "\u7BA1\u7406\u8005\u8A8D\u8A3C\u304C\u5FC5\u8981\u3067\u3059\u3002");
}
__name(assertAdmin, "assertAdmin");
async function sendShippingEmail(env, order, shippingMethod, trackingNumber) {
  if (!resendKey(env) || !env.RESEND_FROM_EMAIL) {
    throw new HttpError(503, "\u30E1\u30FC\u30EB\u9001\u4FE1\u8A2D\u5B9A\u304C\u3042\u308A\u307E\u305B\u3093\u3002");
  }
  const c = order.contact;
  const siteUrl = env.SITE_URL || "https://yasoyahonten.awaiaune.com";
  const trackingHtml = trackingNumber ? `<p style="margin:0 0 8px;"><strong>\u304A\u554F\u3044\u5408\u308F\u305B\u756A\u53F7\uFF1A</strong>${escapeHtml(trackingNumber)}</p>` : "";
  const trackingText = trackingNumber ? `
\u304A\u554F\u3044\u5408\u308F\u305B\u756A\u53F7\uFF1A${trackingNumber}` : "";
  const html = emailShell(`
        <p style="margin:0 0 22px;line-height:2;">
            ${escapeHtml(c.familyName)} ${escapeHtml(c.givenName)} \u69D8<br><br>
            \u3053\u306E\u305F\u3073\u306F\u516B\u8349\u5C4B\u672C\u5E97\u3092\u3054\u5229\u7528\u3044\u305F\u3060\u304D\u3001\u3042\u308A\u304C\u3068\u3046\u3054\u3056\u3044\u307E\u3059\u3002<br>
            \u3054\u6CE8\u6587\u306E\u5546\u54C1\u3092\u767A\u9001\u3044\u305F\u3057\u307E\u3057\u305F\u3002
        </p>

        <p style="margin:0 0 8px;"><strong>\u6CE8\u6587\u756A\u53F7\uFF1A</strong>${escapeHtml(order.order_reference)}</p>
        <p style="margin:0 0 8px;"><strong>\u767A\u9001\u65B9\u6CD5\uFF1A</strong>${escapeHtml(shippingMethod)}</p>
        ${trackingHtml}

        <p style="margin:28px 0;line-height:2;">
            \u5546\u54C1\u304C\u304A\u624B\u5143\u306B\u5C4A\u304F\u307E\u3067\u3001\u4ECA\u3057\u3070\u3089\u304F\u304A\u5F85\u3061\u304F\u3060\u3055\u3044\u3002
        </p>

        <p style="margin:0;color:#6d6f68;font-size:12px;line-height:1.8;">
            <a href="${escapeHtml(siteUrl)}" style="color:#22231f;">${escapeHtml(siteUrl)}</a>
        </p>
    `);
  const text2 = `${c.familyName} ${c.givenName} \u69D8

\u3053\u306E\u305F\u3073\u306F\u516B\u8349\u5C4B\u672C\u5E97\u3092\u3054\u5229\u7528\u3044\u305F\u3060\u304D\u3001\u3042\u308A\u304C\u3068\u3046\u3054\u3056\u3044\u307E\u3059\u3002
\u3054\u6CE8\u6587\u306E\u5546\u54C1\u3092\u767A\u9001\u3044\u305F\u3057\u307E\u3057\u305F\u3002

\u6CE8\u6587\u756A\u53F7\uFF1A${order.order_reference}
\u767A\u9001\u65B9\u6CD5\uFF1A${shippingMethod}${trackingText}

\u5546\u54C1\u304C\u304A\u624B\u5143\u306B\u5C4A\u304F\u307E\u3067\u3001\u4ECA\u3057\u3070\u3089\u304F\u304A\u5F85\u3061\u304F\u3060\u3055\u3044\u3002

\u516B\u8349\u5C4B\u672C\u5E97
YASOYA HONTEN
${siteUrl}`;
  await sendResendEmail(
    env,
    {
      from: env.RESEND_FROM_EMAIL,
      to: [c.email],
      reply_to: env.REPLY_TO_EMAIL || env.ORDER_NOTIFICATION_EMAIL,
      subject: `\u5546\u54C1\u3092\u767A\u9001\u3057\u307E\u3057\u305F\uFF5C\u516B\u8349\u5C4B\u672C\u5E97 ${order.order_reference}`,
      html,
      text: text2
    },
    `shipping-${order.payment_id}`
  );
}
__name(sendShippingEmail, "sendShippingEmail");
var PurchaseCoordinator = class {
  static {
    __name(this, "PurchaseCoordinator");
  }
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.queue = Promise.resolve();
    this.traces = new PaymentTrace(ctx.storage);
    this.alerts = production(env) ? new PaymentAlerts(ctx.storage, {
      prepare: /* @__PURE__ */ __name((text2, kind) => {
        if (!env.RESEND_FROM_EMAIL || !env.ORDER_NOTIFICATION_EMAIL) throw new Error("Alert mail not configured");
        return JSON.stringify({ from: env.RESEND_FROM_EMAIL, to: [env.ORDER_NOTIFICATION_EMAIL], subject: "\u3010\u516B\u8349\u5C4B\u672C\u5E97\u30FB\u8981\u78BA\u8A8D\u3011\u6C7A\u6E08 " + kind, text: text2 });
      }, "prepare"),
      send: /* @__PURE__ */ __name((body, key) => sendResendEmail(env, JSON.parse(body), key, body, AbortSignal.timeout(4e3)), "send")
    }) : null;
    const trace = /* @__PURE__ */ __name(async (id, event) => {
      try {
        await this.traces.append(id, [event]);
      } catch {
      }
      try {
        if (this.alerts) await this.alerts.observe(id, event, await this.ledger.read(id));
      } catch {
      }
    }, "trace");
    this.ledger = new PurchaseLedger(ctx.storage, {
      trace,
      location: env.SQUARE_LOCATION_ID,
      validate: /* @__PURE__ */ __name((body) => {
        requireString(body.sourceId, "\u6C7A\u6E08\u30C8\u30FC\u30AF\u30F3\u304C\u3042\u308A\u307E\u305B\u3093\u3002", 500);
        body.attemptId = validateAttemptId(body.attemptId);
        const quote = buildQuote(body.items, env);
        quote.items.sort((a, b) => a.id.localeCompare(b.id));
        return { quote, stockKeys: quote.items.map((item) => `${env.SQUARE_LOCATION_ID}:${getSquareVariationId(item, env)}`), contact: validateContact(body.contact) };
      }, "validate"),
      stockKeys: /* @__PURE__ */ __name((quote) => quote.items.map((item) => `${env.SQUARE_LOCATION_ID}:${getSquareVariationId(item, env)}`), "stockKeys"),
      notify: /* @__PURE__ */ __name(async (record) => {
        if (this.alerts) return await this.alerts.manual(record) ? { queued: true } : false;
        if (externalPolicy(env).managementOnly) assertMail(env);
        if (!resendKey(env) || !env.RESEND_FROM_EMAIL || !env.ORDER_NOTIFICATION_EMAIL) return false;
        await sendResendEmail(env, {
          from: env.RESEND_FROM_EMAIL,
          to: [env.ORDER_NOTIFICATION_EMAIL],
          subject: `\u3010\u8981\u78BA\u8A8D\u3011\u6CE8\u6587 ${record.orderReference}`,
          text: `\u6CE8\u6587\u756A\u53F7: ${record.orderReference}
\u72B6\u614B: ${record.warning}
\u5BFE\u8C61: ${record.quote.items.map((i) => i.id).join(", ")}
\u518D\u8AB2\u91D1\u305B\u305A\u7BA1\u7406\u8005API\u3067\u72B6\u6CC1\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002`
        }, `purchase-review-${record.id}`);
        return true;
      }, "notify"),
      reference: makeOrderReference,
      stock: /* @__PURE__ */ __name(async (quote) => {
        if (managementEffects(env)) {
          const manager = new Management(env, this.ctx.storage);
          await manager.s.assertUnlocked(quote.items.map((i) => i.id));
          if (catalogEnabled(env)) await manager.assertSalesCatalog(quote);
        }
        return assertSquareInventoryAvailable(env, quote);
      }, "stock"),
      charge: /* @__PURE__ */ __name(async (record, sourceId) => {
        try {
          return await createSquarePayment({ env, ...record, sourceId, trace: /* @__PURE__ */ __name((event) => trace(record.id, event), "trace") });
        } catch (error) {
          if (!(error instanceof SquarePaymentFailure)) await trace(record.id, { stage: "square_unknown" });
          throw error;
        }
      }, "charge"),
      lookup: /* @__PURE__ */ __name((record) => lookupSquarePayment(env, record), "lookup"),
      decrement: /* @__PURE__ */ __name(async (record) => {
        if (externalPolicy(env).managementOnly) assertCheckout(env);
        return decrementSquareInventory({ env, ...record, paymentId: record.payment.id });
      }, "decrement"),
      project: /* @__PURE__ */ __name((record) => saveOrder(env, { ...record, inventoryAdjusted: record.inventory === "applied" }), "project"),
      mail: {
        prepare: /* @__PURE__ */ __name((record) => buildOrderMessages({ env, ...record }), "prepare"),
        send: /* @__PURE__ */ __name((task) => sendResendEmail(env, JSON.parse(task.body), task.key, task.body), "send")
      }
    });
  }
  management() {
    const env = this.env;
    const notify = resendKey(env) && env.RESEND_FROM_EMAIL && env.ORDER_NOTIFICATION_EMAIL ? async (payload, key) => {
      await guard(env);
      await sendResendEmail(env, {
        from: env.RESEND_FROM_EMAIL,
        to: [env.ORDER_NOTIFICATION_EMAIL],
        subject: "\u3010\u7BA1\u7406\u540C\u671F\u30FB\u8981\u78BA\u8A8D\u3011\u516B\u8349\u5C4B\u672C\u5E97",
        text: `\u7BA1\u7406\u540C\u671F\u30B8\u30E7\u30D6: ${payload.jobId}
\u7A2E\u985E: ${payload.kind}
\u5BFE\u8C61: ${payload.resourceId}
\u691C\u51FA: ${payload.event}
\u65B0\u3057\u3044\u64CD\u4F5CID\u3067\u518D\u9001\u305B\u305A\u3001\u7BA1\u7406\u753B\u9762\u3067\u7167\u5408\u3057\u3066\u304F\u3060\u3055\u3044\u3002`
      }, key);
      return true;
    } : void 0;
    return new Management(env, this.ctx.storage, { notify });
  }
  serialize(action, { catalog = true, management = false } = {}) {
    const guarded = /* @__PURE__ */ __name(async () => {
      if (enabled(this.env) && (!production(this.env) || management)) {
        await guard(this.env);
        if (!this.managementStarted) {
          try {
            await this.management().supervision.tick({ run: false });
            this.managementStarted = true;
          } catch {
            console.error("Management startup scan requires watchdog review");
          }
        }
        if (catalog && catalogEnabled(this.env)) await loadCatalog(this.env);
      }
      if (production(this.env) && catalog && catalogEnabled(this.env)) await loadCatalog(this.env);
      return action();
    }, "guarded");
    const job = this.queue.then(guarded, guarded);
    this.queue = job.catch(() => {
    });
    return job;
  }
  async fetch(request) {
    const body = await request.json().catch(() => ({}));
    const path = new URL(request.url).pathname;
    return this.serialize(async () => {
      try {
        const policy = externalPolicy(this.env);
        if (path === "/pay") assertCheckout(this.env);
        if ((policy.readOnly || policy.managementOnly) && ["/recover", "/status"].includes(path)) {
          const record = await this.ledger.read(validateAttemptId(body.attemptId));
          return Response.json({ attemptId: body.attemptId, phase: record?.phase || "unknown", held: true, reason: policy.managementOnly ? "SANDBOX_MANAGEMENT" : "READ_ONLY" });
        }
        let result;
        if (path === "/client-trace") {
          if (!validTraceId(body.attemptId) || !Array.isArray(body.events) || body.events.length > 16) throw new HttpError(400, "\u8A3A\u65AD\u5F62\u5F0F\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002");
          await this.traces.append(body.attemptId, body.events, "browser");
          return Response.json({ ok: true });
        }
        if (enabled(this.env) && path === "/management-monitor") {
          await this.management().recover();
          return Response.json({ ok: true });
        }
        if (enabled(this.env) && path === "/management") return Response.json(await this.management().handle(body.path, body.method, body.body, body.actor));
        if (enabled(this.env) && ["/managed-stock", "/managed-quote"].includes(path)) {
          const manager = new Management(this.env, this.ctx.storage);
          if (path === "/managed-quote") {
            const quote = buildQuote(body.items, this.env);
            await manager.s.assertUnlocked(quote.items.map((i) => i.id));
            await manager.assertSalesCatalog(quote);
            await manager.assertNoPurchaseHold(quote.items.map((i) => i.id));
            return Response.json({ ...quote, inventory: await assertSquareInventoryAvailable(this.env, quote) });
          }
          if (!Array.isArray(body.ids) || !body.ids.length || body.ids.length > 20) throw new ManagementError(400, "\u5546\u54C1ID\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093\u3002");
          const catalog = catalogFor(this.env), ids = [...new Set(body.ids)];
          if (!ids.every((id) => catalog[id])) throw new ManagementError(400, "\u5546\u54C1\u304C\u3042\u308A\u307E\u305B\u3093\u3002");
          const rows = await manager.inventory();
          return Response.json({ inventory: ids.map((id) => {
            const r = rows.find((r2) => r2.id === id);
            return { id, name: catalog[id].name, availableQuantity: catalog[id].active && !r?.held ? r?.quantity || 0 : 0 };
          }) });
        }
        if (path === "/mail-status") {
          const ref = requireString(body.orderReference, "\u6CE8\u6587\u756A\u53F7\u304C\u5FC5\u8981\u3067\u3059\u3002", 100);
          return Response.json({ mail: await this.ledger.mailStatus(ref) });
        }
        if (path === "/warnings") result = { attempts: await this.ledger.warnings(), ...body.includeFailed === true ? { failures: await this.ledger.failures() } : {}, ...body.includeDiagnostics === true ? { diagnostics: await this.traces.list(), diagnosticRetentionDays: 7, adminAlertStatus: await this.alerts?.status() || null } : {} };
        else if (path === "/status" || path === "/recover") {
          body.attemptId = validateAttemptId(body.attemptId);
          result = await this.ledger.recover(body.attemptId, path === "/recover");
        } else {
          assertCheckout(this.env);
          result = await this.ledger.submit(body);
        }
        return Response.json(result, { status: result.attemptId && !result.ok ? 202 : 200 });
      } catch (error) {
        const status = error instanceof HttpError || error instanceof PurchaseError || error instanceof ManagementError || (error instanceof ExternalPolicyError || error instanceof ProductionError || error instanceof CheckoutContractError) ? error.status : 503;
        return Response.json({ error: { code: error instanceof ExternalPolicyError || error instanceof ProductionError || error instanceof CheckoutContractError || error instanceof ManagementError ? error.code : void 0, stage: error instanceof ManagementError ? error.actionStage : void 0, message: status === 503 && !(error instanceof ManagementError && error.actionStage) && !(error instanceof ExternalPolicyError || error instanceof ProductionError || error instanceof CheckoutContractError) ? "\u6CE8\u6587\u306E\u51E6\u7406\u72B6\u6CC1\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u540C\u3058\u6CE8\u6587\u756A\u53F7\u3067\u518D\u78BA\u8A8D\u3067\u304D\u307E\u3059\u3002" : error.message } }, { status });
      }
    }, { catalog: !["/client-trace", "/warnings", "/mail-status", "/management-monitor", "/management"].includes(path), management: ["/management-monitor", "/management"].includes(path) });
  }
  alarm() {
    let alertJob;
    const work = this.serialize(async () => {
      const policy = externalPolicy(this.env);
      try {
        if (policy.readOnly) return;
        if (policy.managementOnly) {
          await this.management().recover();
          return;
        }
        try {
          if (catalogEnabled(this.env)) await loadCatalog(this.env);
          await this.ledger.alarm();
        } finally {
          try {
            await this.ledger.mailAlarm();
          } finally {
            if (managementEffects(this.env)) await this.management().recover();
          }
        }
      } finally {
        try {
          if (!policy.readOnly && !policy.managementOnly) alertJob = await this.alerts?.prepareNext();
        } catch {
          try {
            await this.ledger.arm(Date.now() + 6e4);
          } catch {
          }
        }
        try {
          await this.traces.prune();
        } catch {
          try {
            await this.ledger.arm(Date.now() + 6e4);
          } catch {
          }
        }
      }
    }, { catalog: false });
    return work.then(() => {
      if (!alertJob) return;
      const delivery = this.alerts.deliver(alertJob).then((outcome) => this.serialize(() => this.alerts.complete(alertJob, outcome), { catalog: false })).catch(() => {
      });
      try {
        this.ctx.waitUntil?.(delivery);
      } catch {
      }
    });
  }
};
function validateAttemptId(id) {
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new HttpError(400, "\u6CE8\u6587\u51E6\u7406\u756A\u53F7\u304C\u3042\u308A\u307E\u305B\u3093\u3002\u753B\u9762\u3092\u66F4\u65B0\u3057\u3066\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002");
  }
  return id.toLowerCase();
}
__name(validateAttemptId, "validateAttemptId");
var HttpError = class extends Error {
  static {
    __name(this, "HttpError");
  }
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};

// worker/src/management/seo.js
var BRAND = "\u516B\u8349\u5C4B\u672C\u5E97";
var SHOP_PATH = "/products.html";
var VERIFIED_NAMES = /* @__PURE__ */ new Map([
  ["75d67267-88cd-4dc0-886b-a150de0e1116", { name: "LEMON BALM", label: "\u30EC\u30E2\u30F3\u30D0\u30FC\u30E0\u30C6\u30A3\u30FC" }],
  ["d9b78bb2-74c7-4e3e-9586-4a488baff0f1", { name: "YOMOGI", label: "\u3088\u3082\u304E\u8336" }]
]);
var LEGACY_PRODUCT_PATH = /^\/products\/([a-z0-9-]+)(?:\.html)?\/?$/;
var HEAD_METADATA = 'link[rel="canonical"], meta[property^="og:"], meta[property^="product:"], meta[name^="twitter:"], meta[name="description"], meta[name="keywords"], script[type="application/ld+json"]';
var productPath = /* @__PURE__ */ __name((p) => "/products/" + p.slug + ".html", "productPath");
var PRODUCT_TEMPLATE = "/products/lemonbalm.html";
var json2 = /* @__PURE__ */ __name((value) => JSON.stringify(value).replaceAll("<", "\\u003c"), "json");
var xml = /* @__PURE__ */ __name((value) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]), "xml");
function isRetiredTea(product) {
  return retiredProduct({ STOREFRONT_RETIRE_GOLDENROD: "1" }, product);
}
__name(isRetiredTea, "isRetiredTea");
function sellableVariants(product) {
  if (product.status !== "published" || !/^[a-z0-9-]+$/.test(product.slug) || isRetiredTea(product)) return [];
  return product.variants.filter((v) => v.active && product.checkoutVariantIds?.includes(v.id) && Number.isSafeInteger(v.price) && v.price > 0);
}
__name(sellableVariants, "sellableVariants");
function isIndexableProduct(product) {
  return sellableVariants(product).length > 0;
}
__name(isIndexableProduct, "isIndexableProduct");
async function shopCanonical(env, origin) {
  const url = new URL(SHOP_PATH, origin);
  const response = await env.ASSETS.fetch(new Request(url, { method: "HEAD", redirect: "manual" }));
  if ([301, 302, 307, 308].includes(response.status) && response.headers.has("location")) {
    const destination = new URL(response.headers.get("location"), url);
    if (destination.href === origin + "/products" || destination.href === origin + "/products/") return destination.href;
  }
  return url.href;
}
__name(shopCanonical, "shopCanonical");
async function seoResource(request, env) {
  const { origin, pathname } = new URL(request.url);
  const head = request.method === "HEAD";
  const match = pathname.match(LEGACY_PRODUCT_PATH);
  if (match && isRetiredTea({ id: match[1] })) {
    return noindex(new Response("\u3053\u306E\u5546\u54C1\u306F\u8CA9\u58F2\u3092\u7D42\u4E86\u3057\u307E\u3057\u305F\u3002", { status: 410 }));
  }
  if (pathname === "/robots.txt") {
    const rules = "User-agent: *\nDisallow: /admin$\nDisallow: /admin/\nDisallow: /api/\nAllow: /api/media/\n";
    return new Response(
      head ? null : rules + "Sitemap: " + origin + "/sitemap.xml\n",
      { headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }
  if (pathname !== "/sitemap.xml") return null;
  const [products, shop, template] = await Promise.all([
    new Store(env).publicProducts(),
    shopCanonical(env, origin),
    env.ASSETS.fetch(new Request(origin + PRODUCT_TEMPLATE, { method: "HEAD" }))
  ]);
  const urls = [origin + "/", shop];
  if (template.ok) urls.push(...products.filter(isIndexableProduct).map((p) => origin + productPath(p)));
  const entries = [...new Set(urls)].map((url) => "<url><loc>" + xml(url) + "</loc></url>").join("");
  const body = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + entries + "</urlset>\n";
  return new Response(head ? null : body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
__name(seoResource, "seoResource");
function noindex(response, { stripMetadata = false } = {}) {
  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", "noindex");
  const marked = new Response(response.body, { status: response.status, headers });
  if (!stripMetadata || !marked.headers.get("content-type")?.includes("text/html")) return marked;
  return new HTMLRewriter().on(HEAD_METADATA, { element: /* @__PURE__ */ __name((element) => element.remove(), "element") }).transform(marked);
}
__name(noindex, "noindex");
function legacyProductResponse(request, response) {
  return LEGACY_PRODUCT_PATH.test(new URL(request.url).pathname) ? noindex(response, { stripMetadata: true }) : response;
}
__name(legacyProductResponse, "legacyProductResponse");
function verifiedLabel(product) {
  const verified = VERIFIED_NAMES.get(product.id);
  return verified?.name === product.name ? verified.label : void 0;
}
__name(verifiedLabel, "verifiedLabel");
function productMetadata(product, url, origin, checkoutEnabled) {
  const variants = sellableVariants(product);
  const name = verifiedLabel(product) || product.name;
  const amounts = [...new Set(variants.map((v) => v.amount?.trim()).filter(Boolean))];
  const label = amounts.length === 1 ? name + " " + amounts[0] : name;
  const detailImage = detailImageIds(product)[0];
  const image3 = detailImage ? "/api/media/" + detailImage : product.images.length ? "" : product.fallbackImage || "";
  const description = BRAND + "\u306E" + label + "\u3002\u5546\u54C1\u60C5\u5831\u3068\u5185\u5BB9\u91CF\u3092\u3054\u89A7\u3044\u305F\u3060\u3051\u307E\u3059\u3002";
  const offers = checkoutEnabled ? variants.map((v) => ({
    "@type": "Offer",
    sku: v.id,
    price: v.price,
    priceCurrency: "JPY",
    url
  })) : [];
  return {
    title: label + "\uFF5C" + BRAND,
    description,
    image: image3,
    data: {
      "@context": "https://schema.org",
      "@type": "Product",
      name: label,
      description,
      url,
      brand: { "@type": "Brand", name: BRAND },
      ...image3 ? { image: [new URL(image3, origin).href] } : {},
      ...offers.length ? { offers } : {}
    }
  };
}
__name(productMetadata, "productMetadata");
function storefrontMetadata(products, home, url, origin) {
  const names = products.map(verifiedLabel).filter(Boolean);
  const description = home ? "\u81EA\u7136\u4E7E\u71E5\u306E\u30CF\u30FC\u30D6\u30C6\u30A3\u30FC\u3092\u5C4A\u3051\u308B\u516B\u8349\u5C4B\u672C\u5E97\u3002" + (names.length ? [...new Set(names)].join("\u3084") + "\u306A\u3069\u3001" : "") + "\u690D\u7269\u305D\u308C\u305E\u308C\u306E\u9999\u308A\u3068\u500B\u6027\u3092\u697D\u3057\u3080\u4E7E\u71E5\u30CF\u30FC\u30D6\u306E\u30AA\u30F3\u30E9\u30A4\u30F3\u30B7\u30E7\u30C3\u30D7\u3002" : "\u516B\u8349\u5C4B\u672C\u5E97\u306E\u30CF\u30FC\u30D6\u30C6\u30A3\u30FC\u3068\u91CE\u8349\u8336\u306E\u5546\u54C1\u4E00\u89A7\u3002\u690D\u7269\u305D\u308C\u305E\u308C\u306E\u9999\u308A\u3068\u500B\u6027\u3092\u304A\u697D\u3057\u307F\u304F\u3060\u3055\u3044\u3002";
  return {
    title: (home ? "\u81EA\u7136\u4E7E\u71E5\u306E\u30CF\u30FC\u30D6\u30C6\u30A3\u30FC\u901A\u8CA9" : "\u30CF\u30FC\u30D6\u30C6\u30A3\u30FC\u30FB\u91CE\u8349\u8336\u306E\u5546\u54C1\u4E00\u89A7") + "\uFF5C" + BRAND,
    description,
    image: home ? "/images/project-land.jpg" : products.map(presentationImageUrl).find(Boolean) || "/images/project-land.jpg",
    data: home ? { "@context": "https://schema.org", "@type": "WebSite", name: BRAND, description, url } : {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: products.map((p, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: origin + productPath(p),
        name: verifiedLabel(p) || p.name
      }))
    }
  };
}
__name(storefrontMetadata, "storefrontMetadata");
function applySeo(response, { product, products, home, url, origin, checkoutEnabled }) {
  if (product && !isIndexableProduct(product)) return noindex(response, { stripMetadata: true });
  const { title, description, image: image3, data } = product ? productMetadata(product, url, origin, checkoutEnabled) : storefrontMetadata(products.filter(isIndexableProduct), home, url, origin);
  const meta = /* @__PURE__ */ __name((key, value) => "<meta " + (key.startsWith("og:") ? "property" : "name") + '="' + key + '" content="' + escape(value) + '">', "meta");
  const shareImage = image3 ? new URL(image3, origin).href : "";
  const tags = [
    '<link rel="canonical" href="' + escape(url) + '">',
    meta("description", description),
    meta("og:type", product ? "product" : "website"),
    meta("og:site_name", BRAND),
    meta("og:title", title),
    meta("og:description", description),
    meta("og:url", url),
    meta("twitter:card", shareImage ? "summary_large_image" : "summary"),
    meta("twitter:title", title),
    meta("twitter:description", description),
    ...shareImage ? [meta("og:image", shareImage), meta("twitter:image", shareImage)] : [],
    '<script type="application/ld+json">' + json2(data) + "<\/script>"
  ].join("");
  const rewriter = new HTMLRewriter().on(HEAD_METADATA, { element: /* @__PURE__ */ __name((element) => element.remove(), "element") }).on("title", { element: /* @__PURE__ */ __name((element) => element.setInnerContent(title), "element") }).on("head", { element: /* @__PURE__ */ __name((element) => element.append(tags, { html: true }), "element") });
  if (!product && !home) {
    rewriter.on(".products-season-description", { element: /* @__PURE__ */ __name((element) => element.setInnerContent(
      "\u690D\u7269\u3092\u81EA\u7136\u4E7E\u71E5\u3057\u3001\u305D\u308C\u305E\u308C\u306E\u9999\u308A\u3092\u697D\u3057\u3081\u308B\u30CF\u30FC\u30D6\u30C6\u30A3\u30FC\u306B\u4ED5\u7ACB\u3066\u3066\u3044\u307E\u3059\u3002\n\n\u53CE\u7A6B\u306E\u6642\u671F\u3084\u81EA\u7136\u306E\u72B6\u614B\u306B\u3088\u3063\u3066\u3001\u304A\u5C4A\u3051\u3067\u304D\u308B\u690D\u7269\u3068\u6570\u91CF\u306F\u5909\u308F\u308A\u307E\u3059\u3002"
    ), "element") });
  }
  return rewriter.transform(response);
}
__name(applySeo, "applySeo");

// worker/src/management/v53-render.js
var image2 = /* @__PURE__ */ __name((p) => presentationImageUrl(p), "image");
var img = /* @__PURE__ */ __name((p) => image2(p) ? `<img src="${image2(p)}" alt="${escape(p.alt)}" loading="lazy">` : "", "img");
async function renderV53(request, env) {
  const u = new URL(request.url), match = u.pathname.match(/^\/products\/([a-z0-9-]+)\.html$/);
  const shop = ["/products", "/products/", "/products.html"].includes(u.pathname);
  const home = ["/", "/index.html"].includes(u.pathname);
  if (!match && !shop && !home) return null;
  const store = new Store(env), featuredRaw = home ? await featuredProducts(store) : [];
  const fallback = /* @__PURE__ */ __name((p2) => production(env) && !p2.images.length && ["lemonbalm", "yomogi"].includes(p2.slug) ? { ...p2, fallbackImage: "/images/" + p2.slug + ".jpg" } : p2, "fallback");
  const featured = featuredRaw.filter((p2) => !isRetiredTea(p2)).map(fallback);
  const allProducts = (await store.publicProducts()).map(fallback), products = allProducts.filter((p2) => p2.status === "published" && !isRetiredTea(p2)), p = match ? allProducts.find((p2) => p2.slug === match[1]) : null;
  if (match && !p) {
    const retired = await store.retiredProductIds(), old = (await store.products()).find((n) => n.slug === match[1] && retired.has(n.id));
    return new Response(old || retiredProduct(env, { id: match[1] }) ? "\u3053\u306E\u5546\u54C1\u306F\u8CA9\u58F2\u3092\u7D42\u4E86\u3057\u307E\u3057\u305F\u3002" : "\u5546\u54C1\u304C\u3042\u308A\u307E\u305B\u3093\u3002", { status: old || retiredProduct(env, { id: match[1] }) ? 410 : 404 });
  }
  const template = new URL(request.url);
  if (match) template.pathname = PRODUCT_TEMPLATE;
  const asset = await env.ASSETS.fetch(new Request(template));
  if (asset.status !== 200) return asset;
  let r = new HTMLRewriter();
  if (p) {
    const detailImages = detailImageIds(p);
    const galleryImages = detailImages.length ? detailImages : !p.images.length && p.fallbackImage ? [null] : [];
    const gallery = galleryImages.map((id, i) => `<figure class="v30-slide ${i === 0 ? "is-active" : ""}" data-index="${i}" aria-hidden="${i !== 0}"><img src="${id ? "/api/media/" + id : p.fallbackImage}" alt="${escape(p.alt)}"></figure>`).join("");
    r = r.on(".v30-product", { element: /* @__PURE__ */ __name((e) => e.setAttribute("class", "v30-product v53-managed-product"), "element") }).on("head", { element: /* @__PURE__ */ __name((e) => e.append('<link rel="stylesheet" href="/css/managed-product.css">', { html: true }), "element") }).on("body", { element: /* @__PURE__ */ __name((e) => e.append('<script src="/js/managed-product.js"><\/script>', { html: true }), "element") }).on(".v30-slide", { element: /* @__PURE__ */ __name((e) => e.remove(), "element") }).on(".v30-gallery", { element: /* @__PURE__ */ __name((e) => e.prepend(gallery, { html: true }), "element") }).on(".v30-top h1", { element: /* @__PURE__ */ __name((e) => e.setInnerContent(p.name), "element") }).on(".v30-current", { element: /* @__PURE__ */ __name((e) => e.remove(), "element") }).on(".v30-dots", { element: /* @__PURE__ */ __name((e) => e.setInnerContent(galleryImages.map((_, i) => `<button type="button" data-go="${i}" aria-label="\u753B\u50CF${i + 1}" aria-current="${i === 0}"></button>`).join(""), { html: true }), "element") }).on(".v30-purchase", { element: /* @__PURE__ */ __name((e) => e.setInnerContent(p.variants.map((v) => {
      const available = (!production(env) || env.PRODUCTION_CHECKOUT_ENABLED === "1" && env.PRODUCTION_MANAGED_CHECKOUT_ENABLED === "1") && p.status === "published" && v.active && p.checkoutVariantIds?.includes(v.id);
      return `<div class="v53-variant-purchase"><div class="v30-product-line"><div><span class="v30-overline">JAPANESE BOTANICALS${v.amount ? " \xB7 " + escape(v.amount) : ""}</span><strong>${escape(p.name)}${p.variants.length > 1 ? " / " + escape(v.name) : ""}</strong></div><span class="v30-price">\xA5${v.price.toLocaleString("ja-JP")}<small> \u7A0E\u8FBC</small></span></div><div class="v30-cart-row"><label class="v30-qty">\u6570\u91CF<select class="product-quantity" id="qty-${escape(v.id)}" name="quantity">${Array.from({ length: v.maxQuantity ?? 10 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("")}</select></label><button type="button" data-add-to-cart data-quantity-selector="#qty-${escape(v.id)}" class="product-cart-button v30-cart-button" data-product-id="${escape(v.id)}" data-product-name="${escape(p.name + " " + (v.amount || ""))}" data-product-price="${v.price}" ${available ? "" : 'disabled data-site-disabled="true"'}>${available ? "ADD TO CART <span>\u2197</span>" : p.status !== "published" || !v.active ? "\u8CA9\u58F2\u505C\u6B62" : "\u8CFC\u5165\u6E96\u5099\u4E2D"}</button></div></div>`;
    }).join(""), { html: true }), "element") }).on(".v30-below", { element: /* @__PURE__ */ __name((e) => e.setInnerContent(`<div><span>ABOUT</span><p style="white-space:pre-line">${escape(p.description)}</p></div>`, { html: true }), "element") });
  } else {
    const scenes = products.map((p2, i) => `<div class="v33-scene ${i === 0 ? "is-active" : ""}" aria-hidden="${i !== 0}" data-product-href="${productPath(p2)}">${img(p2)}<div class="v33-scene-shade"></div><div class="v33-scene-label"><span class="v33-kicker">BOTANICALS</span><h1>${escape(p2.name)}</h1><p>${p2.status === "stopped" ? "\u8CA9\u58F2\u505C\u6B62" : "\xA5" + Math.min(...p2.variants.map((v) => v.price))}</p></div></div>`).join("");
    r = r.on(".v33-images", { element: /* @__PURE__ */ __name((e) => e.setInnerContent(scenes || "<p>\u516C\u958B\u4E2D\u306E\u5546\u54C1\u306F\u3042\u308A\u307E\u305B\u3093\u3002</p>", { html: true }), "element") }).on(".v33-rail", { element: /* @__PURE__ */ __name((e) => e.setInnerContent(products.map((p2, i) => `<button class="v33-tile ${i === 0 ? "is-active" : ""}" type="button" role="tab" data-index="${i}" aria-selected="${i === 0}"><span>${escape(p2.name)}</span></button>`).join(""), { html: true }), "element") }).on(".v34-view", { element: /* @__PURE__ */ __name((e) => {
      if (products[0]) e.setAttribute("href", productPath(products[0]));
      else e.remove();
    }, "element") }).on(".v35-all-grid", { element: /* @__PURE__ */ __name((e) => e.setInnerContent(products.map((p2) => `<a class="v35-all-card" href="${productPath(p2)}"><div class="v35-all-image">${img(p2)}</div><span class="v35-all-en">${escape(p2.name)}</span><span class="v35-all-jp">${escape(p2.description.slice(0, 80))}</span><span class="v35-all-link">VIEW BOTANICAL \u2197</span></a>`).join(""), { html: true }), "element") }).on("#botanicals", { element: /* @__PURE__ */ __name((e) => {
      if (!featured.length) e.remove();
    }, "element") }).on(".v19-progress", { element: /* @__PURE__ */ __name((e) => e.setInnerContent(featured.map((_, i) => `<span class="${i === 0 ? "active" : ""}"></span>`).join(""), { html: true }), "element") }).on("#botanicalTrack", { element: /* @__PURE__ */ __name((e) => e.setInnerContent(featured.map((p2) => `<article class="v19-slide" aria-label="${escape(p2.name)}">${img(p2)}<h2 class="v19-center-name">${escape(p2.name)}</h2><a class="v39-botanical-link" aria-label="${escape(p2.name)}" href="${productPath(p2)}"></a></article>`).join("") || "<p>\u516C\u958B\u4E2D\u306E\u5546\u54C1\u306F\u3042\u308A\u307E\u305B\u3093\u3002</p>", { html: true }), "element") });
  }
  r = r.on("body", { element: /* @__PURE__ */ __name((e) => e.append('<script src="/js/managed-storefront.js"><\/script>', { html: true }), "element") });
  if (home) r = r.on(".v20-link-inner > div", {element(e) { e.append("<p class=\"shop-description\">\u516b\u8349\u5c4b\u672c\u5e97\u306f\u3001\u81ea\u7136\u4e7e\u71e5\u306e\u30cf\u30fc\u30d6\u30c6\u30a3\u30fc\u3092\u5c4a\u3051\u308b\u30aa\u30f3\u30e9\u30a4\u30f3\u30b7\u30e7\u30c3\u30d7\u3067\u3059\u3002\u30ec\u30e2\u30f3\u30d0\u30fc\u30e0\u30c6\u30a3\u30fc\u3084\u3088\u3082\u304e\u8336\u306a\u3069\u3001\u690d\u7269\u305d\u308c\u305e\u308c\u306e\u9999\u308a\u3068\u500b\u6027\u3092\u3001\u4e00\u676f\u306e\u304a\u8336\u3067\u697d\u3057\u3081\u307e\u3059\u3002</p>", {html:true}); }});
  const url = p ? u.origin + productPath(p) : home ? u.origin + "/" : await shopCanonical(env, u.origin);
  return applySeo(r.transform(asset), {
    product: p,
    products,
    home,
    url,
    origin: u.origin,
    checkoutEnabled: env.PRODUCTION_CHECKOUT_ENABLED === "1" && env.PRODUCTION_MANAGED_CHECKOUT_ENABLED === "1"
  });
}
__name(renderV53, "renderV53");

// Presentation-only overlay. Original ASSETS, auth, APIs, runtime and bindings stay in place.
const YASOYA_UI_20261123={"/js/admin-management.js": {"sha256": "7bc5cc526d3656c3b08415f3304450842abb666439d84921edeb76ccfcb229c7", "body": "(() => {\n  'use strict';\n  const A = window.YasoyaAdmin, UI = window.YasoyaUI;\n  UI.applyBrand();\n  const {$,esc,money,date,data,write,message,notify} = A;\n  const screens = ['homePanel','ordersPanel','productsPanel','inventoryPanel'];\n  const statusNames = {draft:'\u4e0b\u66f8\u304d',published:'\u516c\u958b\u4e2d',stopped:'\u8ca9\u58f2\u505c\u6b62',archived:'\u30a2\u30fc\u30ab\u30a4\u30d6',queued:'\u5f85\u6a5f',retry:'\u518d\u8a66\u884c\u5f85\u3061',running:'\u540c\u671f\u4e2d',review:'\u8981\u78ba\u8a8d',done:'\u5b8c\u4e86',cancelled:'\u7167\u5408\u3057\u3066\u53d6\u6d88'};\n  let stagingCapabilities=null;\n  let products = [], current = null, busy = false, dirty = false, activePanel = 'homePanel', inventoryRows = [], stockEdit = null, homeGeneration = 0;\n  let productionCapabilities=null;\n  const previews = new Map();\n  const stateBadge = UI.statusBadge, empty = UI.emptyState;\n  function setDirty(value) { dirty = value; $('dirtyStatus').textContent = value ? '\u672a\u4fdd\u5b58\u306e\u5909\u66f4\u3042\u308a' : '\u4fdd\u5b58\u6e08\u307f'; $('dirtyStatus').className = 'badge ' + (value ? 'draft' : 'done'); }\n  function showProductDiagnostic(error) {\n    if (!A.local) return;\n    let details = $('productDiagnosticDetails');\n    if (!details) {\n      details = document.createElement('details'); details.id = 'productDiagnosticDetails';\n      const summary = document.createElement('summary'); summary.textContent = '\u5546\u54c1\u4fdd\u5b58\u30fb\u516c\u958b\u306e\u8a3a\u65ad\uff08\u30ed\u30fc\u30ab\u30eb\u5c02\u7528\uff09';\n      const report = document.createElement('textarea'); report.id = 'productDiagnosticReport'; report.readOnly = true; report.rows = 9; report.setAttribute('aria-label','\u5546\u54c1\u4fdd\u5b58\u30fb\u516c\u958b\u306e\u8a3a\u65adJSON');\n      details.append(summary,report); $('editorMessage').after(details);\n    }\n    // Only enums and HTTP status prepared by api(); never serialize the Error or body.\n    $('productDiagnosticReport').value = JSON.stringify({version:1,...(error.productDiagnostic || {httpStatus:null,serverStage:'unavailable',serverCode:'NO_SERVER_DIAGNOSTIC'}),errorType:['Error','TypeError','SyntaxError','AbortError','TimeoutError'].includes(error.name)?error.name:'OtherError'},null,2);\n    details.hidden = false;\n  }\n  async function work(fn, place = activePanel === 'inventoryPanel' ? 'inventoryMessage' : activePanel === 'homePanel' ? 'homeMessage' : 'managementMessage') {\n    if (busy) return; busy = true;\n    const controls = [...document.querySelectorAll('#app button, dialog button, #logout')].map(button => [button,button.disabled]);\n    controls.forEach(([button]) => button.disabled = true); $('productForm').inert = true; $('inventoryForm').inert = true;\n    $(activePanel).setAttribute('aria-busy','true'); message(place,'\u51e6\u7406\u3057\u3066\u3044\u307e\u3059\u2026','loading');\n    try { await fn(); if ($(place).dataset.state === 'loading') message(place,'\u6700\u65b0\u306e\u60c5\u5831\u3092\u8868\u793a\u3057\u3066\u3044\u307e\u3059\u3002'); }\n    catch (error) { if (place === 'editorMessage') showProductDiagnostic(error); message(place,error.message,'error'); notify(error.message,'error'); if (place === 'photoUploadMessage' || place === 'editorMessage') $(place).scrollIntoView({block:'center',behavior:'instant'}); }\n    finally { busy = false; $('productForm').inert = false; $('inventoryForm').inert = false; screens.forEach(id => $(id).setAttribute('aria-busy','false')); controls.forEach(([button,disabled]) => { if (button.isConnected) button.disabled = disabled; }); }\n  }\n  async function preview(id) {\n    if (!previews.has(id)) { const pending = A.api('/api/admin/images/' + id).then(r => r.blob()).then(blob => URL.createObjectURL(blob)); previews.set(id,pending); pending.catch(() => previews.delete(id)); }\n    return previews.get(id);\n  }\n  const photo = UI.thumbnail;\n  function hydrate(root = document) { root.querySelectorAll('img[data-image]').forEach(img => preview(img.dataset.image).then(url => { if (img.isConnected) img.src = url; }).catch(() => { img.replaceWith(Object.assign(document.createElement('span'),{textContent:'\u5199\u771f\u3092\u53d6\u5f97\u3067\u304d\u307e\u305b\u3093'})); })); }\n  function filterProducts() {\n    const term = $('productSearch').value.normalize('NFKC').toLocaleLowerCase('ja-JP').trim(), filter = $('productFilter').value;\n    const filtered = products.filter(p => (!p.retired||filter==='retired')&&(filter!=='retired'||p.retired) && (filter === 'all' || filter==='retired'||p.status === filter) && [p.draft.name,...p.draft.variants.map(v => v.name)].join(' ').normalize('NFKC').toLocaleLowerCase('ja-JP').includes(term));\n    $('productCount').textContent = `${filtered.length}\u4ef6\u3092\u8868\u793a / \u767b\u9332 ${products.length}\u4ef6`;\n    $('productList').innerHTML = filtered.map(p => UI.productCard(p,money)).join('') || empty(products.length ? '\u6761\u4ef6\u306b\u4e00\u81f4\u3059\u308b\u5546\u54c1\u304c\u3042\u308a\u307e\u305b\u3093\u3002\u691c\u7d22\u3084\u72b6\u614b\u3092\u5909\u66f4\u3057\u3066\u304f\u3060\u3055\u3044\u3002' : '\u307e\u3060\u5546\u54c1\u304c\u3042\u308a\u307e\u305b\u3093\u3002\u300c\u5546\u54c1\u767b\u9332\u300d\u304b\u3089\u59cb\u3081\u307e\u3057\u3087\u3046\u3002'); hydrate($('productList'));\n  }\n  async function jobs() {\n    const [result,audit] = await Promise.all([data('/api/admin/jobs'),data('/api/admin/audit')]);\n    $('jobList').innerHTML = result.jobs.map(j => `<div class=\"management-card\">${stateBadge(j.state)} <strong>${esc({publish:'\u5546\u54c1\u516c\u958b',state:'\u8ca9\u58f2\u72b6\u614b\u306e\u5909\u66f4',stock:'\u5728\u5eab\u5909\u66f4'}[j.kind] || j.kind)}</strong><small>${date(j.updatedAt)}</small><p>${esc(j.error || '')}</p>${j.state === 'retry' ? `<button data-retry=\"${esc(j.id)}\">\u540c\u3058\u64cd\u4f5c\u3092\u518d\u8a66\u884c</button>` : ''}${j.state === 'review'||j.state==='done'&&j.lockCount>0 ? `<p class=\"held\">\u7af6\u5408\u3084\u671f\u9650\u5207\u308c\u3067\u3059\u3002\u4e0a\u66f8\u304d\u305b\u305a\u7167\u5408\u3057\u307e\u3059\u3002</p><button data-reconcile=\"${esc(j.id)}\">\u540c\u671f\u7d50\u679c\u3092\u7167\u5408</button>` : ''}</div>`).join('') || empty('\u540c\u671f\u51e6\u7406\u306f\u3042\u308a\u307e\u305b\u3093\u3002');\n    if(result.orphanLocks?.length){const note=document.createElement('p');note.className='held';note.textContent='\u51e6\u7406\u8a18\u9332\u304c\u898b\u3064\u304b\u3089\u306a\u3044\u30ed\u30c3\u30af\uff1a'+result.orphanLocks.map(l=>l.variantId+'\uff08'+l.jobId+'\uff09').join('\u3001')+'\u3002\u6210\u529f\u78ba\u8a8d\u304c\u3067\u304d\u306a\u3044\u305f\u3081\u81ea\u52d5\u89e3\u9664\u3057\u307e\u305b\u3093\u3002\u8868\u793a\u60c5\u5831\u306e\u7de8\u96c6\u30fb\u516c\u958b\u306f\u53ef\u80fd\u3067\u3059\u3002';$('jobList').prepend(note);}\n    const monitor=result.monitoring;\n    if(monitor)$('jobList').insertAdjacentHTML('afterbegin',`<p role=\"status\">\u7ba1\u7406\u540c\u671f\u306e\u6700\u7d42\u76e3\u8996\uff1a${date(monitor.lastScanAt)}${monitor.alarmState==='failed'?' \uff0f Alarm\u4e88\u7d04\u5931\u6557\uff1a\u5b9a\u671f\u76e3\u8996\u3067\u518d\u691c\u51fa\u3057\u307e\u3059\u3002':''}${monitor.notificationAttention?' \uff0f \u7ba1\u7406\u901a\u77e5\u306e\u8a2d\u5b9a\u30fb\u9001\u4fe1\u7d50\u679c\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002':''}</p>`);\n    for(const [index,j] of result.jobs.entries()){const card=$('jobList').querySelectorAll('.management-card')[index];if(card){const note=document.createElement('small');note.textContent='\u7ba1\u7406\u901a\u77e5\uff1a'+({none:'\u5bfe\u8c61\u5916',pending:'\u518d\u8a66\u884c\u5f85\u3061',blocked:'\u8a2d\u5b9a\u5f85\u3061',sent:'\u9001\u4fe1\u53d7\u4ed8\u6e08\u307f',expired:'\u8981\u78ba\u8a8d',cancelled:'\u5fa9\u65e7\u306b\u3088\u308a\u53d6\u6d88'}[j.notificationState]||'\u672a\u78ba\u8a8d');card.append(note);}}\n    $('auditList').innerHTML = audit.events.map(e => `<div class=\"management-card\"><strong>${esc({draft_saved:'\u4e0b\u66f8\u304d\u4fdd\u5b58',job_queued:'\u540c\u671f\u958b\u59cb',job_completed:'\u540c\u671f\u5b8c\u4e86',sandbox_linked:'Sandbox\u95a2\u9023\u4ed8\u3051',stopped:'\u8ca9\u58f2\u505c\u6b62',archived:'\u30a2\u30fc\u30ab\u30a4\u30d6',release_published:'\u516c\u958b\u5b8c\u4e86'}[e.action] || e.action)}</strong><small>${esc(e.resource_id)} / ${date(e.created_at)}</small></div>`).join('') || empty('\u5909\u66f4\u5c65\u6b74\u306f\u3042\u308a\u307e\u305b\u3093\u3002');\n  }\n  function applyProductionCapabilities(r){if(r.source==='square-sandbox'&&r.capabilities?.sitePublish)stagingCapabilities=r.capabilities;if(r.source==='square-production'){productionCapabilities=r.capabilities;$('importProducts').hidden=true;$('newProduct').disabled=!productionCapabilities.draft;$('homeNewProduct').disabled=!productionCapabilities.draft;}}\n  async function loadProducts() { const r = await data('/api/admin/products'); products = r.products;applyProductionCapabilities(r); filterProducts(); await jobs();if(stagingCapabilities?.featuredProducts||productionCapabilities?.featuredProducts)await loadFeatured(); }\n  let featuredVersion=null;\n  async function loadFeatured(){\n    let box=$('featuredProductsSettings');if(!box){\n      box=document.createElement('section');box.id='featuredProductsSettings';box.className='surface featured-settings';\n      box.innerHTML='<h2>\u30c8\u30c3\u30d7\u30da\u30fc\u30b8\u306b\u8868\u793a\u3059\u308b\u5546\u54c1</h2><p class=\"hint\">\u516c\u958b\u6e08\u307f\u30fb\u8ca9\u58f2\u4e2d\u306e\u5546\u54c1\u304b\u3089\u6700\u59273\u4ef6\u30021\u21923\u306e\u9806\u3067\u8868\u793a\u3057\u307e\u3059\u3002\u7a7a\u6b04\u306f\u63b2\u8f09\u3057\u307e\u305b\u3093\u3002\u30b7\u30e7\u30c3\u30d7\u4e00\u89a7\u306e\u4ef6\u6570\u306f\u5909\u308f\u308a\u307e\u305b\u3093\u3002</p><div class=\"featured-slots\">'+[1,2,3].map(n=>'<label>\u8868\u793a\u9806 '+n+'<select id=\"featuredSlot'+n+'\" aria-label=\"\u30c8\u30c3\u30d7\u30da\u30fc\u30b8 \u8868\u793a\u9806 '+n+'\"></select></label>').join('')+'</div><button type=\"button\" class=\"secondary\" id=\"saveFeaturedProducts\">\u63b2\u8f09\u8a2d\u5b9a\u3092\u4fdd\u5b58</button><p id=\"featuredMessage\" class=\"message\" role=\"status\"></p>';\n      $('productsPanel').querySelector('.filter-bar').before(box);\n      const retired=document.createElement('option');retired.value='retired';retired.textContent='\u8ca9\u58f2\u7d42\u4e86\uff08\u5c65\u6b74\uff09';$('productFilter').append(retired);\n      $('saveFeaturedProducts').onclick=()=>work(async()=>{const ids=[1,2,3].map(n=>$('featuredSlot'+n).value).filter(Boolean);if(new Set(ids).size!==ids.length)throw Error('\u540c\u3058\u5546\u54c1\u306f\u8907\u6570\u306e\u67a0\u306b\u9078\u629e\u3067\u304d\u307e\u305b\u3093\u3002');await write('/api/admin/storefront/featured',{expectedVersion:featuredVersion,productIds:ids});await loadFeatured();message('featuredMessage','\u63b2\u8f09\u8a2d\u5b9a\u3092\u4fdd\u5b58\u3057\u307e\u3057\u305f\u3002\u30c8\u30c3\u30d7\u30da\u30fc\u30b8\u306b\u53cd\u6620\u3055\u308c\u307e\u3059\u3002');},'featuredMessage');\n    }\n    const r=await data('/api/admin/storefront/featured');featuredVersion=r.version;\n    for(const n of [1,2,3]){$('featuredSlot'+n).innerHTML='<option value=\"\">\u63b2\u8f09\u3057\u306a\u3044</option>'+r.candidates.map(p=>'<option value=\"'+esc(p.id)+'\">'+esc(p.name)+'</option>').join('');$('featuredSlot'+n).value=r.selectedProductIds[n-1]||'';}\n    message('featuredMessage',r.productIds.length!==r.selectedProductIds.length?'\u8ca9\u58f2\u7d42\u4e86\u30fb\u975e\u516c\u958b\u306a\u3069\u3001\u63b2\u8f09\u3067\u304d\u306a\u3044\u5546\u54c1\u306f\u8868\u793a\u5bfe\u8c61\u304b\u3089\u9664\u5916\u3057\u3066\u3044\u307e\u3059\u3002\u4fdd\u5b58\u3059\u308b\u3068\u8a2d\u5b9a\u3082\u6574\u7406\u3055\u308c\u307e\u3059\u3002':'');\n  }\n  function recentMarkup(o) { return `<button class=\"recent-order\" data-order=\"${esc(o.order_reference)}\"><span class=\"row\"><strong>${esc(o.contact.familyName)} ${esc(o.contact.givenName)} \u69d8</strong>${A.badge(o.status)}</span><span class=\"row\"><small>${date(o.created_at)}</small><strong>${money(o.total)}</strong></span><small>${esc(o.order_reference)}</small></button>`; }\n  async function home() {\n    const generation = ++homeGeneration;\n    ['homePending','homeProducts','homeLowStock'].forEach(id => $(id).textContent = '\u2014');\n    $('recentOrders').innerHTML = UI.loadingState('\u6ce8\u6587\u3092\u8aad\u307f\u8fbc\u3093\u3067\u3044\u307e\u3059\u2026'); $('lowStockList').innerHTML = UI.loadingState('\u5728\u5eab\u3092\u78ba\u8a8d\u3057\u3066\u3044\u307e\u3059\u2026');\n    const results = await Promise.allSettled([data('/api/admin/orders?status=pending'),data('/api/admin/orders?status=shipped'),data('/api/admin/products'),data('/api/admin/inventory')]);\n    if (generation !== homeGeneration) return;\n    const values = results.map(r => r.status === 'fulfilled' ? r.value : null);\n    const [pending,shipped,registered,stock] = values;\n    if (pending) $('homePending').textContent = pending.orders.length + (pending.orders.length === 200 ? '+' : '');\n    if (registered) { applyProductionCapabilities(registered); products = registered.products; $('homeProducts').textContent = products.length; }\n    const orders = [...(pending?.orders || []),...(shipped?.orders || [])].sort((a,b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0,5);\n    $('recentOrders').innerHTML = orders.length ? orders.map(recentMarkup).join('') : empty(!pending || !shipped ? '\u6ce8\u6587\u3092\u53d6\u5f97\u3067\u304d\u307e\u305b\u3093\u3002\u300c\u66f4\u65b0\u300d\u3067\u518d\u8a66\u884c\u3057\u3066\u304f\u3060\u3055\u3044\u3002' : '\u307e\u3060\u6ce8\u6587\u306f\u3042\u308a\u307e\u305b\u3093\u3002');\n    if (stock) {\n      $('homeLowStock').textContent = stock.inventory.filter(r => r.quantity !== null && r.quantity <= 3).length;\n      const attention = stock.inventory.filter(r => r.held || r.quantity === null || r.quantity <= 3);\n      $('lowStockList').innerHTML = attention.map(r => `<div class=\"low-stock-row\"><span>${esc(r.name)}</span><span class=\"badge ${r.held || r.quantity === 0 ? 'held' : 'draft'}\">${r.held ? '\u8ca9\u58f2\u4fdd\u7559' : r.quantity === null ? '\u672a\u78ba\u8a8d' : r.quantity + '\u500b'}</span></div>`).join('') || empty('\u5728\u5eab\u306b\u4f59\u88d5\u304c\u3042\u308a\u307e\u3059\u3002');\n    } else $('lowStockList').innerHTML = empty('\u5728\u5eab\u3092\u78ba\u8a8d\u3067\u304d\u307e\u305b\u3093\u3002\u300c\u6700\u65b0\u306e\u5728\u5eab\u3092\u53d6\u5f97\u300d\u3067\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002');\n    const failed = results.filter(r => r.status === 'rejected');\n    if (failed.length) message('homeMessage','\u4e00\u90e8\u306e\u60c5\u5831\u3092\u53d6\u5f97\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002\u672a\u78ba\u8a8d\u306e\u5024\u306f\u300c\u2014\u300d\u3067\u3059\u3002\u66f4\u65b0\u3057\u3066\u518d\u8a66\u884c\u3057\u3066\u304f\u3060\u3055\u3044\u3002','error');\n    else message('homeMessage');\n  }\n  function navigate(panel, focus = true) {\n    if (!screens.includes(panel) || busy) return; activePanel = panel;\n    screens.forEach(id => $(id).hidden = id !== panel);\n    document.querySelectorAll('.admin-nav-button').forEach(b => { const selected = b.dataset.panel === panel; b.classList.toggle('active',selected); if (selected) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current'); });\n    if (focus) { $(panel).querySelector('h1').focus({preventScroll:true}); window.scrollTo({top:0,behavior:'instant'}); }\n    if (panel === 'homePanel') work(home); if (panel === 'productsPanel') work(loadProducts); if (panel === 'inventoryPanel') work(inventory); if (panel === 'ordersPanel') A.loadOrders();\n  }\n  document.querySelectorAll('.admin-nav-button,[data-go]').forEach(b => b.onclick = () => navigate(b.dataset.panel || b.dataset.go));\n  $('today').textContent = new Intl.DateTimeFormat('ja-JP',{month:'long',day:'numeric',weekday:'long',timeZone:'Asia/Tokyo'}).format(new Date());\n  window.addEventListener('admin:authenticated',() => navigate('homePanel',false));\n  window.addEventListener('admin:orders-changed',() => { if (activePanel === 'homePanel') work(home); });\n  $('recentOrders').onclick = e => { const b = e.target.closest('[data-order]'); if (b) A.openOrder(b.dataset.order); };\n  $('reloadHome').onclick = () => work(home);\n  $('productSearch').oninput = filterProducts; $('productFilter').onchange = filterProducts;\n\n  function capture() {\n    const f = $('productForm'); if (!current) return;\n    for (const key of ['name','description','alt']) current.draft[key] = f.elements.namedItem(key).value;\n    current.draft.sortOrder = Number(f.elements.namedItem('sortOrder').value); current.slug = f.elements.namedItem('slug').value;\n    current.draft.variants = [...$('variantList').querySelectorAll('fieldset')].map(el => ({id:el.dataset.id,name:el.querySelector('[name=vname]').value,price:Number(el.querySelector('[name=price]').value),amount:el.querySelector('[name=amount]').value,maxQuantity:Number(el.querySelector('[name=max]').value),active:el.querySelector('[name=active]').checked}));\n  }\n  const gallery = UI.createGallery({track:$('photoGalleryTrack'),indicators:$('photoGalleryDots'),position:$('photoGalleryPosition'),load:preview});\n  async function drawImages(preferredId) {\n    if (current.draft.featuredImageId && !current.draft.images.includes(current.draft.featuredImageId)) delete current.draft.featuredImageId;\n    gallery.setItems(current.draft.images,current.draft.alt || current.draft.name,preferredId);\n    const list = $('imageList'); list.replaceChildren();\n    let botanicalStatus=$('botanicalImageStatus');\n    if (!botanicalStatus) {\n      botanicalStatus=document.createElement('div'); botanicalStatus.id='botanicalImageStatus';\n      botanicalStatus.setAttribute('role','status'); botanicalStatus.className='hint';\n      list.before(botanicalStatus);\n    }\n    botanicalStatus.replaceChildren();\n    const selected=current.draft.featuredImageId;\n    const summary=document.createElement('p');\n    summary.textContent=selected?'\u30c8\u30c3\u30d7\u30da\u30fc\u30b8\u8868\u793a\u7528\uff1a\u5199\u771f'+(current.draft.images.indexOf(selected)+1)+'\uff08\u5546\u54c1\u8a73\u7d30\u306b\u306f\u8868\u793a\u3057\u307e\u305b\u3093\uff09':'\u30c8\u30c3\u30d7\u30da\u30fc\u30b8\u8868\u793a\u7528\uff1a\u672a\u6307\u5b9a\uff08\u5148\u982d\u306e\u5546\u54c1\u5199\u771f\u3092\u5171\u7528\uff09';\n    botanicalStatus.append(summary);\n    if (selected) {\n      const clear=document.createElement('button');clear.type='button';clear.className='secondary';\n      clear.textContent='\u30c8\u30c3\u30d7\u30da\u30fc\u30b8\u8868\u793a\u7528\u3092\u89e3\u9664';\n      clear.onclick=()=>{if(busy)return;capture();delete current.draft.featuredImageId;setDirty(true);void drawImages();};\n      botanicalStatus.append(clear);\n    }\n    for (const [i,id] of current.draft.images.entries()) {\n      const div = document.createElement('div'); div.className = 'image-entry'; const img = document.createElement('img'); img.alt = current.draft.alt || current.draft.name || '\u5546\u54c1\u5199\u771f'; div.append(img);\n      preview(id).then(url => img.src = url).catch(() => img.alt = '\u5199\u771f\u3092\u53d6\u5f97\u3067\u304d\u307e\u305b\u3093');\n      const label = document.createElement('p'); label.className = 'image-label'; label.textContent = current.draft.featuredImageId===id?'\u30c8\u30c3\u30d7\u30da\u30fc\u30b8\u8868\u793a\u7528':`\u5546\u54c1\u8a73\u7d30\u7528\u306e\u5199\u771f ${i+1}`; div.append(label);\n      const controls = document.createElement('div'); controls.className = 'image-controls'; div.append(controls);\n      for (const [label,accessible,disabled,action] of [\n        ['\u2191',`\u5199\u771f${i+1}\u3092\u524d\u3078`,i === 0,() => [current.draft.images[i-1],current.draft.images[i]] = [id,current.draft.images[i-1]]],\n        ['\u2193',`\u5199\u771f${i+1}\u3092\u5f8c\u308d\u3078`,i === current.draft.images.length-1,() => [current.draft.images[i+1],current.draft.images[i]] = [id,current.draft.images[i+1]]],\n        ['\u30c8\u30c3\u30d7\u30da\u30fc\u30b8\u8868\u793a\u7528',`\u5199\u771f${i+1}\u3092\u30c8\u30c3\u30d7\u30da\u30fc\u30b8\u8868\u793a\u7528\u306b\u3059\u308b`,current.draft.featuredImageId===id,() => { current.draft.featuredImageId=id; }],\n        ['\u5916\u3059',`\u5199\u771f${i+1}\u3092\u5916\u3059`,false,() => { current.draft.images.splice(i,1); if(current.draft.featuredImageId===id)delete current.draft.featuredImageId; }]]) {\n        const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.setAttribute('aria-label',accessible); b.disabled = disabled;\n        b.onclick = () => { if (busy) return; if (label === '\u5916\u3059' && !confirm('\u3053\u306e\u5199\u771f\u3092\u4e0b\u66f8\u304d\u304b\u3089\u5916\u3057\u307e\u3059\u304b\uff1f\u4fdd\u5b58\u3059\u308b\u307e\u3067\u516c\u958b\u5185\u5bb9\u306f\u5909\u308f\u308a\u307e\u305b\u3093\u3002')) return; capture(); action(); setDirty(true); drawImages(id); }; controls.append(b);\n      }\n      list.append(div);\n    }\n    if (!current.draft.images.length) list.innerHTML = '<p class=\"hint\">\u5199\u771f\u3092\u8ffd\u52a0\u3059\u308b\u3068\u3001\u3053\u3053\u306b\u30d7\u30ec\u30d3\u30e5\u30fc\u304c\u8868\u793a\u3055\u308c\u307e\u3059\u3002</p>';\n  }\n  function drawSyncStatus(){\n    let status=$('editorSyncStatus');if(!status){status=document.createElement('span');status.id='editorSyncStatus';status.className='muted';$('editorProductStatus').after(status);}\n    if(current.capabilities?.unifiedPublish){status.textContent=current.retired?'\u8ca9\u58f2\u7d42\u4e86\uff1a\u8ca9\u58f2\u5c0e\u7dda\u304b\u3089\u9664\u5916\u3057\u3066\u3044\u307e\u3059\u3002\u904e\u53bb\u306e\u6ce8\u6587\u30fbSquare ID\u306f\u4fdd\u6301\u3057\u3066\u3044\u307e\u3059\u3002':(current.status==='published'?'\u516c\u958b\u4e2d':statusNames[current.status]||'\u4e0b\u66f8\u304d')+(current.version&&current.draft_revision!==current.published_revision?' \uff0f \u672a\u516c\u958b\u306e\u4e0b\u66f8\u304d\u3042\u308a':'')+(current.blockingJobs?.length?' \uff0f '+(statusNames[current.blockingJobs[0].state]||'\u7d50\u679c\u672a\u78ba\u8a8d')+'\uff1a'+(current.blockingJobs[0].error||'\u7d50\u679c\u78ba\u8a8d\u5f85\u3061')+'\u3002'+(current.blockingJobs[0].release?'\u300c\u516c\u958b\u3059\u308b\u300d\u3067\u540c\u3058\u516c\u958b\u51e6\u7406\u3092\u78ba\u8a8d\u30fb\u518d\u958b\u3067\u304d\u307e\u3059\u3002':'\u8a73\u7d30\u8a3a\u65ad\u3067\u65e7\u540c\u671f\u30fb\u5728\u5eab\u51e6\u7406\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002'):'');return;}\n    status.textContent=(current.source==='local-mock'?'\u30ed\u30fc\u30ab\u30eb\u4ee3\u66ff\u30c7\u30fc\u30bf':current.source==='square-sandbox'?'Square Sandbox':current.source==='square-production'?'Square Production\uff08\u672c\u756a\uff09':'\u53d6\u5f97\u5143\u672a\u78ba\u8a8d')+' \uff0f '+(current.accessMode==='PRODUCTION_READ_ONLY'?'\u672c\u756a\u30fbSquare\u66f8\u8fbc\u505c\u6b62 \uff0f ':current.accessMode==='PRODUCTION_MANAGEMENT'?'\u672c\u756a\u7ba1\u7406 \uff0f ':current.accessMode==='READ_ONLY'?'\u8aad\u307f\u53d6\u308a\u5c02\u7528 \uff0f ':current.accessMode==='SANDBOX_MANAGEMENT'?'Sandbox\u7ba1\u7406\u66f8\u8fbc \uff0f \u8cfc\u5165\u505c\u6b62 \uff0f ':'')+'\u540c\u671f\u72b6\u614b\uff1a'+({done:'\u524d\u56de\u540c\u671f\u5b8c\u4e86',queued:'\u540c\u671f\u5f85\u3061',running:'\u540c\u671f\u4e2d',retry:'\u518d\u8a66\u884c\u5f85\u3061',review:'\u8981\u78ba\u8a8d',cancelled:'\u65e7\u540c\u671f\u3092\u53d6\u6d88\u6e08\u307f',linked:'\u65e2\u5b58ID\u7167\u5408\u6e08\u307f',unlinked:'\u672a\u9023\u643a'}[current.syncState]||'\u672a\u9023\u643a')+(current.version&&current.draft_revision!==current.published_revision?' \uff0f \u672a\u53cd\u6620\u306e\u4e0b\u66f8\u304d\u3042\u308a':'');\n    if(current.siteWarnings?.length)status.textContent+=' \uff0f '+current.siteWarnings.join(' \uff0f ');\n    if(current.blockingJobs?.length)status.textContent+=' \uff0f \u4fdd\u7559\u4e2d\uff1a'+current.blockingJobs.map(j=>`${({stock:'\u5728\u5eab\u5909\u66f4',publish:'Square\u5546\u54c1\u540c\u671f',state:'Square\u8ca9\u58f2\u72b6\u614b'}[j.kind]||'\u4e0d\u660e\u306a\u51e6\u7406')}\u30fb${statusNames[j.state]||j.state||'\u30b8\u30e7\u30d6\u60c5\u5831\u306a\u3057'}\u30fb${j.error||'\u7d50\u679c\u78ba\u8a8d\u5f85\u3061'}\uff08${j.id||'\u8b58\u5225\u5b50\u306a\u3057'}\uff09`).join(' \uff0f ')+'\u3002\u516c\u958b\u306f\u672a\u5b8c\u4e86\u3067\u3059\u3002\u300c\u516c\u958b\u3059\u308b\u300d\u3067\u540c\u3058\u516c\u958b\u51e6\u7406\u3092\u78ba\u8a8d\u30fb\u518d\u958b\u3067\u304d\u307e\u3059\u3002\u4e0b\u66f8\u304d\u306f\u4fdd\u5b58\u3067\u304d\u307e\u3059\u3002';\n  }\n  function draw() {\n    const f = $('productForm'); for (const key of ['name','description','sortOrder','alt']) f.elements.namedItem(key).value = current.draft[key] ?? '';\n    f.elements.namedItem('slug').value = current.slug; f.elements.namedItem('slug').disabled = current.version > 0;\n    $('editorTitle').textContent = current.version ? '\u5546\u54c1\u3092\u7de8\u96c6' : '\u65b0\u3057\u3044\u5546\u54c1'; $('editorProductStatus').textContent = statusNames[current.status] || '\u4e0b\u66f8\u304d';\n    drawSyncStatus();\n    if(current.source==='square-sandbox'&&current.capabilities?.sitePublish)$('stopProduct').closest('details').querySelector('.hint').textContent='\u4e0b\u66f8\u304d\u4fdd\u5b58\u3067\u306f\u516c\u958b\u4e2d\u306e\u5546\u54c1\u3092\u5909\u66f4\u3057\u307e\u305b\u3093\u3002\u300c\u516c\u958b\u3059\u308b\u300d\u3067Square\u78ba\u8a8d\u3068\u30b5\u30a4\u30c8\u516c\u958b\u3092\u307e\u3068\u3081\u3066\u884c\u3044\u307e\u3059\u3002\u8ca9\u58f2\u505c\u6b62\u3059\u308b\u3068\u4e00\u89a7\u304b\u3089\u975e\u8868\u793a\u306b\u306a\u308a\u3001\u300c\u516c\u958b\u3059\u308b\u300d\u3067\u518d\u958b\u3067\u304d\u307e\u3059\u3002';\n    if(current.capabilities&&(current.source==='square-production'||current.capabilities.sitePublish)){const c=current.capabilities;$('saveProduct').disabled=!c.draft;$('imageFiles').disabled=!c.images;for(const id of ['publishProduct','stopProduct','archiveProduct'])$(id).disabled=!(c.catalog||c.sitePublish);if(c.unifiedPublish)$('publishProduct').disabled=!c.catalog||Boolean(current.retired);$('publishProduct').textContent=c.unifiedPublish?'\u516c\u958b\u3059\u308b':c.sitePublish?'\u30b5\u30a4\u30c8\u3078\u516c\u958b\uff08Square\u5909\u66f4\u306a\u3057\uff09':'Square\u3068\u540c\u671f\u3057\u3066\u516c\u958b';$('linkProduct').disabled=!c.draft;$('linkProduct').textContent=current.source==='square-production'?'\u65e2\u5b58\u672c\u756aID\u30fbSKU\u3092\u7167\u5408':'\u65e2\u5b58Sandbox ID\u3092\u95a2\u9023\u4ed8\u3051';}else{$('imageFiles').disabled=false;$('linkProduct').textContent='\u65e2\u5b58Sandbox ID\u3092\u95a2\u9023\u4ed8\u3051';}\n    let sync=$('syncSquareProduct');if(!sync){sync=document.createElement('button');sync.id='syncSquareProduct';sync.type='button';sync.textContent='Square\u3078\u540c\u671f\uff08\u30b5\u30a4\u30c8\u516c\u958b\u306f\u5225\uff09';$('publishProduct').after(sync);sync.onclick=()=>{if(confirm('Square\u306e\u5546\u54c1\u60c5\u5831\u3092\u5909\u66f4\u3057\u307e\u3059\u3002\u30b5\u30a4\u30c8\u516c\u958b\u306f\u5225\u64cd\u4f5c\u3067\u3059\u3002\u540c\u671f\u3057\u307e\u3059\u304b\uff1f'))work(()=>action('square-publish'),'editorMessage');};}sync.hidden=Boolean(current.capabilities?.unifiedPublish)||!current.capabilities?.sitePublish;sync.disabled=!current.capabilities?.catalog||Boolean(current.blockingJobs?.length);\n    if(current.capabilities?.unifiedPublish||current.source==='square-sandbox'&&current.capabilities?.sitePublish)syncDiagnostics();\n    $('variantList').innerHTML = current.draft.variants.map((v,i) => `<fieldset data-id=\"${esc(v.id)}\"><legend>\u30d0\u30ea\u30a8\u30fc\u30b7\u30e7\u30f3 ${i+1}</legend><label>\u30d0\u30ea\u30a8\u30fc\u30b7\u30e7\u30f3\u540d<input name=\"vname\" maxlength=\"120\" value=\"${esc(v.name)}\" required placeholder=\"\u4f8b\uff1a\u4e7e\u71e5\u30cf\u30fc\u30d6 10g\"></label><div class=\"form-grid\"><label>\u4fa1\u683c\uff08\u5186\uff09<input name=\"price\" type=\"number\" inputmode=\"numeric\" min=\"1\" max=\"10000000\" value=\"${v.price}\" required></label><label>\u5185\u5bb9\u91cf<input name=\"amount\" maxlength=\"120\" value=\"${esc(v.amount||'')}\" placeholder=\"\u4f8b\uff1a10g\"></label></div><div class=\"form-grid\"><label>\u8cfc\u5165\u4e0a\u9650<input name=\"max\" type=\"number\" inputmode=\"numeric\" min=\"1\" max=\"10\" value=\"${v.maxQuantity??10}\" required></label><label class=\"checkbox-label\"><input name=\"active\" type=\"checkbox\" ${v.active!==false ? 'checked' : ''}>\u8ca9\u58f2\u5bfe\u8c61</label></div></fieldset>`).join('');\n    drawImages(); message('editorMessage'); message('photoUploadMessage'); if ($('photoDiagnosticDetails')) $('photoDiagnosticDetails').hidden = true; if ($('productDiagnosticDetails')) { $('productDiagnosticDetails').hidden = true; $('productDiagnosticReport').value = ''; }\n  }\n  function syncDiagnostics(){\n    let panel=$('syncDiagnosticPanel');if(!panel){\n      panel=document.createElement('section');panel.id='syncDiagnosticPanel';\n      const button=document.createElement('button');button.type='button';button.textContent='\u540c\u671f\u72b6\u6cc1\u3092\u78ba\u8a8d\uff08\u8aad\u53d6\u306e\u307f\uff09';\n      const summary=document.createElement('p');summary.id='syncDiagnosticSummary';summary.setAttribute('role','status');\n      const report=document.createElement('div');report.id='syncDiagnosticReport';\n      const actions=document.createElement('div');actions.id='syncDiagnosticActions';\n      panel.append(button,summary,report,actions);if(current.capabilities?.unifiedPublish){const details=document.createElement('details'),title=document.createElement('summary');details.className='form-section release-diagnostics';title.textContent='\u516c\u958b\u72b6\u6cc1\u30fb\u5fa9\u65e7\u30fb\u8a73\u7d30\u8a3a\u65ad';details.append(title,panel);$('editorProductStatus').closest('.editor-status').after(details);}else $('editorProductStatus').closest('.editor-status').after(panel);\n      button.onclick=()=>work(async()=>{\n        const result=await data('/api/admin/products/'+current.id+'/sync-check',{method:'POST',body:'{}'});\n        summary.textContent='\u8aad\u307f\u53d6\u308a\u8a3a\u65ad\u3092\u66f4\u65b0\u3057\u307e\u3057\u305f\u3002Square\u3078\u306e\u518d\u9001\u30fb\u5728\u5eab\u66f4\u65b0\u306f\u3057\u3066\u3044\u307e\u305b\u3093\u3002';report.replaceChildren();actions.replaceChildren();\n        const section=(title,text)=>{const box=document.createElement('section'),heading=document.createElement('h4'),body=document.createElement('p');heading.textContent=title;body.textContent=text;box.append(heading,body);report.append(box);return box;};\n        const squareLabel=result.environment==='production'?'Production':'Sandbox';\n        section('\u63a5\u7d9a',result.connection.ok?(result.connection.locationFound&&result.connection.locationActive?squareLabel+'\u63a5\u7d9a\u6210\u529f\u30fbLocation\u6709\u52b9':squareLabel+'\u63a5\u7d9a\u6210\u529f\u30fbLocation\u306f\u8981\u78ba\u8a8d'):'\u63a5\u7d9a\u5931\u6557\uff1a'+(result.connection.httpStatus||'\u72b6\u614b\u672a\u78ba\u8a8d')+' '+(result.connection.squareCode||'')+'\u3002'+(result.connection.nextAction||''));\n        const labels={environment:'Square\u74b0\u5883',sandbox:'Sandbox\u74b0\u5883',location:'Location',itemId:'\u5546\u54c1ID',variationId:'Variation ID',parent:'\u89aa\u5b50\u95a2\u4fc2',skuPresent:'SKU',skuUnique:'SKU\u91cd\u8907',notDeleted:'\u524a\u9664\u72b6\u614b',name:'\u30d0\u30ea\u30a8\u30fc\u30b7\u30e7\u30f3\u540d',price:'\u4fa1\u683c\u30fb\u901a\u8ca8',tracking:'\u5728\u5eab\u8ffd\u8de1',sellable:'\u8ca9\u58f2\u53ef\u80fd\u72b6\u614b',present:'Location\u8ca9\u58f2\u8a2d\u5b9a'};\n        const productLines=result.variants.map(v=>{const failed=Object.entries(v.checks||{}).filter(([key,ok])=>key!=='catalogVersion'&&ok===false).map(([key])=>labels[key]||key);return (failed.length?'\u8981\u78ba\u8a8d\uff1a'+failed.join('\u30fb'):v.checks?'\u5546\u54c1ID\u30fbSKU\u30fb\u4fa1\u683c\u30fb\u5728\u5eab\u8ffd\u8de1\u3092\u78ba\u8a8d':'\u5546\u54c1\u5bfe\u5fdc\u306f\u672a\u78ba\u8a8d')+(v.versions?'\u3002'+v.versions.reason:'');});\n        section('\u5546\u54c1',(productLines.join(' \uff0f ')||'\u672a\u78ba\u8a8d')+(result.connection.ok&&!result.skuCheck?.complete?'\u3002SKU\u91cd\u8907\u306e\u5168\u4ef6\u78ba\u8a8d\u306f\u672a\u5b8c\u4e86\u3067\u3059\u3002':''));\n        for(const [i,v] of result.variants.entries()){if(!v.checkout)continue;const box=section('\u8cfc\u5165\u6642\u7167\u5408 '+(i+1),v.checkout.ok?(v.checkout.versionRevalidated?'\u30d0\u30fc\u30b8\u30e7\u30f3\u66f4\u65b0\u3042\u308a\u3002\u5b8c\u4e86\u6e08\u307f\u540c\u671f\u3068\u306e\u5546\u54c1\u5185\u5bb9\u30fbID\u30fbSKU\u30fb\u4fa1\u683c\u30fb\u8ca9\u58f2\u8a2d\u5b9a\u306e\u8aad\u53d6\u7167\u5408\u306b\u6210\u529f\u3002\u8cfc\u5165\u53ef\u80fd\uff08\u5728\u5eab\u5909\u66f4\u306a\u3057\uff09':'\u516c\u958b\u4e2d\u306e\u5546\u54c1\u5185\u5bb9\u30fb\u30d0\u30fc\u30b8\u30e7\u30f3\u3092\u7167\u5408\u6e08\u307f'):'\u8cfc\u5165\u3092\u505c\u6b62\u3057\u3066\u3044\u308b\u9805\u76ee\uff1a'+v.checkout.mismatches.map(m=>m.label).join('\u30fb')+'\u3002'+(v.checkout.nextAction||''));for(const m of v.checkout.mismatches){const line=document.createElement('p');line.textContent=m.label+('saved' in m?'\uff1a\u516c\u958b\uff0fD1 '+String(m.saved??'\u672a\u8a18\u9332')+' \uff0f Square '+String(m.current??'\u672a\u78ba\u8a8d'):'');box.append(line);}}\n        if(result.recentOperations?.length)section('\u76f4\u8fd1\u306e\u51e6\u7406',result.recentOperations.map(j=>(j.kind==='stock'?'\u5728\u5eab\u64cd\u4f5c':'\u5546\u54c1\u540c\u671f')+'\uff1a'+(statusNames[j.state]||j.state)+' \uff0f '+j.updatedAt+' \uff0f '+j.id).join('\u3002'));\n        section('\u5728\u5eab',Array.isArray(result.inventory)?result.inventory.length?result.inventory.map((v,i)=>'\u30d0\u30ea\u30a8\u30fc\u30b7\u30e7\u30f3'+(i+1)+'\uff1a'+(v.quantity===null?'\u672a\u78ba\u8a8d':v.quantity+'\u70b9')).join(' \uff0f '):'\u672a\u78ba\u8a8d\uff08Square\u5bfe\u5fdc\u672a\u767b\u9332\uff09':'\u672a\u78ba\u8a8d\u30020\u70b9\u3068\u3057\u3066\u6271\u3044\u307e\u305b\u3093\u3002');\n        const jobsBox=section('\u30b8\u30e7\u30d6',result.jobs.length?result.jobs.map(j=>(statusNames[j.state]||j.state)+'\u30fb\u30ed\u30c3\u30af'+j.lockCount+'\u4ef6').join(' \uff0f '):'\u4fdd\u7559\u30b8\u30e7\u30d6\u306a\u3057');\n        for(const job of result.jobs){\n          const proof=job.proof;\n          const detail=document.createElement('details'),heading=document.createElement('summary'),text=document.createElement('p');heading.textContent='\u7167\u5408\u7d50\u679c'+(proof?.state==='matched'?'\uff1a\u4e00\u81f4':proof?.state==='mismatch'?'\uff1a\u4e0d\u4e00\u81f4':'\uff1a\u672a\u78ba\u8a8d');\n          text.textContent=proof?.message||job.error||job.nextAction;detail.append(heading,text);\n          if(proof){const failed=proof.checks.filter(c=>!c.ok).map(c=>c.label);if(failed.length){const note=document.createElement('p');note.textContent='\u4e0d\u4e00\u81f4\u9805\u76ee\uff1a'+failed.join('\u30fb');detail.append(note);}\n           for(const version of proof.versionInfo){const line=document.createElement('p');line.textContent=version.type+'\uff1a\u9001\u4fe1\u6642 '+(version.requested??'\u672a\u8a18\u9332')+' \uff0f \u30ed\u30fc\u30ab\u30eb '+(version.stored??'\u672a\u8a18\u9332')+' \uff0f Square\u73fe\u5728 '+(version.current??'\u672a\u78ba\u8a8d');detail.append(line);}}\n          jobsBox.append(detail);\n          const resolved=async(mode)=>{\n            let confirmed=false;\n            try{const outcome=await data('/api/admin/jobs/'+job.id+'/'+mode,{method:'POST',body:'{}'});if(outcome.state!==(mode==='adopt-current'?'cancelled':'done')||outcome.lockCount!==0)throw Object.assign(Error('API\u306e\u5b8c\u4e86\u72b6\u614b\u3092\u78ba\u8a8d\u3067\u304d\u307e\u305b\u3093\u3002'),{code:'ADMIN_RECOVERY_UNCONFIRMED'});confirmed=true;}\n            catch(error){\n              // A lost response never authorizes replaying the mutation. Read only.\n              let state;try{state=(await data('/api/admin/jobs/'+job.id)).job;}catch{ /* Keep result unknown, never assume failure/success. */ }\n              confirmed=state?.state===(mode==='adopt-current'?'cancelled':'done')&&state.lockCount===0;\n              if(!confirmed){const phase=error.actionStage?' \uff0f \u51e6\u7406\u6bb5\u968e\uff1a'+error.actionStage:'';const status=error.status?'HTTP '+error.status:'HTTP\u5fdc\u7b54\u672a\u53d6\u5f97';throw Error((state?.state==='review'?'\u53d6\u6d88\u30fb\u5b8c\u4e86\u306f\u53cd\u6620\u3055\u308c\u3066\u3044\u307e\u305b\u3093\uff08\u8981\u78ba\u8a8d\u30fb\u30ed\u30c3\u30af'+state.lockCount+'\u4ef6\uff09\u3002':state?'\u73fe\u5728\u306e\u72b6\u614b\uff1a'+(statusNames[state.state]||state.state)+'\u30fb\u30ed\u30c3\u30af'+state.lockCount+'\u4ef6\u3002':'\u64cd\u4f5c\u7d50\u679c\u306f\u672a\u78ba\u8a8d\u3067\u3059\u3002')+' '+error.message+' \uff3b'+status+'\uff0f'+(error.code||'ADMIN_RECOVERY_UNKNOWN')+phase+'\uff3d \u64cd\u4f5c\uff1aPOST /api/admin/jobs/'+job.id+'/'+mode+'\u3002\u81ea\u52d5\u518d\u9001\u306f\u3057\u3066\u3044\u307e\u305b\u3093\u3002');}\n            }\n            const done=mode==='adopt-current'?'\u65e7\u540c\u671f\u306e\u53d6\u6d88\u304c\u5b8c\u4e86\u3057\u307e\u3057\u305f\u3002Square\u3078\u306e\u518d\u9001\u30fb\u5728\u5eab\u66f4\u65b0\u306f\u3057\u3066\u3044\u307e\u305b\u3093\u3002':'\u8aad\u307f\u53d6\u308a\u7167\u5408\u306b\u3088\u308b\u540c\u671f\u5b8c\u4e86\u3092\u78ba\u8a8d\u3057\u307e\u3057\u305f\u3002Square\u3078\u306e\u518d\u9001\u30fb\u5728\u5eab\u66f4\u65b0\u306f\u3057\u3066\u3044\u307e\u305b\u3093\u3002';\n            try{await loadProducts();current=structuredClone(products.find(p=>p.id===current.id));draw();message('editorMessage',done);}\n            catch{message('editorMessage',done+' \u753b\u9762\u306e\u518d\u53d6\u5f97\u3060\u3051\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002\u7ba1\u7406\u753b\u9762\u3092\u518d\u8aad\u307f\u8fbc\u307f\u3057\u3066\u304f\u3060\u3055\u3044\u3002','success');}\n          };\n          if(proof?.state==='matched'||job.state==='done'||job.kind==='stock'&&job.state==='review'&&job.hasSuccessEvidence){const b=document.createElement('button');b.type='button';b.textContent='\u4e00\u81f4\u3092\u518d\u78ba\u8a8d\u3057\u3066\u540c\u671f\u3092\u5b8c\u4e86';b.onclick=()=>work(()=>resolved('reconcile'),'editorMessage');actions.append(b);}\n          else if(proof?.adoption?.available){const b=document.createElement('button');b.type='button';b.textContent='\u73fe\u5728\u5024\u3092\u63a1\u7528\u3057\u3066\u65e7\u540c\u671f\u3092\u53d6\u308a\u6d88\u3059';b.onclick=()=>{if(confirm('\u65e7\u540c\u671f\u306f\u6210\u529f\u6271\u3044\u306b\u3057\u307e\u305b\u3093\u3002\u65e7\u30ea\u30af\u30a8\u30b9\u30c8\u304c\u9069\u7528\u3067\u304d\u306a\u3044\u3053\u3068\u3092\u30d0\u30fc\u30b8\u30e7\u30f3\u3067\u518d\u78ba\u8a8d\u3057\u3001\u73fe\u5728\u306eSquare\u5bfe\u5fdc\u60c5\u5831\u3092\u63a1\u7528\u3057\u307e\u3059\u3002\u4e0b\u66f8\u304d\u30fb\u516c\u958b\u5185\u5bb9\u30fbSquare\u5728\u5eab\u306f\u5909\u66f4\u3057\u307e\u305b\u3093\u3002\u7d9a\u884c\u3057\u307e\u3059\u304b\uff1f'))work(()=>resolved('adopt-current'),'editorMessage');};actions.append(b);}\n        }\n        section('\u6b21\u306e\u64cd\u4f5c',result.jobs.some(j=>j.proof?.state==='matched')?'\u4fdd\u5b58\u6e08\u307f\u30ea\u30af\u30a8\u30b9\u30c8\u3068\u4e00\u81f4\u3057\u3066\u3044\u307e\u3059\u3002\u300c\u4e00\u81f4\u3092\u518d\u78ba\u8a8d\u3057\u3066\u540c\u671f\u3092\u5b8c\u4e86\u300d\u3092\u62bc\u3057\u3066\u304f\u3060\u3055\u3044\u3002':result.jobs.some(j=>j.proof?.adoption?.available)?'\u5185\u5bb9\u304c\u7570\u306a\u308a\u307e\u3059\u304c\u65e7\u30ea\u30af\u30a8\u30b9\u30c8\u306e\u518d\u9069\u7528\u306f\u9632\u6b62\u3055\u308c\u3066\u3044\u307e\u3059\u3002\u6210\u529f\u6271\u3044\u306b\u305b\u305a\u73fe\u5728\u5024\u3092\u63a1\u7528\u3057\u3001\u65e7\u540c\u671f\u3092\u53d6\u308a\u6d88\u305b\u307e\u3059\u3002':result.jobs.length?'\u6210\u529f\u3092\u8a3c\u660e\u3067\u304d\u306a\u3044\u305f\u3081\u30ed\u30c3\u30af\u3092\u4fdd\u6301\u3057\u3066\u3044\u307e\u3059\u3002\u300c\u30b8\u30e7\u30d6\u300d\u306e\u7167\u5408\u7d50\u679c\u3067\u4e0d\u4e00\u81f4\u3092\u78ba\u8a8d\u3057\u3001\u8aad\u307f\u53d6\u308a\u8a3a\u65ad\u3092\u518d\u5b9f\u884c\u3057\u3066\u304f\u3060\u3055\u3044\u3002\u65b0\u898f\u540c\u671f\u30fb\u518d\u9001\u306f\u884c\u308f\u306a\u3044\u3067\u304f\u3060\u3055\u3044\u3002':result.connection.ok?'\u4fdd\u7559\u306f\u3042\u308a\u307e\u305b\u3093\u3002\u4e0b\u66f8\u304d\u4fdd\u5b58\u307e\u305f\u306f\u300c\u516c\u958b\u3059\u308b\u300d\u3092\u5229\u7528\u3067\u304d\u307e\u3059\u3002':result.connection.nextAction||'\u63a5\u7d9a\u7d50\u679c\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002');\n\n      },'editorMessage');\n    }\n    panel.querySelector('button').disabled=!current.version;\n    $('syncDiagnosticSummary').textContent='\u5546\u54c1\u3054\u3068\u306e\u63a5\u7d9a\u30fbSquare\u5bfe\u5fdc\u30fb\u4fdd\u7559\u30b8\u30e7\u30d6\u3092\u8aad\u307f\u53d6\u308a\u78ba\u8a8d\u3067\u304d\u307e\u3059\u3002';$('syncDiagnosticReport').textContent='';$('syncDiagnosticActions').replaceChildren();\n  }\n  function open(p) { if (busy) return; current = structuredClone(p); setDirty(false); $('imageFiles').value = ''; draw(); $('productEditor').showModal(); $('productEditor').scrollTop = 0; gallery.select(0,false); }\n  function newProduct() { open({...(stagingCapabilities?{source:'square-sandbox',capabilities:stagingCapabilities}:{}),...(productionCapabilities?{source:'square-production',capabilities:productionCapabilities}:{}),id:crypto.randomUUID(),slug:'',version:0,status:'draft',draft:{name:'',description:'',alt:'',sortOrder:0,images:[],variants:[{id:crypto.randomUUID(),name:'',amount:'',price:980,maxQuantity:10,active:true}]}}); }\n  $('newProduct').onclick = newProduct; $('homeNewProduct').onclick = newProduct;\n  $('importProducts').onclick = () => { if (confirm('\u65e2\u5b583\u5546\u54c1\u306e\u8aac\u660e\u30fb\u5199\u771f\u3092\u4e0b\u66f8\u304d\u3068\u3057\u3066\u53d6\u308a\u8fbc\u307f\u307e\u3059\u3002\u516c\u958b\u3084Square\u3078\u306e\u66f8\u8fbc\u307f\u306f\u884c\u3044\u307e\u305b\u3093\u3002')) work(async () => { await write('/api/admin/products/import',{}); await loadProducts(); notify('\u4e0b\u66f8\u304d\u3068\u3057\u3066\u53d6\u308a\u8fbc\u307f\u307e\u3057\u305f\u3002'); }); };\n  $('productList').onclick = e => { const b = e.target.closest('[data-edit]'); if (b) open(products.find(p => p.id === b.dataset.edit)); };\n  $('productForm').addEventListener('input',event => { if (event.target.id !== 'imageFiles') setDirty(true); });\n  // Native constraint validation runs BEFORE submit and invalid does not bubble.\n  // Surface its first failure in the editor instead of silently skipping save.\n  $('productForm').addEventListener('invalid',event => {\n    event.preventDefault();\n    const input = event.target;\n    if (input !== $('productForm').querySelector('input:invalid,textarea:invalid,select:invalid')) return;\n    const labels = {name:'\u5546\u54c1\u540d',slug:'URL\u8b58\u5225\u5b50',sortOrder:'\u8868\u793a\u9806',alt:'\u5199\u771f\u306e\u8aac\u660e',description:'\u8aac\u660e',vname:'\u30d0\u30ea\u30a8\u30fc\u30b7\u30e7\u30f3\u540d',price:'\u4fa1\u683c\uff08\u5186\uff09',max:'\u8cfc\u5165\u4e0a\u9650',amount:'\u5185\u5bb9\u91cf'};\n    const variant = input.closest('#variantList fieldset');\n    const label = (variant ? `\u30d0\u30ea\u30a8\u30fc\u30b7\u30e7\u30f3${[...$('variantList').children].indexOf(variant)+1}\u306e` : '') + (labels[input.name] || '\u5165\u529b\u9805\u76ee');\n    const v = input.validity;\n    const reason = v.valueMissing ? '\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002' : v.rangeUnderflow || v.rangeOverflow ? `${input.min}\u301c${input.max}\u306e\u7bc4\u56f2\u3067\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002` : v.stepMismatch || v.badInput ? '\u6574\u6570\u3067\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002' : v.patternMismatch ? '\u534a\u89d2\u82f1\u5c0f\u6587\u5b57\u30fb\u6570\u5b57\u30fb\u30cf\u30a4\u30d5\u30f3\u3067\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\uff08\u5148\u982d\u306f\u82f1\u6570\u5b57\u300180\u6587\u5b57\u4ee5\u5185\uff09\u3002' : v.tooLong ? `${input.maxLength}\u6587\u5b57\u4ee5\u5185\u3067\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002` : '\u5165\u529b\u5185\u5bb9\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002';\n    const text = `\u4e0b\u66f8\u304d\u306f\u4fdd\u5b58\u3055\u308c\u3066\u3044\u307e\u305b\u3093\u3002${label}\uff1a${reason}`;\n    message('editorMessage',text,'error'); notify(text,'error');\n    input.focus({preventScroll:true}); input.scrollIntoView({block:'center',behavior:'instant'});\n  },true);\n  $('addVariant').onclick = () => { capture(); if (current.draft.variants.length >= 20) { message('editorMessage','\u30d0\u30ea\u30a8\u30fc\u30b7\u30e7\u30f3\u306f20\u4ef6\u307e\u3067\u3067\u3059\u3002','error'); return; } current.draft.variants.push({id:crypto.randomUUID(),name:'',price:980,amount:'',maxQuantity:10,active:true}); setDirty(true); draw(); };\n  async function saveDraft(){\n    capture(); let result;\n    try { result = await write('/api/admin/products/' + current.id,{...current.draft,slug:current.slug,expectedVersion:current.version},'PUT'); }\n    catch (error) { const failure=Error(['TypeError','AbortError','TimeoutError'].includes(error.name) ? '\u4e0b\u66f8\u304d\u306e\u4fdd\u5b58\u7d50\u679c\u3092\u78ba\u8a8d\u3067\u304d\u307e\u305b\u3093\u3002\u901a\u4fe1\u72b6\u614b\u3092\u78ba\u8a8d\u3057\u3066\u518d\u8a66\u884c\u3057\u3066\u304f\u3060\u3055\u3044\u3002\u5165\u529b\u5185\u5bb9\u3068\u5199\u771f\u306f\u3053\u306e\u753b\u9762\u306b\u6b8b\u3063\u3066\u3044\u307e\u3059\u3002' : `\u4e0b\u66f8\u304d\u3092\u4fdd\u5b58\u3067\u304d\u307e\u305b\u3093\uff1a${error.message}${error.status ? '\uff08HTTP '+error.status+'\uff09' : ''}`); failure.name=error.name; failure.productDiagnostic=error.productDiagnostic; throw failure; }\n    current.version = result.version; current.draft_revision = result.revision; $('productForm').elements.namedItem('slug').disabled = true; setDirty(false);\n    drawSyncStatus();\n    if ($('productDiagnosticDetails')) { $('productDiagnosticDetails').hidden = true; $('productDiagnosticReport').value = ''; }\n    message('editorMessage','\u4e0b\u66f8\u304d\u3092\u4fdd\u5b58\u3057\u307e\u3057\u305f\u3002\u516c\u958b\u5185\u5bb9\u306f\u307e\u3060\u5909\u308f\u308a\u307e\u305b\u3093\u3002'); notify('\u4e0b\u66f8\u304d\u3092\u4fdd\u5b58\u3057\u307e\u3057\u305f\u3002'); await loadProducts();\n  }\n  $('productForm').onsubmit = e => { e.preventDefault(); work(saveDraft,'editorMessage'); };\n  async function action(action,extra = {}) {\n    if (dirty || !current.version) throw Error('\u5148\u306b\u4e0b\u66f8\u304d\u3092\u4fdd\u5b58\u3057\u3066\u304f\u3060\u3055\u3044\u3002');\n    const unified=current.capabilities?.unifiedPublish&&action==='publish';\n    const site=!unified&&current.capabilities?.sitePublish&&['publish','state'].includes(action);\n    let result;\n    try{result=await write('/api/admin/products/' + current.id + '/' + (unified?'release':site?'site':action==='square-publish'?'publish':action),{expectedVersion:current.version,...(site?{status:action==='publish'?'published':extra.status}:extra)});}\n    catch(error){if(!unified)throw error;let view;try{view=(await data('/api/admin/products/'+current.id)).product;}catch{}if(view?.releaseJob?.state==='done'&&view.releaseJob.submittedRevision===current.draft_revision&&view.status==='published')result=view.releaseJob;else throw Error('\u516c\u958b\u5b8c\u4e86\u3092\u78ba\u8a8d\u3067\u304d\u307e\u305b\u3093\u3002'+error.message+' \u300c\u516c\u958b\u3059\u308b\u300d\u3067\u540c\u3058\u516c\u958b\u51e6\u7406\u3092\u78ba\u8a8d\u30fb\u518d\u958b\u3067\u304d\u307e\u3059\u3002\u65b0\u898f\u5546\u54c1\u306f\u4f5c\u308a\u76f4\u3055\u306a\u3044\u3067\u304f\u3060\u3055\u3044\u3002');}\n    await loadProducts(); current = structuredClone(products.find(p => p.id === current.id)); draw();\n    const text = unified ? (result.state==='done'?(current.status==='published'?(current.draft_revision===current.published_revision?'\u516c\u958b\u304c\u5b8c\u4e86\u3057\u307e\u3057\u305f\u3002Square\u3068\u30b5\u30a4\u30c8\u306e\u8ca9\u58f2\u60c5\u5831\u3092\u78ba\u8a8d\u6e08\u307f\u3067\u3059\u3002':'\u524d\u56de\u306e\u516c\u958b\u51e6\u7406\u306f\u5b8c\u4e86\u3057\u307e\u3057\u305f\u3002\u6700\u65b0\u306e\u4e0b\u66f8\u304d\u306f\u672a\u516c\u958b\u3067\u3059\u3002\u300c\u516c\u958b\u3059\u308b\u300d\u3067\u6700\u65b0\u5185\u5bb9\u3092\u516c\u958b\u3057\u3066\u304f\u3060\u3055\u3044\u3002'):'\u540c\u671f\u306f\u5b8c\u4e86\u3057\u307e\u3057\u305f\u3002\u51e6\u7406\u4e2d\u306b\u6307\u5b9a\u3055\u308c\u305f\u8ca9\u58f2\u505c\u6b62\u3092\u7dad\u6301\u3057\u3066\u3044\u307e\u3059\u3002\u300c\u516c\u958b\u3059\u308b\u300d\u3067\u518d\u958b\u3067\u304d\u307e\u3059\u3002'):'\u516c\u958b\u306f\u672a\u5b8c\u4e86\u3067\u3059\u3002\u51e6\u7406\u6bb5\u968e\uff1a'+({validation:'\u5165\u529b\u30fb\u65e2\u5b58ID\u78ba\u8a8d','square-confirmation':'Square\u5fdc\u7b54\u306e\u78ba\u8a8d','save-and-publish':'\u8a3c\u8de1\u4fdd\u5b58\u30fb\u30b5\u30a4\u30c8\u516c\u958b'}[result.phase]||result.phase)+'\u3002'+(result.error||'\u7d50\u679c\u78ba\u8a8d\u5f85\u3061')+'\u3002'+result.nextAction+'\uff08\u51e6\u7406ID\uff1a'+result.id+'\uff09') : result.warnings?.length ? result.warnings.join(' \uff0f ') : action==='square-publish'&&result.state==='done' ? 'Square\u3078\u306e\u540c\u671f\u304c\u5b8c\u4e86\u3057\u307e\u3057\u305f\u3002\u30b5\u30a4\u30c8\u516c\u958b\u306f\u5225\u64cd\u4f5c\u3067\u3059\u3002' : result.siteOnly ? '\u30b5\u30a4\u30c8\u306e\u516c\u958b\u72b6\u614b\u3092\u66f4\u65b0\u3057\u307e\u3057\u305f\u3002Square\u306f\u5909\u66f4\u3057\u3066\u3044\u307e\u305b\u3093\u3002' : result.state === 'done' ? '\u540c\u671f\u304c\u5b8c\u4e86\u3057\u3001\u8ca9\u58f2\u72b6\u614b\u3092\u53cd\u6620\u3057\u307e\u3057\u305f\u3002' : result.ok && action === 'link' ? (current.source==='square-production'?'\u65e2\u5b58\u672c\u756aID\u30fbSKU\u3092\u7167\u5408\u3057\u3066\u95a2\u9023\u4ed8\u3051\u307e\u3057\u305f\u3002':'\u65e2\u5b58Sandbox ID\u3092\u95a2\u9023\u4ed8\u3051\u307e\u3057\u305f\u3002') : '\u51e6\u7406\u3092\u53d7\u3051\u4ed8\u3051\u307e\u3057\u305f\u3002\u540c\u671f\u4e00\u89a7\u3067\u7d50\u679c\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002';\n    message('editorMessage',text); notify(text);\n  }\n  $('publishProduct').onclick = () => { if(current.capabilities?.unifiedPublish){if(!$('productForm').reportValidity())return;work(async()=>{if(dirty||!current.version)await saveDraft();await action('publish');},'editorMessage');}else if(confirm('\u4fdd\u5b58\u6e08\u307f\u306e\u4e0b\u66f8\u304d\u3092\u516c\u958b\u3057\u307e\u3059\u304b\uff1fSquare\u5909\u66f4\u306e\u6709\u7121\u306f\u30dc\u30bf\u30f3\u306e\u8868\u793a\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002'))work(()=>action('publish'),'editorMessage'); };\n  $('stopProduct').onclick = () => { if (confirm('\u3053\u306e\u5546\u54c1\u306e\u8ca9\u58f2\u3092\u505c\u6b62\u3057\u307e\u3059\u304b\uff1f')) work(() => action('state',{status:'stopped'}),'editorMessage'); };\n  $('archiveProduct').onclick = () => { if (confirm('\u5546\u54c1\u3092\u30a2\u30fc\u30ab\u30a4\u30d6\u3057\u307e\u3059\u304b\uff1f\u904e\u53bb\u306e\u6ce8\u6587\u306f\u6b8b\u308a\u307e\u3059\u3002')) work(() => action('state',{status:'archived'}),'editorMessage'); };\n  $('linkProduct').onclick = () => work(async () => { if (dirty) throw Error('\u5148\u306b\u4e0b\u66f8\u304d\u3092\u4fdd\u5b58\u3057\u3066\u304f\u3060\u3055\u3044\u3002'); if(current.useConfiguredLinks){if(confirm('\u691c\u8a3c\u8a2d\u5b9a\u306e\u65e2\u5b58Sandbox ID\u3092\u7167\u5408\u3057\u3066\u95a2\u9023\u4ed8\u3051\u307e\u3059\u3002Square\u306e\u5546\u54c1\u3084\u5728\u5eab\u306f\u5909\u66f4\u3057\u307e\u305b\u3093\u3002'))await action('link',{});return;} const mappings = []; for (const v of current.draft.variants) { const variationId = prompt(v.name + (current.source==='square-production'?' \u306e\u5b9f\u7167\u5408\u5bfe\u8c61\u306e\u672c\u756aVariation ID':' \u306e\u65e2\u5b58Sandbox Variation ID')); if (!variationId) return; mappings.push({variantId:v.id,variationId:variationId.trim()}); } await action('link',{mappings}); },'editorMessage');\n  function closeEditor() { if (!busy && (!dirty || confirm('\u672a\u4fdd\u5b58\u306e\u5909\u66f4\u304c\u3042\u308a\u307e\u3059\u3002\u4fdd\u5b58\u305b\u305a\u306b\u9589\u3058\u307e\u3059\u304b\uff1f'))) { $('productEditor').close(); setDirty(false); } }\n  $('closeEditor').onclick = closeEditor;\n  $('productEditor').addEventListener('cancel',e => { e.preventDefault(); closeEditor(); });\n  // Local-only, bounded and memory-only diagnostics. Never include names, image data,\n  // EXIF, URLs, credentials, server response bodies or raw exception messages.\n  const photoRecords = []; let photoTrace, photoStage, photoStarted;\n  const photoReport = () => JSON.stringify({version:1,records:photoRecords},null,2);\n  if (A.local) window.YasoyaPhotoDiagnostics = Object.freeze({report:photoReport});\n  function photoDiagnostic(stage,result,error,extra={}) {\n    if (!A.local) return;\n    photoStage = stage;\n    const row = {trace:photoTrace,stage,result,elapsedMs:Math.round(performance.now()-photoStarted),...extra};\n    if (error) {\n      row.errorType = ['Error','TypeError','SyntaxError','InvalidStateError','AbortError','TimeoutError','NotReadableError','SecurityError','EncodingError'].includes(error.name) ? error.name : 'OtherError';\n      if (Number.isInteger(error.status)) row.httpStatus = error.status;\n      if (error.photoResponse) row.responseKind = error.photoResponse;\n      if (error.photoCode) row.serverCode = error.photoCode;\n      if (error.photoServerStage) row.serverStage = error.photoServerStage;\n      if (error.photoAccessReason) row.accessReason = error.photoAccessReason;\n      if (error.photoHostClass) row.hostClass = error.photoHostClass;\n      if (error.photoOriginClass) row.originClass = error.photoOriginClass;\n      if (error.photoConfigurationMode) row.configurationMode = error.photoConfigurationMode;\n      if (error.photoOriginMatch) row.originMatch = error.photoOriginMatch;\n      if (error.photoOriginEvidence) row.originEvidence = error.photoOriginEvidence;\n    }\n    photoRecords.push(row); if (photoRecords.length > 80) photoRecords.shift();\n    console.debug('[local-photo]',JSON.stringify(row));\n  }\n  function showPhotoDiagnostic() {\n    if (!A.local) return;\n    let details = $('photoDiagnosticDetails');\n    if (!details) {\n      details = document.createElement('details'); details.id = 'photoDiagnosticDetails';\n      const summary = document.createElement('summary'); summary.textContent = '\u5199\u771f\u8ffd\u52a0\u306e\u8a3a\u65ad\uff08\u30ed\u30fc\u30ab\u30eb\u5c02\u7528\uff09';\n      const report = document.createElement('textarea'); report.id = 'photoDiagnosticReport'; report.readOnly = true; report.rows = 8; report.setAttribute('aria-label','\u5199\u771f\u8ffd\u52a0\u306e\u8a3a\u65ad\u7d50\u679c');\n      const copy = document.createElement('button'); copy.type = 'button'; copy.textContent = '\u8a3a\u65ad\u3092\u30b3\u30d4\u30fc';\n      copy.onclick = async () => { report.focus(); report.select(); try { await navigator.clipboard.writeText(report.value); copy.textContent = '\u30b3\u30d4\u30fc\u3057\u307e\u3057\u305f'; } catch { copy.textContent = '\u8a3a\u65ad\u6b04\u3092\u9577\u62bc\u3057\u3057\u3066\u30b3\u30d4\u30fc\u3057\u3066\u304f\u3060\u3055\u3044'; } };\n      details.append(summary,report,copy); $('photoUploadMessage').after(details);\n    }\n    $('photoDiagnosticReport').value = photoReport(); details.hidden = false;\n  }\n  // Materialize a provider-backed File while the picker still owns its selection.\n  // No slice() on the original File: some Android providers cannot read partial files.\n  async function readPhotoFile(file) {\n    for (const method of ['array-buffer','file-reader']) {\n      photoDiagnostic('file-read','begin',null,{method,fileReaderUsed:method === 'file-reader'});\n      try {\n        const buffer = await new Promise((resolve,reject) => {\n          let reader, settled = false;\n          const finish = (error,value) => { if (settled) return; settled = true; clearTimeout(timer); if (reader) reader.onload = reader.onerror = reader.onabort = null; error ? reject(error) : resolve(value); };\n          const timer = setTimeout(() => { finish(new DOMException('Photo read timeout','TimeoutError')); if (reader?.readyState === 1) reader.abort(); },20000);\n          if (method === 'array-buffer') {\n            try { Promise.resolve(file.arrayBuffer()).then(value => finish(null,value),error => finish(error)); } catch (error) { finish(error); }\n          } else {\n            try {\n              reader = new FileReader(); reader.onload = () => finish(null,reader.result);\n              reader.onerror = () => finish(reader.error || new DOMException('Photo read failed','NotReadableError'));\n              reader.onabort = () => finish(new DOMException('Photo read aborted','AbortError'));\n              reader.readAsArrayBuffer(file);\n            } catch (error) { finish(error); }\n          }\n        });\n        if (!(buffer instanceof ArrayBuffer) || buffer.byteLength !== file.size) throw new DOMException('Photo size changed','NotReadableError');\n        photoDiagnostic('file-read','ok',null,{method,fileReaderUsed:method === 'file-reader',readBytes:buffer.byteLength});\n        return buffer;\n      } catch (error) {\n        photoDiagnostic('file-read','failed',error,{method,fileReaderUsed:method === 'file-reader'});\n        // A timed-out native read cannot be cancelled: do not launch another full read.\n        if (error.name === 'TimeoutError' || error.name === 'AbortError' || method === 'file-reader') {\n          throw Object.assign(Error('\u5199\u771f\u30d5\u30a1\u30a4\u30eb\u3092\u8aad\u307f\u8fbc\u3081\u307e\u305b\u3093\u3002\u7de8\u96c6\u6e08\u307f\u5199\u771f\u3092\u7aef\u672b\u306e\u300c\u30c0\u30a6\u30f3\u30ed\u30fc\u30c9\u300d\u306a\u3069\u3078\u66f8\u304d\u51fa\u3057\u3001\u30d5\u30a1\u30a4\u30eb\u9078\u629e\u753b\u9762\u304b\u3089\u9078\u3073\u76f4\u3057\u3066\u304f\u3060\u3055\u3044\u3002'),{photoLogged:true});\n        }\n      }\n    }\n  }\n  async function preparePhoto(file) {\n    if (!file.size) throw Error('\u5199\u771f\u30c7\u30fc\u30bf\u304c\u7a7a\u3067\u3059\u3002\u7aef\u672b\u306b\u5199\u771f\u3092\u4fdd\u5b58\u3057\u3066\u304b\u3089\u9078\u3073\u76f4\u3057\u3066\u304f\u3060\u3055\u3044\u3002');\n    if (file.size > 30*1024*1024) throw Error('\u5143\u306e\u5199\u771f\u306f30MB\u4ee5\u4e0b\u306b\u3057\u3066\u304f\u3060\u3055\u3044\u3002');\n    const buffer = await readPhotoFile(file);\n    photoDiagnostic('header-read','begin');\n    const header = new Uint8Array(buffer,0,Math.min(buffer.byteLength,32));\n    photoDiagnostic('header-read','ok');\n    photoDiagnostic('format-check','begin');\n    const ascii = (start,end) => String.fromCharCode(...header.slice(start,end));\n    const mime = header[0] === 255 && header[1] === 216 && header[2] === 255 ? 'image/jpeg'\n      : [137,80,78,71,13,10,26,10].every((v,i) => header[i] === v) ? 'image/png'\n      : ascii(0,4) === 'RIFF' && ascii(8,12) === 'WEBP' ? 'image/webp' : null;\n    if (!mime) {\n      if (/image\\/hei[cf]/i.test(file.type) || /\\.hei[cf]$/i.test(file.name) || ascii(4,8) === 'ftyp') throw Error('HEIC/HEIF\u306a\u3069\u306e\u5f62\u5f0f\u306f\u8ffd\u52a0\u3067\u304d\u307e\u305b\u3093\u3002JPEG\u30fbPNG\u30fbWebP\u306b\u5909\u63db\u3057\u3066\u9078\u3073\u76f4\u3057\u3066\u304f\u3060\u3055\u3044\u3002');\n      throw Error('\u5bfe\u5fdc\u3057\u3066\u3044\u308b\u5199\u771f\u306fJPEG\u30fbPNG\u30fbWebP\u3067\u3059\u3002\u5f62\u5f0f\u3092\u78ba\u8a8d\u3057\u3066\u9078\u3073\u76f4\u3057\u3066\u304f\u3060\u3055\u3044\u3002');\n    }\n    photoDiagnostic('format-check','ok',null,{detectedMime:mime});\n    // Android document/photo providers can return an empty or generic MIME type.\n    // Decode a typed local Blob with the browser image element instead of ImageBitmap.\n    photoDiagnostic('decode','begin');\n    const url = URL.createObjectURL(new Blob([buffer],{type:mime})), image = new Image();\n    try {\n      await new Promise((resolve,reject) => {\n        const cleanup = () => { clearTimeout(timer); image.onload = image.onerror = null; };\n        const timer = setTimeout(() => { cleanup(); reject(Error('\u5199\u771f\u306e\u8aad\u307f\u8fbc\u307f\u304c\u30bf\u30a4\u30e0\u30a2\u30a6\u30c8\u3057\u307e\u3057\u305f\u3002\u7aef\u672b\u306b\u4fdd\u5b58\u3057\u3001\u7e2e\u5c0f\u3057\u3066\u9078\u3073\u76f4\u3057\u3066\u304f\u3060\u3055\u3044\u3002')); },20000);\n        image.onload = () => { cleanup(); resolve(); };\n        image.onerror = () => { cleanup(); reject(Error('\u5199\u771f\u3092\u8aad\u307f\u8fbc\u3081\u307e\u305b\u3093\u3002\u7834\u640d\u3057\u3066\u3044\u306a\u3044JPEG\u30fbPNG\u30fbWebP\u3067\u9078\u3073\u76f4\u3057\u3066\u304f\u3060\u3055\u3044\u3002')); };\n        image.src = url;\n      });\n      photoDiagnostic('decode','ok');\n      photoDiagnostic('canvas-draw','begin');\n      const width = image.naturalWidth, height = image.naturalHeight;\n      if (!width || !height) throw Error('\u5199\u771f\u306e\u30b5\u30a4\u30ba\u3092\u53d6\u5f97\u3067\u304d\u307e\u305b\u3093\u3002\u5225\u306e\u5199\u771f\u3067\u8a66\u3057\u3066\u304f\u3060\u3055\u3044\u3002');\n      const scale = Math.min(1,2000/Math.max(width,height)), canvas = document.createElement('canvas');\n      canvas.width = Math.max(1,Math.round(width*scale)); canvas.height = Math.max(1,Math.round(height*scale));\n      const context = canvas.getContext('2d');\n      if (!context) throw Error('\u7aef\u672b\u3067\u5199\u771f\u3092\u5909\u63db\u3067\u304d\u307e\u305b\u3093\u3002\u5199\u771f\u3092\u7e2e\u5c0f\u3057\u3001JPEG\u3067\u9078\u3073\u76f4\u3057\u3066\u304f\u3060\u3055\u3044\u3002');\n      context.drawImage(image,0,0,canvas.width,canvas.height);\n      photoDiagnostic('canvas-draw','ok',null,{width:canvas.width,height:canvas.height});\n      photoDiagnostic('blob-encode','begin');\n      const blob = await new Promise(resolve => canvas.toBlob(resolve,'image/jpeg',.85));\n      if (!blob || !blob.size || blob.type !== 'image/jpeg') throw Error('\u5199\u771f\u306e\u5909\u63db\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002\u7e2e\u5c0f\u3057\u305fJPEG\u3067\u9078\u3073\u76f4\u3057\u3066\u304f\u3060\u3055\u3044\u3002');\n      if (blob.size > 8*1024*1024) throw Error('\u5909\u63db\u5f8c\u306e\u5199\u771f\u304c8MB\u3092\u8d85\u3048\u3066\u3044\u307e\u3059\u3002\u7e2e\u5c0f\u3057\u3066\u9078\u3073\u76f4\u3057\u3066\u304f\u3060\u3055\u3044\u3002');\n      photoDiagnostic('blob-encode','ok',null,{outputMime:blob.type,outputBytes:blob.size});\n      return blob;\n    } finally { image.removeAttribute('src'); URL.revokeObjectURL(url); }\n  }\n  let photoSelectionActive = false;\n  function photosSelected(event) {\n    const input = event.currentTarget, files = Array.from(input.files || []);\n    // Preserve the provider reference until every file has been read/processed.\n    // Ignore the paired input/change event while this selection is in flight.\n    if (photoSelectionActive || !files.length) return;\n    if (busy) { message('photoUploadMessage','\u51e6\u7406\u304c\u7d42\u308f\u3063\u3066\u304b\u3089\u3001\u5199\u771f\u3092\u9078\u3073\u76f4\u3057\u3066\u304f\u3060\u3055\u3044\u3002','error'); return; }\n    photoSelectionActive = true;\n    work(async () => {\n      capture(); let added = 0;\n      for (const [i,file] of files.entries()) {\n        photoTrace = crypto.randomUUID(); photoStarted = performance.now();\n        photoDiagnostic('selection','ok',null,{sourceMime:['image/jpeg','image/png','image/webp','image/heic','image/heif','application/octet-stream',''].includes(file.type)?file.type:'other',sourceBytes:file.size,android:/Android/.test(navigator.userAgent),fileReaderUsed:false});\n        try {\n          photoDiagnostic('file-validation','begin');\n          if (current.draft.images.length >= 10) throw Error('\u5199\u771f\u306f10\u679a\u307e\u3067\u3067\u3059\u3002\u4e0d\u8981\u306a\u5199\u771f\u3092\u5916\u3057\u3066\u304b\u3089\u8ffd\u52a0\u3057\u3066\u304f\u3060\u3055\u3044\u3002');\n          message('photoUploadMessage',`\u5199\u771f\u3092\u8aad\u307f\u8fbc\u3093\u3067\u3044\u307e\u3059\u2026\uff08${i+1}/${files.length}\uff09`,'loading');\n          const blob = await preparePhoto(file);\n          message('photoUploadMessage',`\u5199\u771f\u3092\u9001\u4fe1\u3057\u3066\u3044\u307e\u3059\u2026\uff08${i+1}/${files.length}\uff09`,'loading');\n          let result; photoDiagnostic('upload','begin');\n          let response;\n          try { response = await A.api('/api/admin/images',{method:'POST',headers:{'Content-Type':'image/jpeg',...(A.local?{'X-Yasoya-Photo-Trace':photoTrace}:{})},body:blob,signal:AbortSignal.timeout(20000)}); }\n          catch (error) { photoDiagnostic('upload','failed',error); throw Object.assign(Error(error.status ? `\u5199\u771f\u3092\u8ffd\u52a0\u3067\u304d\u307e\u305b\u3093\uff1a${error.message}` : '\u5199\u771f\u3092\u9001\u4fe1\u3067\u304d\u307e\u305b\u3093\u3002\u901a\u4fe1\u72b6\u614b\u3092\u78ba\u8a8d\u3057\u3001\u540c\u3058\u5199\u771f\u3092\u9078\u3073\u76f4\u3057\u3066\u304f\u3060\u3055\u3044\u3002'),{photoLogged:true}); }\n          photoDiagnostic('upload','ok',null,{httpStatus:response.status});\n          photoDiagnostic('response-parse','begin'); result = await response.json(); photoDiagnostic('response-parse','ok');\n          photoDiagnostic('response-validation','begin');\n          if (!/^[a-f0-9]{64}$/.test(result.id || '')) throw Error('\u5199\u771f\u306e\u4fdd\u5b58\u7d50\u679c\u3092\u78ba\u8a8d\u3067\u304d\u307e\u305b\u3093\u3002\u540c\u3058\u5199\u771f\u3092\u9078\u3073\u76f4\u3057\u3066\u304f\u3060\u3055\u3044\u3002');\n          if (!current.draft.images.includes(result.id)) { current.draft.images.push(result.id); added++; setDirty(true); }\n          photoDiagnostic('preview-fetch','begin'); await drawImages(result.id); await preview(result.id); photoDiagnostic('preview-fetch','ok'); photoDiagnostic('complete','ok');\n        } catch (error) { if (!error.photoLogged) photoDiagnostic(photoStage || 'unknown','failed',error); showPhotoDiagnostic(); throw error; }\n      }\n      message('photoUploadMessage',added ? `\u5199\u771f\u3092${added}\u679a\u8ffd\u52a0\u3057\u307e\u3057\u305f\u3002\u4e0b\u66f8\u304d\u3092\u4fdd\u5b58\u3059\u308b\u3068\u5546\u54c1\u306b\u53cd\u6620\u3055\u308c\u307e\u3059\u3002` : '\u9078\u629e\u3057\u305f\u5199\u771f\u306f\u8ffd\u52a0\u6e08\u307f\u3067\u3059\u3002');\n      $('photoGalleryTrack').scrollIntoView({block:'center',behavior:'instant'});\n    },'photoUploadMessage').finally(() => { input.value = ''; photoSelectionActive = false; });\n  }\n  $('imageFiles').addEventListener('input',photosSelected);\n  $('imageFiles').addEventListener('change',photosSelected);\n\n  async function inventory() {\n    const [stock,registered] = await Promise.all([data('/api/admin/inventory'),data('/api/admin/products')]); products = registered.products; inventoryRows = stock.inventory;\n    $('inventoryList').innerHTML = inventoryRows.map(r => { const p = products.find(p => p.id === r.productId), unknown = r.quantity === null, disabled = r.held || unknown || r.accessMode==='READ_ONLY'||r.canWriteInventory===false;\n      return `<article class=\"inventory-card\">${photo(p,'inventory-photo')}<div><p class=\"inventory-name\">${esc(r.name)}</p><p class=\"inventory-stock\">${unknown ? '\u2014' : r.quantity}<small>${unknown ? ' \u672a\u78ba\u8a8d' : ' \u500b'}</small> ${r.held ? '<span class=\"badge held\">\u8ca9\u58f2\u4fdd\u7559\u4e2d</span>' : unknown ? '<span class=\"badge draft\">\u672a\u5bfe\u5fdc</span>' : r.quantity <= 3 ? '<span class=\"badge draft\">\u5728\u5eab\u308f\u305a\u304b</span>' : '<span class=\"badge done\">\u78ba\u8a8d\u6e08\u307f</span>'}</p><p class=\"stock-meta\">\u53d6\u5f97\u5143\uff1a${esc(r.source==='local-mock'?'\u30ed\u30fc\u30ab\u30eb\u4ee3\u66ff\u30c7\u30fc\u30bf':r.source==='square-sandbox'?'Square Sandbox':r.source==='square-production'?'Square Production\uff08\u672c\u756a\uff09':'\u672a\u78ba\u8a8d')}${r.accessMode==='READ_ONLY'?'\uff08\u8aad\u307f\u53d6\u308a\u5c02\u7528\uff09':r.accessMode==='SANDBOX_MANAGEMENT'?'\uff08Sandbox\u7ba1\u7406\u66f8\u8fbc\u30fb\u8cfc\u5165\u505c\u6b62\uff09':''}<br>\u6700\u7d42\u53d6\u5f97 ${date(r.observedAt)}<br>\u540c\u671f\u72b6\u614b\uff1a${esc({held:'\u6574\u5408\u6027\u306e\u78ba\u8a8d\u304c\u5fc5\u8981',synced:r.source==='local-mock'?'\u4ee3\u66ff\u30c7\u30fc\u30bf\u53d6\u5f97\u6e08\u307f':r.source==='square-production'?'\u672c\u756a\u5728\u5eab\u53d6\u5f97\u6e08\u307f':'Sandbox\u5728\u5eab\u53d6\u5f97\u6e08\u307f',unmapped:'\u95a2\u9023\u4ed8\u3051\u304c\u5fc5\u8981'}[r.syncState] || r.syncState)}</p></div><div class=\"inventory-actions\">${['receipt','count','adjustment'].map((kind,i) => `<button class=\"${i ? 'secondary' : 'primary'} ${i === 2 ? 'adjustment' : ''}\" data-kind=\"${kind}\" data-id=\"${esc(r.id)}\" ${disabled ? 'disabled' : ''} aria-label=\"${esc(r.name)}\u306e${['\u5165\u5eab','\u68da\u5378\u3057','\u5897\u6e1b\u8abf\u6574'][i]}\">${['\u5165\u5eab','\u68da\u5378\u3057','\u5897\u6e1b\u8abf\u6574'][i]}</button>`).join('')}</div></article>`;\n    }).join('') || empty('\u5728\u5eab\u3092\u7ba1\u7406\u3059\u308b\u5546\u54c1\u304c\u3042\u308a\u307e\u305b\u3093\u3002\u307e\u305a\u5546\u54c1\u3092\u767b\u9332\u3057\u3066\u304f\u3060\u3055\u3044\u3002'); hydrate($('inventoryList'));\n  }\n  function stockPreview() {\n    if (!stockEdit) return; const raw = $('inventoryQuantity').value, n = Number(raw), after = stockEdit.kind === 'count' ? n : stockEdit.row.quantity + n;\n    $('inventoryAfter').textContent = raw !== '' && Number.isSafeInteger(n) && after >= 0 ? `${stockEdit.row.quantity}\u500b \u2192 ${after}\u500b` : '\u6570\u91cf\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002';\n  }\n  $('inventoryList').onclick = e => {\n    const b = e.target.closest('[data-kind]'); if (!b || busy || b.disabled) return;\n    const row = inventoryRows.find(r => r.id === b.dataset.id); stockEdit = {row:structuredClone(row),kind:b.dataset.kind};\n    const label = {receipt:'\u5165\u5eab',count:'\u68da\u5378\u3057',adjustment:'\u5897\u6e1b\u8abf\u6574'}[stockEdit.kind]; $('inventoryEditorTitle').textContent = label; $('inventoryProductName').textContent = row.name;\n    $('inventoryBefore').textContent = `\u78ba\u8a8d\u6642\u306e\u5728\u5eab\uff1a${row.quantity}\u500b / ${date(row.observedAt)}\u3002\u66f4\u65b0\u6642\u306b\u6700\u65b0\u5024\u3068\u7167\u5408\u3057\u307e\u3059\u3002`;\n    $('inventoryQuantityLabel').textContent = {receipt:'\u8ffd\u52a0\u3059\u308b\u500b\u6570',count:'\u6570\u3048\u305f\u6700\u7d42\u5728\u5eab\u6570',adjustment:'\u5897\u6e1b\u3059\u308b\u500b\u6570\uff08\u6e1b\u3089\u3059\u5834\u5408\u306f\u30de\u30a4\u30ca\u30b9\uff09'}[stockEdit.kind];\n    $('inventoryQuantity').min = stockEdit.kind === 'adjustment' ? '-100000' : stockEdit.kind === 'receipt' ? '1' : '0'; $('inventoryQuantity').value = ''; $('inventoryReason').value = ''; message('inventoryEditorMessage'); stockPreview(); $('inventoryEditor').showModal();\n  };\n  $('inventoryQuantity').oninput = stockPreview;\n  $('inventoryForm').onsubmit = e => { e.preventDefault(); if (busy || !stockEdit) return;\n    const quantity = Number($('inventoryQuantity').value), reason = $('inventoryReason').value.trim(), {row,kind} = stockEdit;\n    const target = kind === 'count' ? quantity : row.quantity + quantity;\n    if (!Number.isSafeInteger(quantity) || !Number.isSafeInteger(target) || target < 0 || quantity > 100000 || (kind === 'receipt' && quantity <= 0) || (kind === 'count' && quantity < 0) || !reason) { message('inventoryEditorMessage','\u6570\u91cf\u3068\u5909\u66f4\u7406\u7531\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002','error'); return; }\n    if (!confirm(`${row.name}\\n${{receipt:'\u5165\u5eab',count:'\u68da\u5378\u3057',adjustment:'\u5897\u6e1b\u8abf\u6574'}[kind]}\uff1a${row.quantity}\u500b \u2192 ${target}\u500b\\n\u7406\u7531\uff1a${reason}\\n\u3053\u306e\u5185\u5bb9\u3067\u66f4\u65b0\u3057\u307e\u3059\u304b\uff1f`)) return;\n    work(async () => {\n      const job = await write('/api/admin/inventory/' + row.id,{kind,quantity,reason,expectedQuantity:row.quantity,observedAt:row.observedAt});\n      $('inventoryEditor').close(); stockEdit = null; await inventory();\n      const text = job.state === 'done' ? `\u5728\u5eab\u3092\u66f4\u65b0\u3057\u307e\u3057\u305f\uff1a${row.quantity}\u500b \u2192 ${target}\u500b` : '\u5728\u5eab\u66f4\u65b0\u306f\u78ba\u8a8d\u4e2d\u3067\u3059\u3002\u8ca9\u58f2\u4fdd\u7559\u3068\u540c\u671f\u7d50\u679c\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002'; message('inventoryMessage',text); notify(text); await jobs();\n    },'inventoryEditorMessage');\n  };\n  $('closeInventory').onclick = () => { if (!busy) { $('inventoryEditor').close(); stockEdit = null; } };\n  $('inventoryEditor').addEventListener('cancel',e => { if (busy) e.preventDefault(); else stockEdit = null; });\n  $('jobList').onclick = e => { const b = e.target.closest('[data-retry],[data-reconcile]'); if (b) work(async () => { await data('/api/admin/jobs/' + (b.dataset.retry || b.dataset.reconcile) + '/' + (b.dataset.retry ? 'retry' : 'reconcile'),{method:'POST',body:'{}'}); await loadProducts(); notify('\u540c\u671f\u72b6\u614b\u3092\u66f4\u65b0\u3057\u307e\u3057\u305f\u3002'); }); };\n  $('reloadProducts').onclick = () => work(loadProducts); $('reloadInventory').onclick = () => work(inventory);\n  window.addEventListener('beforeunload',e => { if (dirty || busy) { e.preventDefault(); e.returnValue = ''; } });\n  window.addEventListener('pagehide',() => { for (const p of previews.values()) p.then(url => URL.revokeObjectURL(url)).catch(() => {}); previews.clear(); });\n})();\n"}, "/css/editorial-v41-home.css": {"sha256": "d3a6350dbf3d45df7ff213824d7bf31af1ca7c9099218cee77995d493036783a", "body": "#botanicalTrack .v39-botanical-link{touch-action:pan-y;-webkit-tap-highlight-color:transparent}#botanicalTrack .v19-slide:not(.v24-active) .v39-botanical-link{pointer-events:none}\n/* YASOYA UI 20261123: preserve artwork colors and compact HTML plant names. */\n#botanicalTrack .v19-slide>img{filter:none!important;object-fit:cover;background:transparent;transform:none!important}\n#botanicalTrack .v19-slide::before,#botanicalTrack .v19-slide::after{content:none!important;display:none!important}\n#botanicalTrack .v19-copy{display:none!important}\n#botanicalTrack .v19-center-name{position:absolute;top:50%;left:50%;width:calc(100% - 36px);margin:0;transform:translate(-50%,-50%);z-index:2;pointer-events:none;color:#fff;text-align:center;font:400 clamp(11px,1.05vw,15px)/1.65 Arial,sans-serif;letter-spacing:.20em;text-shadow:0 1px 3px rgba(0,0,0,.35);overflow-wrap:anywhere}\n.v20-link .shop-description{max-width:36rem;margin:1.5rem 0 0;font-size:1rem;line-height:2;letter-spacing:.04em}\n@media(max-width:700px){#botanicalTrack .v19-center-name{font-size:11px}}\n"}};
function yasoyaUiAssets(env){
 const assets=env.ASSETS;if(!assets)return env;
 return {...env,ASSETS:{async fetch(input,init){
  const req=input instanceof Request&&!init?input:new Request(input,init),path=new URL(req.url).pathname;
  const res=await assets.fetch(input,init);
  if(req.method!=="GET"||res.status!==200)return res;
  if(Object.hasOwn(YASOYA_UI_20261123,path)){
   const spec=YASOYA_UI_20261123[path],bytes=await res.arrayBuffer();
   const sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
   if(sha!==spec.sha256){const h=new Headers(res.headers);h.set('X-Yasoya-UI-Release','baseline-mismatch');return new Response(bytes,{status:res.status,headers:h});}
   const h=new Headers(res.headers);for(const k of ['content-length','content-encoding','etag'])h.delete(k);
   h.set('Cache-Control','no-store');h.set('X-Yasoya-UI-Release','20261123');
   return new Response(spec.body,{status:res.status,headers:h});
  }
  if(['/admin/','/admin/index.html'].includes(path)&&res.headers.get('content-type')?.includes('text/html')){
   return new HTMLRewriter().on('.photo-arrangement summary',{element(e){e.setInnerContent('写真の順序・トップページ表示用を編集');}}).on('.photo-section',{text(t){t.replace(t.text.replaceAll('「メインにする」で一覧の写真を選べます。','「トップページ表示用」で画像を選びます。指定画像は商品詳細には表示されません。商品詳細用の写真も登録してください。'));}}).transform(res);
  }
  return res;
 }}};
}

// production/storefront-worker.js
var csp = "default-src 'self'; script-src 'self' 'unsafe-inline' https://web.squarecdn.com; connect-src 'self' https://connect.squareup.com https://*.squareup.com https://web.squarecdn.com https://o160250.ingest.sentry.io; frame-src 'self' https://*.squareup.com https://web.squarecdn.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://web.squarecdn.com; font-src 'self' https://square-fonts-production-f.squarecdn.com https://d1g145x70srn7h.cloudfront.net https://fonts.gstatic.com https://web.squarecdn.com; img-src 'self' data: blob:; base-uri 'self'; form-action 'self' https://api.squareup.com; frame-ancestors 'none'";
var storefront_worker_default = { async fetch(request, env, ctx) {
  try {
    productionIdentity(env);
    env = yasoyaUiAssets(env);
    const url = new URL(request.url), admin = /^\/api\/admin(?:\/|$)/.test(url.pathname);
    if (admin) {
      if (url.origin !== env.PRODUCTION_ADMIN_ORIGIN) return new Response("Use the protected management origin", { status: 403 });
      return src_default.fetch(request, env, ctx);
    }
    if (/^https:\/\/yasoya-honten-payments\.[a-z0-9-]+\.workers\.dev$/.test(env.PRODUCTION_LEGACY_API_ORIGIN || "") && url.origin === env.PRODUCTION_LEGACY_API_ORIGIN && url.pathname.startsWith("/api/")) return src_default.fetch(request, env, ctx);
    if (url.origin !== env.SITE_URL) return new Response("Host rejected", { status: 403 });
    if (/^\/admin(?:\/|$)/.test(url.pathname)) return new Response("Not found", { status: 404 });
    let response;
    if (url.pathname === "/js/store-config.js") {
      if (!/^sq0idp-/.test(env.SQUARE_PRODUCTION_APPLICATION_ID || "")) throw new ProductionError("PRODUCTION_APPLICATION_INVALID", "Production Application ID is not configured");
      if (env.STOREFRONT_RETIRE_GOLDENROD === "1") await productionDatabase(env);
      const config = { environment: "production", managedStorefront: true, squareApplicationId: env.SQUARE_PRODUCTION_APPLICATION_ID, squareLocationId: env.SQUARE_LOCATION_ID, workerBaseUrl: url.origin, currency: "JPY" };
      response = new Response("window.YASOYA_STORE_CONFIG=Object.freeze(" + JSON.stringify(config) + ");window.YASOYA_RETIRED_VARIANT_IDS=" + JSON.stringify(await new Store(env).retiredVariantIds()) + ";", { headers: { "Content-Type": "application/javascript" } });
    } else if (url.pathname.startsWith("/api/")) response = await src_default.fetch(request, env, ctx);
    else if (!["GET", "HEAD"].includes(request.method)) response = new Response("Method not allowed", { status: 405 });
    else if (env.PRODUCTION_STOREFRONT_ENABLED !== "1") response = new Response("Storefront is not enabled", { status: 503 });
    else {
      await productionDatabase(env);
      response = await seoResource(request, env) || await renderV53(request, env);
      if (!response) response = legacyProductResponse(request, await env.ASSETS.fetch(request));
      if (/^\/(?:checkout|thanks)(?:\.html|\/)?$/.test(url.pathname)) response = noindex(response);
    }
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Content-Security-Policy", csp);
    return new Response(request.method === "HEAD" ? null : response.body, { status: response.status, headers });
  } catch (error) {
    return Response.json({ error: { code: error instanceof ProductionError ? error.code : "PRODUCTION_UNAVAILABLE", message: "\u51E6\u7406\u3092\u958B\u59CB\u3067\u304D\u307E\u305B\u3093\u3002\u7BA1\u7406\u8005\u306B\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002" } }, { status: error.status || 503, headers: { "Cache-Control": "no-store" } });
  }
} };
export {
  PurchaseCoordinator,
  storefront_worker_default as default
};
//# sourceMappingURL=storefront-worker.js.map
