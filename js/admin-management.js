(() => {
  'use strict';
  const A = window.YasoyaAdmin, UI = window.YasoyaUI;
  UI.applyBrand();
  const {$,esc,money,date,data,write,message,notify} = A;
  const screens = ['homePanel','ordersPanel','productsPanel','inventoryPanel'];
  const statusNames = {draft:'下書き',published:'公開中',stopped:'販売停止',archived:'アーカイブ',queued:'待機',retry:'再試行待ち',running:'同期中',review:'要確認',done:'完了'};
  let products = [], current = null, busy = false, dirty = false, activePanel = 'homePanel', inventoryRows = [], stockEdit = null, homeGeneration = 0;
  const previews = new Map();
  const stateBadge = UI.statusBadge, empty = UI.emptyState;
  function setDirty(value) { dirty = value; $('dirtyStatus').textContent = value ? '未保存の変更あり' : '保存済み'; $('dirtyStatus').className = 'badge ' + (value ? 'draft' : 'done'); }
  function showProductDiagnostic(error) {
    if (!A.local) return;
    let details = $('productDiagnosticDetails');
    if (!details) {
      details = document.createElement('details'); details.id = 'productDiagnosticDetails';
      const summary = document.createElement('summary'); summary.textContent = '商品保存・公開の診断（ローカル専用）';
      const report = document.createElement('textarea'); report.id = 'productDiagnosticReport'; report.readOnly = true; report.rows = 9; report.setAttribute('aria-label','商品保存・公開の診断JSON');
      details.append(summary,report); $('editorMessage').after(details);
    }
    // Only enums and HTTP status prepared by api(); never serialize the Error or body.
    $('productDiagnosticReport').value = JSON.stringify({version:1,...(error.productDiagnostic || {httpStatus:null,serverStage:'unavailable',serverCode:'NO_SERVER_DIAGNOSTIC'}),errorType:['Error','TypeError','SyntaxError','AbortError','TimeoutError'].includes(error.name)?error.name:'OtherError'},null,2);
    details.hidden = false;
  }
  async function work(fn, place = activePanel === 'inventoryPanel' ? 'inventoryMessage' : activePanel === 'homePanel' ? 'homeMessage' : 'managementMessage') {
    if (busy) return; busy = true;
    const controls = [...document.querySelectorAll('#app button, dialog button, #logout')].map(button => [button,button.disabled]);
    controls.forEach(([button]) => button.disabled = true); $('productForm').inert = true; $('inventoryForm').inert = true;
    $(activePanel).setAttribute('aria-busy','true'); message(place,'処理しています…','loading');
    try { await fn(); if ($(place).dataset.state === 'loading') message(place,'最新の情報を表示しています。'); }
    catch (error) { if (place === 'editorMessage') showProductDiagnostic(error); message(place,error.message,'error'); notify(error.message,'error'); if (place === 'photoUploadMessage' || place === 'editorMessage') $(place).scrollIntoView({block:'center',behavior:'instant'}); }
    finally { busy = false; $('productForm').inert = false; $('inventoryForm').inert = false; screens.forEach(id => $(id).setAttribute('aria-busy','false')); controls.forEach(([button,disabled]) => { if (button.isConnected) button.disabled = disabled; }); }
  }
  async function preview(id) {
    if (!previews.has(id)) { const pending = A.api('/api/admin/images/' + id).then(r => r.blob()).then(blob => URL.createObjectURL(blob)); previews.set(id,pending); pending.catch(() => previews.delete(id)); }
    return previews.get(id);
  }
  const photo = UI.thumbnail;
  function hydrate(root = document) { root.querySelectorAll('img[data-image]').forEach(img => preview(img.dataset.image).then(url => { if (img.isConnected) img.src = url; }).catch(() => { img.replaceWith(Object.assign(document.createElement('span'),{textContent:'写真を取得できません'})); })); }
  function filterProducts() {
    const term = $('productSearch').value.normalize('NFKC').toLocaleLowerCase('ja-JP').trim(), filter = $('productFilter').value;
    const filtered = products.filter(p => (filter === 'all' || p.status === filter) && [p.draft.name,...p.draft.variants.map(v => v.name)].join(' ').normalize('NFKC').toLocaleLowerCase('ja-JP').includes(term));
    $('productCount').textContent = `${filtered.length}件を表示 / 登録 ${products.length}件`;
    $('productList').innerHTML = filtered.map(p => UI.productCard(p,money)).join('') || empty(products.length ? '条件に一致する商品がありません。検索や状態を変更してください。' : 'まだ商品がありません。「商品登録」から始めましょう。'); hydrate($('productList'));
  }
  async function jobs() {
    const [result,audit] = await Promise.all([data('/api/admin/jobs'),data('/api/admin/audit')]);
    $('jobList').innerHTML = result.jobs.map(j => `<div class="management-card">${stateBadge(j.state)} <strong>${esc({publish:'商品公開',state:'販売状態の変更',stock:'在庫変更'}[j.kind] || j.kind)}</strong><small>${date(j.updatedAt)}</small><p>${esc(j.error || '')}</p>${j.state === 'retry' ? `<button data-retry="${esc(j.id)}">同じ操作を再試行</button>` : ''}${j.state === 'review' ? `<p class="held">競合や期限切れです。上書きせず照合します。</p><button data-reconcile="${esc(j.id)}">同期結果を照合</button>` : ''}</div>`).join('') || empty('同期処理はありません。');
    const monitor=result.monitoring;
    if(monitor)$('jobList').insertAdjacentHTML('afterbegin',`<p role="status">管理同期の最終監視：${date(monitor.lastScanAt)}${monitor.alarmState==='failed'?' ／ Alarm予約失敗：定期監視で再検出します。':''}${monitor.notificationAttention?' ／ 管理通知の設定・送信結果を確認してください。':''}</p>`);
    for(const [index,j] of result.jobs.entries()){const card=$('jobList').querySelectorAll('.management-card')[index];if(card){const note=document.createElement('small');note.textContent='管理通知：'+({none:'対象外',pending:'再試行待ち',blocked:'設定待ち',sent:'送信受付済み',expired:'要確認',cancelled:'復旧により取消'}[j.notificationState]||'未確認');card.append(note);}}
    $('auditList').innerHTML = audit.events.map(e => `<div class="management-card"><strong>${esc({draft_saved:'下書き保存',job_queued:'同期開始',job_completed:'同期完了',sandbox_linked:'Sandbox関連付け',stopped:'販売停止',archived:'アーカイブ'}[e.action] || e.action)}</strong><small>${esc(e.resource_id)} / ${date(e.created_at)}</small></div>`).join('') || empty('変更履歴はありません。');
  }
  async function loadProducts() { const r = await data('/api/admin/products'); products = r.products; filterProducts(); await jobs(); }
  function recentMarkup(o) { return `<button class="recent-order" data-order="${esc(o.order_reference)}"><span class="row"><strong>${esc(o.contact.familyName)} ${esc(o.contact.givenName)} 様</strong>${A.badge(o.status)}</span><span class="row"><small>${date(o.created_at)}</small><strong>${money(o.total)}</strong></span><small>${esc(o.order_reference)}</small></button>`; }
  async function home() {
    const generation = ++homeGeneration;
    ['homePending','homeProducts','homeLowStock'].forEach(id => $(id).textContent = '—');
    $('recentOrders').innerHTML = UI.loadingState('注文を読み込んでいます…'); $('lowStockList').innerHTML = UI.loadingState('在庫を確認しています…');
    const results = await Promise.allSettled([data('/api/admin/orders?status=pending'),data('/api/admin/orders?status=shipped'),data('/api/admin/products'),data('/api/admin/inventory')]);
    if (generation !== homeGeneration) return;
    const values = results.map(r => r.status === 'fulfilled' ? r.value : null);
    const [pending,shipped,registered,stock] = values;
    if (pending) $('homePending').textContent = pending.orders.length + (pending.orders.length === 200 ? '+' : '');
    if (registered) { products = registered.products; $('homeProducts').textContent = products.length; }
    const orders = [...(pending?.orders || []),...(shipped?.orders || [])].sort((a,b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0,5);
    $('recentOrders').innerHTML = orders.length ? orders.map(recentMarkup).join('') : empty(!pending || !shipped ? '注文を取得できません。「更新」で再試行してください。' : 'まだ注文はありません。');
    if (stock) {
      $('homeLowStock').textContent = stock.inventory.filter(r => r.quantity !== null && r.quantity <= 3).length;
      const attention = stock.inventory.filter(r => r.held || r.quantity === null || r.quantity <= 3);
      $('lowStockList').innerHTML = attention.map(r => `<div class="low-stock-row"><span>${esc(r.name)}</span><span class="badge ${r.held || r.quantity === 0 ? 'held' : 'draft'}">${r.held ? '販売保留' : r.quantity === null ? '未確認' : r.quantity + '個'}</span></div>`).join('') || empty('在庫に余裕があります。');
    } else $('lowStockList').innerHTML = empty('在庫を確認できません。「最新の在庫を取得」で確認してください。');
    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length) message('homeMessage','一部の情報を取得できませんでした。未確認の値は「—」です。更新して再試行してください。','error');
    else message('homeMessage');
  }
  function navigate(panel, focus = true) {
    if (!screens.includes(panel) || busy) return; activePanel = panel;
    screens.forEach(id => $(id).hidden = id !== panel);
    document.querySelectorAll('.admin-nav-button').forEach(b => { const selected = b.dataset.panel === panel; b.classList.toggle('active',selected); if (selected) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current'); });
    if (focus) { $(panel).querySelector('h1').focus({preventScroll:true}); window.scrollTo({top:0,behavior:'instant'}); }
    if (panel === 'homePanel') work(home); if (panel === 'productsPanel') work(loadProducts); if (panel === 'inventoryPanel') work(inventory); if (panel === 'ordersPanel') A.loadOrders();
  }
  document.querySelectorAll('.admin-nav-button,[data-go]').forEach(b => b.onclick = () => navigate(b.dataset.panel || b.dataset.go));
  $('today').textContent = new Intl.DateTimeFormat('ja-JP',{month:'long',day:'numeric',weekday:'long',timeZone:'Asia/Tokyo'}).format(new Date());
  window.addEventListener('admin:authenticated',() => navigate('homePanel',false));
  window.addEventListener('admin:orders-changed',() => { if (activePanel === 'homePanel') work(home); });
  $('recentOrders').onclick = e => { const b = e.target.closest('[data-order]'); if (b) A.openOrder(b.dataset.order); };
  $('reloadHome').onclick = () => work(home);
  $('productSearch').oninput = filterProducts; $('productFilter').onchange = filterProducts;

  function capture() {
    const f = $('productForm'); if (!current) return;
    for (const key of ['name','description','alt']) current.draft[key] = f.elements.namedItem(key).value;
    current.draft.sortOrder = Number(f.elements.namedItem('sortOrder').value); current.slug = f.elements.namedItem('slug').value;
    current.draft.variants = [...$('variantList').querySelectorAll('fieldset')].map(el => ({id:el.dataset.id,name:el.querySelector('[name=vname]').value,price:Number(el.querySelector('[name=price]').value),amount:el.querySelector('[name=amount]').value,maxQuantity:Number(el.querySelector('[name=max]').value),active:el.querySelector('[name=active]').checked}));
  }
  const gallery = UI.createGallery({track:$('photoGalleryTrack'),indicators:$('photoGalleryDots'),position:$('photoGalleryPosition'),load:preview});
  async function drawImages(preferredId) {
    gallery.setItems(current.draft.images,current.draft.alt || current.draft.name,preferredId);
    const list = $('imageList'); list.replaceChildren();
    for (const [i,id] of current.draft.images.entries()) {
      const div = document.createElement('div'); div.className = 'image-entry'; const img = document.createElement('img'); img.alt = current.draft.alt || current.draft.name || '商品写真'; div.append(img);
      preview(id).then(url => img.src = url).catch(() => img.alt = '写真を取得できません');
      const label = document.createElement('p'); label.className = 'image-label'; label.textContent = i === 0 ? 'メイン写真' : `写真 ${i+1}`; div.append(label);
      const controls = document.createElement('div'); controls.className = 'image-controls'; div.append(controls);
      for (const [label,accessible,disabled,action] of [
        ['↑',`写真${i+1}を前へ`,i === 0,() => [current.draft.images[i-1],current.draft.images[i]] = [id,current.draft.images[i-1]]],
        ['↓',`写真${i+1}を後ろへ`,i === current.draft.images.length-1,() => [current.draft.images[i+1],current.draft.images[i]] = [id,current.draft.images[i+1]]],
        ['メインにする',`写真${i+1}をメインにする`,i === 0,() => { current.draft.images.splice(i,1); current.draft.images.unshift(id); }],
        ['外す',`写真${i+1}を外す`,false,() => current.draft.images.splice(i,1)]]) {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.setAttribute('aria-label',accessible); b.disabled = disabled;
        b.onclick = () => { if (busy) return; if (label === '外す' && !confirm('この写真を下書きから外しますか？保存するまで公開内容は変わりません。')) return; capture(); action(); setDirty(true); drawImages(label === 'メインにする' ? id : undefined); }; controls.append(b);
      }
      list.append(div);
    }
    if (!current.draft.images.length) list.innerHTML = '<p class="hint">写真を追加すると、ここにプレビューが表示されます。</p>';
  }
  function drawSyncStatus(){
    let status=$('editorSyncStatus');if(!status){status=document.createElement('span');status.id='editorSyncStatus';status.className='muted';$('editorProductStatus').after(status);}
    status.textContent='Square：'+({done:'前回同期完了',queued:'同期待ち',running:'同期中',retry:'再試行待ち',review:'要確認',unlinked:'未連携'}[current.syncState]||'未連携')+(current.version&&current.draft_revision!==current.published_revision?' ／ 未反映の下書きあり':'');
  }
  function draw() {
    const f = $('productForm'); for (const key of ['name','description','sortOrder','alt']) f.elements.namedItem(key).value = current.draft[key] ?? '';
    f.elements.namedItem('slug').value = current.slug; f.elements.namedItem('slug').disabled = current.version > 0;
    $('editorTitle').textContent = current.version ? '商品を編集' : '新しい商品'; $('editorProductStatus').textContent = statusNames[current.status] || '下書き';
    drawSyncStatus();
    $('variantList').innerHTML = current.draft.variants.map((v,i) => `<fieldset data-id="${esc(v.id)}"><legend>バリエーション ${i+1}</legend><label>バリエーション名<input name="vname" maxlength="120" value="${esc(v.name)}" required placeholder="例：乾燥ハーブ 10g"></label><div class="form-grid"><label>価格（円）<input name="price" type="number" inputmode="numeric" min="1" max="10000000" value="${v.price}" required></label><label>内容量<input name="amount" maxlength="120" value="${esc(v.amount)}" placeholder="例：10g"></label></div><div class="form-grid"><label>購入上限<input name="max" type="number" inputmode="numeric" min="1" max="10" value="${v.maxQuantity}" required></label><label class="checkbox-label"><input name="active" type="checkbox" ${v.active ? 'checked' : ''}>販売対象</label></div></fieldset>`).join('');
    drawImages(); message('editorMessage'); message('photoUploadMessage'); if ($('photoDiagnosticDetails')) $('photoDiagnosticDetails').hidden = true; if ($('productDiagnosticDetails')) { $('productDiagnosticDetails').hidden = true; $('productDiagnosticReport').value = ''; }
  }
  function open(p) { if (busy) return; current = structuredClone(p); setDirty(false); $('imageFiles').value = ''; draw(); $('productEditor').showModal(); $('productEditor').scrollTop = 0; gallery.select(0,false); }
  function newProduct() { open({id:crypto.randomUUID(),slug:'',version:0,status:'draft',draft:{name:'',description:'',alt:'',sortOrder:0,images:[],variants:[{id:crypto.randomUUID(),name:'',amount:'',price:980,maxQuantity:10,active:true}]}}); }
  $('newProduct').onclick = newProduct; $('homeNewProduct').onclick = newProduct;
  $('importProducts').onclick = () => { if (confirm('既存3商品の説明・写真を下書きとして取り込みます。公開やSquareへの書込みは行いません。')) work(async () => { await write('/api/admin/products/import',{}); await loadProducts(); notify('下書きとして取り込みました。'); }); };
  $('productList').onclick = e => { const b = e.target.closest('[data-edit]'); if (b) open(products.find(p => p.id === b.dataset.edit)); };
  $('productForm').addEventListener('input',event => { if (event.target.id !== 'imageFiles') setDirty(true); });
  // Native constraint validation runs BEFORE submit and invalid does not bubble.
  // Surface its first failure in the editor instead of silently skipping save.
  $('productForm').addEventListener('invalid',event => {
    event.preventDefault();
    const input = event.target;
    if (input !== $('productForm').querySelector('input:invalid,textarea:invalid,select:invalid')) return;
    const labels = {name:'商品名',slug:'URL識別子',sortOrder:'表示順',alt:'写真の説明',description:'説明',vname:'バリエーション名',price:'価格（円）',max:'購入上限',amount:'内容量'};
    const variant = input.closest('#variantList fieldset');
    const label = (variant ? `バリエーション${[...$('variantList').children].indexOf(variant)+1}の` : '') + (labels[input.name] || '入力項目');
    const v = input.validity;
    const reason = v.valueMissing ? '入力してください。' : v.rangeUnderflow || v.rangeOverflow ? `${input.min}〜${input.max}の範囲で入力してください。` : v.stepMismatch || v.badInput ? '整数で入力してください。' : v.patternMismatch ? '半角英小文字・数字・ハイフンで入力してください（先頭は英数字、80文字以内）。' : v.tooLong ? `${input.maxLength}文字以内で入力してください。` : '入力内容を確認してください。';
    const text = `下書きは保存されていません。${label}：${reason}`;
    message('editorMessage',text,'error'); notify(text,'error');
    input.focus({preventScroll:true}); input.scrollIntoView({block:'center',behavior:'instant'});
  },true);
  $('addVariant').onclick = () => { capture(); if (current.draft.variants.length >= 20) { message('editorMessage','バリエーションは20件までです。','error'); return; } current.draft.variants.push({id:crypto.randomUUID(),name:'',price:980,amount:'',maxQuantity:10,active:true}); setDirty(true); draw(); };
  $('productForm').onsubmit = e => { e.preventDefault(); work(async () => {
    capture(); let result;
    try { result = await write('/api/admin/products/' + current.id,{...current.draft,slug:current.slug,expectedVersion:current.version},'PUT'); }
    catch (error) { const failure=Error(['TypeError','AbortError','TimeoutError'].includes(error.name) ? '下書きの保存結果を確認できません。通信状態を確認して再試行してください。入力内容と写真はこの画面に残っています。' : `下書きを保存できません：${error.message}${error.status ? '（HTTP '+error.status+'）' : ''}`); failure.name=error.name; failure.productDiagnostic=error.productDiagnostic; throw failure; }
    current.version = result.version; current.draft_revision = result.revision; $('productForm').elements.namedItem('slug').disabled = true; setDirty(false);
    drawSyncStatus();
    if ($('productDiagnosticDetails')) { $('productDiagnosticDetails').hidden = true; $('productDiagnosticReport').value = ''; }
    message('editorMessage','下書きを保存しました。公開内容はまだ変わりません。'); notify('下書きを保存しました。'); await loadProducts();
  },'editorMessage'); };
  async function action(action,extra = {}) {
    if (dirty || !current.version) throw Error('先に下書きを保存してください。');
    const result = await write('/api/admin/products/' + current.id + '/' + action,{expectedVersion:current.version,...extra});
    await loadProducts(); current = structuredClone(products.find(p => p.id === current.id)); draw();
    const text = result.state === 'done' ? '同期が完了し、販売状態を反映しました。' : result.ok && action === 'link' ? '既存Sandbox IDを関連付けました。' : '処理を受け付けました。同期一覧で結果を確認してください。';
    message('editorMessage',text); notify(text);
  }
  $('publishProduct').onclick = () => { if (confirm('保存済みの下書きを同期して公開しますか？未保存の変更は公開できません。')) work(() => action('publish'),'editorMessage'); };
  $('stopProduct').onclick = () => { if (confirm('この商品の販売を停止しますか？')) work(() => action('state',{status:'stopped'}),'editorMessage'); };
  $('archiveProduct').onclick = () => { if (confirm('商品をアーカイブしますか？過去の注文は残ります。')) work(() => action('state',{status:'archived'}),'editorMessage'); };
  $('linkProduct').onclick = () => work(async () => { if (dirty) throw Error('先に下書きを保存してください。'); const mappings = []; for (const v of current.draft.variants) { const variationId = prompt(v.name + ' の既存Sandbox Variation ID'); if (!variationId) return; mappings.push({variantId:v.id,variationId:variationId.trim()}); } await action('link',{mappings}); },'editorMessage');
  function closeEditor() { if (!busy && (!dirty || confirm('未保存の変更があります。保存せずに閉じますか？'))) { $('productEditor').close(); setDirty(false); } }
  $('closeEditor').onclick = closeEditor;
  $('productEditor').addEventListener('cancel',e => { e.preventDefault(); closeEditor(); });
  // Local-only, bounded and memory-only diagnostics. Never include names, image data,
  // EXIF, URLs, credentials, server response bodies or raw exception messages.
  const photoRecords = []; let photoTrace, photoStage, photoStarted;
  const photoReport = () => JSON.stringify({version:1,records:photoRecords},null,2);
  if (A.local) window.YasoyaPhotoDiagnostics = Object.freeze({report:photoReport});
  function photoDiagnostic(stage,result,error,extra={}) {
    if (!A.local) return;
    photoStage = stage;
    const row = {trace:photoTrace,stage,result,elapsedMs:Math.round(performance.now()-photoStarted),...extra};
    if (error) {
      row.errorType = ['Error','TypeError','SyntaxError','InvalidStateError','AbortError','TimeoutError','NotReadableError','SecurityError','EncodingError'].includes(error.name) ? error.name : 'OtherError';
      if (Number.isInteger(error.status)) row.httpStatus = error.status;
      if (error.photoResponse) row.responseKind = error.photoResponse;
      if (error.photoCode) row.serverCode = error.photoCode;
      if (error.photoServerStage) row.serverStage = error.photoServerStage;
      if (error.photoAccessReason) row.accessReason = error.photoAccessReason;
      if (error.photoHostClass) row.hostClass = error.photoHostClass;
      if (error.photoOriginClass) row.originClass = error.photoOriginClass;
      if (error.photoConfigurationMode) row.configurationMode = error.photoConfigurationMode;
      if (error.photoOriginMatch) row.originMatch = error.photoOriginMatch;
      if (error.photoOriginEvidence) row.originEvidence = error.photoOriginEvidence;
    }
    photoRecords.push(row); if (photoRecords.length > 80) photoRecords.shift();
    console.debug('[local-photo]',JSON.stringify(row));
  }
  function showPhotoDiagnostic() {
    if (!A.local) return;
    let details = $('photoDiagnosticDetails');
    if (!details) {
      details = document.createElement('details'); details.id = 'photoDiagnosticDetails';
      const summary = document.createElement('summary'); summary.textContent = '写真追加の診断（ローカル専用）';
      const report = document.createElement('textarea'); report.id = 'photoDiagnosticReport'; report.readOnly = true; report.rows = 8; report.setAttribute('aria-label','写真追加の診断結果');
      const copy = document.createElement('button'); copy.type = 'button'; copy.textContent = '診断をコピー';
      copy.onclick = async () => { report.focus(); report.select(); try { await navigator.clipboard.writeText(report.value); copy.textContent = 'コピーしました'; } catch { copy.textContent = '診断欄を長押ししてコピーしてください'; } };
      details.append(summary,report,copy); $('photoUploadMessage').after(details);
    }
    $('photoDiagnosticReport').value = photoReport(); details.hidden = false;
  }
  // Materialize a provider-backed File while the picker still owns its selection.
  // No slice() on the original File: some Android providers cannot read partial files.
  async function readPhotoFile(file) {
    for (const method of ['array-buffer','file-reader']) {
      photoDiagnostic('file-read','begin',null,{method,fileReaderUsed:method === 'file-reader'});
      try {
        const buffer = await new Promise((resolve,reject) => {
          let reader, settled = false;
          const finish = (error,value) => { if (settled) return; settled = true; clearTimeout(timer); if (reader) reader.onload = reader.onerror = reader.onabort = null; error ? reject(error) : resolve(value); };
          const timer = setTimeout(() => { finish(new DOMException('Photo read timeout','TimeoutError')); if (reader?.readyState === 1) reader.abort(); },20000);
          if (method === 'array-buffer') {
            try { Promise.resolve(file.arrayBuffer()).then(value => finish(null,value),error => finish(error)); } catch (error) { finish(error); }
          } else {
            try {
              reader = new FileReader(); reader.onload = () => finish(null,reader.result);
              reader.onerror = () => finish(reader.error || new DOMException('Photo read failed','NotReadableError'));
              reader.onabort = () => finish(new DOMException('Photo read aborted','AbortError'));
              reader.readAsArrayBuffer(file);
            } catch (error) { finish(error); }
          }
        });
        if (!(buffer instanceof ArrayBuffer) || buffer.byteLength !== file.size) throw new DOMException('Photo size changed','NotReadableError');
        photoDiagnostic('file-read','ok',null,{method,fileReaderUsed:method === 'file-reader',readBytes:buffer.byteLength});
        return buffer;
      } catch (error) {
        photoDiagnostic('file-read','failed',error,{method,fileReaderUsed:method === 'file-reader'});
        // A timed-out native read cannot be cancelled: do not launch another full read.
        if (error.name === 'TimeoutError' || error.name === 'AbortError' || method === 'file-reader') {
          throw Object.assign(Error('写真ファイルを読み込めません。編集済み写真を端末の「ダウンロード」などへ書き出し、ファイル選択画面から選び直してください。'),{photoLogged:true});
        }
      }
    }
  }
  async function preparePhoto(file) {
    if (!file.size) throw Error('写真データが空です。端末に写真を保存してから選び直してください。');
    if (file.size > 30*1024*1024) throw Error('元の写真は30MB以下にしてください。');
    const buffer = await readPhotoFile(file);
    photoDiagnostic('header-read','begin');
    const header = new Uint8Array(buffer,0,Math.min(buffer.byteLength,32));
    photoDiagnostic('header-read','ok');
    photoDiagnostic('format-check','begin');
    const ascii = (start,end) => String.fromCharCode(...header.slice(start,end));
    const mime = header[0] === 255 && header[1] === 216 && header[2] === 255 ? 'image/jpeg'
      : [137,80,78,71,13,10,26,10].every((v,i) => header[i] === v) ? 'image/png'
      : ascii(0,4) === 'RIFF' && ascii(8,12) === 'WEBP' ? 'image/webp' : null;
    if (!mime) {
      if (/image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name) || ascii(4,8) === 'ftyp') throw Error('HEIC/HEIFなどの形式は追加できません。JPEG・PNG・WebPに変換して選び直してください。');
      throw Error('対応している写真はJPEG・PNG・WebPです。形式を確認して選び直してください。');
    }
    photoDiagnostic('format-check','ok',null,{detectedMime:mime});
    // Android document/photo providers can return an empty or generic MIME type.
    // Decode a typed local Blob with the browser image element instead of ImageBitmap.
    photoDiagnostic('decode','begin');
    const url = URL.createObjectURL(new Blob([buffer],{type:mime})), image = new Image();
    try {
      await new Promise((resolve,reject) => {
        const cleanup = () => { clearTimeout(timer); image.onload = image.onerror = null; };
        const timer = setTimeout(() => { cleanup(); reject(Error('写真の読み込みがタイムアウトしました。端末に保存し、縮小して選び直してください。')); },20000);
        image.onload = () => { cleanup(); resolve(); };
        image.onerror = () => { cleanup(); reject(Error('写真を読み込めません。破損していないJPEG・PNG・WebPで選び直してください。')); };
        image.src = url;
      });
      photoDiagnostic('decode','ok');
      photoDiagnostic('canvas-draw','begin');
      const width = image.naturalWidth, height = image.naturalHeight;
      if (!width || !height) throw Error('写真のサイズを取得できません。別の写真で試してください。');
      const scale = Math.min(1,2000/Math.max(width,height)), canvas = document.createElement('canvas');
      canvas.width = Math.max(1,Math.round(width*scale)); canvas.height = Math.max(1,Math.round(height*scale));
      const context = canvas.getContext('2d');
      if (!context) throw Error('端末で写真を変換できません。写真を縮小し、JPEGで選び直してください。');
      context.drawImage(image,0,0,canvas.width,canvas.height);
      photoDiagnostic('canvas-draw','ok',null,{width:canvas.width,height:canvas.height});
      photoDiagnostic('blob-encode','begin');
      const blob = await new Promise(resolve => canvas.toBlob(resolve,'image/jpeg',.85));
      if (!blob || !blob.size || blob.type !== 'image/jpeg') throw Error('写真の変換に失敗しました。縮小したJPEGで選び直してください。');
      if (blob.size > 8*1024*1024) throw Error('変換後の写真が8MBを超えています。縮小して選び直してください。');
      photoDiagnostic('blob-encode','ok',null,{outputMime:blob.type,outputBytes:blob.size});
      return blob;
    } finally { image.removeAttribute('src'); URL.revokeObjectURL(url); }
  }
  let photoSelectionActive = false;
  function photosSelected(event) {
    const input = event.currentTarget, files = Array.from(input.files || []);
    // Preserve the provider reference until every file has been read/processed.
    // Ignore the paired input/change event while this selection is in flight.
    if (photoSelectionActive || !files.length) return;
    if (busy) { message('photoUploadMessage','処理が終わってから、写真を選び直してください。','error'); return; }
    photoSelectionActive = true;
    work(async () => {
      capture(); let added = 0;
      for (const [i,file] of files.entries()) {
        photoTrace = crypto.randomUUID(); photoStarted = performance.now();
        photoDiagnostic('selection','ok',null,{sourceMime:['image/jpeg','image/png','image/webp','image/heic','image/heif','application/octet-stream',''].includes(file.type)?file.type:'other',sourceBytes:file.size,android:/Android/.test(navigator.userAgent),fileReaderUsed:false});
        try {
          photoDiagnostic('file-validation','begin');
          if (current.draft.images.length >= 10) throw Error('写真は10枚までです。不要な写真を外してから追加してください。');
          message('photoUploadMessage',`写真を読み込んでいます…（${i+1}/${files.length}）`,'loading');
          const blob = await preparePhoto(file);
          message('photoUploadMessage',`写真を送信しています…（${i+1}/${files.length}）`,'loading');
          let result; photoDiagnostic('upload','begin');
          let response;
          try { response = await A.api('/api/admin/images',{method:'POST',headers:{'Content-Type':'image/jpeg',...(A.local?{'X-Yasoya-Photo-Trace':photoTrace}:{})},body:blob,signal:AbortSignal.timeout(20000)}); }
          catch (error) { photoDiagnostic('upload','failed',error); throw Object.assign(Error(error.status ? `写真を追加できません：${error.message}` : '写真を送信できません。通信状態を確認し、同じ写真を選び直してください。'),{photoLogged:true}); }
          photoDiagnostic('upload','ok',null,{httpStatus:response.status});
          photoDiagnostic('response-parse','begin'); result = await response.json(); photoDiagnostic('response-parse','ok');
          photoDiagnostic('response-validation','begin');
          if (!/^[a-f0-9]{64}$/.test(result.id || '')) throw Error('写真の保存結果を確認できません。同じ写真を選び直してください。');
          if (!current.draft.images.includes(result.id)) { current.draft.images.push(result.id); added++; setDirty(true); }
          photoDiagnostic('preview-fetch','begin'); await drawImages(result.id); await preview(result.id); photoDiagnostic('preview-fetch','ok'); photoDiagnostic('complete','ok');
        } catch (error) { if (!error.photoLogged) photoDiagnostic(photoStage || 'unknown','failed',error); showPhotoDiagnostic(); throw error; }
      }
      message('photoUploadMessage',added ? `写真を${added}枚追加しました。下書きを保存すると商品に反映されます。` : '選択した写真は追加済みです。');
      $('photoGalleryTrack').scrollIntoView({block:'center',behavior:'instant'});
    },'photoUploadMessage').finally(() => { input.value = ''; photoSelectionActive = false; });
  }
  $('imageFiles').addEventListener('input',photosSelected);
  $('imageFiles').addEventListener('change',photosSelected);

  async function inventory() {
    const [stock,registered] = await Promise.all([data('/api/admin/inventory'),data('/api/admin/products')]); products = registered.products; inventoryRows = stock.inventory;
    $('inventoryList').innerHTML = inventoryRows.map(r => { const p = products.find(p => p.id === r.productId), unknown = r.quantity === null, disabled = r.held || unknown;
      return `<article class="inventory-card">${photo(p,'inventory-photo')}<div><p class="inventory-name">${esc(r.name)}</p><p class="inventory-stock">${unknown ? '—' : r.quantity}<small>${unknown ? ' 未確認' : ' 個'}</small> ${r.held ? '<span class="badge held">販売保留中</span>' : unknown ? '<span class="badge draft">未対応</span>' : r.quantity <= 3 ? '<span class="badge draft">在庫わずか</span>' : '<span class="badge done">確認済み</span>'}</p><p class="stock-meta">最終確認 ${date(r.observedAt)}<br>${esc({held:'整合性の確認が必要',synced:'同期済み',unmapped:'関連付けが必要'}[r.syncState] || r.syncState)}</p></div><div class="inventory-actions">${['receipt','count','adjustment'].map((kind,i) => `<button class="${i ? 'secondary' : 'primary'} ${i === 2 ? 'adjustment' : ''}" data-kind="${kind}" data-id="${esc(r.id)}" ${disabled ? 'disabled' : ''} aria-label="${esc(r.name)}の${['入庫','棚卸し','増減調整'][i]}">${['入庫','棚卸し','増減調整'][i]}</button>`).join('')}</div></article>`;
    }).join('') || empty('在庫を管理する商品がありません。まず商品を登録してください。'); hydrate($('inventoryList'));
  }
  function stockPreview() {
    if (!stockEdit) return; const raw = $('inventoryQuantity').value, n = Number(raw), after = stockEdit.kind === 'count' ? n : stockEdit.row.quantity + n;
    $('inventoryAfter').textContent = raw !== '' && Number.isSafeInteger(n) && after >= 0 ? `${stockEdit.row.quantity}個 → ${after}個` : '数量を入力してください。';
  }
  $('inventoryList').onclick = e => {
    const b = e.target.closest('[data-kind]'); if (!b || busy || b.disabled) return;
    const row = inventoryRows.find(r => r.id === b.dataset.id); stockEdit = {row:structuredClone(row),kind:b.dataset.kind};
    const label = {receipt:'入庫',count:'棚卸し',adjustment:'増減調整'}[stockEdit.kind]; $('inventoryEditorTitle').textContent = label; $('inventoryProductName').textContent = row.name;
    $('inventoryBefore').textContent = `確認時の在庫：${row.quantity}個 / ${date(row.observedAt)}。更新時に最新値と照合します。`;
    $('inventoryQuantityLabel').textContent = {receipt:'追加する個数',count:'数えた最終在庫数',adjustment:'増減する個数（減らす場合はマイナス）'}[stockEdit.kind];
    $('inventoryQuantity').min = stockEdit.kind === 'adjustment' ? '-100000' : stockEdit.kind === 'receipt' ? '1' : '0'; $('inventoryQuantity').value = ''; $('inventoryReason').value = ''; message('inventoryEditorMessage'); stockPreview(); $('inventoryEditor').showModal();
  };
  $('inventoryQuantity').oninput = stockPreview;
  $('inventoryForm').onsubmit = e => { e.preventDefault(); if (busy || !stockEdit) return;
    const quantity = Number($('inventoryQuantity').value), reason = $('inventoryReason').value.trim(), {row,kind} = stockEdit;
    const target = kind === 'count' ? quantity : row.quantity + quantity;
    if (!Number.isSafeInteger(quantity) || !Number.isSafeInteger(target) || target < 0 || quantity > 100000 || (kind === 'receipt' && quantity <= 0) || (kind === 'count' && quantity < 0) || !reason) { message('inventoryEditorMessage','数量と変更理由を確認してください。','error'); return; }
    if (!confirm(`${row.name}\n${{receipt:'入庫',count:'棚卸し',adjustment:'増減調整'}[kind]}：${row.quantity}個 → ${target}個\n理由：${reason}\nこの内容で更新しますか？`)) return;
    work(async () => {
      const job = await write('/api/admin/inventory/' + row.id,{kind,quantity,reason,expectedQuantity:row.quantity,observedAt:row.observedAt});
      $('inventoryEditor').close(); stockEdit = null; await inventory();
      const text = job.state === 'done' ? `在庫を更新しました：${row.quantity}個 → ${target}個` : '在庫更新は確認中です。販売保留と同期結果を確認してください。'; message('inventoryMessage',text); notify(text); await jobs();
    },'inventoryEditorMessage');
  };
  $('closeInventory').onclick = () => { if (!busy) { $('inventoryEditor').close(); stockEdit = null; } };
  $('inventoryEditor').addEventListener('cancel',e => { if (busy) e.preventDefault(); else stockEdit = null; });
  $('jobList').onclick = e => { const b = e.target.closest('[data-retry],[data-reconcile]'); if (b) work(async () => { await data('/api/admin/jobs/' + (b.dataset.retry || b.dataset.reconcile) + '/' + (b.dataset.retry ? 'retry' : 'reconcile'),{method:'POST',body:'{}'}); await loadProducts(); notify('同期状態を更新しました。'); }); };
  $('reloadProducts').onclick = () => work(loadProducts); $('reloadInventory').onclick = () => work(inventory);
  window.addEventListener('beforeunload',e => { if (dirty || busy) { e.preventDefault(); e.returnValue = ''; } });
  window.addEventListener('pagehide',() => { for (const p of previews.values()) p.then(url => URL.revokeObjectURL(url)).catch(() => {}); previews.clear(); });
})();
