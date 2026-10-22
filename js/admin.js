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
    if (local && path === '/api/admin/images') {
      const csrf = await photoCsrfToken(); if (csrf) headers['X-Yasoya-Local-CSRF'] = csrf;
      // Diagnostic only. Do not send the page URL, and never use this hint as authorization.
      try {
        const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(location.origin));
        headers['X-Yasoya-Page-Origin-SHA256'] = [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2,'0')).join('');
        headers['X-Yasoya-API-Same-Origin'] = new URL(base + path,location.href).origin === location.origin ? '1' : '0';
      } catch { /* Missing diagnostics must not prevent a normal upload. */ }
    }
    const response = await fetch(base + path, {...options, headers});
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const error = Error(data.error?.message || '処理できませんでした。再試行してください。'); error.status = response.status;
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
  async function openOrder(ref) {
    try {
      const {order:o} = await data('/api/admin/orders/' + encodeURIComponent(ref)); const c = o.contact;
      const address = `〒${esc(c.postalCode)}<br>${esc(c.state)}${esc(c.city)}${(c.addressLines || []).map(esc).join(' ')} `;
      $('detailBody').innerHTML = `<p class="ref">${esc(o.order_reference)}</p><div class="section-heading"><h3>${esc(c.familyName)} ${esc(c.givenName)} 様</h3>${badge(o.status)}</div><p class="hint">${date(o.created_at)}</p><div class="section"><h3>ご注文の商品</h3>${o.items.map(i => `<div class="detail-item"><span>${esc(i.name)} × ${i.quantity}</span><strong>${money(i.lineTotal)}</strong></div>`).join('')}<div class="detail-item"><span>送料</span><span>${money(o.shipping)}</span></div><div class="detail-total"><span>合計</span><span>${money(o.total)}</span></div></div><div class="section"><h3>お届け先</h3><p class="address">${address}<br>電話：${esc(c.phone)}<br>メール：${esc(c.email)}</p></div>${o.status === 'pending' ? `<div class="section"><h3>発送する</h3><label>発送方法<select id="method"><option>ゆうパケット</option><option>クリックポスト</option><option>レターパック</option><option>ゆうパック</option><option>普通郵便</option><option>その他</option></select></label><label>追跡番号（任意）<input id="tracking" inputmode="numeric" maxlength="100" placeholder="追跡がある場合のみ"></label><p class="notice">${local ? 'ローカル確認：実際のメール送信や発送は行いません。' : '発送済みに変更し、お客様へ発送完了メールを送信します。'}</p><button id="ship" class="primary wide">発送を確定する</button><p id="shipMsg" class="message" role="status" aria-live="polite"></p></div>` : `<div class="section sent"><strong>発送済み</strong><p>発送方法：${esc(o.shipping_method || '未登録')}<br>追跡番号：${esc(o.tracking_number || 'なし')}<br>発送処理：${date(o.shipped_at)}</p></div>`}`;
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
  document.querySelectorAll('.tab').forEach(b => b.onclick = () => { current = b.dataset.status; document.querySelectorAll('.tab').forEach(x => { x.classList.toggle('active',x === b); x.setAttribute('aria-pressed',String(x === b)); }); loadOrders(); });
  if (local) $('loginHelp').textContent = 'ローカル専用：local-development-only を入力してください。実際の認証情報は使いません。';
  if (token) { $('token').value = token; login(); }
})();
