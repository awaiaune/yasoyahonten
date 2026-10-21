(() => {
  'use strict';
  const A = window.YasoyaAdmin;
  const {$,esc,money,date,data,write,message,notify} = A;
  const screens = ['homePanel','ordersPanel','productsPanel','inventoryPanel'];
  const statusNames = {draft:'下書き',published:'公開中',stopped:'販売停止',archived:'アーカイブ',queued:'待機',retry:'再試行待ち',running:'同期中',review:'要確認',done:'完了'};
  let products = [], current = null, busy = false, dirty = false, activePanel = 'homePanel', inventoryRows = [], stockEdit = null, homeGeneration = 0;
  const previews = new Map();
  const stateBadge = status => `<span class="badge ${esc(status)}">${esc(statusNames[status] || status)}</span>`;
  const empty = text => `<div class="empty">${esc(text)}</div>`;
  function setDirty(value) { dirty = value; $('dirtyStatus').textContent = value ? '未保存の変更あり' : '保存済み'; $('dirtyStatus').className = 'badge ' + (value ? 'draft' : 'done'); }
  async function work(fn, place = activePanel === 'inventoryPanel' ? 'inventoryMessage' : activePanel === 'homePanel' ? 'homeMessage' : 'managementMessage') {
    if (busy) return; busy = true;
    const controls = [...document.querySelectorAll('#app button, dialog button, #logout')].map(button => [button,button.disabled]);
    controls.forEach(([button]) => button.disabled = true); $('productForm').inert = true; $('inventoryForm').inert = true;
    $(activePanel).setAttribute('aria-busy','true'); message(place,'処理しています…','loading');
    try { await fn(); if ($(place).dataset.state === 'loading') message(place,'最新の情報を表示しています。'); }
    catch (error) { message(place,error.message,'error'); notify(error.message,'error'); }
    finally { busy = false; $('productForm').inert = false; $('inventoryForm').inert = false; screens.forEach(id => $(id).setAttribute('aria-busy','false')); controls.forEach(([button,disabled]) => { if (button.isConnected) button.disabled = disabled; }); }
  }
  async function preview(id) {
    if (!previews.has(id)) { const pending = A.api('/api/admin/images/' + id).then(r => r.blob()).then(blob => URL.createObjectURL(blob)); previews.set(id,pending); pending.catch(() => previews.delete(id)); }
    return previews.get(id);
  }
  function photo(p, className = 'product-photo') {
    const id = p?.draft?.images?.[0]; return `<div class="${className}">${id ? `<img data-image="${esc(id)}" alt="${esc(p.draft.alt || p.draft.name)}" loading="lazy">` : '<span>写真未登録</span>'}</div>`;
  }
  function hydrate(root = document) { root.querySelectorAll('img[data-image]').forEach(img => preview(img.dataset.image).then(url => { if (img.isConnected) img.src = url; }).catch(() => { img.replaceWith(Object.assign(document.createElement('span'),{textContent:'写真を取得できません'})); })); }
  function filterProducts() {
    const term = $('productSearch').value.normalize('NFKC').toLocaleLowerCase('ja-JP').trim(), filter = $('productFilter').value;
    const filtered = products.filter(p => (filter === 'all' || p.status === filter) && [p.draft.name,...p.draft.variants.map(v => v.name)].join(' ').normalize('NFKC').toLocaleLowerCase('ja-JP').includes(term));
    $('productCount').textContent = `${filtered.length}件を表示 / 登録 ${products.length}件`;
    $('productList').innerHTML = filtered.map(p => {
      const prices = p.draft.variants.map(v => v.price), min = Math.min(...prices), max = Math.max(...prices);
      return `<article class="product-card">${photo(p)}<div class="product-body">${stateBadge(p.status)}<h2>${esc(p.draft.name)}</h2><p class="price">${money(min)}${min === max ? '' : '〜'}</p><div class="product-footer"><small>${p.draft.variants.length}バリエーション</small><button class="secondary" data-edit="${esc(p.id)}" aria-label="${esc(p.draft.name)}を編集">編集</button></div></div></article>`;
    }).join('') || empty(products.length ? '条件に一致する商品がありません。検索や状態を変更してください。' : 'まだ商品がありません。「商品登録」から始めましょう。'); hydrate($('productList'));
  }
  async function jobs() {
    const [result,audit] = await Promise.all([data('/api/admin/jobs'),data('/api/admin/audit')]);
    $('jobList').innerHTML = result.jobs.map(j => `<div class="management-card">${stateBadge(j.state)} <strong>${esc({publish:'商品公開',state:'販売状態の変更',stock:'在庫変更'}[j.kind] || j.kind)}</strong><small>${date(j.updatedAt)}</small><p>${esc(j.error || '')}</p>${j.state === 'retry' ? `<button data-retry="${esc(j.id)}">同じ操作を再試行</button>` : ''}${j.state === 'review' ? `<p class="held">競合や期限切れです。上書きせず照合します。</p><button data-reconcile="${esc(j.id)}">同期結果を照合</button>` : ''}</div>`).join('') || empty('同期処理はありません。');
    $('auditList').innerHTML = audit.events.map(e => `<div class="management-card"><strong>${esc({draft_saved:'下書き保存',job_queued:'同期開始',job_completed:'同期完了',sandbox_linked:'Sandbox関連付け',stopped:'販売停止',archived:'アーカイブ'}[e.action] || e.action)}</strong><small>${esc(e.resource_id)} / ${date(e.created_at)}</small></div>`).join('') || empty('変更履歴はありません。');
  }
  async function loadProducts() { const r = await data('/api/admin/products'); products = r.products; filterProducts(); await jobs(); }
  function recentMarkup(o) { return `<button class="recent-order" data-order="${esc(o.order_reference)}"><span class="row"><strong>${esc(o.contact.familyName)} ${esc(o.contact.givenName)} 様</strong>${A.badge(o.status)}</span><span class="row"><small>${date(o.created_at)}</small><strong>${money(o.total)}</strong></span><small>${esc(o.order_reference)}</small></button>`; }
  async function home() {
    const generation = ++homeGeneration;
    ['homePending','homeProducts','homeLowStock'].forEach(id => $(id).textContent = '—');
    $('recentOrders').innerHTML = empty('注文を読み込んでいます…'); $('lowStockList').innerHTML = empty('在庫を確認しています…');
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
  $('today').textContent = new Intl.DateTimeFormat('ja-JP',{month:'long',day:'numeric',weekday:'long',timeZone:'Asia/Tokyo'}).format(new Date()) + ' / SHOP OVERVIEW';
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
  async function drawImages() {
    const list = $('imageList'); list.replaceChildren();
    for (const [i,id] of current.draft.images.entries()) {
      const div = document.createElement('div'); div.className = 'image-entry'; const img = document.createElement('img'); img.alt = current.draft.alt || current.draft.name || '商品写真'; div.append(img);
      preview(id).then(url => img.src = url).catch(() => img.alt = '写真を取得できません');
      const controls = document.createElement('div'); controls.className = 'image-controls'; div.append(controls);
      for (const [label,accessible,disabled,action] of [
        ['↑',`写真${i+1}を前へ`,i === 0,() => [current.draft.images[i-1],current.draft.images[i]] = [id,current.draft.images[i-1]]],
        ['↓',`写真${i+1}を後ろへ`,i === current.draft.images.length-1,() => [current.draft.images[i+1],current.draft.images[i]] = [id,current.draft.images[i+1]]],
        ['外す',`写真${i+1}を外す`,false,() => current.draft.images.splice(i,1)]]) {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.setAttribute('aria-label',accessible); b.disabled = disabled;
        b.onclick = () => { if (busy) return; capture(); action(); setDirty(true); drawImages(); }; controls.append(b);
      }
      list.append(div);
    }
    if (!current.draft.images.length) list.innerHTML = '<p class="hint">写真を追加すると、ここにプレビューが表示されます。</p>';
  }
  function draw() {
    const f = $('productForm'); for (const key of ['name','description','sortOrder','alt']) f.elements.namedItem(key).value = current.draft[key] ?? '';
    f.elements.namedItem('slug').value = current.slug; f.elements.namedItem('slug').disabled = current.version > 0;
    $('editorTitle').textContent = current.version ? '商品を編集' : '新しい商品'; $('editorProductStatus').textContent = statusNames[current.status] || '下書き';
    $('variantList').innerHTML = current.draft.variants.map((v,i) => `<fieldset data-id="${esc(v.id)}"><legend>バリエーション ${i+1}</legend><label>バリエーション名<input name="vname" maxlength="120" value="${esc(v.name)}" required placeholder="例：乾燥ハーブ 10g"></label><div class="form-grid"><label>価格（円）<input name="price" type="number" inputmode="numeric" min="1" max="10000000" value="${v.price}" required></label><label>内容量<input name="amount" maxlength="120" value="${esc(v.amount)}" placeholder="例：10g"></label></div><div class="form-grid"><label>購入上限<input name="max" type="number" inputmode="numeric" min="1" max="10" value="${v.maxQuantity}" required></label><label class="checkbox-label"><input name="active" type="checkbox" ${v.active ? 'checked' : ''}>販売対象</label></div></fieldset>`).join('');
    drawImages(); message('editorMessage');
  }
  function open(p) { if (busy) return; current = structuredClone(p); setDirty(false); $('imageFiles').value = ''; draw(); $('productEditor').showModal(); }
  function newProduct() { open({id:crypto.randomUUID(),slug:'',version:0,status:'draft',draft:{name:'',description:'',alt:'',sortOrder:0,images:[],variants:[{id:crypto.randomUUID(),name:'',amount:'',price:980,maxQuantity:10,active:true}]}}); }
  $('newProduct').onclick = newProduct; $('homeNewProduct').onclick = newProduct;
  $('importProducts').onclick = () => { if (confirm('既存3商品の説明・写真を下書きとして取り込みます。公開やSquareへの書込みは行いません。')) work(async () => { await write('/api/admin/products/import',{}); await loadProducts(); notify('下書きとして取り込みました。'); }); };
  $('productList').onclick = e => { const b = e.target.closest('[data-edit]'); if (b) open(products.find(p => p.id === b.dataset.edit)); };
  $('productForm').addEventListener('input',() => setDirty(true));
  $('addVariant').onclick = () => { capture(); if (current.draft.variants.length >= 20) { message('editorMessage','バリエーションは20件までです。','error'); return; } current.draft.variants.push({id:crypto.randomUUID(),name:'',price:980,amount:'',maxQuantity:10,active:true}); setDirty(true); draw(); };
  $('productForm').onsubmit = e => { e.preventDefault(); work(async () => {
    capture(); const result = await write('/api/admin/products/' + current.id,{...current.draft,slug:current.slug,expectedVersion:current.version},'PUT');
    current.version = result.version; current.draft_revision = result.revision; $('productForm').elements.namedItem('slug').disabled = true; setDirty(false);
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
  $('imageFiles').onchange = () => work(async () => {
    capture(); for (const file of $('imageFiles').files) {
      if (current.draft.images.length >= 10) throw Error('写真は10枚までです。'); if (file.size > 30*1024*1024) throw Error('元の写真は30MB以下にしてください。');
      let bitmap; try { bitmap = await createImageBitmap(file); } catch { throw Error('写真を変換できません。JPEG/PNG/WebPで選び直してください。'); }
      const scale = Math.min(1,2000/Math.max(bitmap.width,bitmap.height)), canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width*scale); canvas.height = Math.round(bitmap.height*scale); canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height); bitmap.close();
      const blob = await new Promise(resolve => canvas.toBlob(resolve,'image/jpeg',.85)); if (!blob) throw Error('写真の変換に失敗しました。');
      const result = await data('/api/admin/images',{method:'POST',headers:{'Content-Type':'image/jpeg'},body:blob}); if (!current.draft.images.includes(result.id)) current.draft.images.push(result.id); setDirty(true); await drawImages();
    }
    $('imageFiles').value = ''; message('editorMessage','写真を追加しました。下書きを保存すると商品に反映されます。');
  },'editorMessage');

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
