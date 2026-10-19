(() => {
    "use strict";

    const config = window.YASOYA_STORE_CONFIG;
    let card;
    let serverQuote;
    let submitting = false;
    let completed = false;
    const ATTEMPT_KEY = "yasoya_checkout_attempt_v1";

    function attemptId() {
        let id = localStorage.getItem(ATTEMPT_KEY);
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem(ATTEMPT_KEY, id);
        }
        return id;
    }
    async function existingResult() {
        const id = localStorage.getItem(ATTEMPT_KEY);
        if (!id) return null;
        try { return await api("/api/payments/status", { method: "POST", body: JSON.stringify({ attemptId: id }) }); }
        catch (error) { if (error.status === 404) return null; throw error; }
    }
    function complete(result) {
        if (result?.status === "declined") {
            localStorage.removeItem(ATTEMPT_KEY);
            throw new Error("決済が完了しなかったことを確認しました。再度お試しください。");
        }
        if (!result?.ok) throw new Error("注文の処理状況を確認中です。再購入せず、この画面で再確認してください。");
        completed = true;
        window.YasoyaCart.clear();
        localStorage.removeItem(ATTEMPT_KEY);
        location.href = `thanks.html?payment=${encodeURIComponent(result.paymentId || "")}&order=${encodeURIComponent(result.orderReference || "")}`;
    }

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
            const error = new Error(message);
            error.status = response.status;
            throw error;
        }

        return body;
    }

    function showInventoryError(message) {
        const alert = document.getElementById("checkoutInventoryAlert");
        const messageRoot = document.getElementById("checkoutInventoryMessage");
        if (messageRoot) messageRoot.textContent = message;
        if (alert) alert.hidden = false;

        const cart = window.YasoyaCart.read();
        const itemsRoot = document.getElementById("checkoutSummaryItems");
        if (itemsRoot) {
            itemsRoot.innerHTML = cart.map((item) => `
                <div class="checkout-summary-line is-inventory-error">
                    <span>${escapeHtml(item.name)} × ${item.quantity}<small class="checkout-summary-inventory-note">在庫数を確認してください</small></span>
                    <strong>—</strong>
                </div>
            `).join("");
        }
        ["checkoutSubtotal", "checkoutShipping", "checkoutTotal"].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.textContent = "要確認";
        });
        const button = document.getElementById("paymentButton");
        if (button) button.disabled = true;
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

        if (completed || submitting || !serverQuote || !card || !form.reportValidity()) {
            return;
        }

        submitting = true;
        button.disabled = true;
        button.textContent = "PROCESSING";
        status.textContent = "";

        try {
            const previous = await existingResult();
            if (previous) { complete(previous); return; }
            const id = attemptId();
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
                    attemptId: id,
                    sourceId: tokenResult.token,
                    items: getCartPayload(),
                    contact
                })
            });

            complete(paymentResult);
        } catch (error) {
            console.error(error);
            status.textContent = error.message || "決済に失敗しました。";
            button.disabled = false;
            button.textContent = "PAY NOW";
        } finally {
            submitting = false;
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
            const previous = await existingResult();
            if (previous) { complete(previous); return; }
            await loadQuote();
            await initializeSquare();
            document
                .getElementById("paymentForm")
                .addEventListener("submit", submitPayment);
        } catch (error) {
            console.error(error);
            if (error.status === 409) {
                showInventoryError(error.message);
            } else {
                status.textContent = error.message;
                document.getElementById("paymentButton").disabled = true;
            }
        }
    });
})();
