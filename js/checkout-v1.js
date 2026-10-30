(() => {
    "use strict";

    const config = window.YASOYA_STORE_CONFIG;
    let card;
    const sandboxPage=config?.environment==='sandbox'&&config?.workerBaseUrl===location.origin;
    let cardStage='準備',cardViolation=null;
    function cardFeedback(text,state='loading'){const el=document.getElementById('cardInitializationStatus');if(el){el.textContent=text;if(el.dataset)el.dataset.state=state;}}
    document.addEventListener('securitypolicyviolation',event=>{
        if(!sandboxPage)return;
        let host;try{host=new URL(event.blockedURI).hostname;}catch{return;}
        if((host==='sandbox.web.squarecdn.com'||host.endsWith('.squareupsandbox.com'))&&['script-src-elem','script-src','style-src-elem','style-src','frame-src','connect-src','font-src'].includes(event.effectiveDirective))cardViolation=event.effectiveDirective;
    });
    function cardFailure(code,message){const error=new Error(message+' ［'+code+'／'+cardStage+'］');error.code=code;return error;}
    async function boundedCard(task){let timer;try{return await Promise.race([task,new Promise((_,reject)=>{timer=setTimeout(()=>reject(cardFailure('CARD_INIT_TIMEOUT','カード入力フォームの'+cardStage+'が時間内に完了しませんでした。通信・認証・CSPを確認して画面を再読み込みしてください。')),12000);})]);}finally{clearTimeout(timer);}}
    async function waitSquare(){
        if(sandboxPage&&[...document.scripts].some(script=>script.src==='https://web.squarecdn.com/v1/square.js'))throw cardFailure('CARD_SDK_ENVIRONMENT','Sandbox画面で本番SDKを検出したためカード初期化を停止しました。');
        if(window.Square?.payments)return;
        const sdk=[...document.scripts].find(script=>script.src==='https://sandbox.web.squarecdn.com/v1/square.js');
        if(!sandboxPage||!sdk||window.YASOYA_SQUARE_SDK_LOAD_FAILED)throw cardFailure('CARD_SDK_LOAD_FAILED','Square Sandbox SDKを読み込めませんでした。通信またはCSPによる遮断を確認してください。');
        await new Promise((resolve,reject)=>{let timer;const cleanup=()=>{clearTimeout(timer);sdk.removeEventListener('load',loaded);sdk.removeEventListener('error',failed);};const loaded=()=>{cleanup();window.Square?.payments?resolve():reject(cardFailure('CARD_SDK_UNAVAILABLE','Sandbox SDKの読み込み後に決済機能を確認できません。'));};const failed=()=>{cleanup();reject(cardFailure('CARD_SDK_LOAD_FAILED','Sandbox SDKの取得に失敗しました。通信またはCSPを確認してください。'));};sdk.addEventListener('load',loaded);sdk.addEventListener('error',failed);timer=setTimeout(()=>{cleanup();reject(cardFailure('CARD_SDK_TIMEOUT','Sandbox SDKの読み込みがタイムアウトしました。通信・CSPを確認して再読み込みしてください。'));},12000);});
    }
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
        if(!sandboxPage){if(!window.Square)throw new Error('Squareの決済画面を読み込めませんでした。');const payments=window.Square.payments(config.squareApplicationId,config.squareLocationId);const attached=await payments.card();await attached.attach('#card-container');card=attached;return;}
        let candidate;
        try{
            cardStage='SDK読み込み';cardFeedback('Square Sandboxのカード入力フォームを読み込んでいます…');
            if(sandboxPage&&(!config.squareApplicationId?.startsWith('sandbox-sq0idb-')||!config.squareLocationId||config.squareLocationId==='LQ693S4H2NBZ8'))throw cardFailure('CARD_SANDBOX_CONFIG','Sandbox用Application ID・Location IDを確認できません。');
            await waitSquare();
            cardStage='決済クライアント初期化';
            const payments=window.Square.payments(config.squareApplicationId,config.squareLocationId);
            cardStage='カードフォーム生成';cardFeedback('カード入力フォームを生成しています…');
            candidate=await boundedCard(payments.card());
            cardStage='カードフォーム表示';cardFeedback('カード入力フォームを表示しています…');
            await boundedCard(candidate.attach('#card-container'));
            if(sandboxPage&&!document.querySelector('#card-container iframe'))throw cardFailure('CARD_FORM_EMPTY','カードフォームを配置しましたが入力用iframeを確認できません。CSP・ブラウザの遮断を確認してください。');
            card=candidate;cardFeedback('Sandboxテスト用カード情報を入力してください。','ready');
        }catch(error){
            card=undefined;try{candidate?.destroy?.()?.catch?.(()=>{});}catch{}
            if(cardViolation)throw cardFailure('CARD_CSP_BLOCKED','CSPの'+cardViolation+'によりSquare Sandboxの表示が遮断されました。');
            if(typeof error?.code==='string'&&error.code.startsWith('CARD_'))throw error;
            const reasons={InvalidApplicationIdError:'Sandbox Application IDを確認してください。',InvalidLocationIdError:'Sandbox Location IDとApplication IDの組合せを確認してください。',PaymentMethodUnsupportedError:'このLocationでカード決済を利用できません。',BrowserNotSupportedError:'対応ブラウザで開き直してください。',SdkNotSupportedInsecureContextError:'HTTPSのステージングURLから開き直してください。',ElementNotFoundError:'カード入力欄を確認できません。画面を再読み込みしてください。'};
            throw cardFailure('CARD_INITIALIZATION_FAILED',cardStage+'に失敗しました。'+(reasons[error.name]||'Sandbox Application ID・Location IDの組合せ、通信・CSPを確認してください。'));
        }
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
        cardFeedback('購入設定・在庫を確認しています…');
        document.getElementById("paymentButton").disabled=true;

        if (!config?.workerBaseUrl || !config?.squareApplicationId || !config?.squareLocationId) {
            status.textContent = "決済設定を読み込めませんでした。";cardFeedback("決済設定を読み込めませんでした。Access認証後に画面を再読み込みしてください。",'error');
            document.getElementById("paymentButton").disabled = true;
            return;
        }

        document.getElementById('checkPaymentStatus')?.addEventListener('click',checkResult);
        document.getElementById('refreshCheckout')?.addEventListener('click',()=>{const url=new URL(location.href);url.searchParams.set('checkoutClient','v1');url.searchParams.set('refresh',String(Date.now()));location.replace(url.href);});
        try {
            const previous = await existingResult();
            if (previous) { complete(previous); return; }
            if(!(await refreshCapabilities()).checkoutEnabled){cardFeedback('購入受付が停止中のためカードフォームは初期化していません。','paused');return;}
            cardStage='商品・在庫確認';await loadQuote();
            await initializeSquare();
            document
                .getElementById("paymentForm")
                .addEventListener("submit", submitPayment);
            buttonState();
        } catch (error) {
            cardFeedback(typeof error?.code==='string'&&error.code.startsWith('CARD_')?error.message:cardStage+'を完了できず、カード入力を開始していません。'+(error.status?' HTTP '+error.status:' 通信・Cloudflare Access認証を確認して再読み込みしてください。'),'error');
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
