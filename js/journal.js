/* Escale : le journal en carnet qui s'ouvre.
 *
 * Étagère de carnets (un par voyage) et mur de souvenirs façon Pinterest sur l'écran Journal.
 * Un carnet s'ouvre en 3D, se feuillette page par page (un jour = une page), et en mode
 * modification on y ajoute photos, textes et stickers (émojis, masking tape, étiquettes,
 * et stickers découpés dans ses propres photos). Les albums partagés par les amis
 * s'ouvrent dans le même carnet, en lecture seule.
 */
'use strict';
const STK = {
  e: ['✈️', '🌍', '🗺️', '🧳', '📸', '🏝️', '🏔️', '🌅', '🌊', '🌴', '🗼', '🏛️', '⛩️', '🚆', '⛵', '🚲', '🍝', '🍣', '🥐', '🍹', '☕', '🍦', '🌸', '🌻', '☀️', '🌙', '⭐', '✨', '❤️', '💌', '🎒', '🎟️'],
  w: ['#F3C979', '#E8A9B8', '#A9C4AF', '#9EC3E6', '#C9B6E4', '#F2A68B'],
  t: ['#2E5E3E', '#B8452C', '#3C6E8F', '#20243A', '#B07A2A'],
  sh: [['circle', 'Rond'], ['heart', 'Cœur'], ['star', 'Étoile'], ['stamp', 'Timbre'], ['square', 'Carré']],
};
let BK = null; // { book, i, edit, sel, busy }
const reduced = () => typeof REDUCED !== 'undefined' && REDUCED;
const r1 = n => Math.round(n * 10) / 10;

/* ---------- données d'un carnet ---------- */
function bookOfTrip(t) {
  return { own: true, tripId: t.id, title: place(t), country: C(t).n, pays: t.pays, du: t.du, au: t.au, cover: t.cover,
    pages: [{ kind: 'intro' }, ...t.entrees.map(e => ({ kind: 'day', e })), { kind: 'add' }] };
}
function bookOfAlbum(a) {
  const pays = a.country_code, c = COUNTRIES[pays] || {};
  return { own: false, title: a.city || c.n || pays, country: c.n || pays, pays, du: a.start_date, au: a.end_date, cover: a.cover_path,
    pages: [{ kind: 'intro' }, ...(a.entries || []).map(x => ({ kind: 'day', e: { id: 'a' + x.day, j: x.day, t: x.title, d: x.description || '', n: x.note || '', photos: x.photos || [], st: x.stickers || [] } }))] };
}
const bookTrip = () => BK && BK.book.own ? trip(BK.book.tripId) : null;
const curEntry = () => { const p = BK && BK.book.pages[BK.i]; return p && p.kind === 'day' ? p.e : null; };
const nDays = b => Math.max(1, Math.round((D(b.au) - D(b.du)) / 864e5) + 1);

/* ---------- rendu d'un sticker et d'une page ---------- */
function stickerHTML(s, i, edit) {
  const st = `left:${s.x}%;top:${s.y}%;--r:${s.r || 0}deg;--s:${s.s || 1}`;
  const inner = s.k === 'e' ? `<span class="se">${esc(s.v || '⭐')}</span>`
    : s.k === 'w' ? `<span class="sw" style="--c:${esc(s.c || '#F3C979')}"></span>`
    : s.k === 't' ? `<span class="sl" style="--c:${esc(s.c || '#2E5E3E')}">${esc(s.v || '')}</span>`
    : `<span class="sp sh-${esc(s.sh || 'circle')}"><span class="cut">${IMG(s.p)}</span></span>`;
  return `<div class="stk ${edit ? 'ed' : ''} ${BK && BK.sel === i ? 'sel' : ''}" data-si="${i}" style="${st}">${inner}</div>`;
}
function pageHTML(b, p, idx) {
  const edit = BK && BK.edit && b.own, n = b.pages.length;
  const foot = `<div class="pg-foot"><span>${esc(b.title)}</span><span class="num">${idx + 1} / ${n}</span></div>`;
  if (p.kind === 'intro') {
    const days = b.pages.filter(x => x.kind === 'day'), photos = days.reduce((a, x) => a + x.e.photos.filter(Boolean).length, 0);
    return `<div class="pg intro"><p class="pg-kicker">Carnet de voyage</p><h2 class="pg-h">${esc(b.title)}</h2>
      <p class="pg-sub">${flag(b.pays)} ${esc(b.country)}, du ${fd(b.du)} au ${fd(b.au)} ${D(b.du).getFullYear()}</p>
      <figure class="pola big" style="--rot:-3deg">${b.cover ? IMG(b.cover) : `<span class="ph-empty">${SV.img}</span>`}<i class="tape"></i></figure>
      <p class="pg-stats num"><b>${nDays(b)}</b> jours <span>·</span> <b>${days.length}</b> page${days.length > 1 ? 's' : ''} <span>·</span> <b>${photos}</b> photo${photos > 1 ? 's' : ''}</p>
      ${days.length ? `<ol class="pg-toc">${days.map(x => `<li><button data-act="bkGo" data-i="${b.pages.indexOf(x)}"><span class="num">Jour ${x.e.j}</span><b>${esc(x.e.t)}</b></button></li>`).join('')}</ol>` : `<p class="pg-hand">Ton carnet est encore vide. Tourne la page pour écrire ton premier jour.</p>`}${foot}</div>`;
  }
  if (p.kind === 'add') return `<div class="pg add"><p class="pg-hand">Une nouvelle journée à raconter ?</p><button class="btn2 g" data-act="bkNewPage">${SV.plus}Ajouter une page</button>${foot}</div>`;
  const e = p.e, date = addDays(b.du, e.j - 1), dn = D(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const ph = e.photos.map((x, i) => ({ x, i })).filter(o => o.x || edit), cnt = Math.min(ph.length, 6), rots = [-4, 3, -2, 5, -5, 2];
  const t = bookTrip();
  return `<div class="pg day" data-entry="${esc(e.id)}"><p class="pg-kicker">Jour ${e.j} · ${esc(dn)}</p><h2 class="pg-h">${esc(e.t)}</h2>${e.d ? `<p class="pg-desc">${esc(e.d)}</p>` : ''}
    ${cnt ? `<div class="pg-ph n${cnt}">${ph.slice(0, 6).map((o, k) => `<figure class="pola" style="--rot:${rots[k]}deg">${o.x ? IMG(o.x) : `<button class="ph-empty" data-photo="${t ? `${t.id}|e|${e.id}|${o.i}` : ''}" aria-label="Ajouter une photo">${SV.cam}</button>`}<i class="tape t${k % 3}"></i></figure>`).join('')}</div>` : ''}
    ${e.n ? `<div class="pg-note">${esc(e.n)}</div>` : edit ? `<button class="pg-note empty" data-act="bkText">Touche ici pour écrire ta journée…</button>` : ''}
    <div class="pg-stk">${(e.st || []).map((s, i) => stickerHTML(s, i, edit)).join('')}</div>${foot}</div>`;
}

/* ---------- ouverture, fermeture, feuilletage ---------- */
function openBook(book, start = 0) {
  BK = { book, i: Math.min(start, book.pages.length - 1), edit: false, sel: null, busy: false };
  let el = $('book'); if (!el) { el = document.createElement('div'); el.id = 'book'; $('phone').appendChild(el); }
  el.className = 'book-ov'; el.hidden = false;
  el.innerHTML = `<div class="bk-top"><button class="bk-ic" data-act="bkClose" aria-label="Fermer le carnet">${SV.x}</button><div class="bk-tt"><b>${esc(book.title)}</b><span>${fd(book.du)} au ${fd(book.au)}</span></div>${book.own ? `<button class="bk-ic" data-act="bkEdit" aria-label="Modifier la page">${SV.edit || SV.plus}</button>` : '<span class="bk-ic ghost"></span>'}</div>
    <div class="bk-stage" id="bkStage"><div class="bk-book" id="bkBook"><div class="bk-leaf under" id="bkUnder"></div><div class="bk-leaf top" id="bkTop"></div>
      <div class="bk-cover" id="bkCover"><div class="front">${book.cover ? IMG(book.cover) : ''}<span class="shade"></span><span class="lbl"><em>Carnet de voyage</em><b>${esc(book.title)}</b><i>${flag(book.pays)} ${D(book.du).getFullYear()}</i></span><span class="band"></span></div><div class="back"></div></div></div></div>
    <div class="bk-bot" id="bkBot"></div>`;
  bkRender();
  const cv = $('bkCover');
  if (start > 0 || reduced()) cv.remove();
  else requestAnimationFrame(() => setTimeout(() => { cv.classList.add('open'); setTimeout(() => cv.remove(), 1000); }, 250));
  bindBookGestures();
}
function bkRender() {
  if (!BK || !$('bkTop')) return;
  if (BK.book.own) { const t = bookTrip(); if (!t) { closeBook(); return; } const cur = BK.book.pages[BK.i]; BK.book = bookOfTrip(t); if (cur && cur.kind === 'day') { const k = BK.book.pages.findIndex(x => x.kind === 'day' && x.e.id === cur.e.id); if (k >= 0) BK.i = k; } BK.i = Math.min(BK.i, BK.book.pages.length - 1); }
  $('bkTop').innerHTML = pageHTML(BK.book, BK.book.pages[BK.i], BK.i); $('bkUnder').innerHTML = '';
  $('book').classList.toggle('editing', !!BK.edit);
  bkBar();
}
function bkBar() {
  const n = BK.book.pages.length, e = curEntry(), s = e && BK.sel != null ? (e.st || [])[BK.sel] : null;
  $('bkBot').innerHTML = BK.edit && e ? (s ? `<div class="bk-tools"><button data-act="bkStk" data-op="small" aria-label="Plus petit">−</button><button data-act="bkStk" data-op="big" aria-label="Plus grand">+</button><button data-act="bkStk" data-op="left" aria-label="Tourner à gauche">↺</button><button data-act="bkStk" data-op="right" aria-label="Tourner à droite">↻</button><button data-act="bkStk" data-op="front" aria-label="Mettre devant">⧉</button><button data-act="bkStk" data-op="del" class="red" aria-label="Retirer le sticker">${SV.trash}</button><button data-act="bkStk" data-op="ok" class="ok">OK</button></div>`
      : `<div class="bk-tools wide"><button data-act="bkText">${SV.edit || ''}<span>Texte</span></button><button data-act="bkPhoto">${SV.cam}<span>Photo</span></button><button data-act="bkStickers">${SV.smile || '☺'}<span>Sticker</span></button><button data-act="bkEdit" class="ok"><span>Terminé</span></button></div><p class="bk-hint">Fais glisser un sticker pour le placer, touche-le pour le régler.</p>`)
    : `<div class="bk-nav"><button class="bk-ic" data-act="bkPrev" aria-label="Page précédente" ${BK.i ? '' : 'disabled'}>${SV.back}</button><div class="bk-dots">${BK.book.pages.map((_, k) => `<i class="${k === BK.i ? 'on' : ''}"></i>`).join('')}</div><button class="bk-ic" data-act="bkNext" aria-label="Page suivante" ${BK.i < n - 1 ? '' : 'disabled'}>${SV.right}</button></div>`;
}
function closeBook() { const el = $('book'); if (el) { el.classList.add('closing'); setTimeout(() => { el.hidden = true; el.innerHTML = ''; el.classList.remove('closing'); }, reduced() ? 0 : 280); } BK = null; }
/** Tourne la page : la feuille se soulève depuis la reliure et découvre la suivante. */
function flipTo(k) {
  if (!BK || BK.busy || k < 0 || k >= BK.book.pages.length || k === BK.i) return;
  const next = k > BK.i, top = $('bkTop'), under = $('bkUnder'), html = pageHTML(BK.book, BK.book.pages[k], k);
  BK.sel = null;
  if (reduced() || !top.animate) { BK.i = k; bkRender(); return; }
  BK.busy = true;
  if (next) { under.innerHTML = html; const a = top.animate([{ transform: 'rotateY(0deg)', filter: 'brightness(1)' }, { transform: 'rotateY(-178deg)', filter: 'brightness(.75)' }], { duration: 650, easing: 'cubic-bezier(.45,.05,.3,1)' });
    a.onfinish = () => { BK.i = k; top.innerHTML = html; under.innerHTML = ''; BK.busy = false; bkBar(); }; }
  else { under.innerHTML = top.innerHTML; top.innerHTML = html; const a = top.animate([{ transform: 'rotateY(-178deg)', filter: 'brightness(.75)' }, { transform: 'rotateY(0deg)', filter: 'brightness(1)' }], { duration: 650, easing: 'cubic-bezier(.45,.05,.3,1)' });
    a.onfinish = () => { BK.i = k; under.innerHTML = ''; BK.busy = false; bkBar(); }; }
}

/* ---------- gestes : balayer pour tourner, glisser et pincer les stickers ---------- */
function bindBookGestures() {
  const stage = $('bkStage'); if (!stage) return;
  const pts = new Map(); let sw = null, drag = null, pin = null;
  const pageRect = () => $('bkTop').getBoundingClientRect();
  stage.addEventListener('pointerdown', e => {
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const st = e.target.closest('.stk');
    if (BK && BK.edit && st) { const i = +st.dataset.si, s = curEntry().st[i]; if (BK.sel !== i) { BK.sel = i; document.querySelectorAll('#bkTop .stk').forEach(x => x.classList.toggle('sel', +x.dataset.si === i)); bkBar(); }
      if (pts.size === 1) drag = { i, x0: e.clientX, y0: e.clientY, sx: s.x, sy: s.y, moved: false };
      e.preventDefault(); try { stage.setPointerCapture(e.pointerId); } catch (_) { } }
    if (BK && BK.edit && pts.size === 2 && BK.sel != null) { const [a, b] = [...pts.values()], s = curEntry().st[BK.sel]; pin = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, ang: Math.atan2(b.y - a.y, b.x - a.x), s: s.s || 1, r: s.r || 0 }; drag = null; }
    if (BK && !BK.edit && pts.size === 1) sw = { x: e.clientX, y: e.clientY };
  });
  stage.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pin && pts.size >= 2) { const [a, b] = [...pts.values()], s = curEntry().st[BK.sel], d = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
      s.s = r1(Math.max(0.3, Math.min(4, pin.s * d / pin.d))); s.r = Math.round(pin.r + (ang - pin.ang) * 180 / Math.PI); styleSel(); return; }
    if (drag) { const r = pageRect(), s = curEntry().st[drag.i]; s.x = r1(Math.max(-5, Math.min(105, drag.sx + (e.clientX - drag.x0) / r.width * 100))); s.y = r1(Math.max(-5, Math.min(105, drag.sy + (e.clientY - drag.y0) / r.height * 100))); drag.moved = true; styleSel(); }
  });
  const up = e => {
    pts.delete(e.pointerId);
    if (pin && pts.size < 2) { pin = null; save(); }
    if (drag && pts.size === 0) { if (drag.moved) save(); drag = null; }
    if (sw && pts.size === 0) { const dx = e.clientX - sw.x, dy = e.clientY - sw.y; sw = null; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) flipTo(BK.i + (dx < 0 ? 1 : -1)); }
  };
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
}
function styleSel() { const e = curEntry(), s = e && e.st[BK.sel], el = document.querySelector(`#bkTop .stk[data-si="${BK.sel}"]`); if (!s || !el) return; el.style.left = s.x + '%'; el.style.top = s.y + '%'; el.style.setProperty('--r', (s.r || 0) + 'deg'); el.style.setProperty('--s', s.s || 1); }

/* ---------- actions ---------- */
ACT.openBook = d => { const t = trip(d.trip); if (!t) return; const k = d.entry ? bookOfTrip(t).pages.findIndex(x => x.kind === 'day' && x.e.id === d.entry) : 0; openBook(bookOfTrip(t), Math.max(0, k)); };
ACT.bkClose = () => closeBook();
ACT.bkNext = () => flipTo(BK.i + 1);
ACT.bkPrev = () => flipTo(BK.i - 1);
ACT.bkGo = d => flipTo(+d.i);
ACT.bkEdit = () => { if (!BK) return; if (!BK.edit && !curEntry()) { const k = BK.book.pages.findIndex(x => x.kind === 'day'); if (k < 0) { ACT.bkNewPage(); return; } BK.i = k; } BK.edit = !BK.edit; BK.sel = null; bkRender(); if (!BK.edit) toast('Page enregistrée'); };
ACT.bkNewPage = () => { const t = bookTrip(); if (t) pageSheet(t.id); };
ACT.bkText = () => { const t = bookTrip(), e = curEntry(); if (t && e) pageSheet(t.id, e.id); };
ACT.bkPhoto = () => { const t = bookTrip(), e = curEntry(); if (!t || !e) return; let i = e.photos.findIndex(x => !x); if (i < 0) { if (e.photos.length >= 6) { toast('6 photos maximum par page'); return; } e.photos.push(null); i = e.photos.length - 1; save(); } pickPhoto(`${t.id}|e|${e.id}|${i}`); };
ACT.bkStk = d => { const e = curEntry(); if (!e || BK.sel == null) return; const s = e.st[BK.sel]; if (!s) return;
  if (d.op === 'small') s.s = r1(Math.max(0.3, (s.s || 1) / 1.2)); else if (d.op === 'big') s.s = r1(Math.min(4, (s.s || 1) * 1.2));
  else if (d.op === 'left') s.r = (s.r || 0) - 15; else if (d.op === 'right') s.r = (s.r || 0) + 15;
  else if (d.op === 'front') { e.st.splice(BK.sel, 1); e.st.push(s); BK.sel = e.st.length - 1; }
  else if (d.op === 'del') { if (s.p) releaseMedia(s.p); e.st.splice(BK.sel, 1); BK.sel = null; }
  else if (d.op === 'ok') BK.sel = null;
  save(); bkRender(); };
function addSticker(s) { const e = curEntry(); if (!e) return; e.st = e.st || []; if (e.st.length >= 40) { toast('40 stickers maximum par page'); return; }
  e.st.push({ ...s, x: r1(35 + Math.random() * 30), y: r1(35 + Math.random() * 25), s: 1, r: Math.round(Math.random() * 16 - 8) }); BK.sel = e.st.length - 1; save(); closePanel(); bkRender(); }
ACT.bkStickers = () => {
  const t = bookTrip(), mine = t ? [...new Set(t.entrees.flatMap(x => (x.st || []).filter(s => s.k === 'p').map(s => s.p + '|' + (s.sh || 'circle'))))] : [];
  openPanel(`<h2>Stickers</h2><div class="stk-tabs" role="tablist"><button class="on" data-tab="e">Émojis</button><button data-tab="p">Mes photos</button><button data-tab="w">Masking tape</button><button data-tab="t">Étiquette</button></div>
    <div class="stk-pane" data-pane="e"><div class="stk-grid">${STK.e.map(x => `<button data-add="e" data-v="${x}">${x}</button>`).join('')}</div></div>
    <div class="stk-pane" data-pane="p" hidden><p class="small">Choisis une forme puis une photo : elle devient un sticker découpé, à coller où tu veux.</p><div class="stk-shapes">${STK.sh.map(([k, n]) => `<button data-shape="${k}"><span class="sp sh-${k}"><span class="cut"></span></span>${n}</button>`).join('')}</div>
      ${mine.length ? `<p class="small" style="margin-top:14px">Déjà créés dans ce carnet</p><div class="stk-grid big">${mine.map(m => { const [pth, sh] = m.split('|'); return `<button data-add="p" data-p="${esc(pth)}" data-sh="${sh}"><span class="sp sh-${sh}"><span class="cut">${IMG(pth)}</span></span></button>`; }).join('')}</div>` : ''}</div>
    <div class="stk-pane" data-pane="w" hidden><div class="stk-grid tapes">${STK.w.map(c => `<button data-add="w" data-c="${c}"><span class="sw" style="--c:${c}"></span></button>`).join('')}</div></div>
    <div class="stk-pane" data-pane="t" hidden><label class="fld"><span>Ton texte</span><input id="stk-txt" maxlength="40" placeholder="Ex. Meilleur jour !"></label><div class="stk-colors">${STK.t.map((c, i) => `<button data-col="${c}" class="${i ? '' : 'on'}" style="background:${c}" aria-label="Couleur"></button>`).join('')}</div><button class="btn full" id="stk-ok">Ajouter l'étiquette<i>${SV.arrow}</i></button></div>${CLOSE('Fermer')}`, p => {
    p.querySelectorAll('.stk-tabs button').forEach(b => b.onclick = () => { p.querySelectorAll('.stk-tabs button').forEach(x => x.classList.toggle('on', x === b)); p.querySelectorAll('.stk-pane').forEach(x => x.hidden = x.dataset.pane !== b.dataset.tab); });
    p.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { const k = b.dataset.add; addSticker(k === 'e' ? { k, v: b.dataset.v } : k === 'w' ? { k, c: b.dataset.c } : { k, p: b.dataset.p, sh: b.dataset.sh }); });
    p.querySelectorAll('[data-shape]').forEach(b => b.onclick = () => { const e = curEntry(); if (!t || !e) return; closePanel(); pickPhoto(`stk|${t.id}|${e.id}|${b.dataset.shape}`); });
    let col = STK.t[0]; p.querySelectorAll('[data-col]').forEach(b => b.onclick = () => { col = b.dataset.col; p.querySelectorAll('[data-col]').forEach(x => x.classList.toggle('on', x === b)); });
    p.querySelector('#stk-ok').onclick = () => { const v = p.querySelector('#stk-txt').value.trim().slice(0, 40); if (!v) { toast('Écris un petit texte'); return; } addSticker({ k: 't', v, c: col }); };
  }, { nofocus: true });
};

/* ---------- branchements sur les photos et l'actualisation ---------- */
{ const up0 = uploadPhoto; uploadPhoto = (f, kind, o) => up0(f, kind, o || (String(photoTarget || '').startsWith('stk|') ? { max: 700, square: true } : undefined)); }
{ const on0 = onPhoto; onPhoto = async (target, path) => {
  if (String(target).startsWith('stk|')) { const [, tid, eid, sh] = target.split('|'), t = trip(tid), e = t && t.entrees.find(x => x.id === eid);
    if (!e) return; if (BK && curEntry() && curEntry().id !== eid) return; addSticker({ k: 'p', p: path, sh }); toast('Sticker créé'); return; }
  await on0(target, path); if (BK) bkRender(); }; }
{ const rf0 = refresh; refresh = () => { rf0(); if (BK && !BK.busy) bkRender(); }; }
{ const cp0 = closePanel; closePanel = () => { cp0(); if (BK) setTimeout(() => { if (BK && !BK.busy && !$('panel').classList.contains('open')) bkRender(); }, 400); }; }

/* ---------- écran Journal : étagère de carnets et mur de souvenirs ---------- */
function renderJournalShelf() {
  const sc = $('s-journal'), list = sorted();
  if (!list.length) { sc.innerHTML = `<div class="navrow"><button class="iconbtn" data-act="back" aria-label="Retour">${SV.back}</button></div><h1 class="bigtitle sans">Journal</h1><div class="emptycard"><b>Pas encore de carnet</b><p>Crée ton premier voyage : il devient un carnet à feuilleter, à remplir de photos, de textes et de stickers.</p><button class="btn2 g wide" data-act="newTrip">${SV.plus}Créer un voyage</button></div>`; return; }
  const tiles = list.flatMap(t => t.entrees.flatMap(e => e.photos.filter(Boolean).map((p, k) => ({ t, e, p, k })))).slice(0, 60);
  sc.innerHTML = `<div class="navrow"><button class="iconbtn" data-act="back" aria-label="Retour">${SV.back}</button></div>
   <h1 class="bigtitle sans">Journal</h1><p class="small" style="margin-top:4px">Touche un carnet pour l'ouvrir et le feuilleter.</p>
   <div class="shelf">${list.map((t, i) => `<button class="shelf-book" data-act="openBook" data-trip="${t.id}" style="--tilt:${[-2, 1.5, -1, 2][i % 4]}deg;--hue:${(i * 47) % 360}"><span class="spine"></span><span class="cv">${t.cover ? IMG(t.cover) : ''}<span class="lbl"><b>${esc(short(t))}</b><i>${flag(t.pays)} ${D(t.du).getFullYear()}</i></span></span><span class="pages-edge"></span><em>${t.entrees.length} page${t.entrees.length > 1 ? 's' : ''}</em></button>`).join('')}
     <button class="shelf-book new" data-act="newTrip"><span class="cv">${SV.plus}<b>Nouveau carnet</b></span></button></div>
   <div class="sec"><h2>Mur de souvenirs</h2><span class="small">${tiles.length} photo${tiles.length > 1 ? 's' : ''}</span></div>
   ${tiles.length ? `<div class="pinwall">${tiles.map(o => `<button class="pin" data-act="openBook" data-trip="${o.t.id}" data-entry="${o.e.id}">${IMG(o.p)}<span><b>${esc(o.e.t)}</b><i>${esc(short(o.t))}, jour ${o.e.j}</i></span></button>`).join('')}</div>` : `<div class="emptyj">Ajoute des photos à tes pages : elles apparaîtront ici comme un tableau d'inspiration.</div>`}`;
}
SCREENS.journal = renderJournalShelf;

/* albums des amis : même carnet, en lecture seule */
ACT.openAlbum = async d => { const a = await rpc('get_album', { p_trip: d.trip }); if (!a) { toast('Album indisponible'); return; } openBook(bookOfAlbum(a)); };
