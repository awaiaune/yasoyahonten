// Presentation only: no API, token, storage, shop data or connection configuration.
(() => {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const defaults = Object.freeze({name:'八草屋本店',wordmark:'YASOYA HONTEN',colors:Object.freeze({paper:'#f6f4ee',ink:'#292d28',green:'#405942',soft:'#edf2e9'})});
  const statuses = Object.freeze({draft:'下書き',published:'公開中',stopped:'販売停止',archived:'アーカイブ',queued:'待機',retry:'再試行待ち',running:'同期中',review:'要確認',done:'完了',pending:'発送待ち',shipped:'発送済み',held:'販売保留中'});
  function normalizeBrand(input = {}) {
    const label = (value,fallback) => typeof value === 'string' && value.trim() && value.length <= 80 ? value.trim() : fallback;
    const colors = Object.fromEntries(Object.entries(defaults.colors).map(([key,value]) => [key,typeof input?.colors?.[key] === 'string' && /^#[a-f0-9]{6}$/i.test(input.colors[key]) ? input.colors[key] : value]));
    // Deliberately ignore all other fields, including API URLs, authentication and tenant IDs.
    return Object.freeze({name:label(input?.name,defaults.name),wordmark:label(input?.wordmark,defaults.wordmark),colors:Object.freeze(colors)});
  }
  function applyBrand(root = document, input = window.YASOYA_ADMIN_BRAND) {
    const brand = normalizeBrand(input);
    root.querySelectorAll('[data-brand-name]').forEach(el => el.textContent = brand.name);
    root.querySelectorAll('[data-brand-wordmark]').forEach(el => el.textContent = brand.wordmark);
    for (const [key,value] of Object.entries(brand.colors)) root.documentElement.style.setProperty('--'+key,value);
    return brand;
  }
  const statusBadge = status => `<span class="badge ${Object.hasOwn(statuses,status) ? escape(status) : ''}">${escape(statuses[status] || status)}</span>`;
  const emptyState = text => `<div class="empty">${escape(text)}</div>`;
  const loadingState = text => `<div class="loading-state" role="status">${escape(text)}</div>`;
  function thumbnail(p, className = 'product-photo') {
    const id = p?.draft?.images?.[0];
    return `<span class="${escape(className)}">${id ? `<img data-image="${escape(id)}" alt="${escape(p.draft.alt || p.draft.name)}" loading="lazy">` : '<span class="photo-placeholder">写真未登録</span>'}</span>`;
  }
  function productCard(p, money) {
    const prices = p.draft.variants.map(v => v.price), min = Math.min(...prices), max = Math.max(...prices);
    const amounts = [...new Set(p.draft.variants.map(v => v.amount).filter(Boolean))].join('・');
    return `<article class="product-card"><button class="product-open" data-edit="${escape(p.id)}" aria-label="${escape(p.draft.name)}を編集">${thumbnail(p)}<span class="product-body">${statusBadge(p.status)}<span class="product-name">${escape(p.draft.name)}</span><span class="product-amount">${escape(amounts || p.draft.variants.length+'バリエーション')}</span><span class="price">${money(min)}${min === max ? '' : '〜'}</span></span></button></article>`;
  }

  // Native horizontal scrolling handles touch independently from explicit image-order buttons.
  // This component receives IDs and a loader, and has no knowledge of persistence or authentication.
  function createGallery({track,indicators,position,load}) {
    let ids = [], selected = 0, generation = 0, resizeWidth = 0, frame;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    function announce() {
      position.textContent = ids.length ? `写真 ${selected+1} / ${ids.length}` : '写真未登録';
      indicators.querySelectorAll('button').forEach((b,i) => { if (i === selected) b.setAttribute('aria-current','true'); else b.removeAttribute('aria-current'); });
    }
    function select(index, animate = true) {
      selected = Math.max(0,Math.min(ids.length-1,index));
      track.scrollTo({left:selected*track.clientWidth,behavior:animate && !media.matches ? 'smooth' : 'instant'}); announce();
    }
    function onScroll() {
      cancelAnimationFrame(frame); frame = requestAnimationFrame(() => {
        if (!ids.length || !track.clientWidth) return;
        const index = Math.max(0,Math.min(ids.length-1,Math.round(track.scrollLeft/track.clientWidth)));
        if (selected !== index) { selected = index; announce(); }
      });
    }
    track.addEventListener('scroll',onScroll,{passive:true});
    const onKeyDown = event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return;
      const target = {ArrowRight:selected+1,ArrowLeft:selected-1,Home:0,End:ids.length-1}[event.key];
      if (target !== undefined && ids.length) { event.preventDefault(); select(target); }
    };
    track.addEventListener('keydown',onKeyDown);
    const observer = new ResizeObserver(() => { if (resizeWidth !== track.clientWidth) { resizeWidth = track.clientWidth; select(selected,false); } });
    observer.observe(track);
    return Object.freeze({
      setItems(next, alt, preferredId) {
        const currentId = preferredId || ids[selected]; ids = [...next]; generation++; const revision = generation;
        const found = ids.indexOf(currentId); selected = found >= 0 ? found : Math.max(0,Math.min(selected,ids.length-1));
        track.replaceChildren(); indicators.replaceChildren();
        track.tabIndex = ids.length ? 0 : -1;
        if (!ids.length) { const placeholder = document.createElement('p'); placeholder.className = 'gallery-placeholder'; placeholder.textContent = '写真を追加してください'; track.append(placeholder); }
        for (const [i,id] of ids.entries()) {
          const slide = document.createElement('div'); slide.className = 'gallery-slide'; slide.setAttribute('role','group'); slide.setAttribute('aria-label',`写真 ${i+1} / ${ids.length}`);
          const img = document.createElement('img'); img.alt = alt || '商品写真'; img.draggable = false; slide.append(img); track.append(slide);
          Promise.resolve().then(() => load(id)).then(url => { if (revision === generation) img.src = url; }).catch(() => { if (revision === generation) { const error = document.createElement('p'); error.textContent = '写真を取得できません'; slide.replaceChildren(error); } });
          const dot = document.createElement('button'); dot.type = 'button'; dot.className = 'gallery-dot'; dot.setAttribute('aria-label',`写真${i+1}を表示`); dot.onclick = () => select(i); indicators.append(dot);
        }
        announce(); select(selected,false);
      },
      selectedId:() => ids[selected],
      select,
      destroy() { observer.disconnect(); cancelAnimationFrame(frame); track.removeEventListener('scroll',onScroll); track.removeEventListener('keydown',onKeyDown); }
    });
  }
  window.YasoyaUI = Object.freeze({normalizeBrand,applyBrand,statusBadge,emptyState,loadingState,thumbnail,productCard,createGallery});
})();
