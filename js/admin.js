(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const config = window.YASOYA_STORE_CONFIG;
  const base = typeof config?.workerBaseUrl === 'string' ? config.workerBaseUrl.replace(/\/$/, '') : '';
  const local = config?.squareApplicationId === 'sandbox-local-only';
  const money = n => new Intl.NumberFormat('ja-JP', {style:'currency',currency:'JPY',maximumFractionDigits:0}).format(n);
  const date = s => s && Number.isFinite(Date.parse(s)) ? new Intl.DateTimeFormat('ja-JP', {dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Tokyo'}).format(new Date(s)) : '未確認';
  const pendingWrites = new Map();
  let token = sessionStorage.getItem('yasoyaAdminToken') || '', current = 'pending', orderGeneration = 0, loggingIn = false, shipping = false, toastTimer;
  function message(id, text = '', state = 'success') { $(id).textContent = text; $(id).dataset.state = state; }
  function notify(text, state = 'success') { clearTimeout(toastTimer); message('toast', text, state); $('toast').hidden = false; toastTimer = setTimeout(() => $('toast').hidden = true, 6000); }
  let localCsrfRequest;
  async function photoCsrfToken() {
    // The absolute origin is rendered from trusted server-side Codespaces metadata.
    // Never fetch a nonce from a different page origin or persist it in storage.
    if (!config?.localCsrfOrigin || config.localCsrfOrigin !== location.origin) return undefined;
    if (!localCsrfRequest) localCsrfRequest = (async () => {
      const r = await fetch(config.localCsrfOrigin+'/api/admin/local-csrf',{method:'GET',headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(10000)});
      if (!r.ok) throw Error('管理画面の安全な送信設定を取得できません。正しいCodespaceのPrivate URLから開き直してください。');
      const result = await r.json(); if (!/^[a-f0-9]{64}$/.test(result.token || '')) throw Error('送信設定を確認できません。管理画面を再読み込みしてください。');
      return result.token;
    })().catch(error => { localCsrfRequest = undefined; throw error; });
    return localCsrfRequest;
  }
  async function api(path, options = {}) {
    if (!base) throw Error('管理APIの設定がありません。接続先を確認してください。');
    if (!token) throw Error('先にログインしてください。');
    const headers = {Authorization:'Bearer ' + token, ...(typeof options.body === 'string' ? {'Content-Type':'application/json'} : {}), ...options.headers};
    const productWrite = options.method === 'PUT' && /^\/api\/admin\/products\/[a-z0-9][a-z0-9-]{0,79}$/.test(path) || options.method === 'POST' && /^\/api\/admin\/products\/[a-z0-9][a-z0-9-]{0,79}\/publish$/.test(path);
    if (local && (path === '/api/admin/images' || productWrite)) {
      const csrf = await photoCsrfToken(); if (csrf) headers['X-Yasoya-Local-CSRF'] = csrf;
      // Diagnostic only. Do not send the page URL, and never use this hint as authorization.
      try {
        const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(location.origin));
        headers['X-Yasoya-Page-Origin-SHA256'] = [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2,'0')).join('');
        headers['X-Yasoya-API-Same-Origin'] = new URL(base + path,location.href).origin === location.origin ? '1' : '0';
      } catch { /* Missing diagnostics must not prevent a normal upload. */ }
    }
    const recovery = /^\/api\/admin\/jobs\/[a-f0-9-]+(?:\/(?:adopt-current|reconcile))?$/.test(path)||/^\/api\/admin\/products\/[a-z0-9-]+\/release$/.test(path);
    if(recovery&&location.origin==='https://staging.awaiaune.com'&&new URL(base+path,location.href).origin!==location.origin){const error=Error('同期復旧APIの接続先が管理画面と異なります。送信を停止しました。管理画面を再読み込みしてください。');error.code='ADMIN_RECOVERY_ORIGIN';throw error;}
    let response;
    try {
      response = await fetch(base + path, {...options, headers,...(recovery?{credentials:'same-origin',redirect:'manual',signal:options.signal||AbortSignal.timeout(20000)}:{})});
    } catch (cause) {
      if(!recovery)throw cause;
      const error=Error((cause.name==='TimeoutError'||cause.name==='AbortError'?'管理APIの応答が時間内に届きませんでした。':'管理APIのHTTP応答を受信できませんでした（通信切断・Access認証・ブラウザによる遮断の可能性）。')+' 自動再送はしていません。');
      error.code=cause.name==='TimeoutError'||cause.name==='AbortError'?'ADMIN_RECOVERY_TIMEOUT':'ADMIN_RECOVERY_NETWORK';error.requestMethod=options.method||'GET';error.requestPath=path;throw error;
    }
    if(recovery&&(response.type==='opaqueredirect'||response.status>=300&&response.status<400)){
      const error=Error('Cloudflare Accessの認証画面への移動が必要です。管理画面を新しいタブで開いて再認証し、読み取り診断で状態を確認してください。');error.code='ADMIN_ACCESS_REDIRECT';throw error;
    }

    if(recovery&&response.ok&&!/json/i.test(response.headers.get('Content-Type')||'')){const error=Error('管理APIからJSON以外の応答が返されました。Access認証を確認して管理画面を開き直してください。');error.code='ADMIN_RECOVERY_NON_JSON';error.status=response.status;throw error;}
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const error = Error(data.error?.message || (recovery?'管理APIからエラー応答を受信しました。自動再送はしていません。':'処理できませんでした。再試行してください。')); error.status = response.status;
      if(recovery){error.code=/^[A-Z0-9_]{1,80}$/.test(data.error?.code||'')?data.error.code:'ADMIN_RECOVERY_HTTP';error.actionStage=['read-proof','check-holds','commit','read-result'].includes(data.error?.stage)?data.error.stage:undefined;}
      if (local && productWrite) {
        const allowed = (value,list,fallback) => list.includes(value) ? value : fallback;
        const type = response.headers.get('Content-Type') || '';
        error.productDiagnostic = {
          httpStatus:response.status,
          responseKind:/json/i.test(type)?'json':/html/i.test(type)?'html':/text/i.test(type)?'text':'other',
          serverCode:allowed(data.error?.code,['LOCAL_HOST_ORIGIN_DENIED','LOCAL_BODY_TOO_LARGE','LOCAL_PRODUCT_FAILED'],'UNCLASSIFIED_RESPONSE'),
          serverStage:allowed(response.headers.get('X-Yasoya-Product-Stage'),['access','body-read','dispatch','response-read','response-write'],'unavailable'),
          accessReason:allowed(data.error?.reason,['HOST_MISSING','HOST_NOT_ALLOWED','ORIGIN_NULL','ORIGIN_MALFORMED','ORIGIN_NOT_ALLOWED','HOST_ORIGIN_PAIR_NOT_ALLOWED','INVALID_TARGET'],'unavailable'),
          originMatch:allowed(data.error?.originMatch,['missing','malformed','loopback','not-configured','expected','wrong-scheme','wrong-port','different-forwarded-port','different-codespace','unsupported-host-form','different-domain','loopback-wrong-scheme','loopback-wrong-port'],'unavailable')
        };
      }
      if (local && path === '/api/admin/images') {
        const type = response.headers.get('Content-Type') || '';
        error.photoResponse = /json/i.test(type) ? 'json' : /html/i.test(type) ? 'html' : /text/i.test(type) ? 'text' : 'other';
        const code = data.error?.code;
        error.photoCode = ['LOCAL_HOST_ORIGIN_DENIED','LOCAL_BODY_TOO_LARGE','LOCAL_UPLOAD_FAILED'].includes(code) ? code : 'UNCLASSIFIED_RESPONSE';
        const stage = response.headers.get('X-Yasoya-Photo-Stage');
        error.photoServerStage = ['access','body-read','dispatch','response-read','response-write'].includes(stage) ? stage : 'unavailable';
        const reason = data.error?.reason, hostClass = data.error?.hostClass, originClass = data.error?.originClass;
        if (['HOST_MISSING','HOST_NOT_ALLOWED','ORIGIN_NULL','ORIGIN_MALFORMED','ORIGIN_NOT_ALLOWED','HOST_ORIGIN_PAIR_NOT_ALLOWED','INVALID_TARGET'].includes(reason)) error.photoAccessReason = reason;
        if (['missing','loopback-port','loopback-no-port','codespace','other'].includes(hostClass)) error.photoHostClass = hostClass;
        if (['missing','null','loopback','codespace','other'].includes(originClass)) error.photoOriginClass = originClass;
        if (['codespaces','loopback'].includes(data.error?.configurationMode)) error.photoConfigurationMode = data.error.configurationMode;
        if (['missing','malformed','loopback','not-configured','expected','wrong-scheme','wrong-port','different-forwarded-port','different-codespace','unsupported-host-form','different-domain','loopback-wrong-scheme','loopback-wrong-port'].includes(data.error?.originMatch)) error.photoOriginMatch = data.error.originMatch;
        const evidence = data.error?.originEvidence;
        if (evidence && ['missing','valid','invalid'].includes(evidence.hintState)) {
          error.photoOriginEvidence = {hintState:evidence.hintState};
          for (const key of ['pageMatchesExpected','pageMatchesReceivedOrigin','apiMatchesPage']) if (typeof evidence[key] === 'boolean' || evidence[key] === null) error.photoOriginEvidence[key] = evidence[key];
        }
      }
      throw error;
    }
    return response;
  }
  const data = async (path, options) => (await api(path, options)).json();
  // Official enum allowlists: keep raw details, identifiers and unknown strings out of the DOM.
  const diagnosticCodes = new Set(["INTERNAL_SERVER_ERROR", "UNAUTHORIZED", "ACCESS_TOKEN_EXPIRED", "ACCESS_TOKEN_REVOKED", "CLIENT_DISABLED", "FORBIDDEN", "INSUFFICIENT_SCOPES", "APPLICATION_DISABLED", "V1_APPLICATION", "V1_ACCESS_TOKEN", "CARD_PROCESSING_NOT_ENABLED", "MERCHANT_SUBSCRIPTION_NOT_FOUND", "BAD_REQUEST", "MISSING_REQUIRED_PARAMETER", "INCORRECT_TYPE", "INVALID_TIME", "INVALID_TIME_RANGE", "INVALID_VALUE", "INVALID_CURSOR", "UNKNOWN_QUERY_PARAMETER", "CONFLICTING_PARAMETERS", "EXPECTED_JSON_BODY", "INVALID_SORT_ORDER", "VALUE_REGEX_MISMATCH", "VALUE_TOO_SHORT", "VALUE_TOO_LONG", "VALUE_TOO_LOW", "VALUE_TOO_HIGH", "VALUE_EMPTY", "ARRAY_LENGTH_TOO_LONG", "ARRAY_LENGTH_TOO_SHORT", "ARRAY_EMPTY", "EXPECTED_BOOLEAN", "EXPECTED_INTEGER", "EXPECTED_FLOAT", "EXPECTED_STRING", "EXPECTED_OBJECT", "EXPECTED_ARRAY", "EXPECTED_MAP", "EXPECTED_BASE64_ENCODED_BYTE_ARRAY", "INVALID_ARRAY_VALUE", "INVALID_ENUM_VALUE", "INVALID_CONTENT_TYPE", "INVALID_FORM_VALUE", "CUSTOMER_NOT_FOUND", "ONE_INSTRUMENT_EXPECTED", "NO_FIELDS_SET", "TOO_MANY_MAP_ENTRIES", "MAP_KEY_LENGTH_TOO_SHORT", "MAP_KEY_LENGTH_TOO_LONG", "CUSTOMER_MISSING_NAME", "CUSTOMER_MISSING_EMAIL", "INVALID_PAUSE_LENGTH", "INVALID_DATE", "UNSUPPORTED_COUNTRY", "UNSUPPORTED_CURRENCY", "APPLE_TTP_PIN_TOKEN", "CARD_EXPIRED", "INVALID_EXPIRATION", "INVALID_EXPIRATION_YEAR", "INVALID_EXPIRATION_DATE", "UNSUPPORTED_CARD_BRAND", "UNSUPPORTED_ENTRY_METHOD", "INVALID_ENCRYPTED_CARD", "INVALID_CARD", "PAYMENT_AMOUNT_MISMATCH", "GENERIC_DECLINE", "CVV_FAILURE", "ADDRESS_VERIFICATION_FAILURE", "INVALID_ACCOUNT", "CURRENCY_MISMATCH", "INSUFFICIENT_FUNDS", "INSUFFICIENT_PERMISSIONS", "CARDHOLDER_INSUFFICIENT_PERMISSIONS", "INVALID_LOCATION", "TRANSACTION_LIMIT", "VOICE_FAILURE", "PAN_FAILURE", "EXPIRATION_FAILURE", "CARD_NOT_SUPPORTED", "READER_DECLINED", "INVALID_PIN", "MISSING_PIN", "MISSING_ACCOUNT_TYPE", "INVALID_POSTAL_CODE", "INVALID_FEES", "MANUALLY_ENTERED_PAYMENT_NOT_SUPPORTED", "PAYMENT_LIMIT_EXCEEDED", "GIFT_CARD_AVAILABLE_AMOUNT", "ACCOUNT_UNUSABLE", "BUYER_REFUSED_PAYMENT", "DELAYED_TRANSACTION_EXPIRED", "DELAYED_TRANSACTION_CANCELED", "DELAYED_TRANSACTION_CAPTURED", "DELAYED_TRANSACTION_FAILED", "CARD_TOKEN_EXPIRED", "CARD_TOKEN_USED", "AMOUNT_TOO_HIGH", "AMOUNT_TOO_LOW", "UNSUPPORTED_INSTRUMENT_TYPE", "REFUND_AMOUNT_INVALID", "REFUND_ALREADY_PENDING", "PAYMENT_NOT_REFUNDABLE", "PAYMENT_NOT_REFUNDABLE_DUE_TO_DISPUTE", "REFUND_ERROR_PAYMENT_NEEDS_COMPLETION", "REFUND_DECLINED", "INSUFFICIENT_PERMISSIONS_FOR_REFUND", "INVALID_CARD_DATA", "SOURCE_USED", "SOURCE_EXPIRED", "UNSUPPORTED_LOYALTY_REWARD_TIER", "LOCATION_MISMATCH", "ORDER_UNPAID_NOT_RETURNABLE", "PARTIAL_PAYMENT_DELAY_CAPTURE_NOT_SUPPORTED", "IDEMPOTENCY_KEY_REUSED", "UNEXPECTED_VALUE", "SANDBOX_NOT_SUPPORTED", "INVALID_EMAIL_ADDRESS", "INVALID_PHONE_NUMBER", "CHECKOUT_EXPIRED", "BAD_CERTIFICATE", "INVALID_SQUARE_VERSION_FORMAT", "API_VERSION_INCOMPATIBLE", "CARD_PRESENCE_REQUIRED", "UNSUPPORTED_SOURCE_TYPE", "CARD_MISMATCH", "PLAID_ERROR", "PLAID_ERROR_ITEM_LOGIN_REQUIRED", "PLAID_ERROR_RATE_LIMIT", "PLAID_ERROR_INVALID_ACCESS_TOKEN", "PLAID_ERROR_INVALID_ACCOUNT_ID", "PLAID_ERROR_NO_ACCOUNTS", "PLAID_ERROR_ITEM_NOT_FOUND", "PLAID_ERROR_INSUFFICIENT_CREDENTIALS", "PLAID_ERROR_ITEM_NOT_SUPPORTED", "PLAID_ERROR_PRODUCT_NOT_READY", "PAYMENT_SOURCE_NOT_ENABLED_FOR_TARGET", "CARD_DECLINED", "VERIFY_CVV_FAILURE", "VERIFY_AVS_FAILURE", "CARD_DECLINED_CALL_ISSUER", "CARD_DECLINED_VERIFICATION_REQUIRED", "BAD_EXPIRATION", "CHIP_INSERTION_REQUIRED", "ALLOWABLE_PIN_TRIES_EXCEEDED", "RESERVATION_DECLINED", "UNKNOWN_BODY_PARAMETER", "CART_INELIGIBLE_FOR_EBT", "NOT_FOUND", "APPLE_PAYMENT_PROCESSING_CERTIFICATE_HASH_NOT_FOUND", "METHOD_NOT_ALLOWED", "NOT_ACCEPTABLE", "REQUEST_TIMEOUT", "CONFLICT", "GONE", "REQUEST_ENTITY_TOO_LARGE", "UNSUPPORTED_MEDIA_TYPE", "UNPROCESSABLE_ENTITY", "RATE_LIMITED", "NOT_IMPLEMENTED", "BAD_GATEWAY", "SERVICE_UNAVAILABLE", "TEMPORARY_ERROR", "GATEWAY_TIMEOUT"]);
  const diagnosticCategories = new Set(["API_ERROR", "AUTHENTICATION_ERROR", "INVALID_REQUEST_ERROR", "RATE_LIMIT_ERROR", "PAYMENT_METHOD_ERROR", "REFUND_ERROR", "MERCHANT_SUBSCRIPTION_ERROR", "EXTERNAL_VENDOR_ERROR"]);
  function paymentDiagnostic(failure) {
    const reasons={three_ds_required:'本人認証（3Dセキュア）が必要',card_declined:'カード会社による拒否',card_invalid:'カード情報の確認が必要',token_invalid:'決済トークンが無効・期限切れ',authentication:'決済認証設定の確認が必要',location:'Location設定の確認が必要',request_invalid:'決済要求の確認が必要',provider_unavailable:'決済サービスの応答を確認できない',unknown:'原因不明'};
    const reason=typeof failure?.classification==='string'&&Object.hasOwn(reasons,failure.classification)?reasons[failure.classification]:reasons.unknown;
    const codes=Array.isArray(failure?.codes)?failure.codes.filter(c=>diagnosticCodes.has(c)).slice(0,8):[];
    const categories=Array.isArray(failure?.categories)?failure.categories.filter(c=>diagnosticCategories.has(c)).slice(0,8):[];
    const http=Number.isInteger(failure?.httpStatus)&&failure.httpStatus>=100&&failure.httpStatus<=599?String(failure.httpStatus):'未確認';
    const source={create:'決済作成応答',lookup:'照会応答',payment:'保存記録',legacy:'旧保存記録'};
    return esc(reason+' ／ HTTP '+http+'（'+(Object.hasOwn(source,failure?.source||'')?source[failure.source]:'取得元未確認')+'） ／ コード：'+(codes.join('・')||'原因不明')+' ／ 分類：'+(categories.join('・')||'未確認'));
  }
  let checkingPaymentAttempts = false;
  async function checkPaymentAttempts() {
    if (checkingPaymentAttempts) return;
    checkingPaymentAttempts = true;
    const button = $('checkPaymentAttempts'), list = $('paymentAttemptsList'), failures = $('paymentFailuresList');
    button.disabled = true; button.setAttribute('aria-busy', 'true');
    list.innerHTML = ''; if(failures)failures.innerHTML='';
    message('paymentAttemptsMessage', '未確認：確認しています…', 'loading');
    if($('paymentFailuresMessage'))message('paymentFailuresMessage','未確認：確認しています…','loading');
    try {
      const result = await data('/api/admin/payment-attempts?include_failed=1', {
        method:'GET', cache:'no-store', credentials:'same-origin', redirect:'manual', signal:AbortSignal.timeout(10000)
      });
      if (!Array.isArray(result?.attempts) || result.attempts.some(r => !r || typeof r !== 'object' || Array.isArray(r))) throw Error('Invalid response');
      const phases = {prepared:'決済準備中・要確認',submitting:'決済要求を送信中',unknown:'決済結果が不明',paid:'決済成功・後処理を確認中',COMPLETED:'決済成功・後処理を確認中',declined:'決済不成立'};
      const inventory = {pending:'未反映・保留中',applied:'反映済み',retry_required:'再確認が必要'};
      const orders = {pending:'未保存',stored:'保存済み',retry_required:'保存の再確認が必要'};
      const label = (labels, value, fallback = '未確認') => typeof value === 'string' && Object.hasOwn(labels, value) ? labels[value] : fallback;
      // Render only fixed state labels. Never interpolate IDs, contacts, card
      // data, provider details, or credentials returned as unexpected fields.
      list.innerHTML = result.attempts.map((r, i) => `<li class="management-card"><strong>試行 ${i + 1}：${r.manualReview === true ? '管理者の確認が必要' : r.paymentOutcome === 'rejected' ? 'Squareが要求を拒否・照合が必要' : label(phases, r.phase || r.status, '状態未確認')}</strong><small>在庫：${label(inventory, r.inventoryState)} ／ 注文：${label(orders, r.orderState)}</small><small>${paymentDiagnostic(r.paymentFailure)}</small></li>`).join('');
      if(failures){
        if(result.failures!==undefined&&!Array.isArray(result.failures))throw Error('Invalid failure history');
        if(Array.isArray(result.failures)){
          if(result.failures.some(r=>!r||typeof r!=='object'||Array.isArray(r)))throw Error('Invalid failure history');
          failures.innerHTML=result.failures.map((r,i)=>`<li class="management-card"><strong>不成立の試行 ${i+1}：${r.squarePaymentStatus==='FAILED'?'決済失敗（FAILED）':r.squarePaymentStatus==='CANCELED'?'取消（CANCELED）':r.status==='declined'?'決済不成立':'状態未確認'}</strong><small>${paymentDiagnostic(r.paymentFailure)}</small></li>`).join('');
          message('paymentFailuresMessage',`不成立の決済：${result.failures.length}件（確認時点）。この一覧から再決済・復旧は実行しません。`);
        }else message('paymentFailuresMessage','未確認：現在のAPIから不成立の診断履歴を取得できません。','error');
      }
      message('paymentAttemptsMessage', `未解決の決済試行：${result.attempts.length}件（確認時点）。` +
        (result.attempts.length ? ' 再決済してよいか、この一覧だけでは判断できません。再購入せず、試行IDと在庫保留を維持して照合してください。' : ' 購入受付の再開可否は別途確認してください。'), result.attempts.length ? 'error' : 'success');
    } catch {
      list.innerHTML = ''; if(failures)failures.innerHTML='';
      if($('paymentFailuresMessage'))message('paymentFailuresMessage','未確認：診断履歴を取得できませんでした。','error');
      message('paymentAttemptsMessage', '未確認：取得できませんでした。通信とCloudflare Access・管理者認証を確認し、もう一度確認してください。0件とは判断できません。', 'error');
    } finally {
      checkingPaymentAttempts = false; button.disabled = false; button.removeAttribute('aria-busy');
    }
  }
  async function write(path, body, method = 'POST') {
    // Keep the original operation ID after a lost response. A changed payload is a separate operation.
    const key = method + path + JSON.stringify(body);
    if (!pendingWrites.has(key)) pendingWrites.set(key, crypto.randomUUID());
    const result = await data(path, {method, body:JSON.stringify({...body, operationId:pendingWrites.get(key)})});
    pendingWrites.delete(key); return result;
  }
  function badge(status) { if (window.YasoyaUI) return window.YasoyaUI.statusBadge(status); return `<span class="badge ${status === 'pending' ? 'pending' : 'shipped'}">${status === 'pending' ? '発送待ち' : '発送済み'}</span>`; }
  async function login() {
    if (loggingIn) return; token = $('token').value.trim(); if (!token) return;
    loggingIn = true; $('loginBtn').disabled = true; message('loginError', '認証しています…', 'loading');
    try {
      await data('/api/admin/orders?status=pending'); sessionStorage.setItem('yasoyaAdminToken', token);
      $('login').hidden = true; $('app').hidden = false; $('logout').hidden = false; message('loginError');
      window.dispatchEvent(new Event('admin:authenticated')); loadOrders();
    } catch (error) { message('loginError', error.message, 'error'); }
    finally { loggingIn = false; $('loginBtn').disabled = false; }
  }
  async function loadOrders() {
    const generation = ++orderGeneration; const wanted = current;
    message('status', '注文を読み込んでいます…', 'loading'); $('orders').setAttribute('aria-busy','true');
    try {
      const {orders} = await data('/api/admin/orders?status=' + wanted); if (generation !== orderGeneration) return;
      message('status'); $('pendingCount').textContent = wanted === 'pending' ? `(${orders.length}${orders.length === 200 ? '+' : ''})` : '';
      $('orders').innerHTML = orders.length ? orders.map(o => `<button class="order" data-order="${esc(o.order_reference)}"><span class="order-top"><span class="ref">${esc(o.order_reference)}</span>${badge(o.status)}</span><span class="name" style="display:block">${esc(o.contact.familyName)} ${esc(o.contact.givenName)} 様</span><span class="items">${o.items.map(i => `${esc(i.name)} × ${i.quantity}`).join('<br>')}</span><span class="order-bottom"><small>${date(o.created_at)}</small><span class="total">${money(o.total)} <span aria-hidden="true">›</span></span></span></button>`).join('') : `<div class="empty">${wanted === 'pending' ? '発送待ちの注文はありません。' : '発送済みの注文はありません。'}</div>`;
    } catch (error) { if (generation === orderGeneration) { $('orders').replaceChildren(); message('status',error.message,'error'); } }
    finally { if (generation === orderGeneration) $('orders').setAttribute('aria-busy','false'); }
  }
  async function showOrderMail(ref, target) {
    const labels={accepted:'受付済み（配信完了は未確認）',delivered:'配信完了',pending:'送信待ち',unknown:'受付結果を確認中',manual_review:'管理者確認待ち',unrecorded:'旧注文・送信記録なし'};
    const reasons={legacy_delivery_unknown:'旧方式の送信結果が不明なため、自動再送しません。',idempotency_window_expired:'安全な再試行期限を超えました。Resendで注文番号を確認し、新しいキーで再送しないでください。',mail_configuration_required:'送信元・通知先の設定確認が必要です。',resend_request_rejected:'Resendの認証・送信元設定を確認してください。',resend_key_conflict:'同一キーの送信内容に相違があります。Resendで確認してください。',resend_not_configured:'ResendのSecret設定を確認してください。'};
    try {
      const {mail}=await data('/api/admin/orders/'+encodeURIComponent(ref)+'/mail-status');
      if (target!==document.getElementById('orderMailStatus')) return;
      target.innerHTML=['admin','customer'].map(kind=>{const t=mail[kind]||{state:'unrecorded'};return `<p><strong>${kind==='admin'?'管理者宛':'購入者宛'}</strong>：${esc(labels[t.state]||'確認が必要です')}<br><small>${esc(reasons[t.reason]||(['pending','unknown'].includes(t.state)?'購入受付OFFでも同じキーと本文で自動確認します。':'メールのために再決済する必要はありません。'))}</small></p>`;}).join('');
    } catch { if(target===document.getElementById('orderMailStatus'))target.textContent='メール状態を取得できません。注文を開き直してください。再決済は不要です。'; }
  }
  async function openOrder(ref) {
    try {
      const {order:o} = await data('/api/admin/orders/' + encodeURIComponent(ref)); const c = o.contact;
      const address = `〒${esc(c.postalCode)}<br>${esc(c.state)}${esc(c.city)}${(c.addressLines || []).map(esc).join(' ')} `;
      $('detailBody').innerHTML = `<p class="ref">${esc(o.order_reference)}</p><div class="section-heading"><h3>${esc(c.familyName)} ${esc(c.givenName)} 様</h3>${badge(o.status)}</div><p class="hint">${date(o.created_at)}</p><div class="section"><h3>ご注文の商品</h3>${o.items.map(i => `<div class="detail-item"><span>${esc(i.name)} × ${i.quantity}</span><strong>${money(i.lineTotal)}</strong></div>`).join('')}<div class="detail-item"><span>送料</span><span>${money(o.shipping)}</span></div><div class="detail-total"><span>合計</span><span>${money(o.total)}</span></div></div><div class="section"><h3>お届け先</h3><p class="address">${address}<br>電話：${esc(c.phone)}<br>メール：${esc(c.email)}</p></div>${o.status === 'pending' ? `<div class="section"><h3>発送する</h3><label>発送方法<select id="method"><option>ゆうパケット</option><option>クリックポスト</option><option>レターパック</option><option>ゆうパック</option><option>普通郵便</option><option>その他</option></select></label><label>追跡番号（任意）<input id="tracking" inputmode="numeric" maxlength="100" placeholder="追跡がある場合のみ"></label><p class="notice">${local ? 'ローカル確認：実際のメール送信や発送は行いません。' : '発送済みに変更し、お客様へ発送完了メールを送信します。'}</p><button id="ship" class="primary wide">発送を確定する</button><p id="shipMsg" class="message" role="status" aria-live="polite"></p></div>` : `<div class="section sent"><strong>発送済み</strong><p>発送方法：${esc(o.shipping_method || '未登録')}<br>追跡番号：${esc(o.tracking_number || 'なし')}<br>発送処理：${date(o.shipped_at)}</p></div>`}`;
      const mailSection=document.createElement('section');mailSection.className='section';
      const mailTitle=document.createElement('h3');mailTitle.textContent='注文メール';
      const mailStatus=document.createElement('div');mailStatus.id='orderMailStatus';mailStatus.setAttribute('role','status');mailStatus.textContent='メール状態を確認しています…';
      mailSection.append(mailTitle,mailStatus);$('detailBody').append(mailSection);
      void showOrderMail(ref,mailStatus);
      if (!$('detail').open) $('detail').showModal();
      if (o.status === 'pending') $('ship').onclick = () => ship(o.order_reference);
    } catch (error) { notify(error.message,'error'); }
  }
  async function ship(ref) {
    if (shipping) return;
    const method = $('method').value, tracking = $('tracking').value.trim();
    if (!confirm(`${ref}\n発送方法：${method}\n追跡番号：${tracking || 'なし'}\n${local ? '架空注文を発送済みにします。実メールは送信しません。' : '発送済みに変更し、発送完了メールを送信します。'}\nよろしいですか？`)) return;
    shipping = true; $('ship').disabled = true; $('close').disabled = true; message('shipMsg','発送を処理しています…','loading');
    try {
      await data('/api/admin/orders/' + encodeURIComponent(ref) + '/ship', {method:'POST',body:JSON.stringify({shippingMethod:method,trackingNumber:tracking})});
      $('detail').close(); notify(local ? '発送済みにしました（実メール送信なし）。' : '発送済みにし、通知しました。');
      await loadOrders(); window.dispatchEvent(new Event('admin:orders-changed'));
    } catch (error) { message('shipMsg',error.message,'error'); if ($('ship')) $('ship').disabled = false; }
    finally { shipping = false; $('close').disabled = false; }
  }
  window.YasoyaAdmin = { $, esc, money, date, api, data, write, message, notify, local, openOrder, loadOrders, badge };
  $('loginForm').onsubmit = e => { e.preventDefault(); login(); };
  $('logout').onclick = () => { if (!confirm('ログアウトしますか？')) return; sessionStorage.removeItem('yasoyaAdminToken'); location.reload(); };
  $('close').onclick = () => { if (!shipping) $('detail').close(); };
  $('detail').addEventListener('cancel',e => { if (shipping) e.preventDefault(); });
  $('orders').onclick = e => { const b = e.target.closest('[data-order]'); if (b) openOrder(b.dataset.order); };
  $('reloadOrders').onclick = loadOrders;
  $('checkPaymentAttempts')?.addEventListener('click', checkPaymentAttempts);
  document.querySelectorAll('.tab').forEach(b => b.onclick = () => { current = b.dataset.status; document.querySelectorAll('.tab').forEach(x => { x.classList.toggle('active',x === b); x.setAttribute('aria-pressed',String(x === b)); }); loadOrders(); });
  if (local) $('loginHelp').textContent = 'ローカル専用：local-development-only を入力してください。実際の認証情報は使いません。';
  if (token) { $('token').value = token; login(); }
})();
