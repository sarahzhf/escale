/* Eskalys : l'itinéraire d'un voyage, sur une vraie carte en 3D.
 *
 * Carte satellite réaliste avec le relief, la brume et le ciel (MapLibre et MapTiler),
 * un trajet blanc qui se dessine, des pins animés en 3D (three.js), une petite lumière qui
 * parcourt le trajet, et à côté de chaque lieu son nom et une mini photo en polaroïd.
 * On tourne, on incline et on zoome au doigt. Touche un lieu en bas pour s'y envoler.
 *
 * Deux entrées :
 *  - Carte > Itinéraire : tes voyages. L'itinéraire se complète petit à petit avec les lieux
 *    que tu ajoutes (recherche du lieu exact, jour, une photo du carnet).
 *  - Carte > Entre amis : les itinéraires de tes amis, ami par ami, voyage par voyage.
 *    On ne voit que leur itinéraire (lieux et photo choisie pour chaque lieu), jamais leur album,
 *    et seulement pour les voyages qu'ils partagent avec toi. Les dépenses ne sont jamais montrées.
 *
 * Les bibliothèques de carte ne sont chargées qu'à l'ouverture de l'écran.
 * Seuls la recherche de lieu et les tuiles de carte passent par MapTiler, jamais l'identité. */
'use strict';
(() => {
  const KEY = () => (window.ESCALE_CONFIG && window.ESCALE_CONFIG.maptilerKey) || '';
  const RED = '#E0533D';
  let LIBS = null;
  const addScript = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Chargement de la carte impossible')); document.head.appendChild(s); });
  function loadLibs() {
    if (LIBS) return LIBS;
    LIBS = (async () => {
      if (!document.querySelector('link[data-ml]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'vendor/maplibre/maplibre-gl.css'; l.dataset.ml = '1'; document.head.appendChild(l); }
      if (!window.maplibregl) await addScript('vendor/maplibre/maplibre-gl-csp.js');
      if (!window.THREE) await addScript('vendor/three/three.min.js');
      maplibregl.setWorkerUrl('vendor/maplibre/maplibre-gl-csp-worker.js');
    })();
    LIBS.catch(() => { LIBS = null; });
    return LIBS;
  }

  /* ---------- données ---------- */
  const byOrder = L => L.slice().sort((a, b) => (a.j || 0) - (b.j || 0) || (a.at || 0) - (b.at || 0));
  const okLL = ll => Array.isArray(ll) && ll.length === 2 && isFinite(ll[0]) && isFinite(ll[1]) && Math.abs(ll[1]) <= 90;
  /** Lieux d'un de tes voyages. Sans lieu ajouté : ses villes, pour commencer le trajet. */
  function myStops(t) {
    // sans photo choisie pour un lieu, on prend une photo de la page du même jour dans le carnet (sans l'enregistrer)
    const used = new Set(), dayPh = j => { const e = t.entrees.find(x => x.j === j), p = e && (e.photos || []).find(x => x && !used.has(x)); if (p) used.add(p); return p || null; };
    const L = byOrder((t.itin || []).filter(s => okLL(s.ll))).map(s => ({ ...s }));
    if (L.length) { L.forEach(s => { if (s.ph) used.add(s.ph); }); L.forEach(s => { if (!s.ph) { s.ph = dayPh(s.j || 1); s.auto = !!s.ph; } }); return { stops: L, draft: false }; }
    const P = tripPlaces(t), all = [...new Set(t.entrees.slice().sort((a, b) => a.j - b.j).flatMap(e => e.photos || []).filter(Boolean))].concat(t.cover && !t.entrees.some(e => (e.photos || []).includes(t.cover)) ? [t.cover] : []);
    const st = (P.length ? P : [{ n: t.ville || C(t).n, ll: C(t).ll }]).map(p => ({ n: p.n, ll: p.ll, ph: null, city: 1 }));
    st.forEach((x, i) => { x.ph = all.length ? all[Math.min(all.length - 1, Math.round(i * (all.length - 1) / Math.max(1, st.length - 1)))] : null; });
    return { stops: st, draft: true };
  }
  /** Lieux du voyage d'un ami : uniquement son itinéraire (jamais le contenu de son album). */
  const friendStops = itin => byOrder((Array.isArray(itin) ? itin : []).filter(s => okLL(s.ll)));

  /* ---------- l'écran ---------- */
  let IT = null; // { mode, trip, friends, friend, albums, album, meta, stops, draft, map, styled, markers, raf }
  function shell(mode) {
    const el = document.createElement('div'); el.className = 'itp'; el.id = 'itp'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', mode === 'amis' ? 'Itinéraires de tes amis' : 'Ton itinéraire');
    el.innerHTML = `<div class="itp-map" id="itp-map"></div><div class="itp-veil" aria-hidden="true"></div>
      <header class="itp-top"><button class="itp-btn" id="itp-back" aria-label="Retour">${SV.back}</button>
        <div class="itp-h"><p>${mode === 'amis' ? 'Entre amis' : 'Mon itinéraire'}</p><h1 id="itp-t">&nbsp;</h1><span id="itp-s"></span></div>
        <button class="itp-btn txt" id="itp-view" aria-label="Changer de vue">2D</button></header>
      <div class="itp-sel" id="itp-sel"></div>
      <div class="itp-msg" id="itp-msg" hidden></div>
      <section class="itp-sheet" id="itp-sheet"></section>`;
    ($('phone') || document.body).appendChild(el); requestAnimationFrame(() => el.classList.add('on'));
    el.querySelector('#itp-back').onclick = close;
    el.querySelector('#itp-view').onclick = () => { const m = IT && IT.map; if (!m) return; const flat = m.getPitch() > 20; m.easeTo({ pitch: flat ? 0 : 58, bearing: flat ? 0 : -14, duration: 1100 }); el.querySelector('#itp-view').textContent = flat ? '3D' : '2D'; };
    return el;
  }
  function close() { if (!IT) return; const el = $('itp'); cancelAnimationFrame(IT.raf || 0); try { IT.map && IT.map.remove(); } catch (_) { } IT = null; if (el) { el.classList.remove('on'); setTimeout(() => el.remove(), 260); } }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && IT && !$('panel').classList.contains('open')) close(); });
  const msg = (h, html) => { const m = $('itp-msg'); if (!m) return; m.hidden = !h; m.innerHTML = html || ''; };
  const head = (t, s) => { const a = $('itp-t'), b = $('itp-s'); if (a) a.textContent = t || ''; if (b) b.textContent = s || ''; };

  async function open(mode) {
    if (IT) close();
    if (!KEY()) { toast('La carte n\'est pas encore configurée (clé MapTiler manquante)'); return; }
    IT = { mode, markers: [] }; shell(mode); msg(true, '<p>Chargement de la carte…</p>');
    try { await loadLibs(); } catch (e) { msg(true, `<p>${esc(e.message)}. Vérifie ta connexion.</p>`); return; }
    if (!IT) return;
    if (typeof maplibregl.supported === 'function' && !maplibregl.supported()) { msg(true, '<p>Ton téléphone ne permet pas d\'afficher la carte en 3D.</p>'); return; }
    if (mode === 'amis') return openFriends();
    const L = S.trips.slice().sort((a, b) => String(b.du).localeCompare(String(a.du)));
    if (!L.length) { head('Ton itinéraire', ''); msg(true, `<p>Crée un voyage pour commencer ton itinéraire.</p><button class="btn2 g" data-act="itinNewTrip">${SV.plus}Créer un voyage</button>`); return; }
    const cur = typeof currentTrip === 'function' && currentTrip();
    IT.trip = (cur || L[0]).id; mySel(); showMine();
  }
  /* sélecteur de tes voyages */
  function mySel() { const L = S.trips.slice().sort((a, b) => String(b.du).localeCompare(String(a.du)));
    $('itp-sel').innerHTML = `<div class="itp-chips">${L.map(t => `<button class="itp-chip ${t.id === IT.trip ? 'on' : ''}" data-t="${t.id}">${flag(t.pays)}<span>${esc(short(t))}</span></button>`).join('')}</div>`;
    $('itp-sel').querySelectorAll('[data-t]').forEach(b => b.onclick = () => { IT.trip = b.dataset.t; mySel(); showMine(); });
    const on = $('itp-sel').querySelector('.on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' }); }
  function showMine() { const t = trip(IT.trip); if (!t) return; const r = myStops(t); IT.stops = r.stops; IT.draft = r.draft;
    head(place(t), r.draft ? `${fd(t.du)} au ${fd(t.au)}` : r.stops.map(s => s.n).slice(0, 5).join(' - ')); msg(false); sheet(); draw(); }

  /* amis : un ami, puis un de ses voyages */
  async function openFriends() {
    head('Leurs itinéraires', '');
    try { IT.friends = (await rpc('my_friends')).filter(f => f.relation === 'friend'); } catch (_) { msg(true, '<p>Connexion impossible pour l\'instant. Réessaie dans un moment.</p>'); return; }
    if (!IT) return;
    if (!IT.friends.length) { msg(true, `<p>Ajoute des amis pour voir leurs itinéraires.</p><button class="btn2 g" data-act="itinFriends">${SV.users}Trouver des amis</button>`); return; }
    IT.friend = IT.friends[0].id; friendSel(); await loadFriend();
  }
  function friendSel() {
    const A = IT.albums || [];
    $('itp-sel').innerHTML = `<div class="itp-chips">${IT.friends.map(f => `<button class="itp-chip who ${f.id === IT.friend ? 'on' : ''}" data-f="${esc(f.id)}">${avatar(f, 'xs')}<span>${esc(f.display_name)}</span></button>`).join('')}</div>
      ${A.length > 1 ? `<div class="itp-chips sm">${A.map(a => `<button class="itp-chip ${a.id === IT.album ? 'on' : ''}" data-a="${esc(a.id)}">${flag(a.country_code)}<span>${esc(a.city)}, ${new Date(a.start_date).getFullYear()}</span></button>`).join('')}</div>` : ''}`;
    $('itp-sel').querySelectorAll('[data-f]').forEach(b => b.onclick = async () => { IT.friend = b.dataset.f; IT.albums = null; friendSel(); await loadFriend(); });
    $('itp-sel').querySelectorAll('[data-a]').forEach(b => b.onclick = () => { IT.album = b.dataset.a; friendSel(); showAlbum(); });
  }
  /* seuls les voyages dont l'ami a dessiné un itinéraire, et qu'il a choisi de partager avec toi */
  async function loadFriend() {
    const fid = IT.friend, f = IT.friends.find(x => x.id === fid); msg(true, '<p>Chargement…</p>');
    let A = []; try { A = ((await rpc('get_albums', { p_user: fid })) || []).sort((a, b) => String(b.start_date).localeCompare(String(a.start_date))).slice(0, 20); } catch (_) { }
    const I = await Promise.all(A.map(a => rpc('get_itinerary', { p_trip: a.id }).catch(() => null)));
    if (!IT || IT.friend !== fid) return;
    IT.itins = {}; A = A.filter((a, k) => { const L = friendStops(I[k]); if (L.length) IT.itins[a.id] = L; return L.length; }); IT.albums = A;
    if (!A.length) { IT.album = null; friendSel(); head(f ? f.display_name : '', ''); IT.stops = []; sheet(); draw(); msg(true, `<p>${esc(f ? f.display_name : 'Ton ami')} n'a pas encore partagé d'itinéraire avec toi.</p>`); return; }
    IT.album = A[0].id; friendSel(); showAlbum();
  }
  function showAlbum() {
    const a = (IT.albums || []).find(x => x.id === IT.album); if (!a) return;
    IT.stops = IT.itins[a.id] || []; IT.draft = false; IT.meta = a;
    head(a.city, IT.stops.map(s => s.n).slice(0, 5).join(' - ')); msg(false); sheet(); draw();
  }

  /* ---------- bas de l'écran : les lieux, dans l'ordre ---------- */
  function sheet() {
    const sh = $('itp-sheet'); if (!sh) return; const mine = IT.mode === 'moi', L = IT.stops || [], t = mine ? trip(IT.trip) : null;
    if (!mine && !L.length) { sh.innerHTML = ''; return; }
    const card = (s, i) => `<button class="itp-card" data-i="${i}">${s.ph ? IMG(s.ph, s.n) : `<span class="itp-noph">${SV.pin}</span>`}<span class="tx">${s.j ? `<em>Jour ${s.j}</em>` : ''}<b>${esc(s.n)}</b>${s.sub ? `<i>${esc(s.sub)}</i>` : ''}</span>${mine && !s.city ? `<span class="itp-ed" data-ed="${esc(s.id)}" role="button" aria-label="Modifier ${esc(s.n)}">${SV.edit}</span>` : ''}</button>`;
    sh.innerHTML = `<div class="itp-sh-h"><b>${IT.draft ? (mine ? 'Ton trajet commence ici' : 'Ses villes') : `${L.length} lieu${L.length > 1 ? 'x' : ''} visité${L.length > 1 ? 's' : ''}`}</b>${mine ? `<button class="itp-add" data-act="itinAdd">${SV.plus}Ajouter un lieu</button>` : ''}</div>
      ${IT.draft && mine ? '<p class="itp-hint">Ajoute les endroits que tu visites, avec une photo : ton itinéraire se dessine petit à petit.</p>' : ''}
      <div class="itp-cards">${L.map(card).join('')}</div>`;
    sh.querySelectorAll('.itp-card').forEach(b => b.onclick = e => { const ed = e.target.closest('[data-ed]'); if (ed) { e.stopPropagation(); editStop(t, ed.dataset.ed); return; } flyTo(+b.dataset.i); });
  }

  /* ---------- la carte ---------- */
  function smooth(pts) { // courbe douce entre les lieux (Catmull-Rom)
    if (pts.length < 3) return pts.slice(); const out = [];
    for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let k = 0; k < 14; k++) { const t = k / 14, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map(d => .5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3))); } }
    out.push(pts[pts.length - 1]); return out;
  }
  function makeMap() {
    const k = KEY(), map = new maplibregl.Map({ container: 'itp-map', style: (window.ITP_STYLE || `https://api.maptiler.com/maps/satellite/style.json?key=${k}`), center: [10, 40], zoom: 2, pitch: 0, maxPitch: 78, attributionControl: { compact: true }, canvasContextAttributes: { antialias: true } });
    map.on('style.load', () => {
      try { (map.getStyle().layers || []).filter(l => l.type === 'raster').forEach(l => { map.setPaintProperty(l.id, 'raster-saturation', -0.14); map.setPaintProperty(l.id, 'raster-contrast', -0.05); map.setPaintProperty(l.id, 'raster-brightness-max', 0.97); }); } catch (_) { }
      if (!window.ITP_STYLE) try { map.addSource('itp-dem', { type: 'raster-dem', url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${k}`, tileSize: 256 }); map.setTerrain({ source: 'itp-dem', exaggeration: 1.45 }); } catch (_) { }
      try { map.setSky && map.setSky({ 'sky-color': '#BFDDEA', 'horizon-color': '#EEF4F2', 'fog-color': '#E7EFEA', 'fog-ground-blend': .45, 'horizon-fog-blend': .65, 'sky-horizon-blend': .75, 'atmosphere-blend': .6 }); } catch (_) { }
      if (IT) { IT.styled = true; draw(); }
    });
    map.on('error', e => { const s = e && e.error && (e.error.status || 0); if (s === 401 || s === 403) msg(true, '<p>La carte refuse la clé MapTiler. Vérifie qu\'elle autorise le domaine de l\'appli.</p>'); });
    map.on('move', placeLabels);
    return map;
  }
  function clearMap() { const m = IT.map; IT.markers.forEach(x => x.remove()); IT.markers = [];
    ['itp-3d', 'itp-dots', 'itp-route', 'itp-route-sh'].forEach(id => { try { if (m.getLayer(id)) m.removeLayer(id); } catch (_) { } }); ['itp-route', 'itp-dots'].forEach(id => { try { if (m.getSource(id)) m.removeSource(id); } catch (_) { } }); }
  function draw() {
    if (!IT) return; if (!IT.map) { IT.map = makeMap(); return; } if (!IT.styled) return;
    const m = IT.map, L = IT.stops || []; clearMap(); if (!L.length) return;
    const pts = L.map(s => s.ll), line = smooth(pts);
    if (line.length > 1) {
      m.addSource('itp-route', { type: 'geojson', lineMetrics: true, data: { type: 'Feature', geometry: { type: 'LineString', coordinates: line } } });
      m.addLayer({ id: 'itp-route-sh', type: 'line', source: 'itp-route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': 'rgba(24,44,32,.38)', 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 5, 12, 11], 'line-blur': 5, 'line-translate': [0, 2] } });
      m.addLayer({ id: 'itp-route', type: 'line', source: 'itp-route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 3, 12, 6.5], 'line-gradient': grad(0.0005) } });
    }
    m.addSource('itp-dots', { type: 'geojson', data: { type: 'FeatureCollection', features: pts.map(c => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: c } })) } });
    m.addLayer({ id: 'itp-dots', type: 'circle', source: 'itp-dots', paint: { 'circle-radius': 4.5, 'circle-color': RED, 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 } });
    if (window.THREE) try { m.addLayer(threeLayer(L, line)); } catch (e) { console.warn(e); }
    const cc = IT.mode === 'moi' ? (trip(IT.trip) || {}).pays : (IT.meta || {}).country_code;
    L.forEach((s, i) => { const el = document.createElement('div'); el.className = 'itp-mk';
      el.style.setProperty('--r', `${((i * 37) % 11) - 5}deg`);
      el.innerHTML = `${s.ph || !s.city ? `<figure class="itp-pola">${s.ph ? IMG(s.ph, s.n).replace('loading="lazy"', 'loading="eager"') : `<span class="itp-noph">${flag(cc)}</span>`}</figure>` : ''}<span class="itp-name"><b>${esc(s.n)}</b>${s.sub ? `<i>${esc(s.sub)}</i>` : ''}</span>`;
      el.onclick = e => { e.stopPropagation(); flyTo(i); };
      IT.markers.push(new maplibregl.Marker({ element: el, anchor: 'bottom-left', offset: [14, -20] }).setLngLat(s.ll).addTo(m)); });
    intro(pts); placeLabels();
  }
  const grad = p => p >= 1 ? ['interpolate', ['linear'], ['line-progress'], 0, '#ffffff', 1, '#ffffff'] : ['interpolate', ['linear'], ['line-progress'], 0, '#ffffff', p, '#ffffff', Math.min(.999, p + 0.002), 'rgba(255,255,255,0)', 1, 'rgba(255,255,255,0)'];
  function intro(pts) {
    const m = IT.map, b = new maplibregl.LngLatBounds(pts[0], pts[0]); pts.forEach(p => b.extend(p));
    if (pts.length === 1) m.flyTo({ center: pts[0], zoom: 12.5, pitch: 58, bearing: -14, duration: REDUCED ? 0 : 2600, essential: true });
    else m.fitBounds(b, { padding: { top: 200, bottom: 250, left: 40, right: 110 }, pitch: 56, bearing: -14, maxZoom: 14.5, duration: REDUCED ? 0 : 2800, essential: true });
    cancelAnimationFrame(IT.raf || 0);
    const t0 = performance.now(), D = REDUCED ? 1 : 2600, tick = now => { if (!IT || !IT.map || !m.getLayer('itp-route')) return; const p = Math.min(1, (now - t0) / D);
      m.setPaintProperty('itp-route', 'line-gradient', grad(Math.max(.0005, 1 - Math.pow(1 - p, 3)))); if (p < 1) IT.raf = requestAnimationFrame(tick); };
    IT.raf = requestAnimationFrame(tick);
  }
  function flyTo(i) { const s = (IT.stops || [])[i]; if (!s || !IT.map) return;
    IT.map.flyTo({ center: s.ll, zoom: Math.max(13.5, Math.min(16, IT.map.getZoom() + 2)), pitch: 62, bearing: IT.map.getBearing() + 25, duration: REDUCED ? 0 : 1900, essential: true });
    IT.markers.forEach((mk, k) => mk.getElement().classList.toggle('on', k === i));
    const sh = $('itp-sheet'), c = sh && sh.querySelector(`.itp-card[data-i="${i}"]`); if (c) { sh.querySelectorAll('.itp-card').forEach(x => x.classList.toggle('on', x === c)); c.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); } }
  /* polaroïds qui se chevauchent : on garde le premier, les autres se replient sur leur nom */
  let lblRaf = 0;
  function placeLabels() { if (lblRaf || !IT || !IT.map) return; lblRaf = requestAnimationFrame(() => { lblRaf = 0; if (!IT || !IT.map) return;
    const kept = []; IT.markers.forEach(mk => { const el = mk.getElement(), b = el.getBoundingClientRect(), r = [b.left, b.top, b.width, b.height];
      const hit = kept.some(q => r[0] < q[0] + q[2] && q[0] < r[0] + r[2] && r[1] < q[1] + q[3] && q[1] < r[1] + r[3]);
      el.classList.toggle('mini', hit); if (!hit) kept.push(r); }); }); }

  /* ---------- la 3D : pins qui flottent et lumière qui parcourt le trajet (three.js) ---------- */
  function threeLayer(stops, line) {
    const origin = maplibregl.MercatorCoordinate.fromLngLat(stops[0].ll, 0), u = origin.meterInMercatorCoordinateUnits();
    const local = ll => { const c = maplibregl.MercatorCoordinate.fromLngLat(ll, 0); return [(c.x - origin.x) / u, (c.y - origin.y) / u]; };
    const base = new THREE.Matrix4().makeTranslation(origin.x, origin.y, origin.z).scale(new THREE.Vector3(u, -u, u)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    let renderer, scene, camera, glow, halo, elevT = -1; const pins = []; let path = [];
    const elev = ll => { try { return (IT.map.queryTerrainElevation && IT.map.queryTerrainElevation(ll)) || 0; } catch (_) { return 0; } };
    return {
      id: 'itp-3d', type: 'custom', renderingMode: '3d',
      onAdd(map, gl) {
        camera = new THREE.Camera(); scene = new THREE.Scene();
        scene.add(new THREE.HemisphereLight(0xffffff, 0x6f8f72, 1.2)); const sun = new THREE.DirectionalLight(0xffffff, 1.1); sun.position.set(-.6, 1, .8); scene.add(sun);
        const red = new THREE.MeshStandardMaterial({ color: RED, emissive: 0x6a1a0e, roughness: .35, metalness: .05 }), white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .5 });
        stops.forEach((s, i) => { const g = new THREE.Group();
          const hd = new THREE.Mesh(new THREE.SphereGeometry(.42, 32, 20), red); hd.position.y = 1.32;
          const tip = new THREE.Mesh(new THREE.ConeGeometry(.3, 1.05, 32, 1, true), red); tip.rotation.x = Math.PI; tip.position.y = .62;
          const dot = new THREE.Mesh(new THREE.SphereGeometry(.16, 20, 12), white); dot.position.set(0, 1.36, .33);
          const ring = new THREE.Mesh(new THREE.RingGeometry(.25, .42, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false })); ring.rotation.x = -Math.PI / 2;
          g.add(hd, tip, dot, ring); const [x, z] = local(s.ll); g.userData = { x, z, ll: s.ll, ph: i * .9, ring, h: 0 }; scene.add(g); pins.push(g); });
        path = line.map(ll => { const [x, z] = local(ll); return { x, z, ll }; });
        if (path.length > 1) { glow = new THREE.Mesh(new THREE.SphereGeometry(.32, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
          halo = new THREE.Mesh(new THREE.SphereGeometry(.8, 24, 16), new THREE.MeshBasicMaterial({ color: 0xF28DA5, transparent: true, opacity: .32, depthWrite: false })); scene.add(glow, halo); }
        renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true }); renderer.autoClear = false;
      },
      render(gl, args) {
        const map = IT && IT.map; if (!map || !renderer) return;
        const mm = args && args.defaultProjectionData ? args.defaultProjectionData.mainMatrix : args;
        const t = performance.now() / 1000, lat = map.getCenter().lat, mpp = 40075016.686 * Math.cos(lat * Math.PI / 180) / (512 * Math.pow(2, map.getZoom()));
        const size = mpp * 26; // un pin fait environ 26 pixels de haut, quel que soit le zoom
        if (t - elevT > .6) { elevT = t; pins.forEach(g => { g.userData.h = elev(g.userData.ll); }); path.forEach(p => { p.h = undefined; }); }
        pins.forEach(g => { const d = g.userData, bob = REDUCED ? 0 : Math.sin(t * 2.1 + d.ph) * .12, f = (t * .7 + d.ph) % 1;
          g.position.set(d.x, d.h + size * (bob + .05), d.z); g.scale.setScalar(size); g.rotation.y = REDUCED ? 0 : t * .8 + d.ph;
          d.ring.scale.setScalar(1 + f * 1.6); d.ring.material.opacity = .55 * (1 - f); d.ring.position.y = -bob + .02; });
        if (glow && path.length > 1) { const f = REDUCED ? 0 : (t / 14) % 1, x = f * (path.length - 1), i = Math.floor(x), w = x - i, a = path[i], b = path[Math.min(path.length - 1, i + 1)];
          if (a.h === undefined) a.h = elev(a.ll); if (b.h === undefined) b.h = elev(b.ll);
          glow.position.set(a.x + (b.x - a.x) * w, a.h + (b.h - a.h) * w + size * .45, a.z + (b.z - a.z) * w); glow.scale.setScalar(size * .55);
          halo.position.copy(glow.position); halo.scale.setScalar(size * (.6 + .12 * Math.sin(t * 4))); }
        camera.projectionMatrix = new THREE.Matrix4().fromArray(mm).multiply(base);
        renderer.resetState(); renderer.render(scene, camera); map.triggerRepaint();
      },
      onRemove() { try { renderer && renderer.dispose(); } catch (_) { } }
    };
  }

  /* ---------- ajouter ou modifier un lieu (tes voyages) ---------- */
  async function geocode(q, t) {
    const near = (tripPlaces(t)[0] || {}).ll || C(t).ll, cc = String(t.pays || '').toLowerCase();
    const url = c => `https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?key=${KEY()}&language=fr&limit=7&proximity=${near[0]},${near[1]}${c ? `&country=${c}` : ''}`;
    const get = async c => { const r = await fetch(url(c)); if (!r.ok) throw new Error('Recherche impossible pour l\'instant'); return ((await r.json()).features || []); };
    let F = await get(cc); if (!F.length && cc) F = await get('');
    return F.filter(f => Array.isArray(f.center)).map(f => ({ n: String(f.text || f.place_name || '').slice(0, 60), sub: String(f.place_name || '').split(',').slice(1, 3).join(',').trim().slice(0, 80), ll: [+(+f.center[0]).toFixed(6), +(+f.center[1]).toFixed(6)] }));
  }
  ACT.itinAdd = () => { const t = IT && trip(IT.trip); if (!t) return;
    openPanel(`<h2>Ajouter un lieu</h2><p class="small">Cherche l'endroit visité : musée, café, plage, point de vue, quartier…</p>
      <label class="fld"><span>Lieu</span><input id="ip-q" maxlength="80" placeholder="Ex : musée du Louvre" autocomplete="off" enterkeyhint="search"></label>
      <div class="menulist ip-res" id="ip-res"></div>${CLOSE()}`, p => {
      const q = p.querySelector('#ip-q'), out = p.querySelector('#ip-res'); let tm = 0, seq = 0;
      q.oninput = () => { clearTimeout(tm); const v = q.value.trim(); if (v.length < 2) { out.innerHTML = ''; return; } tm = setTimeout(async () => { const n = ++seq; out.innerHTML = '<p class="small">Recherche…</p>';
        try { const R = await geocode(v, t); if (n !== seq) return; out.innerHTML = R.map((r, i) => `<button data-i="${i}">${SV.pin}<span>${esc(r.n)}<span class="small" style="display:block">${esc(r.sub)}</span></span></button>`).join('') || '<p class="small">Aucun lieu trouvé. Essaie avec le nom de la ville.</p>';
          out.querySelectorAll('[data-i]').forEach(b => b.onclick = () => stopSheet(t, { id: uid(), ...R[+b.dataset.i], j: dayGuess(t), ph: null, at: Date.now() }, true)); }
        catch (e) { if (n === seq) out.innerHTML = `<p class="small">${esc(e.message)}</p>`; } }, 380); };
    }); };
  const dayGuess = t => { const f = info(t); return f.enCours ? f.jour : f.futur ? 1 : Math.min(f.jours, Math.max(1, ...(t.itin || []).map(s => s.j || 1))); };
  const tripPhotos = t => [...new Set([t.cover, ...t.entrees.flatMap(e => e.photos)].filter(Boolean))].slice(0, 40);
  function stopSheet(t, s, isNew) {
    const days = info(t).jours, P = tripPhotos(t); let ph = s.ph || null;
    openPanel(`<h2>${isNew ? 'Ton lieu' : 'Modifier le lieu'}</h2>
      <label class="fld"><span>Nom</span><input id="ip-n" maxlength="60" value="${esc(s.n)}"></label>
      <label class="fld"><span>Jour</span><select id="ip-j">${Array.from({ length: days }, (_, i) => `<option value="${i + 1}" ${(s.j || 1) === i + 1 ? 'selected' : ''}>Jour ${i + 1}, ${fd(addDays(t.du, i))}</option>`).join('')}</select></label>
      <p class="setsec">Une photo</p><div class="ip-ph" id="ip-ph"><button type="button" class="ip-none ${ph ? '' : 'on'}" data-p="">Sans photo</button>${P.map(x => `<button type="button" class="${x === ph ? 'on' : ''}" data-p="${esc(x)}">${IMG(x)}</button>`).join('')}
        <label class="ip-up">${SV.plus}<span>Ajouter</span><input type="file" accept="image/*" id="ip-file" hidden></label></div>
      <p class="small">Une seule photo par lieu, pour garder le trajet lisible. Une photo ajoutée ici rejoint aussi la page du jour dans ton carnet.</p>
      <button class="btn full" id="ip-ok">${isNew ? 'Ajouter à l\'itinéraire' : 'Enregistrer'}<i>${SV.arrow}</i></button>
      ${isNew ? '' : `<button class="ghostbtn red" id="ip-del">Retirer ce lieu</button>`}${CLOSE()}`, p => {
      const pick = v => { ph = v || null; p.querySelectorAll('#ip-ph [data-p]').forEach(b => b.classList.toggle('on', (b.dataset.p || null) === ph)); };
      const bind = () => p.querySelectorAll('#ip-ph [data-p]').forEach(b => b.onclick = () => pick(b.dataset.p));
      bind();
      p.querySelector('#ip-file').onchange = async e => { const f = e.target.files[0]; if (!f) return; const lab = p.querySelector('.ip-up span'); lab.textContent = 'Envoi…';
        try { const path = await uploadPhoto(f, 'entries'), j = +p.querySelector('#ip-j').value || 1;
          let en = t.entrees.find(x => x.j === j); if (!en) { en = { id: uid(), j, t: p.querySelector('#ip-n').value.trim() || s.n, n: '', d: '', st: [], lay: {}, photos: [] }; t.entrees.push(en); t.entrees.sort((a, b) => a.j - b.j); }
          en.photos.push(path); save();
          const b = document.createElement('button'); b.type = 'button'; b.dataset.p = path; b.innerHTML = IMG(path); p.querySelector('.ip-up').before(b); bind(); pick(path); }
        catch (err) { toast(err.message || 'Envoi impossible'); } finally { lab.textContent = 'Ajouter'; } };
      p.querySelector('#ip-ok').onclick = () => { const n = p.querySelector('#ip-n').value.trim().slice(0, 60) || s.n;
        const row = { id: s.id, n, sub: s.sub || '', ll: s.ll, j: +p.querySelector('#ip-j').value || 1, ph, at: s.at || Date.now() };
        t.itin = [...(t.itin || []).filter(x => x.id !== s.id), row]; save(); closePanel(); toast(isNew ? `${n} ajouté à ton itinéraire` : 'Lieu modifié'); if (IT && IT.trip === t.id) showMine(); };
      const del = p.querySelector('#ip-del'); if (del) del.onclick = () => { t.itin = (t.itin || []).filter(x => x.id !== s.id); save(); closePanel(); toast('Lieu retiré de l\'itinéraire'); if (IT && IT.trip === t.id) showMine(); };
    }, { nofocus: true });
  }
  function editStop(t, id) { const s = t && (t.itin || []).find(x => x.id === id); if (s) stopSheet(t, s, false); }

  /* ---------- entrées ---------- */
  ACT.itinOpen = () => open('moi');
  ACT.friendStats = () => open('amis'); // le bouton « Entre amis » de la carte ouvre les itinéraires des amis
  ACT.itinNewTrip = () => { close(); setTimeout(() => ACT.newTrip({}), 300); };
  ACT.itinFriends = () => { close(); setTimeout(() => ACT.findFriends(), 300); };
})();
