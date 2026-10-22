import { enabled as managementEnabled, guard as managementGuard, ManagementError, squareId as managedSquareId } from './management/domain.js';
import { Management } from './management/service.js';
import { loadCatalog, Store as ManagementStore } from './management/store.js';
import { uploadImage, serveImage } from './management/images.js';
import { renderPage } from './management/storefront.js';
import { CATALOG, SHIPPING, calculateShipping } from "./catalog.js";
import { SANDBOX_CATALOG } from "../../validation/catalog.js";
import { PurchaseLedger, PurchaseError } from "./purchase-ledger.js";
import { assertSquareDestination, assertTestEmail } from "../../validation/safety.js";

const JSON_HEADERS = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
};

const MAX_BODY_BYTES = 24_000;
const MAX_ITEM_TYPES = 20;

export default {
    async scheduled(event,env,ctx) {
        if(!managementEnabled(env))return;
        await managementGuard(env);
        const id=env.PURCHASE_COORDINATOR.idFromName('yasoya-honten-global-purchase-lock');
        const r=await env.PURCHASE_COORDINATOR.get(id).fetch('https://purchase.internal/management-monitor',{method:'POST',body:'{}'});
        if(!r.ok)throw Error('Management watchdog requires review');
    },
    async fetch(request, env, ctx) {
        const origin = request.headers.get("Origin") || "";
        const allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS);

        if (request.method === "OPTIONS") {
            return corsResponse(null, 204, origin, allowedOrigins);
        }

        const url = new URL(request.url);

        try {
            if (managementEnabled(env)) {
                await managementGuard(env);
                if (url.pathname.startsWith('/api/admin/images')) {
                    await assertAdmin(request, env);
                    if(origin && request.method!=='GET') assertAllowedOrigin(origin,allowedOrigins);
                    if (request.method === 'POST' && url.pathname === '/api/admin/images') return corsJson(await uploadImage(request,env),200,origin,allowedOrigins);
                    if (request.method === 'GET' && /^\/api\/admin\/images\/[a-f0-9]{64}$/.test(url.pathname)) return await serveImage(url.pathname.split('/').pop(),env,true);
                    throw new ManagementError(405,'Method not allowed');
                }
                if (request.method==='GET' && /^\/api\/media\/[a-f0-9]{64}$/.test(url.pathname)) return await serveImage(url.pathname.split('/').pop(),env);
                if (/^\/api\/admin\/(products|inventory|jobs|audit)(\/|$)/.test(url.pathname)) {
                    await assertAdmin(request, env);
                    if(origin && request.method!=='GET') assertAllowedOrigin(origin,allowedOrigins);
                    if (!['GET','PUT','POST'].includes(request.method)) throw new ManagementError(405,'Method not allowed');
                    const payload=request.method==='GET'?{}:await readJson(request);
                    const id=env.PURCHASE_COORDINATOR.idFromName('yasoya-honten-global-purchase-lock');
                    const r=await env.PURCHASE_COORDINATOR.get(id).fetch('https://purchase.internal/management',{method:'POST',body:JSON.stringify({path:url.pathname,method:request.method,body:payload,actor:'authenticated-admin'})});
                    return corsJson(await r.json(),r.status,origin,allowedOrigins);
                }
                await loadCatalog(env);
                if(request.method==='GET' && !url.pathname.startsWith('/api/')) {const page=await renderPage(request,env);if(page)return page;}
                if(request.method==='GET'&&url.pathname==='/api/catalog') return corsJson({products:await new ManagementStore(env).publicProducts()},200,origin,allowedOrigins);
                if(request.method==='POST'&&['/api/inventory','/api/quote'].includes(url.pathname)) {
                    assertAllowedOrigin(origin,allowedOrigins);const body=await readJson(request);
                    const id=env.PURCHASE_COORDINATOR.idFromName('yasoya-honten-global-purchase-lock');
                    const r=await env.PURCHASE_COORDINATOR.get(id).fetch('https://purchase.internal/'+(url.pathname.endsWith('quote')?'managed-quote':'managed-stock'),{method:'POST',body:JSON.stringify(body)});
                    return corsJson(await r.json(),r.status,origin,allowedOrigins);
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
                    throw new HttpError(400, "在庫を確認する商品が正しくありません。");
                }

                const ids = [...new Set(rawIds.map((id) => String(id || "").trim()))];
                const items = ids.map((id) => {
                    const product = catalogFor(env)[id];
                    if (!product || !product.active) {
                        throw new HttpError(400, "販売できない商品が含まれています。");
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
                if(url.pathname==='/api/payments'&&managementEnabled(env)&&env.MANAGEMENT_CHECKOUT_PAUSED==='1')throw new HttpError(503,'新規注文を一時停止しています。既存注文の確認は継続できます。');
                const body = await readJson(request);
                if (!env.PURCHASE_COORDINATOR) {
                    throw new Error("PURCHASE_COORDINATOR binding is missing.");
                }
                // 全購入を1つのDurable Objectで直列化。
                // 「在庫確認→決済→在庫減算」が同時に走らないため、残り1点の二重販売を防ぎます。
                const id = env.PURCHASE_COORDINATOR.idFromName("yasoya-honten-global-purchase-lock");
                const stub = env.PURCHASE_COORDINATOR.get(id);
                const coordinated = await stub.fetch(url.pathname.endsWith("/status") ? "https://purchase.internal/status" : "https://purchase.internal/pay", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body)
                });
                const result = await coordinated.json().catch(() => ({}));
                if (!coordinated.ok) {
                    throw new HttpError(coordinated.status, result?.error?.message || "決済を完了できませんでした。");
                }
                return corsJson(result, coordinated.status, origin, allowedOrigins);
            }

            if (url.pathname.startsWith("/api/admin/")) {
                await assertAdmin(request, env);
                if (url.pathname === "/api/admin/payment-attempts" || /^\/api\/admin\/payment-attempts\/[a-f0-9-]+\/recover$/.test(url.pathname)) {
                    const id = env.PURCHASE_COORDINATOR.idFromName("yasoya-honten-global-purchase-lock");
                    const stub = env.PURCHASE_COORDINATOR.get(id);
                    const recovery = url.pathname.endsWith("/recover");
                    if ((recovery && request.method !== "POST") || (!recovery && request.method !== "GET")) throw new HttpError(405, "Method not allowed.");
                    const attemptId = recovery ? url.pathname.split("/")[4] : null;
                    const response = await stub.fetch(`https://purchase.internal/${recovery ? "recover" : "warnings"}`, {
                        method: "POST", body: JSON.stringify({ attemptId })
                    });
                    return corsJson(await response.json(), response.status, origin, allowedOrigins);
                }
                if (request.method === "GET" && url.pathname === "/api/admin/orders") {
                    const status = url.searchParams.get("status") || "pending";
                    return corsJson({ orders: await listOrders(env, status) }, 200, origin, allowedOrigins);
                }
                if (request.method === "GET" && url.pathname.startsWith("/api/admin/orders/")) {
                    const ref = decodeURIComponent(url.pathname.split("/").pop());
                    const order = await getOrder(env, ref);
                    if (!order) throw new HttpError(404, "注文が見つかりません。");
                    return corsJson({ order }, 200, origin, allowedOrigins);
                }
                if (request.method === "POST" && /\/api\/admin\/orders\/[^/]+\/ship$/.test(url.pathname)) {
                    const parts = url.pathname.split("/");
                    const ref = decodeURIComponent(parts[4]);
                    const body = await readJson(request);
                    const order = await getOrder(env, ref);
                    if (!order) throw new HttpError(404, "注文が見つかりません。");
                    if (order.status === "shipped") throw new HttpError(409, "この注文は発送済みです。");
                    const shippingMethod = requireString(body.shippingMethod, "発送方法を選択してください。", 80);
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

            const status = error instanceof HttpError || error instanceof ManagementError ? error.status : 500;
            const message = error instanceof HttpError || error instanceof ManagementError
                ? error.message
                : "サーバーで問題が発生しました。";

            return corsJson(
                { error: { message } },
                status,
                origin,
                allowedOrigins
            );
        }
    }
};

function catalogFor(env) {
    if (managementEnabled(env)) { if(!env.MANAGED_CATALOG) throw new ManagementError(503,"公開商品情報が未読込です。"); return env.MANAGED_CATALOG; }
    return env?.RUNTIME_TIER === "sandbox-validation" ? SANDBOX_CATALOG : CATALOG;
}

function buildQuote(rawItems, env) {
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
        throw new HttpError(400, "カートが空です。");
    }

    if (rawItems.length > MAX_ITEM_TYPES) {
        throw new HttpError(400, "商品の種類が多すぎます。");
    }

    const quantities = new Map();

    for (const rawItem of rawItems) {
        const id = String(rawItem?.id || "").trim();
        const quantity = Number.parseInt(rawItem?.quantity, 10);
        const product = catalogFor(env)[id];

        if (!product || !product.active) {
            throw new HttpError(400, "販売できない商品が含まれています。");
        }

        if (!Number.isInteger(quantity) || quantity < 1) {
            throw new HttpError(400, `${product.name}の数量が正しくありません。`);
        }

        const nextQuantity = (quantities.get(id) || 0) + quantity;

        if (nextQuantity > product.maxQuantity) {
            throw new HttpError(400, `${product.name}の購入上限を超えています。`);
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
            ...(managementEnabled(env) ? {squareVariationId:product.squareVariationId,revision:product.revision} : {})
        };
    });

    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const shipping = calculateShipping(subtotal);
    const total = subtotal + shipping;

    if (!Number.isSafeInteger(total) || total < 1) {
        throw new HttpError(400, "決済金額が正しくありません。");
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

function validateContact(rawContact) {
    if (!rawContact || typeof rawContact !== "object") {
        throw new HttpError(400, "お届け先を入力してください。");
    }

    const givenName = requireString(rawContact.givenName, "名を入力してください。", 80);
    const familyName = requireString(rawContact.familyName, "姓を入力してください。", 80);
    const email = requireString(rawContact.email, "メールアドレスを入力してください。", 255).toLowerCase();
    const phone = requireString(rawContact.phone, "電話番号を入力してください。", 40);
    const city = requireString(rawContact.city, "市区町村を入力してください。", 120);
    const state = requireString(rawContact.state, "都道府県を入力してください。", 80);
    const postalCode = requireString(rawContact.postalCode, "郵便番号を入力してください。", 20);
    const countryCode = String(rawContact.countryCode || "JP").toUpperCase();

    const rawAddressLines = Array.isArray(rawContact.addressLines)
        ? rawContact.addressLines
        : [];

    const addressLines = rawAddressLines
        .map((line) => String(line || "").trim())
        .filter(Boolean)
        .slice(0, 2);

    if (addressLines.length === 0) {
        throw new HttpError(400, "町名・番地を入力してください。");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new HttpError(400, "メールアドレスの形式を確認してください。");
    }

    if (!/^[0-9０-９+()（）.\-ー―−\s]{9,30}$/.test(phone)) {
        throw new HttpError(400, "電話番号の形式を確認してください。");
    }

    if (countryCode !== "JP") {
        throw new HttpError(400, "現在は日本国内への発送のみ対応しています。");
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

function squareToken(env) {
    return env.RUNTIME_TIER === "sandbox-validation" ? env.SQUARE_SANDBOX_ACCESS_TOKEN : env.SQUARE_ACCESS_TOKEN;
}
function resendKey(env) {
    return env.RUNTIME_TIER === "sandbox-validation" ? env.RESEND_VALIDATION_API_KEY : env.RESEND_API_KEY;
}
function squareBaseUrl(env) {
    return (env.SQUARE_ENVIRONMENT || "sandbox") === "production"
        ? "https://connect.squareup.com"
        : "https://connect.squareupsandbox.com";
}


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


function getSquareVariationId(item, env) {
    if(Number.isSafeInteger(item.revision)&&item.revision>0&&item.squareVariationId&&env.SQUARE_ENVIRONMENT==='sandbox'){ managedSquareId(item.squareVariationId);return item.squareVariationId; }
    if(managementEnabled(env)) { const id=item.squareVariationId||env.MANAGED_CATALOG?.[item.id]?.squareVariationId; if(!id) throw new ManagementError(503,"Square対応情報がありません。"); return id; }
    const product = catalogFor(env)[item.id];
    const override = env?.RUNTIME_TIER === "sandbox-validation" ? JSON.parse(env.SQUARE_VARIATION_IDS || "{}") : null;
    const variationId = String(override ? override[item.id] || "" : product?.squareVariationId || "").trim();

    if (!variationId || variationId.startsWith("SET_SQUARE_VARIATION_ID_")) {
        throw new Error(`Square在庫連携が未設定です: ${item.id}`);
    }

    return variationId;
}


async function squareFetch(env, url, options = {}) {
    assertSquareDestination(env, url);
    options = { ...options, signal: options.signal || AbortSignal.timeout(5000) };
    if (env.LOCAL_SQUARE) {
        if (env.LOCAL_TEST_MODE !== "1" || env.SQUARE_ENVIRONMENT !== "sandbox") throw new Error("Test Square binding is not allowed here.");
        return env.LOCAL_SQUARE.fetch(url, options);
    }
    return fetch(url, options);
}

async function lookupSquarePayment(env, record) {
    if (record.payment?.id) {
        const response = await squareFetch(env, `${squareBaseUrl(env)}/v2/payments/${encodeURIComponent(record.payment.id)}`, { headers: squareHeaders(env) });
        if (!response.ok) throw new Error("Payment lookup unavailable");
        return (await response.json()).payment;
    }
    // Square has no assumed 'retrieve by idempotency key' endpoint. Absence from this
    // bounded scan is NOT proof of no charge: keep unknown and never charge again.
    let cursor; const matches = []; const deadline = Date.now() + 5000;
    for (let page = 0; page < 20; page++) {
        if (Date.now() >= deadline) throw new Error("Payment reconciliation time budget exceeded");
        const query = new URLSearchParams({ begin_time: new Date(Date.parse(record.createdAt) - 300000).toISOString(), limit: "100" });
        if (cursor) query.set("cursor", cursor);
        const response = await squareFetch(env, `${squareBaseUrl(env)}/v2/payments?${query}`, { headers: squareHeaders(env), signal: AbortSignal.timeout(Math.max(1, Math.min(2000, deadline - Date.now()))) });
        if (!response.ok) throw new Error("Payment reconciliation unavailable");
        const result = await response.json();
        matches.push(...(result.payments || []).filter(p => p.reference_id === record.orderReference));
        cursor = result.cursor;
        if (!cursor) {
            if (matches.length > 1) throw new Error("Multiple matching payments");
            return matches[0] || null;
        }
    }
    throw new Error("Payment reconciliation scan incomplete");
}

async function retrieveSquareInventory(env, quote) {
    if (!env.SQUARE_LOCATION_ID) {
        throw new Error("SQUARE_LOCATION_ID is missing.");
    }

    const requested = quote.items.map((item) => ({
        item,
        variationId: getSquareVariationId(item, env)
    }));

    const response = await squareFetch(env,
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
            "在庫情報を確認できませんでした。時間をおいてもう一度お試しください。"
        );
    }

    const stockByVariationId = new Map();

    for (const count of result.counts || []) {
        if (
            count.state === "IN_STOCK" &&
            count.location_id === env.SQUARE_LOCATION_ID
        ) {
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


async function assertSquareInventoryAvailable(env, quote) {
    const inventory = await retrieveSquareInventory(env, quote);

    for (const stock of inventory) {
        if (stock.availableQuantity < stock.requestedQuantity) {
            if (stock.availableQuantity <= 0) {
                throw new HttpError(
                    409,
                    `${stock.name}は現在売り切れです。`
                );
            }

            throw new HttpError(
                409,
                `${stock.name}の在庫は残り${stock.availableQuantity}点です。数量を変更してください。`
            );
        }
    }

    return inventory.map((stock) => ({
        id: stock.id,
        availableQuantity: stock.availableQuantity
    }));
}


async function decrementSquareInventory({
    env,
    quote,
    orderReference,
    paymentId,
    inventoryOperation
}) {
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

    const response = await squareFetch(env,
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

    if (
        !response.ok ||
        (Array.isArray(result.errors) && result.errors.length > 0)
    ) {
        console.error("Square inventory adjustment error:", result);

        const error = new Error("Square inventory adjustment failed.");
        error.permanent = response.status === 409;
        throw error;
    }

    return result;
}

async function createSquarePayment({ env, sourceId, quote, contact, orderReference, paymentKey }) {
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
            ...(contact.addressLines[1]
                ? { address_line_2: contact.addressLines[1] }
                : {}),
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

    if (!response.ok || !result.payment) {
        console.error("Square error:", result);

        const squareMessage =
            result?.errors?.[0]?.detail ||
            result?.errors?.[0]?.code ||
            "Squareで決済を完了できませんでした。";

        throw new HttpError(400, squareMessage);
    }

    return result.payment;
}

async function sendOrderEmails({ env, payment, quote, contact, orderReference }) {
    const adminEmail = env.ORDER_NOTIFICATION_EMAIL || "yasoyahonten@gmail.com";
    const replyTo = env.REPLY_TO_EMAIL || adminEmail;
    const siteUrl = env.SITE_URL || "https://yasoyahonten.awaiaune.com";
    const dateText = formatJapanDate(payment.created_at || new Date().toISOString());

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

    const results = await Promise.allSettled([
        sendResendEmail(env, {
            from: env.RESEND_FROM_EMAIL,
            to: [adminEmail],
            reply_to: contact.email,
            subject: `【八草屋本店】新しいご注文 ${orderReference}`,
            html: adminMail.html,
            text: adminMail.text
        }, `admin-${payment.id}`),

        sendResendEmail(env, {
            from: env.RESEND_FROM_EMAIL,
            to: [contact.email],
            reply_to: replyTo,
            subject: `ご注文ありがとうございます｜八草屋本店 ${orderReference}`,
            html: customerMail.html,
            text: customerMail.text
        }, `customer-${payment.id}`)
    ]);

    for (const result of results) {
        if (result.status === "rejected") {
            console.error("Resend delivery failed:", result.reason);
        }
    }
}

async function sendResendEmail(env, payload, idempotencyKey) {
    assertTestEmail(env, payload);
    const transport = env.LOCAL_RESEND ? (url, options) => {
        if (env.LOCAL_TEST_MODE !== "1" || env.SQUARE_ENVIRONMENT !== "sandbox") throw new Error("Test Resend binding is not allowed here.");
        return env.LOCAL_RESEND.fetch(url, options);
    } : fetch;
    const response = await transport("https://api.resend.com/emails", {
        signal: AbortSignal.timeout(5000),
        method: "POST",
        headers: {
            "Authorization": `Bearer ${resendKey(env)}`,
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey.slice(0, 256)
        },
        body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            result?.message ||
            result?.error?.message ||
            `Resend error (${response.status})`
        );
    }

    return result;
}

function buildAdminEmail({ paymentId, orderReference, dateText, quote, contact }) {
    const itemsHtml = quote.items.map((item) => `
        <tr>
            <td style="padding:10px 0;border-bottom:1px solid #e7e1d6;">${escapeHtml(item.name)}</td>
            <td style="padding:10px 0;border-bottom:1px solid #e7e1d6;text-align:center;">${item.quantity}</td>
            <td style="padding:10px 0;border-bottom:1px solid #e7e1d6;text-align:right;">${formatMoney(item.lineTotal)}</td>
        </tr>
    `).join("");

    const itemsText = quote.items
        .map((item) => `・${item.name} × ${item.quantity}　${formatMoney(item.lineTotal)}`)
        .join("\n");

    const address = formatAddress(contact);

    return {
        html: emailShell(`
            <p style="margin:0 0 24px;font-size:18px;">新しいご注文が入りました。</p>
            <p style="margin:0 0 8px;"><strong>注文番号：</strong>${escapeHtml(orderReference)}</p>
            <p style="margin:0 0 8px;"><strong>Square Payment ID：</strong>${escapeHtml(paymentId)}</p>
            <p style="margin:0 0 28px;"><strong>注文日時：</strong>${escapeHtml(dateText)}</p>

            <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
                <thead>
                    <tr>
                        <th style="padding:8px 0;text-align:left;border-bottom:1px solid #22231f;">商品</th>
                        <th style="padding:8px 0;text-align:center;border-bottom:1px solid #22231f;">数量</th>
                        <th style="padding:8px 0;text-align:right;border-bottom:1px solid #22231f;">金額</th>
                    </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
            </table>

            ${totalsHtml(quote)}

            <h2 style="margin:32px 0 14px;font-size:15px;letter-spacing:.08em;">お届け先</h2>
            <p style="margin:0;line-height:1.9;">
                ${escapeHtml(contact.familyName)} ${escapeHtml(contact.givenName)} 様<br>
                ${escapeHtml(address)}<br>
                電話：${escapeHtml(contact.phone)}<br>
                メール：${escapeHtml(contact.email)}
            </p>
        `),
        text: `新しいご注文が入りました。\n\n注文番号：${orderReference}\nSquare Payment ID：${paymentId}\n注文日時：${dateText}\n\n【商品】\n${itemsText}\n\n小計：${formatMoney(quote.subtotal)}\n送料：${formatMoney(quote.shipping)}\n合計：${formatMoney(quote.total)}\n\n【お届け先】\n${contact.familyName} ${contact.givenName} 様\n${address}\n電話：${contact.phone}\nメール：${contact.email}`
    };
}

function buildCustomerEmail({ paymentId, orderReference, dateText, quote, contact, siteUrl }) {
    const itemsHtml = quote.items.map((item) => `
        <tr>
            <td style="padding:10px 0;border-bottom:1px solid #e7e1d6;">${escapeHtml(item.name)} × ${item.quantity}</td>
            <td style="padding:10px 0;border-bottom:1px solid #e7e1d6;text-align:right;">${formatMoney(item.lineTotal)}</td>
        </tr>
    `).join("");

    const itemsText = quote.items
        .map((item) => `・${item.name} × ${item.quantity}　${formatMoney(item.lineTotal)}`)
        .join("\n");

    const address = formatAddress(contact);

    return {
        html: emailShell(`
            <p style="margin:0 0 22px;line-height:2;">
                ${escapeHtml(contact.familyName)} ${escapeHtml(contact.givenName)} 様<br><br>
                このたびは八草屋本店をご利用いただき、ありがとうございます。<br>
                以下の内容でご注文を承りました。
            </p>

            <p style="margin:0 0 8px;"><strong>注文番号：</strong>${escapeHtml(orderReference)}</p>
            <p style="margin:0 0 26px;"><strong>注文日時：</strong>${escapeHtml(dateText)}</p>

            <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
                <tbody>${itemsHtml}</tbody>
            </table>

            ${totalsHtml(quote)}

            <h2 style="margin:32px 0 14px;font-size:15px;letter-spacing:.08em;">お届け先</h2>
            <p style="margin:0 0 28px;line-height:1.9;">
                ${escapeHtml(contact.familyName)} ${escapeHtml(contact.givenName)} 様<br>
                ${escapeHtml(address)}
            </p>

            <p style="margin:0 0 28px;line-height:2;">
                発送準備が整いましたら、改めてご案内いたします。<br>
                商品がお手元に届くまで、しばらくお待ちください。
            </p>

            <p style="margin:0;color:#6d6f68;font-size:12px;line-height:1.8;">
                Square Payment ID：${escapeHtml(paymentId)}<br>
                <a href="${escapeHtml(siteUrl)}" style="color:#22231f;">${escapeHtml(siteUrl)}</a>
            </p>
        `),
        text: `${contact.familyName} ${contact.givenName} 様\n\nこのたびは八草屋本店をご利用いただき、ありがとうございます。\n以下の内容でご注文を承りました。\n\n注文番号：${orderReference}\n注文日時：${dateText}\n\n【ご注文内容】\n${itemsText}\n\n小計：${formatMoney(quote.subtotal)}\n送料：${formatMoney(quote.shipping)}\n合計：${formatMoney(quote.total)}\n\n【お届け先】\n${contact.familyName} ${contact.givenName} 様\n${address}\n\n発送準備が整いましたら、改めてご案内いたします。\n商品がお手元に届くまで、しばらくお待ちください。\n\n八草屋本店\n${siteUrl}\nSquare Payment ID：${paymentId}`
    };
}

function emailShell(content) {
    return `<!doctype html>
<html lang="ja">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f0e7;color:#22231f;font-family:'Hiragino Mincho ProN','Yu Mincho',serif;">
    <div style="max-width:640px;margin:0 auto;padding:42px 22px;">
        <div style="padding:34px 26px;background:#f8f5ee;border:1px solid #ded8cc;">
            <p style="margin:0 0 28px;text-align:center;letter-spacing:.18em;">
                <strong style="font-size:16px;">八草屋本店</strong><br>
                <span style="font-size:10px;letter-spacing:.24em;color:#6d6f68;">YASOYA HONTEN</span>
            </p>
            ${content}
        </div>
    </div>
</body>
</html>`;
}

function totalsHtml(quote) {
    return `
        <div style="margin-left:auto;max-width:280px;">
            <p style="display:flex;justify-content:space-between;margin:8px 0;"><span>小計</span><strong>${formatMoney(quote.subtotal)}</strong></p>
            <p style="display:flex;justify-content:space-between;margin:8px 0;"><span>送料</span><strong>${formatMoney(quote.shipping)}</strong></p>
            <p style="display:flex;justify-content:space-between;margin:16px 0 0;padding-top:16px;border-top:1px solid #22231f;font-size:17px;"><span>合計</span><strong>${formatMoney(quote.total)}</strong></p>
        </div>
    `;
}

function makeOrderReference() {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(now);

    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const date = `${values.year}${values.month}${values.day}`;
    const random = crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();

    return `YH-${date}-${random}`;
}

function buildPaymentNote(quote) {
    const itemText = quote.items
        .map((item) => `${item.name} x${item.quantity}`)
        .join(" / ");

    return `YASOYA HONTEN ONLINE STORE: ${itemText}`.slice(0, 500);
}

function formatAddress(contact) {
    const postal = normalizePostalCode(contact.postalCode);
    return `〒${postal} ${contact.state}${contact.city}${contact.addressLines.join(" ")}`;
}

function normalizePostalCode(value) {
    return String(value)
        .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
        .trim();
}

function normalizeJapanesePhone(value) {
    const ascii = String(value)
        .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
        .replace(/[^0-9+]/g, "");

    if (/^\+81\d{9,10}$/.test(ascii)) {
        return ascii;
    }

    if (/^0\d{9,10}$/.test(ascii)) {
        return `+81${ascii.slice(1)}`;
    }

    // Squareの形式条件を満たさない電話番号は決済リクエストに含めません。
    return "";
}

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

function formatMoney(amount) {
    return new Intl.NumberFormat("ja-JP", {
        style: "currency",
        currency: "JPY",
        maximumFractionDigits: 0
    }).format(amount);
}

function requireString(value, message, maxLength) {
    const text = String(value || "").trim();

    if (!text) {
        throw new HttpError(400, message);
    }

    if (text.length > maxLength) {
        throw new HttpError(400, "入力内容が長すぎます。");
    }

    return text;
}

async function readJson(request) {
    const contentType = request.headers.get("Content-Type") || "";

    if (!contentType.includes("application/json")) {
        throw new HttpError(415, "JSON形式で送信してください。");
    }

    const contentLength = Number(request.headers.get("Content-Length") || 0);
    if (contentLength > MAX_BODY_BYTES) {
        throw new HttpError(413, "送信内容が大きすぎます。");
    }

    try {
        return await request.json();
    } catch {
        throw new HttpError(400, "送信内容を読み取れませんでした。");
    }
}

function parseAllowedOrigins(value = "") {
    return new Set(
        String(value)
            .split(",")
            .map((item) => item.trim().replace(/\/$/, ""))
            .filter(Boolean)
    );
}

function assertAllowedOrigin(origin, allowedOrigins) {
    if (!origin || !allowedOrigins.has(origin.replace(/\/$/, ""))) {
        throw new HttpError(403, "このサイトからのリクエストは許可されていません。");
    }
}

function corsHeaders(origin, allowedOrigins) {
    const headers = new Headers(JSON_HEADERS);
    const normalizedOrigin = origin.replace(/\/$/, "");

    if (normalizedOrigin && allowedOrigins.has(normalizedOrigin)) {
        headers.set("Access-Control-Allow-Origin", origin);
        headers.set("Vary", "Origin");
        headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
        headers.set("Access-Control-Max-Age", "86400");
    }

    return headers;
}

function corsResponse(body, status, origin, allowedOrigins) {
    return new Response(body, {
        status,
        headers: corsHeaders(origin, allowedOrigins)
    });
}

function corsJson(data, status, origin, allowedOrigins) {
    return corsResponse(
        JSON.stringify(data),
        status,
        origin,
        allowedOrigins
    );
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


async function ensureOrdersTable(env) {
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

async function saveOrder(env, { payment, quote, contact, orderReference, inventoryAdjusted }) {
    await ensureOrdersTable(env);
    await env.ORDERS_DB.prepare(`INSERT OR IGNORE INTO orders
        (order_reference,payment_id,created_at,status,subtotal,shipping,total,items_json,contact_json,inventory_adjusted)
        VALUES (?,?,?,?,?,?,?,?,?,?)`)
        .bind(orderReference, payment.id, payment.created_at || new Date().toISOString(), "pending",
            quote.subtotal, quote.shipping, quote.total, JSON.stringify(quote.items), JSON.stringify(contact), inventoryAdjusted ? 1 : 0)
        .run();
    const row = await env.ORDERS_DB.prepare("SELECT payment_id FROM orders WHERE order_reference=?").bind(orderReference).first();
    if (row?.payment_id !== payment.id) throw new Error("Order/payment projection conflict");
    await env.ORDERS_DB.prepare("UPDATE orders SET inventory_adjusted=? WHERE order_reference=? AND payment_id=?")
        .bind(inventoryAdjusted ? 1 : 0, orderReference, payment.id).run();
}

function rowToOrder(row) {
    if (!row) return null;
    return { ...row, items: JSON.parse(row.items_json || "[]"), contact: JSON.parse(row.contact_json || "{}"), inventoryAdjusted: Boolean(row.inventory_adjusted) };
}

async function listOrders(env, status) {
    await ensureOrdersTable(env);
    const wanted = status === "shipped" ? "shipped" : "pending";
    const { results = [] } = await env.ORDERS_DB.prepare(`SELECT * FROM orders WHERE status=? ORDER BY created_at DESC LIMIT 200`).bind(wanted).all();
    return results.map(rowToOrder);
}

async function getOrder(env, ref) {
    await ensureOrdersTable(env);
    return rowToOrder(await env.ORDERS_DB.prepare(`SELECT * FROM orders WHERE order_reference=?`).bind(ref).first());
}

async function markOrderShipped(env, ref, shippingMethod, trackingNumber) {
    await ensureOrdersTable(env);
    await env.ORDERS_DB.prepare(`UPDATE orders SET status='shipped', shipping_method=?, tracking_number=?, shipped_at=? WHERE order_reference=?`)
        .bind(shippingMethod, trackingNumber || null, new Date().toISOString(), ref).run();
}

async function assertAdmin(request, env) {
    const token = env.RUNTIME_TIER === "sandbox-validation" ? env.VALIDATION_ADMIN_TOKEN : env.ADMIN_TOKEN;
    if (!token) throw new Error("ADMIN_TOKEN secret is missing.");
    const auth = request.headers.get("Authorization") || "";
    if(auth.length>8192) throw new HttpError(401,"管理者認証が必要です。");
    const encode=new TextEncoder();const [a,b]=await Promise.all([crypto.subtle.digest('SHA-256',encode.encode(auth)),crypto.subtle.digest('SHA-256',encode.encode(`Bearer ${token}`))]);
    let mismatch=0;const x=new Uint8Array(a),y=new Uint8Array(b);for(let i=0;i<x.length;i++)mismatch|=x[i]^y[i];
    if(mismatch) throw new HttpError(401, "管理者認証が必要です。");
}

async function sendShippingEmail(env, order, shippingMethod, trackingNumber) {
    if (!resendKey(env) || !env.RESEND_FROM_EMAIL) {
        throw new HttpError(503, "メール送信設定がありません。");
    }

    const c = order.contact;
    const siteUrl = env.SITE_URL || "https://yasoyahonten.awaiaune.com";
    const trackingHtml = trackingNumber
        ? `<p style="margin:0 0 8px;"><strong>お問い合わせ番号：</strong>${escapeHtml(trackingNumber)}</p>`
        : "";
    const trackingText = trackingNumber
        ? `\nお問い合わせ番号：${trackingNumber}`
        : "";

    const html = emailShell(`
        <p style="margin:0 0 22px;line-height:2;">
            ${escapeHtml(c.familyName)} ${escapeHtml(c.givenName)} 様<br><br>
            このたびは八草屋本店をご利用いただき、ありがとうございます。<br>
            ご注文の商品を発送いたしました。
        </p>

        <p style="margin:0 0 8px;"><strong>注文番号：</strong>${escapeHtml(order.order_reference)}</p>
        <p style="margin:0 0 8px;"><strong>発送方法：</strong>${escapeHtml(shippingMethod)}</p>
        ${trackingHtml}

        <p style="margin:28px 0;line-height:2;">
            商品がお手元に届くまで、今しばらくお待ちください。
        </p>

        <p style="margin:0;color:#6d6f68;font-size:12px;line-height:1.8;">
            <a href="${escapeHtml(siteUrl)}" style="color:#22231f;">${escapeHtml(siteUrl)}</a>
        </p>
    `);

    const text = `${c.familyName} ${c.givenName} 様\n\nこのたびは八草屋本店をご利用いただき、ありがとうございます。\nご注文の商品を発送いたしました。\n\n注文番号：${order.order_reference}\n発送方法：${shippingMethod}${trackingText}\n\n商品がお手元に届くまで、今しばらくお待ちください。\n\n八草屋本店\nYASOYA HONTEN\n${siteUrl}`;

    await sendResendEmail(
        env,
        {
            from: env.RESEND_FROM_EMAIL,
            to: [c.email],
            reply_to: env.REPLY_TO_EMAIL || env.ORDER_NOTIFICATION_EMAIL,
            subject: `商品を発送しました｜八草屋本店 ${order.order_reference}`,
            html,
            text
        },
        `shipping-${order.payment_id}`
    );
}

export class PurchaseCoordinator {
    constructor(ctx, env) {
        this.ctx = ctx; this.env = env; this.queue = Promise.resolve();
        this.ledger = new PurchaseLedger(ctx.storage, {
            location: env.SQUARE_LOCATION_ID,
            validate: body => {
                requireString(body.sourceId, "決済トークンがありません。", 500);
                body.attemptId = validateAttemptId(body.attemptId);
                const quote = buildQuote(body.items, env);
                quote.items.sort((a, b) => a.id.localeCompare(b.id));
                return { quote, stockKeys: quote.items.map(item => `${env.SQUARE_LOCATION_ID}:${getSquareVariationId(item, env)}`), contact: validateContact(body.contact) };
            },
            stockKeys: quote => quote.items.map(item => `${env.SQUARE_LOCATION_ID}:${getSquareVariationId(item, env)}`),
            notify: async record => {
                if (!resendKey(env) || !env.RESEND_FROM_EMAIL || !env.ORDER_NOTIFICATION_EMAIL) return false;
                await sendResendEmail(env, {
                    from: env.RESEND_FROM_EMAIL, to: [env.ORDER_NOTIFICATION_EMAIL],
                    subject: `【要確認】注文 ${record.orderReference}`,
                    text: `注文番号: ${record.orderReference}\n状態: ${record.warning}\n対象: ${record.quote.items.map(i => i.id).join(", ")}\n再課金せず管理者APIで状況を確認してください。`
                }, `purchase-review-${record.id}`);
                return true;
            },
            reference: makeOrderReference,
            stock: async quote => { if(managementEnabled(env)){ const manager=new Management(env,this.ctx.storage);await manager.s.assertUnlocked(quote.items.map(i=>i.id));await manager.assertSalesCatalog(quote); } return assertSquareInventoryAvailable(env, quote); },
            charge: (record, sourceId) => createSquarePayment({ env, ...record, sourceId }),
            lookup: record => lookupSquarePayment(env, record),
            decrement: record => decrementSquareInventory({ env, ...record, paymentId: record.payment.id }),
            project: record => saveOrder(env, { ...record, inventoryAdjusted: record.inventory === "applied" }),
            email: async record => {
                if (resendKey(env) && env.RESEND_FROM_EMAIL) {
                    this.ctx.waitUntil(sendOrderEmails({ env, ...record }).catch(() => console.error("Order email delivery requires review")));
                    return true;
                }
                return false;
            }
        });
    }
    management() {
        const env=this.env;
        const notify=resendKey(env)&&env.RESEND_FROM_EMAIL&&env.ORDER_NOTIFICATION_EMAIL?async(payload,key)=>{
            await managementGuard(env);
            await sendResendEmail(env,{from:env.RESEND_FROM_EMAIL,to:[env.ORDER_NOTIFICATION_EMAIL],
                subject:'【管理同期・要確認】八草屋本店',
                text:`管理同期ジョブ: ${payload.jobId}\n種類: ${payload.kind}\n対象: ${payload.resourceId}\n検出: ${payload.event}\n新しい操作IDで再送せず、管理画面で照合してください。`},key);
            return true;
        }:undefined;
        return new Management(env,this.ctx.storage,{notify});
    }
    serialize(action,{catalog=true}={}) {
        const guarded=async()=>{if(managementEnabled(this.env)){
            await managementGuard(this.env);
            if(!this.managementStarted){try{await this.management().supervision.tick({run:false});this.managementStarted=true;}catch{console.error('Management startup scan requires watchdog review');}}
            if(catalog)await loadCatalog(this.env);
        }return action();};
        const job = this.queue.then(guarded, guarded);
        this.queue = job.catch(() => {});
        return job;
    }
    async fetch(request) {
        const body = await request.json().catch(() => ({}));
        const path = new URL(request.url).pathname;
        return this.serialize(async () => {
            try {
                let result;
                if(managementEnabled(this.env)&&path==='/management-monitor'){await this.management().recover();return Response.json({ok:true});}
                if(managementEnabled(this.env)&&path==='/management') return Response.json(await this.management().handle(body.path,body.method,body.body,body.actor));
                if(managementEnabled(this.env)&&['/managed-stock','/managed-quote'].includes(path)) {
                    const manager=new Management(this.env,this.ctx.storage);
                    if(path==='/managed-quote'){const quote=buildQuote(body.items,this.env);await manager.s.assertUnlocked(quote.items.map(i=>i.id));await manager.assertSalesCatalog(quote);await manager.assertNoPurchaseHold(quote.items.map(i=>i.id));return Response.json({...quote,inventory:await assertSquareInventoryAvailable(this.env,quote)});}
                    if(!Array.isArray(body.ids)||!body.ids.length||body.ids.length>20)throw new ManagementError(400,'商品IDが正しくありません。');
                    const catalog=catalogFor(this.env),ids=[...new Set(body.ids)];if(!ids.every(id=>catalog[id]))throw new ManagementError(400,'商品がありません。');
                    const rows=await manager.inventory();return Response.json({inventory:ids.map(id=>{const r=rows.find(r=>r.id===id);return {id,name:catalog[id].name,availableQuantity:catalog[id].active&&!r?.held?(r?.quantity||0):0};})});
                }
                if (path === "/warnings") result = { attempts: await this.ledger.warnings() };
                else if (path === "/status" || path === "/recover") {
                    body.attemptId = validateAttemptId(body.attemptId);
                    result = await this.ledger.recover(body.attemptId, path === "/recover");
                } else result = await this.ledger.submit(body);
                return Response.json(result, { status: result.attemptId && !result.ok ? 202 : 200 });
            } catch (error) {
                const status = error instanceof HttpError || error instanceof PurchaseError || error instanceof ManagementError ? error.status : 503;
                return Response.json({ error: { message: status === 503 ? "注文の処理状況を確認してください。同じ注文番号で再確認できます。" : error.message } }, { status });
            }
        },{catalog:path!=='/management-monitor'});
    }
    alarm() { return this.serialize(async () => { try{if(managementEnabled(this.env))await loadCatalog(this.env);await this.ledger.alarm();}finally{if(managementEnabled(this.env))await this.management().recover();} },{catalog:false}); }
}
function validateAttemptId(id) {
    if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
        throw new HttpError(400, "注文処理番号がありません。画面を更新して確認してください。");
    }
    return id.toLowerCase();
}

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
