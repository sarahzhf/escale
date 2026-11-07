/* Escale : écran Conseil. Recommande des destinations à partir de l'historique de voyages
   (styles, dépense par jour, durée, distance, saison). Tout est calculé sur le téléphone. */
'use strict';
let cfStyle = null, cfBud = null;
const STYLE_A = { culture: 'la culture', gastronomie: 'la gastronomie', plage: 'la plage', ville: 'les villes', nature: 'la nature', iles: 'les îles', desert: 'le désert', aventure: "l'aventure", roadtrip: 'les roadtrips', fete: 'les sorties' };
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const moisTxt = L => { const s = [...L].sort((a, b) => a - b); if (!s.length) return ''; // plage continue la plus longue, gère décembre-janvier
  const runs = []; s.forEach(m => { const r = runs[runs.length - 1]; if (r && m === r[1] + 1) r[1] = m; else runs.push([m, m]); });
  if (runs.length > 1 && runs[0][0] === 1 && runs[runs.length - 1][1] === 12) { const a = runs.pop(); runs[0][0] = a[0]; }
  return runs.map(([a, b]) => a === b ? MOIS[a - 1] : `${MOIS[a - 1]} à ${MOIS[b - 1]}`).join(', '); };

/** Ce que l'historique dit des goûts : styles, dépense par jour, durée, distance de vol. */
function travelProfile() {
  const past = S.trips.filter(t => !info(t).futur), st = {}, perDay = [], lens = [], vols = [];
  past.forEach(t => { const D0 = DEST[t.pays]; if (D0) { D0.st.forEach((k, i) => st[k] = (st[k] || 0) + (i < 2 ? 2 : 1)); vols.push(D0.vol); }
    const j = info(t).enCours ? info(t).jour : info(t).jours, s = spentOf(t); lens.push(info(t).jours); if (s > 0 && j) perDay.push(s / j); });
  S.envies.forEach(w => { const D0 = DEST[w.pays]; if (D0) D0.st.forEach(k => st[k] = (st[k] || 0) + 1); });
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const tops = Object.entries(st).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  return { n: past.length, styles: tops.slice(0, 3), st, pj: avg(perDay), len: Math.round(avg(lens) || 7), vol: vols.length ? Math.max(...vols) : null, seen: new Set(S.trips.map(t => t.pays)) };
}
/** Destinations classées, avec les raisons du conseil. */
function recommend(P) {
  const now = D(TODAY).getMonth() + 1, soon = [0, 1, 2, 3].map(i => (now - 1 + i) % 12 + 1), wish = new Set(S.envies.map(w => w.pays));
  const budMax = cfBud === 'petit' ? 70 : cfBud === 'moyen' ? 120 : cfBud === 'confort' ? 1e9 : null, budMin = cfBud === 'confort' ? 120 : cfBud === 'moyen' ? 70 : 0;
  return Object.entries(DEST).map(([cc, d]) => {
    if (cfStyle && !d.st.includes(cfStyle)) return null;
    if (budMax != null && (d.pj > budMax || d.pj < budMin)) return null;
    let sc = 0; const why = [];
    const common = d.st.filter(k => P.st[k]); sc += common.reduce((a, k) => a + P.st[k], 0) * 1.4;
    if (common.length && P.n) why.push(`Tu aimes ${common.slice(0, 2).map(k => STYLE_A[k]).join(' et ')}`);
    if (P.pj) { const r = d.pj / P.pj; sc += r <= 1 ? 4 : r <= 1.3 ? 1.5 : -3; why.push(r <= .85 ? `Environ ${fmt(d.pj)} par jour, moins que ta moyenne (${fmt(P.pj)})` : r <= 1.15 ? `Environ ${fmt(d.pj)} par jour, comme d'habitude pour toi` : `Plus cher que d'habitude : environ ${fmt(d.pj)} par jour`); }
    else why.push(`Environ ${fmt(d.pj)} par jour sur place`);
    const ok = d.mois.filter(m => soon.includes(m)); if (ok.length) { sc += ok.includes(now) ? 4 : 2.5; why.push(ok.includes(now) ? 'C\'est la bonne saison en ce moment' : `Idéal en ${MOIS[ok[0] - 1]}`); } else sc -= 1.5;
    if (P.vol != null) sc += d.vol <= P.vol + 2 ? 1 : -1.5;
    if (P.seen.has(cc)) sc -= 6; if (wish.has(cc)) { sc += 3; why.unshift('Dans tes envies'); }
    return { cc, d, sc, why: why.slice(0, 3), seen: P.seen.has(cc), wish: wish.has(cc) };
  }).filter(Boolean).sort((a, b) => b.sc - a.sc);
}
function renderConseil() {
  const sc = $('s-conseil'), P = travelProfile(), L = recommend(P), top = L.slice(0, 6), days = P.len;
  const chips = [[null, 'Tout'], ...['plage', 'culture', 'nature', 'gastronomie', 'ville', 'aventure', 'iles', 'desert'].map(k => [k, STYLE_N[k][0].toUpperCase() + STYLE_N[k].slice(1)])];
  const intro = P.n ? `D'après tes ${P.n} voyage${P.n > 1 ? 's' : ''}${P.styles.length ? `, tu voyages surtout pour ${P.styles.slice(0, 2).map(k => STYLE_A[k]).join(' et ')}` : ''}${P.pj ? `, avec environ ${fmt(P.pj)} par jour` : ''}. Voici où partir ensuite.` : 'Note tes voyages passés pour des conseils sur mesure. En attendant, voici les destinations de saison.';
  sc.innerHTML = `<div class="vtop"><button class="iconbtn" data-act="back" aria-label="Retour">${SV.back}</button><h1>Conseils</h1><div class="r"></div></div>
   <div class="cf-intro"><i>${SV.spark}</i><p>${esc(intro)}</p></div>
   <div class="cf-chips">${chips.map(([k, n]) => `<button class="pill ${cfStyle === k ? 'on' : ''}" data-act="cfStyle" data-k="${k || ''}">${n}</button>`).join('')}</div>
   <div class="seg wide cf-bud">${[[null, 'Tous'], ['petit', 'Petit'], ['moyen', 'Moyen'], ['confort', 'Confort']].map(([k, n]) => `<button class="${cfBud === k ? 'on' : ''}" data-act="cfBud" data-k="${k || ''}">${n}</button>`).join('')}</div>
   ${top.length ? top.map((r, i) => { const c = COUNTRIES[r.cc], inc = (INC[r.cc] || []).slice(0, 3);
     return `<article class="cf-card ${i === 0 ? 'first' : ''}"><div class="cf-h"><span class="cf-flag">${flag(r.cc)}</span><div><b>${esc(c.n)}</b><span class="num">${fmt(r.d.pj * days)} pour ${days} jours, ${r.d.vol ? `${String(r.d.vol).replace('.', ',')} h de vol` : 'sans avion'}</span></div>${i === 0 ? '<em class="cf-best">Notre conseil</em>' : ''}</div>
       <ul class="cf-why">${r.why.map(w => `<li>${esc(w)}</li>`).join('')}</ul>
       <p class="cf-when">Meilleure période : ${esc(moisTxt(r.d.mois))}</p>
       ${inc.length ? `<div class="cf-inc">${inc.map(([n]) => `<span>${esc(n)}</span>`).join('')}</div>` : ''}
       <div class="cf-act"><button class="btn2 g" data-act="cfTrip" data-c="${r.cc}">Préparer ce voyage</button>${r.wish ? `<span class="small">Dans tes envies</span>` : `<button class="link" data-act="cfWish" data-c="${r.cc}">${SV.heart}Envie</button>`}</div></article>`; }).join('')
     : `<p class="small" style="padding:30px 4px">Aucune destination ne correspond à ces filtres. Essaie un autre style ou un autre budget.</p>`}
   <p class="small cf-note">Prix indicatifs par personne, logement compris, sans le vol. Les conseils se calculent sur ton téléphone à partir de tes carnets.</p>`;
}
SCREENS.conseil = renderConseil;
ACT.cfStyle = d => { cfStyle = d.k || null; renderConseil(); };
ACT.cfBud = d => { cfBud = d.k || null; renderConseil(); };
ACT.cfWish = d => { if (!COUNTRIES[d.c] || S.envies.some(w => w.pays === d.c)) return; S.envies.push({ id: uid(), pays: d.c, note: '' }); save(); renderConseil(); toast(`${COUNTRIES[d.c].n} ajouté à tes envies`); };
ACT.cfTrip = d => { tripSheet(); setTimeout(() => { const i = $('f-pays'); if (i) { i.value = COUNTRIES[d.c].n; i.dispatchEvent(new Event('input')); } }, 60); };
