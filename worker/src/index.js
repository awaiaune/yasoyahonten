import { CATALOG, calculateShipping } from "./catalog.js";

const JSON_HEADERS = {
    "Content-Type": "application/json; charset=utf-8"
};

export default {
    async fetch(request, env) {
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
                    environment: env.SQUARE_ENVIRONMENT || "sandbox"
                }, 200, origin, allowedOrigins);
            }

            if (request.method === "POST" && url.pathname === "/api/quote") {
                assertAllowedOrigin(origin, allowedOrigins);
                const body = await readJson(request);
                const quote = buildQuote(body.items);
                return corsJson(quote, 200, origin, allowedOrigins);
            }

            if (request.method === "POST" && url.pathname === "/api/payments") {
                assertAllowedOrigin(origin, allowedOrigins);
                const body = await readJson(request);

                if (!body.sourceId || typeof body.sourceId !== "string") {
                    throw new HttpError(400, "決済トークンがありません。");
                }

                const quote = buildQuote(body.items);
                const payment = await createSquarePayment({
                    env,
                    sourceId: body.sourceId,
                    quote
                });

                return corsJson({
                    ok: true,
                    paymentId: payment.id,
                    status: payment.status,
                    amount: quote.total
                }, 200, origin, allowedOrigins);
            }

            return corsJson({ error: { message: "Not found." } }, 404, origin, allowedOrigins);
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

function parseAllowedOrigins(value = "") {
    return new Set(
        String(value)
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
    );
}

function assertAllowedOrigin(origin, allowedOrigins) {
    if (!origin || !allowedOrigins.has(origin)) {
        throw new HttpError(403, "このサイトからのリクエストは許可されていません。");
    }
}

function corsHeaders(origin, allowedOrigins) {
    const headers = new Headers(JSON_HEADERS);

    if (origin && allowedOrigins.has(origin)) {
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

async function readJson(request) {
    const contentType = request.headers.get("Content-Type") || "";

    if (!contentType.includes("application/json")) {
        throw new HttpError(415, "JSON形式で送信してください。");
    }

    try {
        return await request.json();
    } catch {
        throw new HttpError(400, "送信内容を読み取れませんでした。");
    }
}

function buildQuote(rawItems) {
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
        throw new HttpError(400, "カートが空です。");
    }

    if (rawItems.length > 20) {
        throw new HttpError(400, "商品の種類が多すぎます。");
    }

    const quantities = new Map();

    for (const rawItem of rawItems) {
        const id = String(rawItem?.id || "");
        const quantity = Number.parseInt(rawItem?.quantity, 10);
        const product = CATALOG[id];

        if (!product || !product.active) {
            throw new HttpError(400, "販売できない商品が含まれています。");
        }

        if (
            !Number.isInteger(quantity) ||
            quantity < 1 ||
            quantity > product.maxQuantity
        ) {
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

    if (total < 1) {
        throw new HttpError(400, "決済金額が正しくありません。");
    }

    return {
        currency: "JPY",
        items,
        subtotal,
        shipping,
        total
    };
}

async function createSquarePayment({ env, sourceId, quote }) {
    const environment = env.SQUARE_ENVIRONMENT || "sandbox";
    const baseUrl = environment === "production"
        ? "https://connect.squareup.com"
        : "https://connect.squareupsandbox.com";

    if (!env.SQUARE_ACCESS_TOKEN) {
        throw new Error("SQUARE_ACCESS_TOKEN is missing.");
    }

    if (!env.SQUARE_LOCATION_ID) {
        throw new Error("SQUARE_LOCATION_ID is missing.");
    }

    const idempotencyKey = crypto.randomUUID();

    const response = await fetch(`${baseUrl}/v2/payments`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
            "Square-Version": env.SQUARE_API_VERSION || "2026-07-15"
        },
        body: JSON.stringify({
            source_id: sourceId,
            idempotency_key: idempotencyKey,
            amount_money: {
                amount: quote.total,
                currency: "JPY"
            },
            location_id: env.SQUARE_LOCATION_ID,
            autocomplete: true,
            note: buildPaymentNote(quote)
        })
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

function buildPaymentNote(quote) {
    const itemText = quote.items
        .map((item) => `${item.name} x${item.quantity}`)
        .join(" / ");

    return `YASOYA HONTEN ONLINE STORE: ${itemText}`.slice(0, 500);
}

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
