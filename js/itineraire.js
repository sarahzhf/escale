/* Escale : l'itinéraire d'un voyage en carte, façon carnet Pinterest.
 *
 * Un tracé blanc relie les lieux du voyage dans l'ordre, chaque lieu a son pin,
 * et à côté de chaque pin une mini photo en polaroïd, légèrement penchée.
 * Fond doux et réaliste : relief brumeux, mer et terres aux couleurs naturelles.
 *
 * Utilisé pour les albums de tes amis (écran Carte > Entre amis) :
 * seuls les albums qu'ils ont choisi de partager avec toi sont visibles, la base de données
 * n'en donne pas d'autres. Les dépenses ne sont jamais montrées. */
'use strict';
(() => {
  const PIN = '<svg viewBox="0 0 24 32" aria-hidden="true"><path d="M12 31s10-11.2 10-19A10 10 0 0 0 2 12c0 7.8 10 19 10 19z" fill="#E0533D" stroke="#fff" stroke-width="1.6"/><circle cx="12" cy="12" r="3.6" fill="#fff"/></svg>';
  /** Lieux d'un album : ville(s) puis lieux notés, avec coordonnées ; photos réparties dans l'ordre des jours. */
  function stops(a) {
    const cc = a.country_code, names = [];
    String(a.city || '').split(/\s*(?:,|;|\/|\+|→|->)\s*/).forEach(n => { n = n.trim(); if (n) names.push(n); });
    (a.places || []).forEach(n => names.push(n));
    const out = [], seen = new Set();
    names.forEach(n => { const ll = placeLL(n, cc); const k = ll && ll.join(); if (ll && !seen.has(k)) { seen.add(k); out.push({ n, ll }); } });
    if (!out.length && COUNTRIES[cc]) out.push({ n: a.city || COUNTRIES[cc].n, ll: COUNTRIES[cc].ll });
    const ph = (a.entries || []).slice().sort((x, y) => x.day - y.day).flatMap(e => (e.photos || []).filter(Boolean).map(p => ({ p, t: e.title })));
    out.forEach((s, i) => { const k = ph.length ? Math.min(ph.length - 1, Math.round(i * (ph.length - 1) / Math.max(1, out.length - 1))) : -1; s.ph = k >= 0 ? ph[k].p : null; });
    return out;
  }
  /** La carte, en SVG et cartes polaroïd posées par-dessus. */
  function mapHTML(a, W = 340, H = 440) {
    const L = stops(a), feats = topojson.feature(WORLD, WORLD.objects.countries).features;
    const pts = { type: 'MultiPoint', coordinates: L.map(s => s.ll) };
    const proj = d3.geoMercator();
    if (L.length > 1) proj.fitExtent([[56, 96], [W - 56, H - 70]], pts); else proj.center(L[0].ll).scale(5200).translate([W / 2, H / 2 + 20]);
    if (proj.scale() > 9000) { const c = proj.invert([W / 2, H / 2 + 13]); proj.scale(9000).center(c).translate([W / 2, H / 2 + 13]); }
    const path = d3.geoPath(proj), xy = L.map(s => proj(s.ll));
    const line = d3.line().curve(L.length > 2 ? d3.curveCatmullRom.alpha(.5) : d3.curveLinear)(xy);
    const rot = i => ((i * 37) % 13) - 6;
    // place chaque polaroïd à côté de son pin, sans chevaucher les autres ni sortir de la carte
    const PW = 64, PH = 76, placed = [], hit = (r, q) => r[0] < q[0] + q[2] && q[0] < r[0] + r[2] && r[1] < q[1] + q[3] && q[1] < r[1] + r[3];
    const pinsR = xy.map(([x, y]) => [x - 10, y - 27, 20, 27]);
    const spots = xy.map(([x, y]) => { const C0 = [[14, -62], [-PW - 14, -62], [14, 4], [-PW - 14, 4], [-PW / 2, -PH - 30], [-PW / 2, 8], [30, -30], [-PW - 30, -30], [40, -90], [-PW - 40, -90], [40, 30], [-PW - 40, 30]];
      let best = null, bestN = 1e9;
      for (const [dx, dy] of C0) { const r = [Math.max(6, Math.min(W - PW - 6, x + dx)), Math.max(64, Math.min(H - PH - 6, y + dy)), PW, PH];
        const n = placed.filter(q => hit(r, q)).length * 3 + pinsR.filter(q => hit(r, q)).length; if (n < bestN) { best = r; bestN = n; } if (!n) break; }
      placed.push(best); return [best[0], best[1]]; });
    return `<div class="it-map" style="width:${W}px;height:${H}px">
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">
        <defs><linearGradient id="it-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfd6dc"/><stop offset="1" stop-color="#8fb3bf"/></linearGradient>
        <linearGradient id="it-land" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a9c49a"/><stop offset=".55" stop-color="#7fa36f"/><stop offset="1" stop-color="#5f8a55"/></linearGradient>
        <filter id="it-sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.6" flood-color="#1d3b2a" flood-opacity=".35"/></filter></defs>
        <rect width="${W}" height="${H}" fill="url(#it-sea)"/>
        <g class="it-land">${feats.map(f => `<path d="${path(f) || ''}" fill="url(#it-land)" stroke="rgba(255,255,255,.35)" stroke-width=".6"/>`).join('')}</g>
        ${line ? `<path d="${line}" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#it-sh)"/>` : ''}
        ${xy.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.2" fill="#E0533D" stroke="#fff" stroke-width="1.6"/>`).join('')}
      </svg>
      <div class="it-mist"></div>
      <div class="it-title"><b>${esc(a.city || (COUNTRIES[a.country_code] || {}).n || '')}</b><span>${esc(L.map(s => s.n).slice(0, 6).join(' - '))}</span></div>
      ${L.map((s, i) => { const [x, y] = xy[i], [px, py] = spots[i]; return `<span class="it-pin" style="left:${x}px;top:${y}px">${PIN}</span>
        <figure class="it-pola" style="left:${px}px;top:${py}px;--r:${rot(i)}deg">${s.ph ? IMG(s.ph, s.n) : `<span class="it-ph0">${flag(a.country_code)}</span>`}<figcaption>${esc(s.n)}</figcaption></figure>`; }).join('')}
    </div>`;
  }
  ACT.itin = async d => {
    if (!window.d3 || !window.topojson) { toast('La carte n\'a pas pu se charger'); return; }
    let a = null; try { a = await rpc('get_album', { p_trip: d.trip }); } catch (_) { }
    if (!a) { toast('Itinéraire indisponible'); return; }
    const w = Math.min(360, ($('panel').clientWidth || 380) - 40);
    openPanel(`<h2>L'itinéraire</h2><p class="small">${flag(a.country_code)} ${esc((COUNTRIES[a.country_code] || {}).n || '')}, ${fd(a.start_date)} au ${fd(a.end_date)}</p>
      <div class="it-wrap">${mapHTML(a, w, Math.round(w * 1.3))}</div>
      <p class="small">Les lieux viennent de l'album partagé, dans l'ordre du voyage.</p>
      <button class="btn2 wide" data-act="openAlbum" data-trip="${esc(d.trip)}">Ouvrir l'album</button>${CLOSE('Fermer')}`, null, { nofocus: true });
  };

  /** Les itinéraires de tes amis : leurs albums partagés avec toi. */
  async function friendsItinHTML() {
    let fr = []; try { fr = (await rpc('my_friends')).filter(f => f.relation === 'friend').slice(0, 12); } catch (_) { return ''; }
    if (!fr.length) return '';
    const lists = await Promise.all(fr.map(f => rpc('get_albums', { p_user: f.id }).then(L => (L || []).map(x => ({ ...x, who: f }))).catch(() => [])));
    const L = lists.flat().sort((a, b) => String(b.start_date).localeCompare(String(a.start_date))).slice(0, 12);
    if (!L.length) return `<section class="sx-card"><h3>Leurs itinéraires<em>en carte, avec leurs photos</em></h3><p class="small">Tes amis n'ont pas encore partagé d'album avec toi.</p></section>`;
    return `<section class="sx-card"><h3>Leurs itinéraires<em>en carte, avec leurs photos</em></h3><div class="it-list">${L.map(x => `<button class="it-row" data-act="itin" data-trip="${esc(x.id)}"><span class="ph">${x.cover_path ? IMG(x.cover_path) : flag(x.country_code)}</span><span class="m"><b>${esc(x.city)}</b><span class="small">${esc(x.who.display_name)}, ${new Date(x.start_date).getFullYear()}</span></span>${SV.chev}</button>`).join('')}</div></section>`;
  }
  // dans l'écran Entre amis de la carte, sous les statistiques
  let FIT = '';
  const putItin = () => { const f = $('fstats'); if (!FIT || !f || f.querySelector('.it-box')) return;
    const div = document.createElement('div'); div.className = 'it-box'; div.innerHTML = FIT; f.insertBefore(div, f.querySelector('.sx-note')); };
  const fs0 = ACT.friendStats;
  ACT.friendStats = async () => { await fs0(); if (!$('fstats')) return; FIT = await friendsItinHTML(); putItin(); };
  const by0 = ACT.fsBy; ACT.fsBy = d => { by0(d); putItin(); };
})();
