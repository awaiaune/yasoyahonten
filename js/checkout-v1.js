(() => {
    "use strict";

    const config = window.YASOYA_STORE_CONFIG;
    let card;
    let serverQuote;
    let submitting = false;
    let completed = false;
    const ATTEMPT_KEY = "yasoya_checkout_attempt_v1";

    const META_KEY='yasoya_checkout_attempt_meta_v1';
    let capabilities=null;
    function metadata(id){try{const m=JSON.parse(localStorage.getItem(META_KEY)||'null');return m?.id===id&&['prepared','submitted'].includes(m.state)?m:{id,state:'submitted'};}catch{return {id,state:'submitted'};}}
    function remember(id,state){localStorage.setItem(META_KEY,JSON.stringify({id,state}));}
    function attemptId(){let id=localStorage.getItem(ATTEMPT_KEY);if(!id){id=crypto.randomUUID();localStorage.setItem(ATTEMPT_KEY,id);remember(id,'prepared');}return id;}
    function feedback(text){document.getElementById('paymentStatus').textContent=text;}
    function buttonState(){const id=localStorage.getItem(ATTEMPT_KEY),sent=id&&metadata(id).state==='submitted',button=document.getElementById('paymentButton');button.disabled=completed||submitting||!card||!serverQuote||!capabilities?.checkoutEnabled||Boolean(sent);button.textContent=sent?'処理状況を確認してください':capabilities?.checkoutEnabled?'PAY NOW':'ただいま購入受付を停止しています';const check=document.getElementById('checkPaymentStatus');if(check)check.hidden=!id;}
    async function refreshCapabilities(){
        capabilities=await api('/api/v1/checkout-capabilities');
        if(capabilities.contractVersion!==1||!Array.isArray(capabilities.supportedContracts)||!capabilities.supportedContracts.includes(1))throw new Error('購入画面とAPIの版が一致しません。画面を更新してください。');
        if(!capabilities.checkoutEnabled)feedback('ただいまWeb決済の受付を一時停止しています。受付済みの注文は「処理状況を確認」から確認できます。');
        buttonState();return capabilities;
    }
    async function existingResult(){
        const id=localStorage.getItem(ATTEMPT_KEY);if(!id)return null;
        try{return await api('/api/v1/payments/status',{method:'POST',body:JSON.stringify({attemptId:id,contractVersion:1})});}
        catch(error){if(error.status===404&&metadata(id).state==='prepared')return null;if(error.status===404)throw new Error('送信済み注文の結果を確認できません。再決済せず、同じ画面で処理状況を確認してください。');throw error;}
    }
    function complete(result){
        if(result?.status==='declined'){localStorage.removeItem(ATTEMPT_KEY);localStorage.removeItem(META_KEY);throw new Error('決済が完了しなかったことを確認しました。再度お試しください。');}
        if(!result?.ok||!result.paymentId||!result.orderReference)throw new Error('注文の処理状況を確認中です。再購入せず「処理状況を確認」を押してください。');
        completed=true;window.YasoyaCart.clear();localStorage.removeItem(ATTEMPT_KEY);localStorage.removeItem(META_KEY);
        location.href=`thanks.html?payment=${encodeURIComponent(result.paymentId)}&order=${encodeURIComponent(result.orderReference)}`;
    }
    async function checkResult(){if(submitting||completed)return;submitting=true;buttonState();try{const result=await existingResult();if(result)complete(result);else feedback('注文はまだ送信されていません。');}catch(error){feedback(error.message);}finally{submitting=false;buttonState();}}

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
            cache: "no-store",
            ...options,
            signal:options.signal||AbortSignal.timeout(15000),
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        });

        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
            const message =
                (path.endsWith('/checkout-capabilities')&&[404,426].includes(response.status)?'購入画面とAPIの版を確認できません。購入画面を更新してください。':'') ||
                body?.error?.message ||
                body?.message ||
                "通信に失敗しました。";
            const error = new Error(message);
            error.status = response.status;
            error.code = body.error?.code;
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

        serverQuote = await api("/api/v1/quote", {
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
            if(!(await refreshCapabilities()).checkoutEnabled)return;
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

            remember(id,'submitted');
            const paymentResult = await api("/api/v1/payments", {
                method: "POST",
                body: JSON.stringify({
                    contractVersion: 1,
                    attemptId: id,
                    sourceId: tokenResult.token,
                    items: getCartPayload(),
                    contact
                })
            });

            complete(paymentResult);
        } catch (error) {

            status.textContent = error.message || "決済に失敗しました。";
            if(error.code==='CHECKOUT_DISABLED'){const id=localStorage.getItem(ATTEMPT_KEY);if(id)remember(id,'prepared');capabilities={...capabilities,checkoutEnabled:false};}
        } finally {
            submitting = false;
            buttonState();
        }
    }

    document.addEventListener("DOMContentLoaded", async () => {
        const status = document.getElementById("paymentStatus");
        document.getElementById("paymentButton").disabled=true;

        if (!config?.workerBaseUrl || !config?.squareApplicationId || !config?.squareLocationId) {
            status.textContent = "決済設定を読み込めませんでした。";
            document.getElementById("paymentButton").disabled = true;
            return;
        }

        document.getElementById('checkPaymentStatus')?.addEventListener('click',checkResult);
        document.getElementById('refreshCheckout')?.addEventListener('click',()=>{const url=new URL(location.href);url.searchParams.set('checkoutClient','v1');url.searchParams.set('refresh',String(Date.now()));location.replace(url.href);});
        try {
            const previous = await existingResult();
            if (previous) { complete(previous); return; }
            if(!(await refreshCapabilities()).checkoutEnabled)return;
            await loadQuote();
            await initializeSquare();
            document
                .getElementById("paymentForm")
                .addEventListener("submit", submitPayment);
            buttonState();
        } catch (error) {

            if (error.status === 409) {
                showInventoryError(error.message);
            } else {
                status.textContent = error.message;
                document.getElementById("paymentButton").disabled = true;
            }
            const check=document.getElementById('checkPaymentStatus');if(check)check.hidden=!localStorage.getItem(ATTEMPT_KEY);
        }
    });
})();
