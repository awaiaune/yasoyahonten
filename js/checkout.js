(() => {
    "use strict";

    const config = window.YASOYA_STORE_CONFIG;
    let card;
    let serverQuote;

    const money = new Intl.NumberFormat("ja-JP", {
        style: "currency",
        currency: "JPY",
        maximumFractionDigits: 0
    });

    function getCartPayload() {
        return window.YasoyaCart.read().map(({ id, quantity }) => ({
            id,
            quantity
        }));
    }

    async function api(path, options = {}) {
        const response = await fetch(`${config.workerBaseUrl}${path}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        });

        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
            const message =
                body?.error?.message ||
                body?.message ||
                "通信に失敗しました。";
            throw new Error(message);
        }

        return body;
    }

    async function loadQuote() {
        const items = getCartPayload();

        if (items.length === 0) {
            location.href = "products.html";
            return;
        }

        serverQuote = await api("/api/quote", {
            method: "POST",
            body: JSON.stringify({ items })
        });

        renderQuote(serverQuote);
    }

    function renderQuote(quote) {
        const itemsRoot = document.getElementById("checkoutSummaryItems");

        itemsRoot.innerHTML = quote.items.map((item) => `
            <div class="checkout-summary-line">
                <span>${escapeHtml(item.name)} × ${item.quantity}</span>
                <strong>${money.format(item.lineTotal)}</strong>
            </div>
        `).join("");

        document.getElementById("checkoutSubtotal").textContent =
            money.format(quote.subtotal);
        document.getElementById("checkoutShipping").textContent =
            money.format(quote.shipping);
        document.getElementById("checkoutTotal").textContent =
            money.format(quote.total);
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function formContact() {
        return {
            givenName: document.getElementById("givenName").value.trim(),
            familyName: document.getElementById("familyName").value.trim(),
            email: document.getElementById("email").value.trim(),
            phone: document.getElementById("phone").value.trim(),
            addressLines: [
                document.getElementById("address1").value.trim(),
                document.getElementById("address2").value.trim()
            ].filter(Boolean),
            city: document.getElementById("city").value.trim(),
            state: document.getElementById("state").value.trim(),
            postalCode: document.getElementById("postalCode").value.trim(),
            countryCode: "JP"
        };
    }

    async function initializeSquare() {
        if (!window.Square) {
            throw new Error("Squareの決済画面を読み込めませんでした。");
        }

        const payments = window.Square.payments(
            config.squareApplicationId,
            config.squareLocationId
        );

        card = await payments.card();
        await card.attach("#card-container");
    }

    async function submitPayment(event) {
        event.preventDefault();

        const form = event.currentTarget;
        const button = document.getElementById("paymentButton");
        const status = document.getElementById("paymentStatus");

        if (!serverQuote || !card || !form.reportValidity()) {
            return;
        }

        button.disabled = true;
        button.textContent = "PROCESSING";
        status.textContent = "";

        try {
            const contact = formContact();

            const verificationDetails = {
                amount: String(serverQuote.total),
                currencyCode: "JPY",
                intent: "CHARGE",
                customerInitiated: true,
                sellerKeyedIn: false,
                billingContact: contact
            };

            const tokenResult = await card.tokenize(verificationDetails);

            if (tokenResult.status !== "OK" || !tokenResult.token) {
                throw new Error(
                    tokenResult.errors?.[0]?.message ||
                    "カード情報を確認できませんでした。"
                );
            }

            const paymentResult = await api("/api/payments", {
                method: "POST",
                body: JSON.stringify({
                    sourceId: tokenResult.token,
                    items: getCartPayload(),
                    contact
                })
            });

            window.YasoyaCart.clear();

            const paymentId = encodeURIComponent(paymentResult.paymentId || "");
            const order = encodeURIComponent(paymentResult.orderReference || "");
            location.href = `thanks.html?payment=${paymentId}&order=${order}`;
        } catch (error) {
            console.error(error);
            status.textContent = error.message || "決済に失敗しました。";
            button.disabled = false;
            button.textContent = "PAY NOW";
        }
    }

    document.addEventListener("DOMContentLoaded", async () => {
        const status = document.getElementById("paymentStatus");

        if (!config?.workerBaseUrl || !config?.squareApplicationId || !config?.squareLocationId) {
            status.textContent = "決済設定を読み込めませんでした。";
            document.getElementById("paymentButton").disabled = true;
            return;
        }

        try {
            await loadQuote();
            await initializeSquare();
            document
                .getElementById("paymentForm")
                .addEventListener("submit", submitPayment);
        } catch (error) {
            console.error(error);
            status.textContent = error.message;
            document.getElementById("paymentButton").disabled = true;
        }
    });
})();
