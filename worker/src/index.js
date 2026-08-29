import { CATALOG, SHIPPING, calculateShipping } from "./catalog.js";

const JSON_HEADERS = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
};

const MAX_BODY_BYTES = 24_000;
const MAX_ITEM_TYPES = 20;

export default {
    async fetch(request, env, ctx) {
        const origin = request.headers.get("Origin") || "";
        const allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS);

        if (request.method === "OPTIONS") {
            return corsResponse(null, 204, origin, allowedOrigins);
        }

        const url = new URL(request.url);

        try {
            if (request.method === "GET" && url.pathname === "/api/health") {
                return corsJson({
                    ok: true,
                    service: "YASOYA HONTEN PAYMENTS",
                    version: "2.0.0",
                    environment: env.SQUARE_ENVIRONMENT || "sandbox",
                    emailConfigured: Boolean(env.RESEND_API_KEY && env.RESEND_FROM_EMAIL)
                }, 200, origin, allowedOrigins);
            }

            
            if (request.method === "POST" && url.pathname === "/api/quote") {
    assertAllowedOrigin(origin, allowedOrigins);
    const body = await readJson(request);
    const quote = buildQuote(body.items);

    const inventory = await assertSquareInventoryAvailable(env, quote);

    return corsJson({
        ...quote,
        inventory
    }, 200, origin, allowedOrigins);
            }

            
            if (request.method === "POST" && url.pathname === "/api/payments") {
                assertAllowedOrigin(origin, allowedOrigins);
                const body = await readJson(request);

                const sourceId = requireString(body.sourceId, "決済トークンがありません。", 500);
                const contact = validateContact(body.contact);
                const quote = buildQuote(body.items);
                const orderReference = makeOrderReference();

                await assertSquareInventoryAvailable(env, quote);

                const payment = await createSquarePayment({
                    env,
                    sourceId,
                    quote,
                    contact,
                    orderReference
                });

                if (payment.status !== "COMPLETED") {
                    console.error("Unexpected Square payment status:", payment.status, payment.id);
                    throw new HttpError(502, "決済状態を確認できませんでした。お問い合わせください。");
                }

                let inventoryAdjusted = false;

try {
    await decrementSquareInventory({
        env,
        quote,
        orderReference,
        paymentId: payment.id
    });

    inventoryAdjusted = true;
} catch (inventoryError) {
    console.error(
        "CRITICAL: Payment completed but inventory adjustment failed:",
        {
            paymentId: payment.id,
            orderReference,
            error: inventoryError
        }
    );
}

                // メール失敗で決済自体を失敗扱いにしないため、レスポンス後に送信します。
                if (env.RESEND_API_KEY && env.RESEND_FROM_EMAIL) {
                    ctx.waitUntil(
                        sendOrderEmails({
                            env,
                            payment,
                            quote,
                            contact,
                            orderReference
                        }).catch((error) => {
                            console.error("Order email error:", error);
                        })
                    );
                } else {
                    console.warn("Email is not configured. RESEND_API_KEY or RESEND_FROM_EMAIL is missing.");
                }

                return corsJson({
                    ok: true,
                    paymentId: payment.id,
                    status: payment.status,
                    amount: quote.total,
                    orderReference,
                    inventoryAdjusted,
                    emailQueued: Boolean(env.RESEND_API_KEY && env.RESEND_FROM_EMAIL)
                }, 200, origin, allowedOrigins);
            }

            return corsJson({
                error: { message: "Not found." }
            }, 404, origin, allowedOrigins);
        } catch (error) {
            console.error(error);

            const status = error instanceof HttpError ? error.status : 500;
            const message = error instanceof HttpError
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

function buildQuote(rawItems) {
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
        const product = CATALOG[id];

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
        const product = CATALOG[id];

        return {
            id,
            name: product.name,
            unitPrice: product.price,
            quantity,
            lineTotal: product.price * quantity
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

function squareBaseUrl(env) {
    return (env.SQUARE_ENVIRONMENT || "sandbox") === "production"
        ? "https://connect.squareup.com"
        : "https://connect.squareupsandbox.com";
}


function squareHeaders(env) {
    if (!env.SQUARE_ACCESS_TOKEN) {
        throw new Error("SQUARE_ACCESS_TOKEN is missing.");
    }

    return {
        "Authorization": `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "Square-Version": env.SQUARE_API_VERSION || "2026-07-15"
    };
}


function getSquareVariationId(item) {
    const product = CATALOG[item.id];
    const variationId = String(product?.squareVariationId || "").trim();

    if (!variationId || variationId.startsWith("SET_SQUARE_VARIATION_ID_")) {
        throw new Error(`Square在庫連携が未設定です: ${item.id}`);
    }

    return variationId;
}


async function retrieveSquareInventory(env, quote) {
    if (!env.SQUARE_LOCATION_ID) {
        throw new Error("SQUARE_LOCATION_ID is missing.");
    }

    const requested = quote.items.map((item) => ({
        item,
        variationId: getSquareVariationId(item)
    }));

    const response = await fetch(
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
    paymentId
}) {
    if (!env.SQUARE_LOCATION_ID) {
        throw new Error("SQUARE_LOCATION_ID is missing.");
    }

    const occurredAt = new Date().toISOString();

    const changes = quote.items.map((item) => ({
        type: "ADJUSTMENT",
        adjustment: {
            reference_id: `${orderReference}:${paymentId}`.slice(0, 255),
            catalog_object_id: getSquareVariationId(item),
            from_state: "IN_STOCK",
            to_state: "SOLD",
            from_location_id: env.SQUARE_LOCATION_ID,
            to_location_id: env.SQUARE_LOCATION_ID,
            quantity: String(item.quantity),
            occurred_at: occurredAt
        }
    }));

    const response = await fetch(
        `${squareBaseUrl(env)}/v2/inventory/changes/batch-create`,
        {
            method: "POST",
            headers: squareHeaders(env),
            body: JSON.stringify({
                idempotency_key: `yh-inventory-${paymentId}`.slice(0, 128),
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

        throw new Error(
            result?.errors?.[0]?.detail ||
            result?.errors?.[0]?.code ||
            "Square inventory adjustment failed."
        );
    }

    return result;
}

async function createSquarePayment({ env, sourceId, quote, contact, orderReference }) {
    const baseUrl = squareBaseUrl(env);

    if (!env.SQUARE_ACCESS_TOKEN) {
        throw new Error("SQUARE_ACCESS_TOKEN is missing.");
    }

    if (!env.SQUARE_LOCATION_ID) {
        throw new Error("SQUARE_LOCATION_ID is missing.");
    }

    const requestBody = {
        source_id: sourceId,
        idempotency_key: crypto.randomUUID(),
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

    const response = await fetch(`${baseUrl}/v2/payments`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
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
    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${env.RESEND_API_KEY}`,
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
        headers.set("Access-Control-Allow-Headers", "Content-Type");
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

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
