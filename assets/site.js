// Coco De Mer Seychelles: shared behaviour for every page.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const WA = 'https://wa.me/2482595547';
  const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg>';

  /* ---------- Header menu, overlay, scrolled state ---------- */
  const menu = $('.menu'), glow = $('.menu-glow');
  if (menu && glow) {
    $$('a', menu).forEach((a) => a.addEventListener('mouseenter', () => {
      glow.style.width = a.offsetWidth + 'px';
      glow.style.transform = `translateX(${a.offsetLeft - 4}px)`;
      glow.style.left = '4px';
      glow.style.opacity = 1;
    }));
    menu.addEventListener('mouseleave', () => { glow.style.opacity = 0; });
  }
  const overlay = $('[data-menu]'), openBtn = $('[data-menu-open]'), closeBtn = $('[data-menu-close]');
  if (overlay && openBtn) {
    const close = () => { overlay.hidden = true; openBtn.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; openBtn.focus(); };
    openBtn.addEventListener('click', () => {
      overlay.hidden = false; openBtn.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; closeBtn.focus();
    });
    closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !overlay.hidden) close(); });
  }
  const header = $('[data-header]');
  const wa = $('.wa-float');
  const onScroll = () => {
    if (header) header.classList.toggle('scrolled', scrollY > 40);
    if (wa && scrollY > 200) wa.classList.add('show');
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  if (wa) setTimeout(() => wa.classList.add('show'), 2200);
  const y = $('[data-year]');
  if (y) y.textContent = new Date().getFullYear();

  /* ---------- Split headings into letters ---------- */
  let ci = 0;
  const splitNode = (node) => {
    Array.from(node.childNodes).forEach((c) => {
      if (c.nodeType === 3) {
        // words stay unbroken; each letter animates on its own
        const frag = document.createDocumentFragment();
        c.textContent.replace(/\n/g, '').split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span');
          w.className = 'w';
          for (const ch of part) {
            const s = document.createElement('span');
            s.className = 'ch'; s.style.setProperty('--i', ci++); s.textContent = ch;
            w.appendChild(s);
          }
          frag.appendChild(w);
        });
        c.replaceWith(frag);
      } else if (c.nodeType === 1 && !c.classList.contains('ch')) splitNode(c);
    });
  };
  $$('.split').forEach((el) => {
    ci = 0;
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    $$('.ln', el).forEach((ln) => { ln.setAttribute('aria-hidden', 'true'); splitNode(ln); });
  });

  /* ---------- Count-up numbers ---------- */
  const counters = $$('[data-count]');
  counters.forEach((el) => { el.dataset.final = el.textContent; });
  const runCount = (el) => {
    const end = parseFloat(el.dataset.count), pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    const plain = el.hasAttribute('data-plain');
    if (calm) { el.textContent = el.dataset.final; return; }
    const from = plain ? Math.round(end * 0.96) : 0;
    const t0 = performance.now(), dur = 1700;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      const v = Math.round(from + (end - from) * e);
      el.textContent = pre + (plain ? v : v.toLocaleString('en')) + suf;
      if (p < 1) requestAnimationFrame(tick); else el.textContent = el.dataset.final;
    };
    requestAnimationFrame(tick);
  };

  /* ---------- Reveal on scroll ---------- */
  const start = () => {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      el.classList.add('in');
      if (el.hasAttribute('data-count')) runCount(el);
      io.unobserve(el);
    }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    $$('.reveal,.reveal-x,.clip,.split,.map,.timeline,[data-count]').forEach((el) => io.observe(el));
  };

  /* ---------- Loader (first page of a visit) ---------- */
  let seen = false;
  try { seen = sessionStorage.getItem('cdm-seen') === '1'; sessionStorage.setItem('cdm-seen', '1'); } catch (e) { seen = true; }
  if (!seen && !calm) {
    const ld = document.createElement('div');
    ld.className = 'loader';
    ld.innerHTML = '<img src="assets/img/web/logo.png" alt=""><i></i>';
    document.body.appendChild(ld);
    document.body.style.overflow = 'hidden';
    const done = () => {
      ld.classList.add('out');
      document.body.style.overflow = '';
      setTimeout(start, 350);
      setTimeout(() => ld.remove(), 1100);
    };
    const t0 = performance.now();
    const go = () => setTimeout(done, Math.max(0, 1400 - (performance.now() - t0)));
    if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true });
    setTimeout(() => { if (ld.isConnected && !ld.classList.contains('out')) done(); }, 3500);
  } else start();

  /* ---------- Scroll parallax ---------- */
  const px = $$('[data-speed]');
  if (px.length && !calm) {
    let ticking = false;
    const update = () => {
      const vh = innerHeight;
      px.forEach((el) => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        const d = (r.top + r.height / 2 - vh / 2) * parseFloat(el.dataset.speed);
        el.style.translate = `0 ${d.toFixed(1)}px`;
      });
      ticking = false;
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update);
    update();
  }

  /* ---------- Nut cards ---------- */
  const NUTS = window.NUTS || [];
  const rank = { available: 0, reserved: 1, sold: 2 };
  const fmt = (n) => 'US$' + n.toLocaleString('en');
  const dims = (n) => `Width ${n.w} cm · Length ${n.l} cm` + (n.g ? ` · Girth ${n.g} cm` : '');
  const kind = (n) => n.type === 'bowl' ? 'Coco De Mer Bowl' : 'Female nut';
  const card = (n, i) => {
    const st = { available: 'Available', reserved: 'Reserved', sold: 'Sold' }[n.status];
    const cta = n.status === 'available' ? `Reserve this ${n.type === 'bowl' ? 'bowl' : 'nut'}` : n.status === 'reserved' ? 'On hold' : 'Sold';
    const src = `assets/img/web/nuts/${n.img}`;
    return `<a class="nut-card ${n.type} is-${n.status}" href="nut.html?n=${n.id}" style="--n:${i}">
      <div class="nut-media"><span class="status ${n.status}">${st}</span>
        <img class="front" src="${src}-front.webp" alt="${kind(n)} Nº ${n.id}, front" loading="lazy" decoding="async">
        <img class="back" src="${src}-back.webp" alt="" loading="lazy" decoding="async">
        <span class="nut-go">${arrow}</span></div>
      <div class="nut-info"><p class="nut-kind">${kind(n)}</p><h3>Nº ${n.id}</h3><p class="dims">${dims(n)}</p>
        <div class="nut-foot"><b>${fmt(n.price)}</b><span>${cta}</span></div></div></a>`;
  };
  const byStatus = (a, b) => rank[a.status] - rank[b.status];

  $$('[data-nuts]').forEach((box) => {
    const mode = box.dataset.nuts;
    if (mode === 'home') {
      box.innerHTML = NUTS.filter((n) => n.status === 'available').slice(0, 4).map(card).join('');
    }
    if (mode === 'related') {
      const cur = new URLSearchParams(location.search).get('n') || NUTS[0].id;
      box.innerHTML = NUTS.filter((n) => n.id !== cur).sort(byStatus).slice(0, 4).map(card).join('');
    }
    if (mode === 'shop') {
      let filter = 'all', sort = 'featured';
      const chips = $$('[data-filter]');
      const sel = $('[data-sort]');
      const empty = $('.empty-note');
      const counts = { all: NUTS.length, nut: NUTS.filter((n) => n.type === 'nut').length, bowl: NUTS.filter((n) => n.type === 'bowl').length,
        available: NUTS.filter((n) => n.status === 'available').length };
      chips.forEach((c) => { const s = c.querySelector('span'); if (s) s.textContent = counts[c.dataset.filter]; });
      const render = () => {
        let list = NUTS.filter((n) => filter === 'all' || (filter === 'available' ? n.status === 'available' : n.type === filter));
        list.sort((a, b) => byStatus(a, b) || (sort === 'featured' ? (a.type === b.type ? 0 : a.type === 'nut' ? -1 : 1)
          : sort === 'price-desc' ? b.price - a.price : sort === 'size' ? (b.w + b.l) - (a.w + a.l) : a.price - b.price));
        box.classList.remove('flip'); void box.offsetWidth; box.classList.add('flip');
        box.innerHTML = list.map(card).join('');
        if (empty) empty.style.display = list.length ? 'none' : 'block';
      };
      chips.forEach((c) => c.addEventListener('click', () => {
        filter = c.dataset.filter;
        chips.forEach((x) => x.setAttribute('aria-pressed', x === c ? 'true' : 'false'));
        render();
      }));
      if (sel) sel.addEventListener('change', () => { sort = sel.value; render(); });
      render();
    }
  });

  /* ---------- Home hero: nut switcher + pointer parallax ---------- */
  const hh = $('.home-hero');
  if (hh) {
    if (!calm) hh.addEventListener('pointermove', (e) => {
      const r = hh.getBoundingClientRect();
      hh.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
      hh.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
    });
    const img = $('.hh-nut img'), btns = $$('.hh-thumbs button'), num = $('[data-hh-num]'), cap = $('[data-hh-cap]'), bar = $('.hh-count i');
    let idx = 0, timer;
    const show = (i) => {
      idx = (i + btns.length) % btns.length;
      const n = NUTS.find((x) => x.id === btns[idx].dataset.id);
      btns.forEach((b, j) => b.setAttribute('aria-current', j === idx ? 'true' : 'false'));
      if (num) num.textContent = String(idx + 1).padStart(2, '0');
      if (bar) bar.style.setProperty('--p', (idx + 1) / btns.length);
      img.classList.add('out');
      setTimeout(() => {
        img.src = `assets/img/web/nuts/${n.img}-front.webp`;
        img.alt = `${kind(n)} Nº ${n.id}`;
        if (cap) cap.innerHTML = `<b>${kind(n)} Nº ${n.id}</b>W ${n.w} × L ${n.l} cm · ${fmt(n.price)}`;
        $('.hh-nut').href = `nut.html?n=${n.id}`;
        requestAnimationFrame(() => img.classList.remove('out'));
      }, calm ? 0 : 420);
    };
    const auto = () => { clearInterval(timer); if (!calm) timer = setInterval(() => show(idx + 1), 6000); };
    btns.forEach((b, j) => b.addEventListener('click', () => { show(j); auto(); }));
    if (btns.length) { btns.forEach((b) => { const s = b.querySelector('img'); }); auto(); }
  }

  /* ---------- Testimonial map ---------- */
  const map = $('.map');
  if (map) {
    const pop = $('.map-pop', map);
    const pins = $$('.pin[data-r]', map);
    let cycle, user = false, cur = -1;
    const hot = (key, on) => {
      pins.forEach((p) => p.classList.toggle('hot', on && p.dataset.r === key));
      $$('.arc', map).forEach((a) => a.classList.toggle('hot', on && a.dataset.r === key));
      $$('.review').forEach((r) => r.classList.toggle('hot', on && r.dataset.review === key));
      const pin = pins.find((p) => p.dataset.r === key);
      const rev = $(`.review[data-review="${key}"]`);
      if (!on || !pin || !rev) { pop.classList.remove('show'); return; }
      pop.innerHTML = `<img src="${$('img', rev).src}" alt=""><div><p>“${rev.dataset.short}”</p><b>${rev.dataset.who}</b></div>`;
      let x = parseFloat(pin.dataset.x), yv = parseFloat(pin.dataset.y);
      const w = map.clientWidth, half = Math.min(150, w * 0.4);
      const left = Math.min(Math.max(x / 100 * w, half + 8), w - half - 8);
      pop.style.left = left + 'px';
      pop.style.top = yv + '%';
      pop.classList.add('show');
    };
    const keys = pins.map((p) => p.dataset.r);
    const startCycle = () => {
      if (calm) return;
      cycle = setInterval(() => { if (user) return; cur = (cur + 1) % keys.length; hot(keys[cur], true); }, 3800);
    };
    pins.forEach((p) => {
      p.addEventListener('mouseenter', () => { user = true; hot(p.dataset.r, true); });
      p.addEventListener('mouseleave', () => { user = false; hot(p.dataset.r, false); });
      p.addEventListener('click', () => { user = true; hot(p.dataset.r, true); });
      p.addEventListener('focus', () => { user = true; hot(p.dataset.r, true); });
      p.addEventListener('blur', () => { user = false; hot(p.dataset.r, false); });
    });
    $$('.review[data-review]').forEach((r) => {
      r.addEventListener('mouseenter', () => { user = true; hot(r.dataset.review, true); });
      r.addEventListener('mouseleave', () => { user = false; hot(r.dataset.review, false); });
    });
    new IntersectionObserver((en, o) => { if (en[0].isIntersecting) { setTimeout(startCycle, 2600); o.disconnect(); } }, { threshold: 0.3 }).observe(map);
  }
  $$('.review .rm').forEach((b) => b.addEventListener('click', () => {
    const r = b.closest('.review'); r.classList.toggle('open');
    b.textContent = r.classList.contains('open') ? 'Show less' : 'Read more';
  }));

  /* ---------- Nut detail page ---------- */
  if (document.body.dataset.page === 'nut' && NUTS.length) {
    const id = new URLSearchParams(location.search).get('n');
    const n = NUTS.find((x) => x.id === id) || NUTS[0];
    const thing = n.type === 'bowl' ? 'bowl' : 'nut';
    const set = (k, v) => $$(`[data-f="${k}"]`).forEach((el) => { el.textContent = v; });
    document.title = `${kind(n)} Nº ${n.id} · Coco De Mer Seychelles`;
    set('kind', n.type === 'bowl' ? 'Coco De Mer Bowl · Certified' : 'Female nut · Certified');
    set('crumb-kind', n.type === 'bowl' ? 'Bowls' : 'Female nuts');
    set('no', `Nº ${n.id}`);
    set('desc', n.desc + ' Registered with the Seychelles government and sealed with its own number, ready for its new home anywhere in the world.');
    set('price', fmt(n.price));
    set('w', n.w + ' cm'); set('l', n.l + ' cm'); set('g', n.g ? n.g + ' cm' : '—');
    set('thing', thing);
    const pill = $('[data-f="status"]');
    pill.textContent = { available: 'Available', reserved: 'Reserved', sold: 'Sold' }[n.status];
    pill.className = 'pill ' + n.status;
    const msg = encodeURIComponent(`Hello! I'd like to ask about Coco de Mer ${n.type === 'bowl' ? 'Bowl' : 'nut'} Nº ${n.id}.`);
    $$('[data-wa-nut]').forEach((a) => { a.href = `${WA}?text=${msg}`; });
    const hid = $('input[name="nut"]'); if (hid) hid.value = n.id;
    if (n.status !== 'available') {
      const rb = $('[data-reserve-btn]');
      if (rb) { rb.textContent = n.status === 'sold' ? 'This one has found its home' : 'On hold for another collector'; rb.removeAttribute('href'); rb.style.pointerEvents = 'none'; rb.style.opacity = '.55'; }
      const form = $('#reserve-form'), done = $('#reserve-closed');
      if (form && done) { form.hidden = true; done.classList.add('show'); }
      const rt = $('[data-f="reserve-title"]'), rl = $('[data-f="reserve-lede"]');
      if (rt) rt.textContent = n.status === 'sold' ? 'This one has found its home.' : 'On hold for another collector.';
      if (rl) rl.textContent = 'Every Coco de Mer is one of a kind, but there are more waiting for you. New nuts are registered in batches, so ask us about the next one.';
    }
    // gallery
    const views = [
      { k: 'front', label: 'Front', cut: true }, { k: 'back', label: 'Back', cut: true },
      { k: 'seal', label: 'Seal' }, { k: 'ruler', label: 'Measured' }
    ];
    const stage = $('.nd-stage img'), thumbs = $('.nd-thumbs');
    const src = (v) => `assets/img/web/nuts/${n.img}-${v.k}.webp`;
    thumbs.innerHTML = views.map((v, i) => `<button type="button" class="${v.cut ? 'cut' : ''}" aria-current="${i === 0}" data-v="${i}"><span><img src="${src(v)}" alt="" loading="lazy"></span>${v.label}</button>`).join('');
    stage.src = src(views[0]); stage.className = 'cut'; stage.alt = `${kind(n)} Nº ${n.id}, front`;
    $$('button', thumbs).forEach((b) => b.addEventListener('click', () => {
      const v = views[+b.dataset.v];
      $$('button', thumbs).forEach((x) => x.setAttribute('aria-current', x === b ? 'true' : 'false'));
      stage.classList.add('leaving');
      setTimeout(() => {
        stage.src = src(v); stage.className = (v.cut ? 'cut' : 'photo') + ' entering'; stage.alt = `${kind(n)} Nº ${n.id}, ${v.label.toLowerCase()}`;
        requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.remove('entering')));
      }, calm ? 0 : 300);
    }));
    $$('[data-src]').forEach((el) => { el.src = `assets/img/web/nuts/${n.img}-${el.dataset.src}.webp`; });
    const zb = $('.zoom-box');
    if (zb) {
      const open = () => { $('img', zb).src = stage.src.replace(/-(front|back)\.webp$/, '-$1.webp'); zb.classList.add('show'); };
      $('.nd-zoom').addEventListener('click', open);
      zb.addEventListener('click', () => zb.classList.remove('show'));
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') zb.classList.remove('show'); });
    }
  }

  /* ---------- Kernel order ---------- */
  const order = $('#kernel-order');
  if (order) {
    const total = $('[data-total]');
    const calc = () => {
      let kg = 0;
      $$('.orow', order).forEach((r) => { if ($('input[type=checkbox]', r).checked) kg += +$('output', r).dataset.kg; });
      total.textContent = kg ? `Total so far: ${kg} kg` : 'Choose at least one cut (1 kg minimum)';
      return kg;
    };
    $$('.orow', order).forEach((r) => {
      const out = $('output', r);
      $$('.qty button', r).forEach((b) => b.addEventListener('click', () => {
        out.dataset.kg = Math.max(1, +out.dataset.kg + (+b.dataset.step));
        out.textContent = out.dataset.kg + ' kg';
        calc();
      }));
      $('input[type=checkbox]', r).addEventListener('change', calc);
    });
    $$('[data-add]').forEach((b) => b.addEventListener('click', (e) => {
      e.preventDefault();
      const box = $(`#cut-${b.dataset.add}`);
      box.checked = !box.checked;
      b.classList.toggle('on', box.checked);
      b.innerHTML = box.checked ? 'Added ✓' : 'Add to request +';
      calc();
    }));
    order.addEventListener('submit', (e) => { if (!calc()) { e.preventDefault(); e.stopImmediatePropagation(); total.textContent = 'Please choose at least one cut (1 kg minimum).'; } }, true);
    calc();
  }

  /* ---------- Demo forms (preview only: nothing is sent) ---------- */
  $$('form[data-demo]').forEach((f) => f.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!f.checkValidity()) { f.reportValidity(); return; }
    const done = f.nextElementSibling;
    f.hidden = true;
    if (done && done.classList.contains('form-done')) { done.classList.add('show'); done.setAttribute('tabindex', '-1'); done.focus(); }
  }));

  /* ---------- Journal filter ---------- */
  const jchips = $$('[data-cat-filter]');
  if (jchips.length) {
    jchips.forEach((c) => c.addEventListener('click', () => {
      const cat = c.dataset.catFilter;
      jchips.forEach((x) => x.setAttribute('aria-pressed', x === c ? 'true' : 'false'));
      $$('.post').forEach((p, i) => {
        const show = cat === 'all' || p.dataset.cat === cat;
        p.classList.toggle('hide', !show);
        if (show && !calm) { p.style.animation = 'none'; void p.offsetWidth; p.style.animation = `cardIn .6s var(--ease-out) ${i % 6 * 50}ms both`; }
      });
    }));
  }
})();
