/* Escale : le journal en carnets de cuir.
 *
 * Écran Journal : une bibliothèque en bois où chaque voyage est un carnet rangé debout.
 * On fait défiler (molette, glisser ou flèches) pour choisir un carnet, on clique pour l'ouvrir.
 * Le carnet fermé apparaît (cuir grainé de la couleur choisie), sa couverture s'ouvre sur une
 * double page : à gauche les photos du jour, à droite le titre, la description et le texte.
 * Les pages se tournent par-dessus la reliure. Sur téléphone, toucher une page zoome dessus.
 * En mode modification : texte, photos et stickers (émojis, masking tape, étiquettes,
 * stickers découpés dans ses photos). Les albums des amis s'ouvrent dans le même carnet.
 */
'use strict';
/* deux modèles : A = pages crème lignées et signet en satin, B = pages blanches et pinces dorées */
const BOOKS = {
  rose: { n: 'Rose poudré', c: '#E9BCC3', d: '#D9A3AC', m: 'A', rib: '#F4D9D6', ink: '#7a4a52' },
  bordeaux: { n: 'Bordeaux', c: '#6E1F2A', d: '#561520', m: 'B', rib: '#C9A15A', ink: '#f6e9e2' },
  sauge: { n: 'Sauge', c: '#AFC3AC', d: '#97AD94', m: 'A', rib: '#F3EBDD', ink: '#3f5240' },
  lilas: { n: 'Lilas', c: '#CDBDE3', d: '#B8A6D3', m: 'A', rib: '#F4D9D6', ink: '#4e3f68' },
  bleu: { n: 'Bleu ciel', c: '#A9C2DA', d: '#91AECB', m: 'A', rib: '#F3EBDD', ink: '#2f4a66' },
  creme: { n: 'Crème', c: '#EFE4D0', d: '#E2D3B8', m: 'A', rib: '#E9BCC3', ink: '#6b5a3e' },
  noir: { n: 'Noir', c: '#2C2B2E', d: '#1E1D20', m: 'B', rib: '#C9A15A', ink: '#efe9df' },
};
const BOOK_KEYS = Object.keys(BOOKS);
const bookColor = (key, seed) => BOOKS[key] ? key : BOOK_KEYS[Math.abs([...String(seed || '')].reduce((a, ch) => a * 31 + ch.charCodeAt(0) | 0, 7)) % BOOK_KEYS.length];
const STK = {
  e: ['✈️', '🌍', '🗺️', '🧳', '📸', '🏝️', '🏔️', '🌅', '🌊', '🌴', '🗼', '🏛️', '⛩️', '🚆', '⛵', '🚲', '🍝', '🍣', '🥐', '🍹', '☕', '🍦', '🌸', '🌻', '☀️', '🌙', '⭐', '✨', '❤️', '💌', '🎒', '🎟️'],
  w: ['#F3C979', '#E8A9B8', '#A9C4AF', '#9EC3E6', '#C9B6E4', '#F2A68B'],
  t: ['#2E5E3E', '#B8452C', '#3C6E8F', '#20243A', '#B07A2A'],
  sh: [['circle', 'Rond'], ['heart', 'Cœur'], ['star', 'Étoile'], ['stamp', 'Timbre'], ['square', 'Carré']],
};
const PG_W = 300, PG_H = 417; // taille de dessin d'une page, mise à l'échelle à l'écran
let BK = null; // { book, i (double page), edit, sel, busy, zoom: null|'l'|'r' }
const reduced = () => typeof REDUCED !== 'undefined' && REDUCED;
const r1 = n => Math.round(n * 10) / 10;

/* ---------- données ---------- */
function bookOfTrip(t) {
  return { own: true, tripId: t.id, color: bookColor(t.bk, t.id), title: place(t), country: C(t).n, pays: t.pays, du: t.du, au: t.au, cover: t.cover,
    spreads: [{ kind: 'intro' }, ...t.entrees.map(e => ({ kind: 'day', e })), { kind: 'add' }] };
}
function bookOfAlbum(a) {
  const pays = a.country_code, c = COUNTRIES[pays] || {};
  return { own: false, color: bookColor(a.book_color, a.id), title: a.city || c.n || pays, country: c.n || pays, pays, du: a.start_date, au: a.end_date, cover: a.cover_path,
    spreads: [{ kind: 'intro' }, ...(a.entries || []).map(x => ({ kind: 'day', e: { id: 'a' + x.day, j: x.day, t: x.title, d: x.description || '', n: x.note || '', photos: x.photos || [], st: x.stickers || [] } }))] };
}
const bookTrip = () => BK && BK.book.own ? trip(BK.book.tripId) : null;
const curEntry = () => { const s = BK && BK.book.spreads[BK.i]; return s && s.kind === 'day' ? s.e : null; };
const nDays = b => Math.max(1, Math.round((D(b.au) - D(b.du)) / 864e5) + 1);

/* ---------- le contenu des pages ---------- */
function stickerHTML(s, i, edit) {
  const st = `left:${s.x}%;top:${s.y}%;--r:${s.r || 0}deg;--s:${s.s || 1}`;
  const inner = s.k === 'e' ? `<span class="se">${esc(s.v || '⭐')}</span>`
    : s.k === 'w' ? `<span class="sw" style="--c:${esc(s.c || '#F3C979')}"></span>`
    : s.k === 't' ? letterHTML(s)
    : s.k === 'd' ? `<span class="sd ${DECOS[s.v] ? 'deco dv-' + esc(s.v) : 'doodle'}">${DECOS[s.v] ? decoSVG(s.v, esc(s.c || '#C0392B')) : doodleSVG(s.v, esc(s.c || '#20243A'))}</span>`
    : `<span class="sp sh-${esc(s.sh || 'circle')}"><span class="cut">${IMG(s.p)}</span></span>`;
  return `<div class="stk ${edit ? 'ed' : ''} ${BK && BK.sel === i ? 'sel' : ''}" data-si="${i}" style="${st}">${inner}</div>`;
}
function letterHTML(s) { const f = s.f || 'label', v = String(s.v || ''), c = esc(s.c || '#2E5E3E');
  if (f === 'bead') return `<span class="sb">${[...v].map(ch => ch === ' ' ? '<i class="gap"></i>' : `<i>${esc(ch.toUpperCase())}</i>`).join('')}</span>`;
  if (f === 'tile') return `<span class="st">${[...v].map((ch, i) => ch === ' ' ? '<i class="gap"></i>' : `<i style="--tr:${[-3, 2, -1, 3, -2][i % 5]}deg">${esc(ch.toUpperCase())}</i>`).join('')}</span>`;
  if (f === 'script' || f === 'serif') return `<span class="s-${f}" style="color:${c}">${esc(v)}</span>`;
  return `<span class="sl" style="--c:${c}">${esc(v)}</span>`; }
const ORN = '<svg class="orn" viewBox="0 0 100 130" preserveAspectRatio="none" aria-hidden="true"><ellipse cx="50" cy="65" rx="46" ry="60" fill="none" stroke="currentColor" stroke-width="3"/><ellipse cx="50" cy="65" rx="41" ry="55" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M38 5c5-5 19-5 24 0M38 125c5 5 19 5 24 0M4 58c-3 4-3 10 0 14M96 58c3 4 3 10 0 14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="50" cy="3" r="3" fill="currentColor"/><circle cx="50" cy="127" r="3" fill="currentColor"/></svg>';
const WAVE = '<svg class="orn" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M6 10q8-6 16 0t16 0 16 0 16 0 16 0 8 4q6 8 0 16t0 16 0 16 0 16 0 16-4 6q-8 6-16 0t-16 0-16 0-16 0-16 0-8-4q-6-8 0-16t0-16 0-16 0-16 0-16z" fill="none" stroke="currentColor" stroke-width="2.4" vector-effect="non-scaling-stroke"/></svg>';
const pageFrame = (e, k) => { const l = e.lay || {}; return (l.fr && l.fr[k]) || 'polaroid'; };
const pola = (src, k, target, fr = 'polaroid') => fr !== 'polaroid' ? `<figure class="phf fr-${fr}" style="--rot:${[-3, 2, -1, 3, -2, 1][k % 6]}deg"><span class="in">${src ? IMG(src) : `<button class="ph-empty" ${target ? `data-photo="${target}"` : ''} aria-label="Ajouter une photo">${SV.cam}</button>`}</span>${fr === 'ovale' ? ORN : fr === 'vague' ? WAVE : ''}</figure>` : polaroid(src, k, target);
const polaroid = (src, k, target) => `<figure class="pola" style="--rot:${[-4, 3, -2, 5, -5, 2][k % 6]}deg">${src ? IMG(src) : `<button class="ph-empty" ${target ? `data-photo="${target}"` : ''} aria-label="Ajouter une photo">${SV.cam}</button>`}<i class="tape t${k % 3}"></i></figure>`;
function pageHTML(b, s, side) {
  const edit = BK && BK.edit && b.own, idx = b.spreads.indexOf(s), num = idx * 2 + (side === 'l' ? 1 : 2);
  const foot = `<span class="pg-num num">${num}</span>`;
  if (s.kind === 'intro') {
    const days = b.spreads.filter(x => x.kind === 'day'), photos = days.reduce((a, x) => a + x.e.photos.filter(Boolean).length, 0);
    if (side === 'l') return `<div class="pg"><p class="pg-kicker">Carnet de voyage</p><h2 class="pg-h">${esc(b.title)}</h2><p class="pg-sub">${flag(b.pays)} ${esc(b.country)}</p><p class="pg-sub">du ${fd(b.du)} au ${fd(b.au)} ${D(b.du).getFullYear()}</p>
      <div class="pg-ph n1">${b.cover ? pola(b.cover, 0) : `<figure class="pola" style="--rot:-3deg"><span class="ph-empty">${SV.img}</span><i class="tape t0"></i></figure>`}</div>
      <p class="pg-stats num"><b>${nDays(b)}</b> jours · <b>${days.length}</b> page${days.length > 1 ? 's' : ''} · <b>${photos}</b> photo${photos > 1 ? 's' : ''}</p>${foot}</div>`;
    return `<div class="pg"><p class="pg-kicker">Sommaire</p>${days.length ? `<ol class="pg-toc">${days.map(x => `<li><button data-act="bkGo" data-i="${b.spreads.indexOf(x)}"><span class="num">Jour ${x.e.j}</span><b>${esc(x.e.t)}</b></button></li>`).join('')}</ol>` : `<p class="pg-hand" style="margin-top:14px">Ton carnet est encore vide. Tourne la page pour écrire ton premier jour.</p>`}${foot}</div>`;
  }
  if (s.kind === 'add') return side === 'l' ? `<div class="pg"><p class="pg-hand" style="margin-top:40px">Une nouvelle journée à raconter ?</p>${foot}</div>`
    : `<div class="pg center">${b.own ? `<button class="btn2 g" data-act="bkNewPage">${SV.plus}Ajouter une page</button>` : `<p class="pg-hand">Fin du carnet</p>`}${foot}</div>`;
  const e = s.e, t = bookTrip(), date = addDays(b.du, e.j - 1), dn = D(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const lay = e.lay || {}, cls = `ft-${lay.font || 'carnet'} pp-${lay.paper || (BOOKS[b.color].m === 'B' ? 'blanc' : 'ligne')}`;
  if (side === 'l') { const ph = e.photos.map((x, i) => ({ x, i })).filter(o => o.x || edit).slice(0, 6);
    return `<div class="pg ${cls}"><p class="pg-kicker">Jour ${e.j} · ${esc(dn)}</p>${ph.length ? `<div class="pg-ph n${ph.length}">${ph.map((o, k) => pola(o.x, k, o.x || !t ? '' : `${t.id}|e|${e.id}|${o.i}`, pageFrame(e, o.i))).join('')}</div>` : `<p class="pg-hand" style="margin-top:18px">${edit ? 'Touche « Photo » pour coller tes photos ici.' : ''}</p>`}${foot}</div>`; }
  return `<div class="pg ${cls}"><h2 class="pg-h">${esc(e.t)}</h2>${e.d ? `<p class="pg-desc">${esc(e.d)}</p>` : ''}${e.n ? `<div class="pg-note">${esc(e.n)}</div>` : edit ? `<button class="pg-note empty" data-act="bkText">Touche ici pour écrire ta journée…</button>` : ''}${foot}</div>`;
}
const stkLayerHTML = () => { const e = curEntry(); return e ? (e.st || []).map((s, i) => stickerHTML(s, i, BK.edit && BK.book.own)).join('') : ''; };

/* ---------- le carnet en cuir (fermé puis ouvert) ---------- */
const leather = c => `--lc:${c.c};--ld:${c.d};--rib:${c.rib};--lk:${c.ink}`;
const clipSVG = '<svg viewBox="0 0 60 44" aria-hidden="true"><defs><linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3dc9a"/><stop offset=".45" stop-color="#c79a3e"/><stop offset=".7" stop-color="#e9c977"/><stop offset="1" stop-color="#9c7425"/></linearGradient></defs><path d="M30 4h26v36H30z" fill="url(#gold)"/><path d="M30 4L36 22 30 40" fill="none" stroke="#8a6620" stroke-width="1.2" opacity=".6"/><path d="M30 10C10 8 3 14 3 22s7 14 27 12" fill="none" stroke="url(#gold)" stroke-width="3.4" stroke-linecap="round"/><path d="M30 14C16 13 11 17 11 22s5 9 19 8" fill="none" stroke="url(#gold)" stroke-width="3" stroke-linecap="round"/></svg>';
function openBook(book, start = 0) {
  const col = BOOKS[book.color], wide = $('phone').clientWidth >= 700;
  BK = { book, i: Math.min(start, book.spreads.length - 1), edit: false, sel: null, busy: true, zoom: null, wide };
  let el = $('book'); if (!el) { el = document.createElement('div'); el.id = 'book'; $('phone').appendChild(el); }
  el.className = `book-ov m${col.m}`; el.hidden = false; el.setAttribute('style', leather(col));
  el.innerHTML = `<div class="bk-top"><button class="bk-ic" data-act="bkClose" aria-label="Fermer le carnet">${SV.x}</button><div class="bk-tt"><b>${esc(book.title)}</b><span>${fd(book.du)} au ${fd(book.au)}</span></div>${book.own ? `<button class="bk-ic" data-act="bkColor" aria-label="Couleur du carnet"><i class="swatch"></i></button><button class="bk-ic" data-act="bkEdit" aria-label="Modifier la page">${SV.edit || SV.plus}</button>` : '<span class="bk-ic ghost"></span>'}</div>
    <div class="bk-stage" id="bkStage"><div class="bk-book closed" id="bkBook">
      <div class="bk-case"></div>
      <div class="bk-spread"><div class="bk-pg l" id="bkL"></div><div class="bk-pg r" id="bkR"></div><div class="bk-gutter"></div>
        <div class="bk-shade" id="bkShade"></div><div class="bk-stk" id="bkStk"></div><div class="bk-leaf" id="bkLeaf"></div></div>
      ${col.m === 'B' ? `<span class="bk-clip cl">${clipSVG}</span><span class="bk-clip cr">${clipSVG}</span>` : '<span class="bk-ribbon"><i></i></span>'}
      <div class="bk-cover" id="bkCover"><div class="front"><span class="hinge"></span><span class="emboss">${esc(book.title)}</span></div><div class="back"></div></div>
    </div></div>
    <div class="bk-bot" id="bkBot"></div>`;
  bkSize(); bkRender();
  const bookEl = $('bkBook');
  const done = () => { bookEl.classList.remove('closed', 'opening'); const c = $('bkCover'); if (c) c.remove(); BK.busy = false; if (!BK.wide) bkZoom('l'); bkBar(); };
  if (start > 0 || reduced()) { done(); return; }
  setTimeout(() => { bookEl.classList.add('opening'); setTimeout(done, 1250); }, 650);
}
/** Taille du carnet selon l'écran : double page entière, mise à l'échelle. */
function bkSize() {
  const st = $('bkStage'), bk = $('bkBook'); if (!st || !bk) return;
  const clips = $('book').classList.contains('mB'), w = (st.clientWidth - 28) * (clips ? .8 : 1), h = st.clientHeight - 28, sw = Math.min(w, h * (2 * PG_W / PG_H), 820), k = sw / (2 * PG_W);
  bk.style.width = sw + 'px'; bk.style.height = PG_H * k + 'px'; bk.style.setProperty('--k', k);
  BK.k = k; BK.zk = Math.min((st.clientWidth - 16) / (PG_W * k), (st.clientHeight - 16) / (PG_H * k));
  bkApplyZoom();
}
function bkApplyZoom() { const bk = $('bkBook'); if (!bk || !BK) return; const z = BK.zoom ? BK.zk : 1, dx = BK.zoom === 'l' ? 25 : BK.zoom === 'r' ? -25 : 0;
  bk.style.setProperty('--zx', dx + '%'); bk.style.setProperty('--z', z); bk.classList.toggle('zoomed', !!BK.zoom); }
function bkZoom(side) { if (!BK) return; BK.zoom = side; bkApplyZoom(); bkBar(); }
addEventListener('resize', () => { if (BK) bkSize(); });

function bkRender() {
  if (!BK || !$('bkL')) return;
  if (BK.book.own) { const t = bookTrip(); if (!t) { closeBook(); return; } const cur = BK.book.spreads[BK.i]; BK.book = bookOfTrip(t);
    if (cur && cur.kind === 'day') { const k = BK.book.spreads.findIndex(x => x.kind === 'day' && x.e.id === cur.e.id); if (k >= 0) BK.i = k; } BK.i = Math.min(BK.i, BK.book.spreads.length - 1); }
  const s = BK.book.spreads[BK.i];
  $('bkL').innerHTML = pageHTML(BK.book, s, 'l'); $('bkR').innerHTML = pageHTML(BK.book, s, 'r'); $('bkStk').innerHTML = stkLayerHTML();
  $('book').classList.toggle('editing', !!BK.edit);
  bkBar();
}
function bkBar() {
  const n = BK.book.spreads.length, e = curEntry(), s = e && BK.sel != null ? (e.st || [])[BK.sel] : null;
  const zoomBtn = !BK.wide ? `<button class="bk-ic" data-act="bkZoomToggle" aria-label="${BK.zoom ? 'Voir la double page' : 'Zoomer sur la page'}">${BK.zoom ? '⤢' : '⤡'}</button>` : '';
  $('bkBot').innerHTML = BK.edit && e ? (s ? `<div class="bk-tools"><button data-act="bkStk" data-op="small" aria-label="Plus petit">−</button><button data-act="bkStk" data-op="big" aria-label="Plus grand">+</button><button data-act="bkStk" data-op="left" aria-label="Tourner à gauche">↺</button><button data-act="bkStk" data-op="right" aria-label="Tourner à droite">↻</button><button data-act="bkStk" data-op="front" aria-label="Mettre devant">⧉</button><button data-act="bkStk" data-op="del" class="red" aria-label="Retirer le sticker">${SV.trash}</button><button data-act="bkStk" data-op="ok" class="ok">OK</button></div>`
      : `<div class="bk-tools wide"><button data-act="bkText">${SV.edit || ''}<span>Texte</span></button><button data-act="bkStyle"><b class="aa">Aa</b><span>Style</span></button><button data-act="bkPhoto">${SV.cam}<span>Photo</span></button><button data-act="bkStickers">${SV.smile || '☺'}<span>Sticker</span></button><button data-act="bkEdit" class="ok"><span>Terminé</span></button></div><p class="bk-hint">Glisse un sticker pour le placer, touche-le pour le régler.</p>`)
    : `<div class="bk-nav"><button class="bk-ic" data-act="bkPrev" aria-label="Page précédente" ${BK.i || BK.zoom === 'r' ? '' : 'disabled'}>${SV.back}</button><div class="bk-dots">${BK.book.spreads.map((_, k) => `<i class="${k === BK.i ? 'on' : ''}"></i>`).join('')}</div>${zoomBtn}<button class="bk-ic" data-act="bkNext" aria-label="Page suivante" ${BK.i < n - 1 || BK.zoom === 'l' ? '' : 'disabled'}>${SV.right}</button></div>`;
}
function closeBook() { const el = $('book'); if (el) { el.classList.add('closing'); setTimeout(() => { el.hidden = true; el.innerHTML = ''; el.classList.remove('closing'); }, reduced() ? 0 : 280); } BK = null; }

/** Tourne la feuille de droite par-dessus la reliure (ou la ramène pour revenir en arrière). */
function flipTo(k) {
  if (!BK || BK.busy || k < 0 || k >= BK.book.spreads.length || k === BK.i) return;
  const next = k > BK.i, cur = BK.book.spreads[BK.i], to = BK.book.spreads[k], leaf = $('bkLeaf'), L = $('bkL'), R = $('bkR'), stk = $('bkStk');
  BK.sel = null;
  if (reduced() || !leaf.animate) { BK.i = k; bkRender(); return; }
  BK.busy = true; stk.style.opacity = 0;
  // sur téléphone : on recule pour voir la double page, la feuille tourne, puis on revient sur une page
  if (!BK.wide && BK.zoom) { BK.zoom = null; bkApplyZoom(); setTimeout(turn, 480); } else turn();
  function turn() {
  if (next) { const front = R.innerHTML, back = pageHTML(BK.book, to, 'l'); R.innerHTML = pageHTML(BK.book, to, 'r'); curl(leaf, front, back, true, () => { L.innerHTML = back; end(); }); }
  else { const front = pageHTML(BK.book, to, 'r'), back = L.innerHTML; L.innerHTML = pageHTML(BK.book, to, 'l'); curl(leaf, front, back, false, () => { R.innerHTML = front; end(); }); }
  }
  function end() { BK.i = k; BK.busy = false; stk.innerHTML = stkLayerHTML(); stk.style.opacity = ''; if (!BK.wide) BK.zoom = next ? 'l' : 'r'; bkApplyZoom(); bkBar(); }
}
/** Feuille souple : la page est découpée en bandes verticales qui tournent chacune un peu plus
 *  que la précédente. Le bord libre part en premier et la feuille se courbe comme un magazine. */
function curl(leaf, front, back, next, done) {
  const N = 14; leaf.innerHTML = ''; let parent = leaf; const parts = [];
  for (let i = 0; i < N; i++) {
    const s = document.createElement('div'); s.className = 'cs'; s.style.cssText = i ? 'left:100%;width:100%' : `left:0;width:${100 / N}%`;
    // chaque face déborde d'1 px sur la bande suivante pour qu'aucune couture ne se voie
    const cin = j => `width:calc((100% - 1.5px) * ${N});left:calc((100% - 1.5px) * ${-j})`;
    s.innerHTML = `<div class="cf"><div class="cin" style="${cin(i)}">${front}</div><i class="sh"></i></div><div class="cb"><div class="cin" style="${cin(N - 1 - i)}">${back}</div><i class="sh"></i></div>`;
    parent.appendChild(s); parts.push({ s, f: s.querySelector('.cf .sh'), b: s.querySelector('.cb .sh') }); parent = s;
  }
  const shade = $('bkShade'); leaf.classList.add('on');
  const dur = 950, t0 = performance.now();
  const frame = now => {
    const p = Math.min(1, (now - t0) / dur), e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    const base = next ? 180 * e : 180 * (1 - e), bend = 85 * Math.sin(Math.PI * e); let prev = 0;
    parts.forEach((o, i) => { const f = Math.pow(i / (N - 1), 1.4), a = next ? Math.min(180, base + bend * f) : Math.max(0, base - bend * f);
      o.s.style.transform = `rotateY(${-(a - prev)}deg)`;
      // ombre continue d'une bande à l'autre : dégradé entre l'angle du bord gauche et celui du bord droit
      const l0 = Math.sin(prev * Math.PI / 180), l1 = Math.sin(a * Math.PI / 180); prev = a;
      o.f.style.background = `linear-gradient(90deg,rgba(40,30,20,${(l0 * .3).toFixed(3)}),rgba(40,30,20,${(l1 * .3).toFixed(3)}))`;
      o.b.style.background = `linear-gradient(270deg,rgba(40,30,20,${(l0 * .22).toFixed(3)}),rgba(40,30,20,${(l1 * .22).toFixed(3)}))`; });
    if (shade) shade.style.opacity = Math.sin(Math.PI * e) * .5;
    if (p < 1) requestAnimationFrame(frame); else { leaf.classList.remove('on'); leaf.innerHTML = ''; if (shade) shade.style.opacity = 0; done(); }
  };
  requestAnimationFrame(frame);
}
/* sur téléphone : page de gauche, page de droite, puis double page suivante */
function step(dir) { if (!BK) return; if (!BK.wide && BK.zoom) { if (dir > 0 && BK.zoom === 'l') return bkZoom('r'); if (dir < 0 && BK.zoom === 'r') return bkZoom('l'); } flipTo(BK.i + dir); }

/* ---------- gestes : balayer, toucher une page, glisser et pincer les stickers ---------- */
function bindBookGestures() {
  const stage = $('bkStage'); if (!stage) return;
  const pts = new Map(); let sw = null, drag = null, pin = null;
  const spreadRect = () => $('bkStk').getBoundingClientRect();
  stage.addEventListener('pointerdown', e => {
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const st = e.target.closest('.stk');
    if (BK && BK.edit && st) { const i = +st.dataset.si, s = curEntry().st[i]; if (BK.sel !== i) { BK.sel = i; document.querySelectorAll('#bkStk .stk').forEach(x => x.classList.toggle('sel', +x.dataset.si === i)); bkBar(); }
      if (pts.size === 1) drag = { i, x0: e.clientX, y0: e.clientY, sx: s.x, sy: s.y, moved: false };
      e.preventDefault(); try { stage.setPointerCapture(e.pointerId); } catch (_) { } }
    if (BK && BK.edit && pts.size === 2 && BK.sel != null) { const [a, b] = [...pts.values()], s = curEntry().st[BK.sel]; pin = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, ang: Math.atan2(b.y - a.y, b.x - a.x), s: s.s || 1, r: s.r || 0 }; drag = null; }
    if (BK && !BK.edit && pts.size === 1) sw = { x: e.clientX, y: e.clientY, t: Date.now(), target: e.target };
  });
  stage.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pin && pts.size >= 2) { const [a, b] = [...pts.values()], s = curEntry().st[BK.sel], d = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
      s.s = r1(Math.max(0.3, Math.min(4, pin.s * d / pin.d))); s.r = Math.round(pin.r + (ang - pin.ang) * 180 / Math.PI); styleSel(); return; }
    if (drag) { const r = spreadRect(), s = curEntry().st[drag.i]; s.x = r1(Math.max(-5, Math.min(105, drag.sx + (e.clientX - drag.x0) / r.width * 100))); s.y = r1(Math.max(-5, Math.min(105, drag.sy + (e.clientY - drag.y0) / r.height * 100))); drag.moved = true; styleSel(); }
  });
  const up = e => {
    pts.delete(e.pointerId);
    if (pin && pts.size < 2) { pin = null; save(); }
    if (drag && pts.size === 0) { if (drag.moved) save(); drag = null; }
    if (sw && pts.size === 0) { const dx = e.clientX - sw.x, dy = e.clientY - sw.y, tap = Math.abs(dx) < 8 && Math.abs(dy) < 8 && Date.now() - sw.t < 400, tgt = sw.target; sw = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) step(dx < 0 ? 1 : -1);
      else if (tap && !BK.wide && !BK.zoom && !tgt.closest('button,a')) { const r = $('bkBook').getBoundingClientRect(); bkZoom(e.clientX < r.left + r.width / 2 ? 'l' : 'r'); } }
  };
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  stage.addEventListener('wheel', e => { if (!BK || BK.edit || Math.abs(e.deltaX) < 30) return; e.preventDefault(); step(e.deltaX > 0 ? 1 : -1); }, { passive: false });
}
function styleSel() { const e = curEntry(), s = e && e.st[BK.sel], el = document.querySelector(`#bkStk .stk[data-si="${BK.sel}"]`); if (!s || !el) return; el.style.left = s.x + '%'; el.style.top = s.y + '%'; el.style.setProperty('--r', (s.r || 0) + 'deg'); el.style.setProperty('--s', s.s || 1); }

/* ---------- actions ---------- */
ACT.openBook = d => { const t = trip(d.trip); if (!t) return; const b = bookOfTrip(t), k = d.entry ? b.spreads.findIndex(x => x.kind === 'day' && x.e.id === d.entry) : 0; openBook(b, Math.max(0, k)); bindBookGestures(); };
ACT.bkClose = () => closeBook();
ACT.bkNext = () => step(1);
ACT.bkPrev = () => step(-1);
ACT.bkGo = d => flipTo(+d.i);
ACT.bkZoomToggle = () => bkZoom(BK.zoom ? null : 'l');
ACT.bkEdit = () => { if (!BK) return; if (!BK.edit && !curEntry()) { const k = BK.book.spreads.findIndex(x => x.kind === 'day'); if (k < 0) { ACT.bkNewPage(); return; } BK.i = k; } BK.edit = !BK.edit; BK.sel = null; bkRender(); if (!BK.edit) toast('Page enregistrée'); };
ACT.bkNewPage = () => { const t = bookTrip(); if (t) pageSheet(t.id); };
ACT.bkText = () => { const t = bookTrip(), e = curEntry(); if (t && e) pageSheet(t.id, e.id); };
ACT.bkPhoto = () => { const t = bookTrip(), e = curEntry(); if (!t || !e) return; let i = e.photos.findIndex(x => !x); if (i < 0) { if (e.photos.length >= 6) { toast('6 photos maximum par page'); return; } e.photos.push(null); i = e.photos.length - 1; save(); } pickPhoto(`${t.id}|e|${e.id}|${i}`); };
ACT.bkColor = () => { const t = bookTrip(); if (!t) return;
  openPanel(`<h2>Couleur du carnet</h2><p class="small">Le carnet garde cette couleur sur l'étagère et pour tes amis.</p><div class="bk-colors">${BOOK_KEYS.map(k => `<button data-act="bkSetColor" data-k="${k}" class="${BK.book.color === k ? 'on' : ''}" style="${leather(BOOKS[k])}"><span class="mini-cover"></span><b>${BOOKS[k].n}</b><i>${BOOKS[k].m === 'B' ? 'pages blanches, pinces dorées' : 'pages lignées, signet'}</i></button>`).join('')}</div>${CLOSE('Fermer')}`, null, { nofocus: true }); };
ACT.bkSetColor = d => { const t = bookTrip(); if (!t) return; t.bk = d.k; save(); closePanel(); const i = BK.i; setTimeout(() => { openBook(bookOfTrip(t), i); bindBookGestures(); }, 380); toast(`Carnet ${BOOKS[d.k].n.toLowerCase()}`); };
ACT.bkStk = d => { const e = curEntry(); if (!e || BK.sel == null) return; const s = e.st[BK.sel]; if (!s) return;
  if (d.op === 'small') s.s = r1(Math.max(0.3, (s.s || 1) / 1.2)); else if (d.op === 'big') s.s = r1(Math.min(4, (s.s || 1) * 1.2));
  else if (d.op === 'left') s.r = (s.r || 0) - 15; else if (d.op === 'right') s.r = (s.r || 0) + 15;
  else if (d.op === 'front') { e.st.splice(BK.sel, 1); e.st.push(s); BK.sel = e.st.length - 1; }
  else if (d.op === 'del') { if (s.p) releaseMedia(s.p); e.st.splice(BK.sel, 1); BK.sel = null; }
  else if (d.op === 'ok') BK.sel = null;
  save(); bkRender(); };
function addSticker(s) { const e = curEntry(); if (!e) return; e.st = e.st || []; if (e.st.length >= 40) { toast('40 stickers maximum par page'); return; }
  const cx = BK.zoom === 'l' ? 25 : BK.zoom === 'r' ? 75 : 50;
  e.st.push({ ...s, x: r1(cx - 10 + Math.random() * 20), y: r1(35 + Math.random() * 25), s: 1, r: Math.round(Math.random() * 16 - 8) }); BK.sel = e.st.length - 1; save(); closePanel(); bkRender(); }
ACT.bkStickers = () => {
  const t = bookTrip(), mine = t ? [...new Set(t.entrees.flatMap(x => (x.st || []).filter(s => s.k === 'p').map(s => s.p + '|' + (s.sh || 'circle'))))] : [];
  let ink = INK[0];
  const inkRow = id => `<div class="stk-ink" data-ink-row="${id}">${INK.map((c, i) => `<button data-ink="${c}" class="${i ? '' : 'on'}" style="background:${c}" aria-label="Couleur"></button>`).join('')}</div>`;
  openPanel(`<h2>Stickers et décos</h2><div class="stk-tabs" role="tablist"><button class="on" data-tab="e">Émojis</button><button data-tab="d">Doodles</button><button data-tab="o">Décos</button><button data-tab="l">Lettres</button><button data-tab="p">Mes photos</button><button data-tab="w">Masking tape</button></div>
    <div class="stk-pane" data-pane="e"><div class="stk-grid">${STK.e.map(x => `<button data-add="e" data-v="${x}">${x}</button>`).join('')}</div></div>
    <div class="stk-pane" data-pane="d" hidden>${inkRow('d')}<div class="stk-grid doodles">${Object.keys(DOODLES).map(k => `<button data-add="d" data-v="${k}" aria-label="${k}">${doodleSVG(k, 'currentColor')}</button>`).join('')}</div></div>
    <div class="stk-pane" data-pane="o" hidden>${inkRow('o')}<div class="stk-grid decos">${Object.keys(DECOS).map(k => `<button data-add="d" data-v="${k}"><span>${decoSVG(k, 'currentColor')}</span><i>${DECO_N[k]}</i></button>`).join('')}</div></div>
    <div class="stk-pane" data-pane="l" hidden><label class="fld"><span>Ton texte</span><input id="stk-txt" maxlength="24" placeholder="Ex. ROME 2026"></label>
      <div class="stk-lt">${Object.entries(LETTERS).map(([k, n], i) => `<button data-lt="${k}" class="${i ? '' : 'on'}">${letterHTML({ f: k, v: k === 'bead' || k === 'tile' ? 'ABC' : 'Abc', c: '#20243A' })}<i>${n}</i></button>`).join('')}</div>${inkRow('l')}
      <button class="btn full" id="stk-ok">Ajouter<i>${SV.arrow}</i></button></div>
    <div class="stk-pane" data-pane="p" hidden><p class="small">Importe une photo de ta galerie : choisis une forme, elle devient un sticker découpé.</p><div class="stk-shapes">${STK.sh.map(([k, n]) => `<button data-shape="${k}"><span class="sp sh-${k}"><span class="cut"></span></span>${n}</button>`).join('')}</div>
      ${mine.length ? `<p class="small" style="margin-top:14px">Déjà créés dans ce carnet</p><div class="stk-grid big">${mine.map(m => { const [pth, sh] = m.split('|'); return `<button data-add="p" data-p="${esc(pth)}" data-sh="${sh}"><span class="sp sh-${sh}"><span class="cut">${IMG(pth)}</span></span></button>`; }).join('')}</div>` : ''}</div>
    <div class="stk-pane" data-pane="w" hidden><div class="stk-grid tapes">${STK.w.map(c => `<button data-add="w" data-c="${c}"><span class="sw" style="--c:${c}"></span></button>`).join('')}</div></div>${CLOSE('Fermer')}`, p => {
    p.querySelectorAll('.stk-tabs button').forEach(b => b.onclick = () => { p.querySelectorAll('.stk-tabs button').forEach(x => x.classList.toggle('on', x === b)); p.querySelectorAll('.stk-pane').forEach(x => x.hidden = x.dataset.pane !== b.dataset.tab); });
    const paint = () => { p.querySelectorAll('.stk-grid.doodles button, .stk-grid.decos button').forEach(b => b.style.color = ink === '#FFFFFF' ? '#b9b2a6' : ink); };
    p.querySelectorAll('[data-ink]').forEach(b => b.onclick = () => { ink = b.dataset.ink; p.querySelectorAll('[data-ink]').forEach(x => x.classList.toggle('on', x.dataset.ink === ink)); paint(); }); paint();
    p.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { const k = b.dataset.add; addSticker(k === 'e' ? { k, v: b.dataset.v } : k === 'w' ? { k, c: b.dataset.c } : k === 'd' ? { k, v: b.dataset.v, c: ink } : { k, p: b.dataset.p, sh: b.dataset.sh }); });
    p.querySelectorAll('[data-shape]').forEach(b => b.onclick = () => { const e = curEntry(); if (!t || !e) return; closePanel(); pickPhoto(`stk|${t.id}|${e.id}|${b.dataset.shape}`); });
    let lt = 'label'; p.querySelectorAll('[data-lt]').forEach(b => b.onclick = () => { lt = b.dataset.lt; p.querySelectorAll('[data-lt]').forEach(x => x.classList.toggle('on', x === b)); });
    p.querySelector('#stk-ok').onclick = () => { const v = p.querySelector('#stk-txt').value.trim().slice(0, 24); if (!v) { toast('Écris un petit texte'); return; } addSticker({ k: 't', v, f: lt, c: ink === '#FFFFFF' ? '#20243A' : ink }); };
  }, { nofocus: true });
};
/* style de la page : typographie, papier, cadres des photos */
ACT.bkStyle = () => { const e = curEntry(); if (!e) return; e.lay = e.lay || {}; let target = 'all';
  const ph = e.photos.map((x, i) => ({ x, i })).filter(o => o.x);
  const draw = p => {
    const lay = e.lay, def = BOOKS[BK.book.color].m === 'B' ? 'blanc' : 'ligne', curFr = target === 'all' ? null : pageFrame(e, +target);
    p.querySelector('#sty-f').innerHTML = Object.entries(FONTS).map(([k, f]) => `<button data-font="${k}" class="${(lay.font || 'carnet') === k ? 'on' : ''}"><span class="pg ft-${k} demo"><b class="pg-h">Rome</b><i class="pg-note">Une belle journée</i></span><em>${f.n}</em></button>`).join('');
    p.querySelector('#sty-p').innerHTML = Object.entries(PAPERS).map(([k, n]) => `<button data-paper="${k}" class="${(lay.paper || def) === k ? 'on' : ''}"><span class="pg pp-${k} demo"></span><em>${n}</em></button>`).join('');
    p.querySelector('#sty-t').innerHTML = ph.length ? `<button data-tg="all" class="${target === 'all' ? 'on' : ''}">Toutes</button>${ph.map(o => `<button data-tg="${o.i}" class="th ${target === String(o.i) ? 'on' : ''}">${IMG(o.x)}</button>`).join('')}` : '<p class="small">Ajoute des photos à la page pour leur choisir un cadre.</p>';
    p.querySelector('#sty-fr').innerHTML = ph.length ? Object.entries(FRAMES).map(([k, n]) => `<button data-fr="${k}" class="${curFr === k || (target === 'all' && ph.every(o => pageFrame(e, o.i) === k)) ? 'on' : ''}">${pola(ph[0].x, 0, '', k)}<em>${n}</em></button>`).join('') : '';
    p.querySelectorAll('[data-font]').forEach(b => b.onclick = () => { lay.font = b.dataset.font; if (lay.font === 'carnet') delete lay.font; save(); bkRender(); draw(p); });
    p.querySelectorAll('[data-paper]').forEach(b => b.onclick = () => { lay.paper = b.dataset.paper; save(); bkRender(); draw(p); });
    p.querySelectorAll('[data-tg]').forEach(b => b.onclick = () => { target = b.dataset.tg; draw(p); });
    p.querySelectorAll('[data-fr]').forEach(b => b.onclick = () => { const fr = Array.from({ length: Math.max(e.photos.length, 1) }, (_, i) => pageFrame(e, i));
      if (target === 'all') fr.fill(b.dataset.fr); else fr[+target] = b.dataset.fr; lay.fr = fr.slice(0, 6); if (lay.fr.every(x => x === 'polaroid')) delete lay.fr; save(); bkRender(); draw(p); });
  };
  openPanel(`<h2>Style de la page</h2><div class="stk-tabs" role="tablist"><button class="on" data-tab="f">Typographie</button><button data-tab="fr">Cadres photo</button><button data-tab="p">Papier</button></div>
    <div class="stk-pane" data-pane="f"><div class="sty-fonts" id="sty-f"></div></div>
    <div class="stk-pane" data-pane="fr" hidden><div class="sty-tg" id="sty-t"></div><div class="sty-frames" id="sty-fr"></div></div>
    <div class="stk-pane" data-pane="p" hidden><div class="sty-papers" id="sty-p"></div></div>${CLOSE('Fermer')}`, p => {
    p.querySelectorAll('.stk-tabs button').forEach(b => b.onclick = () => { p.querySelectorAll('.stk-tabs button').forEach(x => x.classList.toggle('on', x === b)); p.querySelectorAll('.stk-pane').forEach(x => x.hidden = x.dataset.pane !== b.dataset.tab); });
    draw(p);
  }, { nofocus: true }); };

/* ---------- branchements sur les photos et l'actualisation ---------- */
{ const up0 = uploadPhoto; uploadPhoto = (f, kind, o) => up0(f, kind, o || (String(photoTarget || '').startsWith('stk|') ? { max: 700, square: true } : undefined)); }
{ const on0 = onPhoto; onPhoto = async (target, path) => {
  if (String(target).startsWith('stk|')) { const [, tid, eid, sh] = target.split('|'), t = trip(tid), e = t && t.entrees.find(x => x.id === eid);
    if (!e) return; if (BK && curEntry() && curEntry().id !== eid) return; addSticker({ k: 'p', p: path, sh }); toast('Sticker créé'); return; }
  await on0(target, path); if (BK) bkRender(); }; }
{ const rf0 = refresh; refresh = () => { rf0(); if (BK && !BK.busy) bkRender(); }; }
{ const cp0 = closePanel; closePanel = () => { cp0(); if (BK) setTimeout(() => { if (BK && !BK.busy && !$('panel').classList.contains('open')) bkRender(); }, 400); }; }

/* ---------- écran Journal : la bibliothèque ---------- */
let shelfSel = 0;
function renderJournalShelf() {
  const sc = $('s-journal'), list = sorted();
  if (!list.length) { sc.innerHTML = `<div class="navrow"><button class="iconbtn" data-act="back" aria-label="Retour">${SV.back}</button></div><h1 class="bigtitle sans">Journal</h1><div class="emptycard"><b>Pas encore de carnet</b><p>Crée ton premier voyage : il devient un carnet à feuilleter, à remplir de photos, de textes et de stickers.</p><button class="btn2 g wide" data-act="newTrip">${SV.plus}Créer un voyage</button></div>`; return; }
  shelfSel = Math.min(shelfSel, list.length - 1);
  const tiles = list.flatMap(t => t.entrees.flatMap(e => e.photos.filter(Boolean).map(p => ({ t, e, p })))).slice(0, 60);
  sc.innerHTML = `<div class="navrow"><button class="iconbtn" data-act="back" aria-label="Retour">${SV.back}</button></div>
   <h1 class="bigtitle sans">Journal</h1><p class="small" style="margin-top:4px">Fais défiler pour choisir un carnet, touche-le pour l'ouvrir.</p>
   <div class="bookcase"><div class="bc-row" id="shelf">${list.map((t, i) => { const c = BOOKS[bookColor(t.bk, t.id)], h = 178 + (t.entrees.length * 7 + (i * 13) % 26) % 46, w = 40 + Math.min(18, t.entrees.length * 3) + (i * 5) % 10;
       return `<button class="spine" data-i="${i}" data-trip="${t.id}" style="${leather(c)};--h:${h}px;--w:${w}px" aria-label="Carnet ${esc(place(t))}"><span class="sband t"></span><span class="ttl">${esc(short(t))}</span><span class="yr num">${D(t.du).getFullYear()}</span><span class="sband b"></span></button>`; }).join('')}
       <button class="spine add" data-act="newTrip" style="--h:178px;--w:44px" aria-label="Nouveau carnet">${SV.plus}</button></div><div class="bc-plank"></div></div>
   <div class="shelf-info" id="shelfInfo"></div>
   <div class="sec"><h2>Mur de souvenirs</h2><span class="small">${tiles.length} photo${tiles.length > 1 ? 's' : ''}</span></div>
   ${tiles.length ? `<div class="pinwall">${tiles.map(o => `<button class="pin" data-act="openBook" data-trip="${o.t.id}" data-entry="${o.e.id}">${IMG(o.p)}<span><b>${esc(o.e.t)}</b><i>${esc(short(o.t))}, jour ${o.e.j}</i></span></button>`).join('')}</div>` : `<div class="emptyj">Ajoute des photos à tes pages : elles apparaîtront ici comme un tableau d'inspiration.</div>`}`;
  const row = $('shelf'), spines = [...row.querySelectorAll('.spine:not(.add)')];
  const select = (i, scroll) => { shelfSel = Math.max(0, Math.min(spines.length - 1, i)); spines.forEach((s, k) => s.classList.toggle('on', k === shelfSel));
    const t = trip(spines[shelfSel].dataset.trip), f = info(t);
    $('shelfInfo').innerHTML = `<div><b>${esc(place(t))}</b><span>${flag(t.pays)} ${fd(t.du)} au ${fd(t.au)} ${D(t.du).getFullYear()}, ${t.entrees.length} page${t.entrees.length > 1 ? 's' : ''}${f.enCours ? ', en cours' : ''}</span></div><button class="btn2 g" data-act="openBook" data-trip="${t.id}">Ouvrir</button>`;
    if (scroll) spines[shelfSel].scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' }); };
  spines.forEach((s, i) => s.onclick = () => { if (i === shelfSel) ACT.openBook({ trip: s.dataset.trip }); else select(i, true); });
  // molette : un cran = un carnet
  let wl = 0; row.addEventListener('wheel', e => { const d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX; if (!d) return; e.preventDefault(); if (Date.now() - wl < 140) return; wl = Date.now(); select(shelfSel + (d > 0 ? 1 : -1), true); }, { passive: false });
  // défilement au doigt : le carnet au centre est sélectionné
  let st = null; row.addEventListener('scroll', () => { clearTimeout(st); st = setTimeout(() => { const mid = row.getBoundingClientRect().left + row.clientWidth / 2; let best = 0, bd = 1e9; spines.forEach((s, i) => { const r = s.getBoundingClientRect(), dd = Math.abs(r.left + r.width / 2 - mid); if (dd < bd) { bd = dd; best = i; } }); if (best !== shelfSel) select(best, false); }, 120); }, { passive: true });
  row.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { select(shelfSel + 1, true); e.preventDefault(); } if (e.key === 'ArrowLeft') { select(shelfSel - 1, true); e.preventDefault(); } });
  select(shelfSel, false); requestAnimationFrame(() => spines[shelfSel] && spines[shelfSel].scrollIntoView({ inline: 'center', block: 'nearest' }));
}
SCREENS.journal = renderJournalShelf;

/* albums des amis : même carnet, en lecture seule */
ACT.openAlbum = async d => { const a = await rpc('get_album', { p_trip: d.trip }); if (!a) { toast('Album indisponible'); return; } openBook(bookOfAlbum(a)); bindBookGestures(); };
