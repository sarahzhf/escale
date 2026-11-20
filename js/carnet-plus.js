/* Eskalys : carnet libre et carnet à plusieurs.
 *
 * 1. Photos libres : chaque photo d'une page devient un élément « f » posé où l'on veut, comme un sticker :
 *    on la glisse, on la pince pour l'agrandir ou la tourner, on la rogne (cadrage et format) et on choisit
 *    son cadre, ou aucun cadre. La photo reste aussi dans la liste des photos du jour (e.photos), pour
 *    l'onglet Photos, les compteurs et l'itinéraire.
 *    Élément : { k:'f', p: chemin, x, y (en % de la double page), s (taille), r (rotation),
 *                fr: cadre, ar: format ('o' original, 'carre', 'portrait', 'paysage', 'large', 'story'), cx, cy (point de cadrage en %), cz (zoom 1 à 3), cap: légende }
 * 2. Plus de papiers, de couleurs d'encre et de masking tapes.
 * 3. Collaborer : la propriétaire invite des amis qui étaient du voyage. Ils écrivent, ajoutent des photos et
 *    décorent les pages du carnet, sans jamais voir le budget, les dépenses ni les documents.
 *    Côté serveur : table trip_collaborators et fonctions collab_* (supabase/migrations/20261120_v2_10_carnet_collab.sql).
 *    Côté appli : les carnets partagés avec moi sont gardés dans COLLAB_TRIPS (jamais mélangés à mes voyages)
 *    et chaque page modifiée est envoyée par collab_save_entry.
 */
'use strict';
const COLLAB_TRIPS = new Map();
(() => {
  /* ---------- photos libres ---------- */
  const FP_FRAMES = { aucun: 'Sans cadre', polaroid: 'Polaroïd', blanc: 'Bord blanc', arrondi: 'Arrondi', rond: 'Rond', timbre: 'Timbre', film: 'Pellicule', scotch: 'Scotchée', ombre: 'Ombre douce', kraft: 'Bord kraft' };
  const FP_AR = { o: ['Original', null], carre: ['Carré', '1 / 1'], portrait: ['Portrait', '3 / 4'], paysage: ['Paysage', '4 / 3'], large: ['Large', '16 / 9'], story: ['Story', '9 / 16'] };
  window.FP_FRAMES = FP_FRAMES;
  window.freePhotoHTML = s => {
    const fr = FP_FRAMES[s.fr] ? s.fr : 'polaroid', ar = s.fr === 'rond' ? '1 / 1' : (FP_AR[s.ar] || FP_AR.o)[1];
    const crop = `--cx:${+s.cx >= 0 ? +s.cx : 50}%;--cy:${+s.cy >= 0 ? +s.cy : 50}%;--cz:${Math.max(1, Math.min(3, +s.cz || 1))}`;
    return `<figure class="fp fr-${fr}"><span class="fpc${ar ? '' : ' nat'}" style="${ar ? `aspect-ratio:${ar};` : ''}${crop}">${IMG(s.p)}</span>${fr === 'polaroid' && s.cap ? `<figcaption>${esc(s.cap)}</figcaption>` : ''}${fr === 'polaroid' && s.tp != null ? `<i class="tape t${(+s.tp || 0) % 3}"></i>` : ''}${fr === 'scotch' ? '<i class="tp a"></i><i class="tp b"></i>' : ''}</figure>`;
  };
  const r1 = n => Math.round(n * 10) / 10;
  const SLOTS = [[[25, 46]], [[25, 33], [25, 68]], [[17, 32], [33, 50], [19, 72]], [[16, 32], [34, 32], [16, 66], [34, 66]], [[15, 28], [34, 30], [25, 52], [15, 75], [35, 75]], [[15, 26], [35, 26], [15, 51], [35, 51], [15, 76], [35, 76]]];
  const FR_MAP = { polaroid: 'polaroid', simple: 'blanc', cercle: 'rond', timbre: 'timbre', arche: 'arrondi', ovale: 'arrondi', festonne: 'blanc', vague: 'blanc', dentelle: 'blanc' };
  /** Première modification d'une page : ses photos quittent la grille et deviennent libres, à la même place à peu près. */
  const FREED = new Set();
  function freePage(e) {
    if (!e || (e.lay && e.lay.free) || FREED.has(e.id)) return false; FREED.add(e.id); e.lay = e.lay || {}; e.st = e.st || [];
    const placed = new Set(e.st.filter(x => x.k === 'f').map(x => x.p)), ph = e.photos.map((p, i) => ({ p, i })).filter(o => o.p && !placed.has(o.p)).slice(0, 6);
    const pos = SLOTS[Math.max(0, ph.length - 1)] || SLOTS[0], sc = ph.length <= 1 ? 1.15 : ph.length <= 2 ? .95 : ph.length <= 4 ? .72 : .6;
    // place exacte de chaque photo dans la grille affichée : la page ne bouge pas quand elle devient libre
    let real = null; const stkEl = $('bkStk'), Lp = $('bkL');
    if (stkEl && Lp && BK && curEntry() === e) { const sr = stkEl.getBoundingClientRect(), figs = [...Lp.querySelectorAll('.pg-ph > figure')];
      if (sr.width && figs.length === ph.length) real = figs.map(f => { const r = f.getBoundingClientRect(), rot = parseFloat(getComputedStyle(f).getPropertyValue('--rot')) || 0;
        return { x: r1((r.left + r.width / 2 - sr.left) / sr.width * 100), y: r1((r.top + r.height / 2 - sr.top) / sr.height * 100), s: Math.max(.3, Math.min(4, Math.round(f.offsetWidth / 118 * 100) / 100)), r: rot }; }); }
    // les photos passent sous les stickers déjà posés
    const add = ph.map((o, k) => ({ k: 'f', p: o.p, x: real ? real[k].x : pos[k][0], y: real ? real[k].y : pos[k][1], s: real ? real[k].s : sc, r: real ? real[k].r : [-4, 3, -2, 5, -5, 2][k % 6], fr: FR_MAP[pageFrame(e, o.i)] || 'polaroid', ar: 'carre', cx: 50, cy: 50, cz: 1, tp: k % 3 })); // tp : le petit morceau de scotch du polaroïd, gardé
    e.st = add.concat(e.st); e.lay.free = 1; delete e.lay.fr; e.photos = e.photos.filter(Boolean); return true;
  }
  { const r0 = bkRender; bkRender = () => { if (BK && BK.edit && BK.book.own) { const e = curEntry(); if (freePage(e)) { if (BK.sel != null) BK.sel = null; save(); } } r0(); }; }
  // Photo : on choisit une photo, elle arrive au milieu de la page, prête à être déplacée
  ACT.bkPhoto = () => { const t = bookTrip(), e = curEntry(); if (!t || !e) return;
    if (e.photos.filter(Boolean).length >= 12) { toast('12 photos maximum par page'); return; }
    pickPhoto(`fp|${t.id}|${e.id}|new`); }; // l'emplacement n'est créé qu'une fois la photo choisie
  { const on0 = onPhoto; onPhoto = async (target, path) => {
    if (!String(target).startsWith('fp|')) return on0(target, path);
    const [, tid, eid, i] = target.split('|'), t = trip(tid), e = t && t.entrees.find(x => x.id === eid); if (!e) return;
    e.photos = e.photos.filter(Boolean); e.photos.push(path); e.st = e.st || []; const cx = BK && BK.zoom === 'r' ? 75 : 25;
    e.st.push({ k: 'f', p: path, x: r1(cx - 4 + Math.random() * 8), y: r1(42 + Math.random() * 12), s: 1, r: Math.round(Math.random() * 8 - 4), fr: 'polaroid', ar: 'o', cx: 50, cy: 50, cz: 1 });
    if (BK && curEntry() && curEntry().id === eid) BK.sel = e.st.length - 1;
    save(); if (BK) bkRender(); toast('Photo posée : glisse-la où tu veux'); }; }
  // retirer une photo libre la retire aussi des photos du jour
  { const st0 = ACT.bkStk; ACT.bkStk = d => { const e = curEntry(), s = e && BK.sel != null ? e.st[BK.sel] : null;
    if (s && s.k === 'f' && d.op === 'del' && !e.st.some((x, k) => k !== BK.sel && x.p === s.p)) e.photos = e.photos.filter(x => x && x !== s.p);
    return st0(d); }; }

  /* rogner : on fait glisser la photo dans son cadre, on zoome, on choisit le format */
  ACT.fpCrop = () => { const e = curEntry(), s = e && e.st[BK.sel]; if (!s || s.k !== 'f') return;
    const keep = { ar: s.ar, cx: s.cx, cy: s.cy, cz: s.cz };
    const ar = () => s.fr === 'rond' ? '1 / 1' : (FP_AR[s.ar || 'o'] || FP_AR.o)[1];
    openPanel(`<h2>Rogner la photo</h2><p class="small">Fais glisser la photo pour la cadrer, zoome avec le curseur.</p>
      <div class="fp-ed"><span class="fpc" id="fp-box">${IMG(s.p)}</span></div>
      <label class="fld"><span>Zoom</span><input type="range" id="fp-z" min="1" max="3" step="0.01" value="${+s.cz || 1}"></label>
      <p class="setsec">Format</p><div class="seg wide wrap" id="fp-ar">${Object.entries(FP_AR).map(([k, [n]]) => `<button type="button" data-ar="${k}" class="${(s.ar || 'o') === k ? 'on' : ''}">${n}</button>`).join('')}</div>
      <button class="btn full" id="fp-ok" style="margin-top:14px">Valider le cadrage<i>${SV.arrow}</i></button>
      <button class="btn2 wide" id="fp-rs" style="margin-top:8px">Recentrer</button>${CLOSE()}`, p => {
      const box = p.querySelector('#fp-box');
      const paint = () => { const a = ar(); box.style.aspectRatio = a || ''; box.classList.toggle('nat', !a); box.classList.toggle('round', s.fr === 'rond');
        box.style.setProperty('--cx', (s.cx ?? 50) + '%'); box.style.setProperty('--cy', (s.cy ?? 50) + '%'); box.style.setProperty('--cz', s.cz || 1); };
      paint();
      let d0 = null;
      box.addEventListener('pointerdown', ev => { d0 = { x: ev.clientX, y: ev.clientY, cx: s.cx ?? 50, cy: s.cy ?? 50 }; try { box.setPointerCapture(ev.pointerId); } catch (_) { } ev.preventDefault(); });
      box.addEventListener('pointermove', ev => { if (!d0) return; const r = box.getBoundingClientRect(), z = s.cz || 1;
        s.cx = r1(Math.max(0, Math.min(100, d0.cx - (ev.clientX - d0.x) / r.width * 100 / z * 1.6)));
        s.cy = r1(Math.max(0, Math.min(100, d0.cy - (ev.clientY - d0.y) / r.height * 100 / z * 1.6))); paint(); });
      const end = () => { d0 = null; }; box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
      p.querySelector('#fp-z').oninput = ev => { s.cz = r1(+ev.target.value * 100) / 100; paint(); };
      p.querySelectorAll('[data-ar]').forEach(b => b.onclick = () => { s.ar = b.dataset.ar; p.querySelectorAll('[data-ar]').forEach(x => x.classList.toggle('on', x === b)); paint(); });
      p.querySelector('#fp-rs').onclick = () => { s.cx = 50; s.cy = 50; s.cz = 1; p.querySelector('#fp-z').value = 1; paint(); };
      p.querySelector('#fp-ok').onclick = () => { save(); closePanel(); bkRender(); toast('Cadrage enregistré'); };
      p.querySelector('[data-close]').addEventListener('click', () => { Object.assign(s, keep); bkRender(); });
    }, { nofocus: true }); };
  /* cadre : aucun, polaroïd (avec légende), bord blanc, arrondi, rond, timbre, pellicule, scotchée… */
  ACT.fpFrame = () => { const e = curEntry(), s = e && e.st[BK.sel]; if (!s || s.k !== 'f') return;
    openPanel(`<h2>Cadre de la photo</h2><p class="small">Choisis un cadre, ou aucun pour poser la photo telle quelle.</p>
      <div class="fp-frames">${Object.entries(FP_FRAMES).map(([k, n]) => `<button data-fr="${k}" class="${(s.fr || 'polaroid') === k ? 'on' : ''}"><span class="fp-demo">${freePhotoHTML({ ...s, fr: k, cap: '' })}</span><em>${n}</em></button>`).join('')}</div>
      <label class="fld" id="fp-capw" ${s.fr && s.fr !== 'polaroid' ? 'hidden' : ''}><span>Légende sous le polaroïd <i class="opt">facultatif</i></span><input id="fp-cap" maxlength="40" value="${esc(s.cap || '')}" placeholder="Ex. Coucher de soleil à Oia"></label>
      ${CLOSE('Fermer')}`, p => {
      p.querySelectorAll('[data-fr]').forEach(b => b.onclick = () => { s.fr = b.dataset.fr; p.querySelectorAll('[data-fr]').forEach(x => x.classList.toggle('on', x === b)); p.querySelector('#fp-capw').hidden = s.fr !== 'polaroid'; save(); bkRender(); });
      p.querySelector('#fp-cap').oninput = ev => { s.cap = ev.target.value.slice(0, 40); clearTimeout(p._t); p._t = setTimeout(() => { save(); bkRender(); }, 400); };
    }, { nofocus: true }); };

  /* ---------- plus de papiers, d'encres et de masking tapes ---------- */
  Object.assign(PAPERS, { ivoire: 'Ivoire', ciel: 'Bleu ciel', sauge: 'Sauge', lavande: 'Lavande', citron: 'Jaune pâle', peche: 'Pêche', menthe: 'Menthe', terracotta: 'Terracotta', nuit: 'Bleu nuit', noir: 'Noir', millimetre: 'Millimétré', aquarelle: 'Aquarelle', vintage: 'Vieux papier', calque: 'Carreaux colorés' });
  ['#3C6E8F', '#7A5C9E', '#E07A3F', '#5FA8A0', '#F2C14E'].forEach(c => { if (!INK.includes(c)) INK.splice(INK.length - 1, 0, c); });
  ['#F6E27A', '#B7D7C9', '#F4B6C2', '#C7B3E5', '#9AD0EC', '#E9C4A0'].forEach(c => { if (!STK.w.includes(c)) STK.w.push(c); });
  ['🗽', '🏖️', '🏕️', '🎡', '🛶', '🚗', '🚌', '🛫', '🗺', '🧭', '📍', '🌺', '🍋', '🍕', '🥘', '🍷', '🌈', '❄️', '🔥', '🎶', '💛', '🫶', '🐚', '🐠'].forEach(x => { if (!STK.e.includes(x)) STK.e.push(x); });
  // dans Style > Papier : appliquer le même papier à tout le carnet
  { const sty0 = ACT.bkStyle; ACT.bkStyle = d => { sty0(d);
    const e0 = curEntry(), frp = document.querySelector('#panel .stk-pane[data-pane="fr"]');
    if (frp && e0 && e0.lay && e0.lay.free) frp.innerHTML = '<p class="small" style="line-height:1.55">Sur cette page, chaque photo a son propre cadre : ferme ce menu, touche une photo, puis ▢ pour choisir son cadre et ✂ pour la rogner.</p>';
    const pane = document.querySelector('#panel .stk-pane[data-pane="p"]'), t = bookTrip(); if (!pane || !t || pane.querySelector('#pp-all')) return;
    pane.insertAdjacentHTML('beforeend', '<button class="btn2 wide" id="pp-all" style="margin-top:12px">Mettre ce papier sur toutes les pages</button>');
    pane.querySelector('#pp-all').onclick = () => { const e = curEntry(), pp = e && e.lay && e.lay.paper; if (!pp) { toast('Choisis d’abord un papier'); return; }
      t.entrees.forEach(x => { x.lay = x.lay || {}; x.lay.paper = pp; }); save(); bkRender(); toast('Papier appliqué à tout le carnet'); }; }; }

  /* ---------- collaborer ---------- */
  SV.users = SV.users || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 19c.6-3.2 3-5 6-5s5.4 1.8 6 5"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.2c2.4.2 4.3 1.8 4.8 4.8"/></svg>';
  const isCollab = () => BK && BK.book && BK.book.collab;
  { const ob0 = openBook; openBook = (book, start) => { ob0(book, start);
    const top = document.querySelector('#book .bk-top'); if (!top) return;
    if (book.collab) { const c = top.querySelector('[data-act="bkColor"]'); if (c) c.remove(); top.querySelector('.bk-tt').insertAdjacentHTML('beforeend', `<span class="bk-by">Carnet de ${esc(book.ownerName || 'ton amie')} · <button data-act="collabLeaveAsk" data-trip="${book.tripId}">quitter</button></span>`); }
    else if (book.own) { const ed = top.querySelector('[data-act="bkEdit"]'); if (ed) ed.insertAdjacentHTML('beforebegin', `<button class="bk-ic" data-act="collabManage" aria-label="Carnet à plusieurs">${SV.users}</button>`); pullTrip(book.tripId); }
  }; }
  { const bt0 = bookOfTrip; bookOfTrip = t => { const b = bt0(t); if (t._collab) { b.collab = true; b.ownerName = t._owner; } return b; }; }

  /* la propriétaire : qui peut remplir ce carnet avec moi */
  ACT.collabManage = async () => { const t = bookTrip(); if (!t || t._collab) return;
    let fr = [], cur = [], crew = [];
    try { [fr, cur, crew] = await Promise.all([rpc('my_friends'), rpc('collab_list', { p_trip: t.id }), rpc('crew_of', { p_trip: t.id })]); } catch (e) { toast(navigator.onLine ? 'Le carnet à plusieurs sera disponible après la prochaine mise à jour' : 'Pas de connexion'); return; }
    // seulement les amis du voyage : l'équipage choisi dans Entre amis
    const inCrew = new Set((crew || []).map(x => typeof x === 'string' ? x : x.crew_of || x.user_id || x.id));
    fr = (fr || []).filter(f => f.relation === 'friend' && inCrew.has(f.id)); const on = new Set((cur || []).map(x => x.id));
    openPanel(`<h2>Carnet à plusieurs</h2><p class="small">Invite les amis qui étaient du voyage. Ils pourront écrire, ajouter leurs photos et décorer les pages avec toi. Ils ne voient jamais ton budget, tes dépenses ni tes documents.</p>
      ${fr.length ? `<div class="flist collab-l">${fr.map(f => `<button type="button" class="togrow ${on.has(f.id) ? 'on' : ''}" data-u="${f.id}" aria-pressed="${on.has(f.id)}"><div><b>${esc(f.display_name || 'Ami')}</b><span>${on.has(f.id) ? 'Peut remplir le carnet' : 'Touche pour l’inviter'}</span></div><i class="sw"></i></button>`).join('')}</div>`
        : '<p class="small" style="margin-top:12px">Aucun ami du voyage pour l’instant. Ajoute d’abord tes amis Eskalys qui sont partis avec toi.</p>'}
      <button type="button" class="btn2 wide" id="cl-crew" style="margin-top:12px">${SV.users}Choisir les amis du voyage</button>${on.size ? `<button type="button" class="btn2 wide" data-act="bkHistory" style="margin-top:8px">${SV.clock}Historique des modifications</button>` : ''}${CLOSE('Fermer')}`, p => {
      p.querySelector('#cl-crew').onclick = () => { closePanel(); setTimeout(() => ACT.crewSet({ trip: t.id }), 360); };
      p.querySelectorAll('[data-u]').forEach(b => b.onclick = async () => { const v = !b.classList.contains('on'); b.disabled = true;
        try { await rpc('collab_set', { p_trip: t.id, p_user: b.dataset.u, p_on: v }); b.classList.toggle('on', v); b.setAttribute('aria-pressed', v); b.querySelector('span').textContent = v ? 'Peut remplir le carnet' : 'Touche pour l’inviter'; toast(v ? 'Invitation envoyée' : 'Retiré du carnet'); }
        catch (e) { toast(errMsg(e)); } b.disabled = false; });
    }, { nofocus: true }); };

  /* la propriétaire récupère les pages écrites par ses amis à l'ouverture du carnet */
  async function pullTrip(tid) {
    const t = S.trips.find(x => x.id === tid); if (!t || !navigator.onLine || !SNAP) return;
    const { data, error } = await sb.from('journal_entries').select('*').eq('trip_id', tid); if (error || !data) return;
    const snap = SNAP.journal_entries, mine = new Map(t.entrees.map(e => [e.id, e])), seen = new Set(); let changed = false;
    const conv = r => ({ id: r.id, j: r.day, t: r.title, n: r.note, d: r.description || '', st: r.stickers || [], lay: r.layout || {}, photos: r.photo_paths || [] });
    for (const r of data) { seen.add(r.id); const loc = mine.get(r.id), srv = conv(r), srvJson = JSON.stringify(ROW.journal_entries([t, srv]));
      if (snap[r.id] === srvJson) continue; // rien de neuf
      if (loc && snap[r.id] && JSON.stringify(ROW.journal_entries([t, loc])) !== snap[r.id]) continue; // modifiée ici aussi : la version de cet appareil part au serveur
      if (loc) Object.assign(loc, srv); else t.entrees.push(srv); snap[r.id] = srvJson; changed = true; }
    t.entrees.slice().forEach(e => { if (!seen.has(e.id) && snap[e.id] && JSON.stringify(ROW.journal_entries([t, e])) === snap[e.id]) { t.entrees = t.entrees.filter(x => x !== e); delete snap[e.id]; changed = true; } });
    if (!changed) return; t.entrees.sort((a, b) => a.j - b.j); writeCache(); if (BK && BK.book.tripId === tid && !BK.edit) bkRender();
  }

  /* les amis : carnets partagés avec moi */
  // pour chaque carnet partagé : t._snap = Map(id de page -> JSON confirmé par le serveur)
  const rowOf = e => ({ id: e.id, day: e.j, title: e.t, note: e.n || '', description: e.d || '', photo_paths: e.photos, stickers: e.st || [], layout: e.lay || {} });
  async function loadCollab(tid) {
    const b = await rpc('collab_book', { p_trip: tid }); if (!b || !b.trip) throw new Error('Carnet indisponible');
    const r = b.trip, t = { id: r.id, pays: r.country_code, ville: r.city || '', du: r.start_date, au: r.end_date, bk: r.book_color || null, cover: r.cover_path, budget: 0, lieux: [], todo: [], tickets: [], membres: [], reglements: [], depenses: [], vis: 'prive', _collab: true, _owner: r.owner_name || '',
      entrees: (b.entries || []).map(x => ({ id: x.id, j: x.day, t: x.title, n: x.note || '', d: x.description || '', st: x.stickers || [], lay: x.layout || {}, photos: x.photo_paths || [] })).sort((a, c) => a.j - c.j) };
    t._snap = new Map(t.entrees.map(e => [e.id, JSON.stringify(rowOf(e))])); COLLAB_TRIPS.set(t.id, t); return t;
  }
  ACT.collabOpen = async d => { try { const t = await loadCollab(d.trip); openBook(bookOfTrip(t), 0); bindBookGestures(); } catch (e) { toast(errMsg(e)); } };
  let pushT = null, pushing = false;
  async function pushCollab() {
    if (pushing) { clearTimeout(pushT); pushT = setTimeout(pushCollab, 800); return; } pushing = true;
    try { for (const t of COLLAB_TRIPS.values()) {
      const ids = new Set(t.entrees.map(e => e.id));
      for (const e of t.entrees) { const j = JSON.stringify(rowOf(e)); if (t._snap.get(e.id) === j) continue;
        await rpc('collab_save_entry', { p_trip: t.id, p_entry: rowOf(e) }); t._snap.set(e.id, j); }
      for (const id of [...t._snap.keys()]) if (!ids.has(id)) { await rpc('collab_delete_entry', { p_trip: t.id, p_id: id }); t._snap.delete(id); } } }
    catch (e) { if (navigator.onLine) toast('Page du carnet partagé non enregistrée : ' + errMsg(e)); clearTimeout(pushT); pushT = setTimeout(pushCollab, 15000); }
    pushing = false;
  }
  { const sv0 = save; save = (...a) => { sv0(...a); if (COLLAB_TRIPS.size) { clearTimeout(pushT); pushT = setTimeout(pushCollab, 600); } }; }
  addEventListener('online', () => { if (COLLAB_TRIPS.size) pushCollab(); });

  /* étagère : « Carnets partagés avec toi » sous mes carnets */
  let shared = null;
  async function sharedShelf() {
    const host = document.getElementById('collabShelf'); if (!host) return;
    try { shared = await rpc('collab_trips'); } catch (_) { shared = shared || []; }
    if (!shared || !shared.length) { host.innerHTML = ''; return; }
    host.innerHTML = `<div class="sec"><h2>Carnets partagés avec toi</h2></div><div class="collab-shelf">${shared.map(x => { const c = BOOKS[bookColor(x.book_color, x.id)];
      return `<button class="cs-book" data-act="collabOpen" data-trip="${x.id}" style="${leather(c)}"><span class="cs-cv">${x.cover_path ? IMG(x.cover_path) : ''}</span><b>${esc(x.city || (COUNTRIES[x.country_code] || {}).n || '')}</b><em>Carnet de ${esc(x.owner_name || 'ton amie')}</em></button>`; }).join('')}</div>`;
  }
  { const rj0 = renderJournalShelf; renderJournalShelf = (...a) => { const r = rj0(...a); const sc = $('s-journal'); if (sc && !sc.querySelector('#collabShelf')) { const anchor = sc.querySelector('#shelfInfo') || sc.querySelector('.emptycard'); if (anchor) { anchor.insertAdjacentHTML('afterend', '<div id="collabShelf"></div>'); sharedShelf(); } } return r; }; if (typeof SCREENS !== 'undefined') SCREENS.journal = renderJournalShelf; }
  ACT.collabLeaveAsk = d => openPanel(`<h2>Quitter ce carnet ?</h2><p class="small">Tes pages et tes photos restent dans le carnet de ton amie. Tu ne pourras plus le modifier, sauf si elle t'invite à nouveau.</p><button class="danger" data-act="collabLeave" data-trip="${d.trip}">Quitter le carnet</button>${CLOSE()}`, null, { nofocus: true });
  ACT.collabLeave = async d => { try { await rpc('collab_leave', { p_trip: d.trip }); COLLAB_TRIPS.delete(d.trip); closePanel(); closeBook(); toast('Tu as quitté ce carnet'); sharedShelf(); } catch (e) { toast(errMsg(e)); } };

  /* ---------- annuler la dernière action ---------- */
  // à chaque enregistrement pendant la modification, l'état précédent de la page est gardé (50 étapes)
  const UNDO = [], BASE = new Map(); let undoing = false;
  const ej = e => JSON.stringify({ t: e.t, d: e.d || '', n: e.n || '', j: e.j, photos: e.photos, st: e.st || [], lay: e.lay || {} });
  { const sv1 = save; save = (...a) => {
    if (BK && BK.edit && !undoing) { const e = curEntry(); if (e) { const j = ej(e), prev = BASE.get(e.id);
      if (prev && prev !== j) { UNDO.push({ tid: BK.book.tripId, id: e.id, j: prev }); if (UNDO.length > 50) UNDO.shift(); }
      BASE.set(e.id, j); } }
    return sv1(...a); }; }
  ACT.bkUndo = () => { if (!BK) return; let k = UNDO.length - 1; while (k >= 0 && UNDO[k].tid !== BK.book.tripId) k--;
    if (k < 0) { toast('Rien à annuler'); return; } const u = UNDO.splice(k, 1)[0], t = trip(u.tid), e = t && t.entrees.find(x => x.id === u.id);
    if (!e) { toast('Cette page n’existe plus'); return; }
    const v = JSON.parse(u.j); Object.assign(e, { t: v.t, d: v.d, n: v.n, j: v.j, photos: v.photos, st: v.st, lay: v.lay }); BASE.set(e.id, u.j);
    const i = BK.book.spreads.findIndex(x => x.kind === 'day' && x.e.id === e.id); if (i >= 0 && i !== BK.i) BK.i = i;
    BK.sel = null; undoing = true; try { save(); } finally { undoing = false; } bkRender(); toast('Action annulée'); };
  // les photos retirées pendant la modification ne sont effacées qu'à la fin, pour pouvoir annuler
  const LATER = new Set();
  { const rm0 = releaseMedia; releaseMedia = p => { if (BK && BK.edit && p) { LATER.add(p); return; } rm0(p); };
    const flushLater = () => { if (!LATER.size) return; const used = new Set(); [...S.trips, ...COLLAB_TRIPS.values()].forEach(t => t.entrees.forEach(e => { e.photos.forEach(x => x && used.add(x)); (e.st || []).forEach(x => x.p && used.add(x.p)); }));
      [...LATER].forEach(p => { if (!used.has(p)) rm0(p); }); LATER.clear(); };
    const br = bkRender; bkRender = () => { if (BK && !BK.edit) { flushLater(); UNDO.length = 0; } br(); };
    const cb = closeBook; closeBook = (...a) => { const r = cb(...a); flushLater(); UNDO.length = 0; BASE.clear(); return r; }; }
  { const bar0 = bkBar; bkBar = () => { bar0(); if (!BK || !BK.edit) return; const tools = document.querySelector('#bkBot .bk-tools'); if (!tools) return;
    const has = UNDO.some(u => u.tid === BK.book.tripId);
    tools.insertAdjacentHTML('afterbegin', `<button data-act="bkUndo" class="undo" aria-label="Annuler la dernière action" ${has ? '' : 'disabled'}>↶</button>`); }; }

  /* ---------- historique des modifications (carnet à plusieurs) ---------- */
  const ACTS = { page_new: 'a créé la page', page_del: 'a supprimé la page', titre: 'a changé le titre', texte: 'a écrit du texte', photo_add: 'a ajouté des photos', photo_del: 'a retiré des photos',
    stk_add: 'a ajouté des stickers', stk_del: 'a retiré des stickers', deplace: 'a déplacé ou recadré des éléments', style: 'a changé le style de la page' };
  const joinFr = L => L.length <= 1 ? (L[0] || 'a modifié la page') : L.slice(0, -1).join(', ') + ' et ' + L[L.length - 1];
  const dayLbl = d => { const k = diffDays(iso(new Date(d)), TODAY); return k === 0 ? 'Aujourd’hui' : k === 1 ? 'Hier' : new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); };
  ACT.bkHistory = async () => { const tid = BK && BK.book.tripId; if (!tid) return; let L;
    try { L = await rpc('collab_history', { p_trip: tid }); } catch (_) { toast(navigator.onLine ? 'Historique indisponible pour l’instant' : 'Pas de connexion'); return; }
    L = L || []; let last = '';
    const rows = L.map(h => { const g = dayLbl(h.at), head = g !== last ? `<p class="caps hist-d">${esc(g)}</p>` : ''; last = g;
      const who = h.me ? 'Tu' : (h.name || 'Un ami'), ini = esc(((h.me ? (S.user || 'Moi') : who)[0] || '?').toUpperCase()), acts = joinFr(Object.keys(ACTS).filter(a => (h.acts || []).includes(a)).map(a => ACTS[a]));
      return `${head}<button class="hist-r" data-act="histGo" data-e="${h.entry_id || ''}"><i class="hist-av">${h.avatar ? IMG(h.avatar) : ini}</i><span><b>${esc(who)}</b> ${esc(h.me ? acts.replace(/^a /, 'as ') : acts)}<em>${h.day ? `Jour ${h.day}` : ''}${h.title ? `, ${esc(h.title)}` : ''} · ${new Date(h.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</em></span></button>`; }).join('');
    openPanel(`<h2>Historique</h2><p class="small">Qui a modifié quoi dans ce carnet, du plus récent au plus ancien.</p>${rows ? `<div class="hist">${rows}</div>` : '<p class="small" style="margin-top:12px">Rien pour l’instant. L’historique se remplit dès qu’un ami est invité à remplir le carnet avec toi.</p>'}${CLOSE('Fermer')}`, null, { nofocus: true }); };
  ACT.histGo = d => { closePanel(); if (!BK || !d.e) return; const i = BK.book.spreads.findIndex(x => x.kind === 'day' && x.e.id === d.e); if (i >= 0) setTimeout(() => flipTo(i), 380); };
  // bouton Historique : en haut du carnet pour les amis invités, et pour la propriétaire dès qu'un ami est invité
  { const ob1 = openBook; openBook = (book, start) => { ob1(book, start); const top = document.querySelector('#book .bk-top'), ed = top && top.querySelector('[data-act="bkEdit"]'); if (!ed) return;
    const btn = `<button class="bk-ic" data-act="bkHistory" aria-label="Historique des modifications">${SV.clock}</button>`;
    if (book.collab) ed.insertAdjacentHTML('beforebegin', btn);
    else if (book.own && navigator.onLine) rpc('collab_list', { p_trip: book.tripId }).then(L => { if (L && L.length && BK && BK.book.tripId === book.tripId && top.isConnected && !top.querySelector('[data-act="bkHistory"]')) ed.insertAdjacentHTML('beforebegin', btn); }).catch(() => { }); }; }

  /* ---------- carnet plus léger et plus fluide ---------- */
  // Les pages souples en WebGL demandaient une « photo » de chaque double page avant de tourner (lent, lourd en mémoire).
  // La page se tourne maintenant directement au doigt, en 3D CSS : elle suit le geste et se pose, ou revient.
  if (typeof PC !== 'undefined') PC.failed = true;
  const EASE = 'cubic-bezier(.22,.61,.36,1)';
  // stickers d'une moitié de double page : à leur place sur la double page (halfStk), ou dans la face d'une feuille (faceStk)
  const stOf = sp => sp && sp.kind === 'day' ? (sp.e.st || []) : [];
  const onHalf = (x, h) => h === 'l' ? x < 50 : x >= 50;
  // from : moitié d'origine des stickers, to : moitié où on les affiche sur la double page
  function halfStk(sp, from, to = from) { return stOf(sp).map((x, i) => onHalf(x.x, from) ? stickerHTML({ ...x, x: x.x + (to === from ? 0 : to === 'r' ? 50 : -50) }, i, false) : '').join(''); }
  function faceStk(sp, h) { return stOf(sp).map((x, i) => onHalf(x.x, h) ? stickerHTML({ ...x, x: (x.x - (h === 'r' ? 50 : 0)) * 2 }, i, false) : '').join(''); }
  function liveTurn(stage) {
    let g = null;
    const cancelG = () => { g = null; };
    stage.addEventListener('pointerdown', e => {
      if (!BK || BK.edit || BK.busy || e.button > 0 || e.target.closest('button,a,input,[contenteditable]')) { g = null; return; }
      g = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), on: false, lx: e.clientX, lt: performance.now(), v: 0 };
    });
    stage.addEventListener('pointermove', e => {
      if (!g || e.pointerId !== g.id || !BK) return; const dx = e.clientX - g.x0, dy = e.clientY - g.y0, now = performance.now();
      g.v = (e.clientX - g.lx) / Math.max(1, now - g.lt); g.lx = e.clientX; g.lt = now;
      if (!g.on) { if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.2) return; if (!start(dx < 0 ? 1 : -1)) { g = null; return; } }
      move(dx);
    });
    const up = e => { if (!g || e.pointerId !== g.id) return; const G = g; g = null; if (!G.on) return;
      const done = G.p > .33 || (G.dir > 0 ? G.v < -.45 : G.v > .45); finish(G, done && !(G.dir > 0 ? G.v > .3 : G.v < -.3)); };
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', e => { if (g && e.pointerId === g.id && g.on) { const G = g; g = null; finish(G, false); } else cancelG(); });
    function start(dir) {
      const n = BK.book.spreads.length, L = $('bkL'), R = $('bkR'), stk = $('bkStk'); if (!L || !R) return false;
      const phone = !BK.wide && BK.zoom, G = g; G.dir = dir; G.phone = phone;
      if (phone) { const z = BK.zoom, pos = BK.i * 2 + (z === 'r' ? 1 : 0), to = pos + dir; if (to < 0 || to > n * 2 - 1) return false;
        G.ti = to >> 1; G.tz = to % 2 ? 'r' : 'l'; G.side = z; G.here = z === 'r' ? R : L; G.keep = G.here.innerHTML;
        const target = pageHTML(BK.book, BK.book.spreads[G.ti], G.tz);
        if (dir > 0) { G.front = G.keep; G.back = blankBack(); G.here.innerHTML = target; G.a0 = 0; G.a1 = -180; G.origin = '0 50%'; }
        else { G.front = target; G.back = blankBack(); G.a0 = -180; G.a1 = 0; G.origin = '0 50%'; }
      } else { const k = BK.i + dir; if (k < 0 || k >= n) return false; G.k = k; const to = BK.book.spreads[k];
        if (dir > 0) { G.side = 'r'; G.here = R; G.keep = R.innerHTML; G.front = G.keep; G.back = pageHTML(BK.book, to, 'l'); R.innerHTML = pageHTML(BK.book, to, 'r'); G.a0 = 0; G.a1 = -180; G.origin = '0 50%'; G.after = () => { L.innerHTML = G.back; }; }
        else { G.side = 'l'; G.here = L; G.keep = L.innerHTML; G.front = G.keep; G.back = pageHTML(BK.book, to, 'r'); L.innerHTML = pageHTML(BK.book, to, 'l'); G.a0 = 0; G.a1 = 180; G.origin = '100% 50%'; G.after = () => { R.innerHTML = G.back; }; } }
      BK.busy = true; BK.sel = null;
      // calque des stickers : les moitiés immobiles gardent les leurs, la feuille emporte ceux de ses deux faces
      const sp = BK.book.spreads, cur = sp[BK.i], A = BK.i;
      if (phone) { const tgt = sp[G.ti]; G.fe = dir > 0 ? [cur, G.side] : [tgt, G.tz]; G.be = [null, 'l'];
        stk.innerHTML = dir > 0 ? halfStk(tgt, G.tz, G.side) + halfStk(cur, G.side === 'l' ? 'r' : 'l') : halfStk(cur, 'l') + halfStk(cur, 'r'); }
      else { const tgt = sp[G.k];
        if (dir > 0) { G.fe = [cur, 'r']; G.be = [tgt, 'l']; stk.innerHTML = halfStk(cur, 'l') + halfStk(tgt, 'r'); }
        else { G.fe = [cur, 'l']; G.be = [tgt, 'r']; stk.innerHTML = halfStk(tgt, 'l') + halfStk(cur, 'r'); } }
      // la feuille est dessinée dans un calque posé sur la page, à la taille réelle de l'écran :
      // elle reste nette même quand la page est zoomée (téléphone), et sa perspective est la sienne
      const st = $('bkStage'), sr = st.getBoundingClientRect(), r = G.here.getBoundingClientRect(), sc = r.width / PG_W;
      const ov = document.createElement('div'); ov.className = `lt-ov ${G.side}`;
      ov.style.cssText = `left:${r.left - sr.left}px;top:${r.top - sr.top}px;width:${r.width}px;height:${r.height}px;--k:${sc};perspective:${Math.round(Math.max(900, r.width * 5))}px`;
      ov.innerHTML = `<div class="lt-leaf" style="transform-origin:${G.origin}"><div class="lt-face f"><div class="bk-pg ${G.side}">${G.front}</div><div class="lfs">${faceStk(G.fe[0], G.fe[1])}</div><i class="sh"></i></div><div class="lt-face b"><div class="bk-pg ${G.side === 'l' ? 'r' : 'l'}">${G.back}</div><div class="lfs">${faceStk(G.be[0], G.be[1])}</div><i class="sh"></i></div></div>`;
      st.appendChild(ov); G.ov = ov;
      G.w = (G.here.getBoundingClientRect().width || 200) * (phone ? 1 : 1.15); G.persp = Math.round(Math.max(1400, G.w * 6)); G.on = true; G.p = 0; set(G, G.a0); return true;
    }
    function set(G, a) { const lf = G.ov && G.ov.firstChild; if (!lf) return; const p = Math.abs(a - G.a0) / 180, lift = Math.sin(Math.min(1, p) * Math.PI);
      lf.style.transform = `rotateY(${a}deg)`;
      const f = lf.querySelector('.f .sh'), b = lf.querySelector('.b .sh'), d = Math.abs(a) / 180, edge = Math.pow(Math.abs(Math.sin(a * Math.PI / 180)), 6) * .5; // plus sombre de profil : on voit la tranche, pas le contenu écrasé
      if (f) f.style.opacity = Math.min(.9, d * .5 + edge).toFixed(3); if (b) b.style.opacity = Math.min(.9, (1 - d) * .4 + edge).toFixed(3);
      const sh = $('bkShade'); if (sh) { sh.className = `bk-shade ${G.side} ${G.origin.startsWith('100') ? 'hr' : 'hl'}`; sh.style.animation = 'none'; sh.style.opacity = (lift * .6).toFixed(3); } }
    function move(dx) { const G = g; if (!G || !G.on) return; let p = (G.dir > 0 ? -dx : dx) / G.w; p = Math.max(0, Math.min(1, p)); G.p = p; set(G, G.a0 + (G.a1 - G.a0) * p); }
    function finish(G, done) {
      const lf = G.ov && G.ov.firstChild, to = done ? G.a1 : G.a0, rest = done ? 1 - G.p : G.p, ms = Math.round(180 + 260 * rest);
      if (lf) { lf.style.transition = `transform ${ms}ms ${EASE}`; lf.querySelectorAll('.sh').forEach(x => x.style.transition = `opacity ${ms}ms ${EASE}`); requestAnimationFrame(() => set(G, to)); }
      const sh = $('bkShade'); if (sh) sh.style.transition = `opacity ${ms}ms ${EASE}`;
      setTimeout(() => {
        const stk = $('bkStk');
        if (sh) { sh.className = 'bk-shade'; sh.style.cssText = ''; }
        if (BK) {
          if (done) { if (G.phone) { BK.i = G.ti; BK.busy = false; bkRender(); snapZoom(G.tz); bkBar(); } else { if (G.after) G.after(); BK.i = G.k; BK.busy = false; if (stk) stk.innerHTML = stkLayerHTML(); bkBar(); } }
          else { G.here.innerHTML = G.keep; BK.busy = false; if (stk) stk.innerHTML = stkLayerHTML(); }
        }
        // le calque part une image plus tard, une fois la page posée dessous : aucun clignotement
        requestAnimationFrame(() => { if (G.ov) G.ov.remove(); });
      }, ms + 30);
    }
  }
  { const ob2 = openBook; openBook = (book, start) => { ob2(book, start); const st = $('bkStage'); if (st && !st._live) { st._live = 1; liveTurn(st); } }; }

  // en modification : toucher la page alors qu'un élément est sélectionné le désélectionne seulement (pas de texte surprise)
  { const bt0 = bookTap; bookTap = (x, y) => { if (BK && BK.edit && BK.sel != null) { BK.sel = null; document.querySelectorAll('#bkStk .stk.sel').forEach(el => el.classList.remove('sel')); bkBar(); return; } return bt0(x, y); }; }

  /* ---------- modifier la bonne page, et savoir laquelle on modifie ---------- */
  { const ed0 = ACT.bkEdit; ACT.bkEdit = d => { if (!BK) return;
    if (!BK.edit && !curEntry()) { const sp = BK.book.spreads[BK.i];
      if (sp && sp.kind === 'add') { ACT.bkNewPage(); return; }
      toast('Cette page se remplit toute seule : tourne la page jusqu’à une journée, puis touche le crayon'); return; }
    return ed0(d); }; }
  ACT.bkSide = () => { if (!BK || BK.wide) return; BK.sel = null; bkZoom(BK.zoom === 'r' ? 'l' : 'r'); };
  { const bar1 = bkBar; bkBar = () => { bar1(); if (!BK || !BK.edit) return; const e = curEntry(), bot = $('bkBot'); if (!e || !bot || bot.querySelector('.bk-editing')) return;
    const side = BK.wide ? '' : BK.zoom === 'r' ? ' · page de droite' : ' · page de gauche';
    bot.insertAdjacentHTML('afterbegin', `<p class="bk-editing">✎ Tu modifies : <b>Jour ${e.j}${e.t ? ', ' + esc(e.t) : ''}</b>${side}</p>`);
    const tools = bot.querySelector('.bk-tools.wide'); if (tools && !BK.wide) tools.querySelector('[data-act="bkEdit"]').insertAdjacentHTML('beforebegin', `<button data-act="bkSide" aria-label="Passer à l'autre page de cette journée">⇆<span>${BK.zoom === 'r' ? 'Gauche' : 'Droite'}</span></button>`); }; }
})();
