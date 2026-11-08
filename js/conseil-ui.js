/* Escale : écran Conseils. Trois onglets :
   - Pour toi : des pays proches de ce que tu aimes déjà (styles, régions, saison) ;
   - Dépaysement : des pays qui sortent de tes habitudes (nouveau continent, nouveaux styles) ;
   - Tous les pays : le monde entier, avec recherche et filtre par style.
   Chaque carte s'ouvre en fiche : temps de vol depuis chez toi, meilleure période, incontournables,
   monnaie, formalités. Tout est calculé sur le téléphone, sans budget affiché. */
'use strict';
let cfStyle = null, cfTab = 'toi', cfQ = '';
const POPULAR = new Set('IT ES PT GR HR MT CY MA TN TR EG JO AE OM JP KR TH VN ID KH LA PH MY SG LK MV IN NP CN TW US CA MX CU CR GT PE AR CL CO EC BR BO ZA KE TZ NA BW MU MG RE SC IS NO IE GB NL DE AT CH CZ HU PL SI ME AL BE DK SE FI AU NZ PF NC GP MQ'.split(' '));
const STYLE_A = { culture: 'la culture', gastronomie: 'la gastronomie', plage: 'la plage', ville: 'les villes', nature: 'la nature', iles: 'les îles', desert: 'le désert', aventure: "l'aventure", roadtrip: 'les roadtrips', fete: 'les sorties' };
const STYLE_ICO = { culture: '🏛️', gastronomie: '🍜', plage: '🏖️', ville: '🏙️', nature: '🌿', iles: '🏝️', desert: '🏜️', aventure: '🧗', roadtrip: '🚐', fete: '🎶' };
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const moisTxt = L => { const s = [...L].sort((a, b) => a - b); if (!s.length) return '';
  const runs = []; s.forEach(m => { const r = runs[runs.length - 1]; if (r && m === r[1] + 1) r[1] = m; else runs.push([m, m]); });
  if (runs.length > 1 && runs[0][0] === 1 && runs[runs.length - 1][1] === 12) { const a = runs.pop(); runs[0][0] = a[0]; }
  return runs.map(([a, b]) => a === b ? MOIS[a - 1] : `${MOIS[a - 1]} à ${MOIS[b - 1]}`).join(', '); };
const andList = L => L.length < 2 ? L.join('') : L.slice(0, -1).join(', ') + ' et ' + L[L.length - 1];
const enPays = cc => { const n = COUNTRIES[cc].n;
  if (['US', 'NL', 'AE', 'MV', 'PH', 'KM', 'SC', 'BS', 'FJ', 'SB', 'MH'].includes(cc)) return `aux ${n}`;
  if (/^(La |Le )/.test(n) || ['SG', 'MC', 'HK', 'MO', 'CU', 'CY', 'MT', 'BH', 'MU', 'MG', 'TW', 'SM', 'VA', 'AD'].includes(cc)) return `à ${n.replace(/^Le /, 'le ')}`;
  if (/^[AEIOUÉÈÎ]/.test(n)) return `en ${n}`;
  return /e$/.test(n) && !['MX', 'KH', 'MZ', 'ZW', 'BZ'].includes(cc) ? `en ${n}` : `au ${n}`; };
/** Heures de vol estimées depuis chez soi (vol direct ou presque). */
function flightH(cc) { const H = homeOf(), km = kmBetween(H.ll, COUNTRIES[cc].ll); return km < 350 ? 0 : Math.max(1, Math.round((km / 800 + .6) * 2) / 2); }
const volTxt = h => h ? `${String(h).replace('.', ',')} h de vol` : 'sans avion';

/** Ce que l'historique dit des goûts. */
function travelProfile() {
  const past = S.trips.filter(t => !info(t).futur), st = {}, by = {}, vols = [];
  past.forEach(t => { const D0 = DEST[t.pays]; if (!D0) return; D0.st.forEach((k, i) => { st[k] = (st[k] || 0) + (i < 2 ? 2 : 1); (by[k] = by[k] || new Set()).add(t.pays); }); vols.push(flightH(t.pays)); });
  S.envies.forEach(w => { const D0 = DEST[w.pays]; if (D0) D0.st.forEach(k => st[k] = (st[k] || 0) + 1); });
  const seen = new Set(S.trips.map(t => t.pays)), conts = new Set([...seen].map(k => CONT[k]).filter(Boolean));
  return { n: past.length, st, by, styles: Object.entries(st).sort((a, b) => b[1] - a[1]).map(([k]) => k), vol: vols.length ? Math.max(...vols) : null, seen, conts };
}
/** Pays recommandés pour un onglet, avec les raisons, propres à l'historique. */
function recommend(P, mode) {
  const now = D(TODAY).getMonth() + 1, soon = [0, 1, 2, 3].map(i => (now - 1 + i) % 12 + 1), wish = new Set(S.envies.map(w => w.pays));
  return Object.keys(DEST).filter(cc => COUNTRIES[cc] && !P.seen.has(cc) && !RISK.has(cc) && (!cfStyle || DEST[cc].st.includes(cfStyle))).map(cc => {
    const d = DEST[cc], why = [], vol = flightH(cc); let sc = 0;
    const ok = d.mois.filter(m => soon.includes(m)), season = ok.length ? (ok.includes(now) ? 'C\'est la bonne saison en ce moment' : `Idéal à partir de ${MOIS[ok[0] - 1]}`) : null;
    if (mode === 'toi') {
      const common = d.st.filter(k => P.st[k]).sort((a, b) => P.st[b] - P.st[a]);
      sc += common.reduce((a, k) => a + P.st[k], 0) * 1.4;
      if (common.length && P.n) { const like = [...new Set(common.slice(0, 2).flatMap(k => [...(P.by[k] || [])]))].slice(0, 2);
        why.push(like.length ? `Pour ${andList(common.slice(0, 2).map(k => STYLE_A[k]))}, comme tes voyages ${andList(like.map(enPays))}` : `Tu aimes ${andList(common.slice(0, 2).map(k => STYLE_A[k]))}`); }
      if (P.conts.has(CONT[cc])) sc += 1.5;
      if (P.vol != null) sc += vol <= P.vol + 1.5 ? 1.5 : -2;
    } else {
      const fresh = d.st.filter(k => !P.st[k]);
      if (!P.conts.has(CONT[cc]) && CONT[cc]) { sc += 4; why.push(`Un continent que tu n'as jamais exploré : ${CONT[cc] === 'Amériques' ? 'les Amériques' : CONT[cc] === 'Océanie' ? "l'Océanie" : CONT[cc] === 'Asie' ? "l'Asie" : CONT[cc] === 'Afrique' ? "l'Afrique" : "l'Europe"}`); }
      if (fresh.length) { sc += fresh.length * 1.5; why.push(`Nouveau pour toi : ${andList(fresh.slice(0, 2).map(k => STYLE_A[k]))}`); }
      sc -= d.st.filter(k => P.st[k]).length * .5;
    }
    if (season) { sc += ok.includes(now) ? 3 : 2; why.push(season); } else sc -= 1.5;
    if (wish.has(cc)) { sc += 3; why.unshift('Dans tes envies'); }
    if (POPULAR.has(cc)) sc += 2; // destinations faciles à organiser un peu devant
    return { cc, d, sc, vol, why: why.slice(0, 3), wish: wish.has(cc) };
  }).sort((a, b) => b.sc - a.sc);
}
function cfCard(r, i, first) { const c = COUNTRIES[r.cc], inc = (INC[r.cc] || []).slice(0, 3);
  return `<button class="cf-card ${first ? 'first' : ''}" data-act="cfOpen" data-c="${r.cc}"><div class="cf-h"><span class="cf-flag">${flag(r.cc)}</span><div><b>${esc(c.n)}</b><span>${volTxt(r.vol)}${r.d.mois.length ? ` · ${esc(moisTxt(r.d.mois))}` : ''}</span></div>${first ? `<em class="cf-best">${cfTab === 'toi' ? 'Pour toi' : 'À découvrir'}</em>` : SV.chev}</div>
    ${r.why.length ? `<ul class="cf-why">${r.why.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
    ${inc.length ? `<div class="cf-inc">${inc.map(([n]) => `<span>${esc(n)}</span>`).join('')}</div>` : ''}</button>`; }
function renderConseil() {
  const sc = $('s-conseil'), P = travelProfile(), y = sc.scrollTop;
  const chips = [[null, 'Tout'], ...['plage', 'culture', 'nature', 'gastronomie', 'ville', 'aventure', 'iles', 'desert', 'roadtrip', 'fete'].map(k => [k, `${STYLE_ICO[k]} ${STYLE_N[k][0].toUpperCase() + STYLE_N[k].slice(1)}`])];
  const intro = cfTab === 'tous' ? `${Object.keys(DEST).length} pays. Touche un pays pour ses incontournables et la meilleure période.`
    : P.n ? (cfTab === 'toi' ? `D'après tes ${P.n} voyage${P.n > 1 ? 's' : ''}, tu aimes surtout ${andList(P.styles.slice(0, 2).map(k => STYLE_A[k]))}. Voici des pays où tu n'es pas encore allée et qui te ressemblent.` : 'Des pays qui sortent de tes habitudes : un autre continent, d\'autres paysages, d\'autres façons de voyager.')
    : 'Note tes voyages passés pour des conseils sur mesure. En attendant, voici les destinations de saison.';
  let body;
  if (cfTab === 'tous') {
    const q = norm(cfQ), L = Object.keys(DEST).filter(cc => COUNTRIES[cc] && (!cfStyle || DEST[cc].st.includes(cfStyle)) && (!q || norm(COUNTRIES[cc].n).includes(q))).sort((a, b) => COUNTRIES[a].n.localeCompare(COUNTRIES[b].n, 'fr'));
    let letter = ''; body = L.map(cc => { const l = norm(COUNTRIES[cc].n)[0].toUpperCase(), h = l !== letter ? `<p class="caps cf-letter">${letter = l}</p>` : '';
      return `${h}<button class="cf-row" data-act="cfOpen" data-c="${cc}">${flag(cc)}<span><b>${esc(COUNTRIES[cc].n)}</b><em>${DEST[cc].st.slice(0, 3).map(k => STYLE_N[k]).join(', ')}</em></span>${P.seen.has(cc) ? '<i class="cf-seen">Visité</i>' : RISK.has(cc) ? '<i class="cf-risk">Prudence</i>' : ''}${SV.chev}</button>`; }).join('') || '<p class="small" style="padding:20px 4px">Aucun pays ne correspond.</p>';
  } else {
    const L = recommend(P, cfTab).slice(0, 8);
    body = L.map((r, i) => cfCard(r, i, i === 0)).join('') || `<p class="small" style="padding:30px 4px">Aucune destination pour ce style. Essaie un autre filtre.</p>`;
  }
  sc.innerHTML = `<div class="vtop"><button class="iconbtn" data-act="back" aria-label="Retour">${SV.back}</button><h1>Conseils</h1><div class="r"></div></div>
   <div class="seg wide cf-tabs">${[['toi', 'Pour toi'], ['decouverte', 'Dépaysement'], ['tous', 'Tous les pays']].map(([k, n]) => `<button class="${cfTab === k ? 'on' : ''}" data-act="cfTab" data-k="${k}">${n}</button>`).join('')}</div>
   <div class="cf-intro"><i>${SV.spark}</i><p>${esc(intro)}</p></div>
   ${cfTab === 'tous' ? `<label class="cf-search">${SV.search}<input id="cf-q" type="search" placeholder="Chercher un pays" value="${esc(cfQ)}" autocomplete="off"></label>` : ''}
   <div class="cf-chips">${chips.map(([k, n]) => `<button class="pill ${cfStyle === k ? 'on' : ''}" data-act="cfStyle" data-k="${k || ''}">${n}</button>`).join('')}</div>
   <div class="cf-list">${body}</div>
   <p class="small cf-note">Temps de vol estimé depuis ${esc(homeOf().n)}. Les conseils se calculent sur ton téléphone à partir de tes carnets.</p>`;
  const qi = $('cf-q'); if (qi) qi.oninput = () => { cfQ = qi.value; const pos = qi.selectionStart; renderConseil(); const n = $('cf-q'); n.focus(); n.setSelectionRange(pos, pos); };
  sc.scrollTop = y;
}
SCREENS.conseil = renderConseil;
ACT.cfStyle = d => { cfStyle = d.k || null; renderConseil(); };
ACT.cfTab = d => { cfTab = d.k; $('s-conseil').scrollTop = 0; renderConseil(); };
ACT.cfWish = d => { if (!COUNTRIES[d.c] || S.envies.some(w => w.pays === d.c)) return; S.envies.push({ id: uid(), pays: d.c, note: '' }); save(); toast(`${COUNTRIES[d.c].n} ajouté à tes envies`); const b = document.querySelector('#panel [data-act="cfWish"]'); if (b) { b.outerHTML = `<span class="small cf-inwish">${SV.heart}Dans tes envies</span>`; } if (current === 'conseil') renderConseil(); };
ACT.cfTrip = d => { closePanel(); setTimeout(() => { tripSheet(); setTimeout(() => { const i = $('f-pays'); if (i) { i.value = COUNTRIES[d.c].n; i.dispatchEvent(new Event('input')); i.blur(); } }, 80); }, 360); };
/** Fiche d'un pays. */
ACT.cfOpen = d => { const cc = d.c, c = COUNTRIES[cc], D0 = DEST[cc], inc = INC[cc] || [], vol = flightH(cc), P = travelProfile(), wish = S.envies.some(w => w.pays === cc);
  const now = D(TODAY).getMonth() + 1, eu = typeof EU !== 'undefined' && EU.has(cc);
  const papers = VISA[cc] ? `${VISA[cc]} pour les voyageurs français.` : eu || ['BE', 'LU', 'AT', 'IE', 'FI', 'EE', 'LV', 'LT', 'SI', 'SK', 'MT', 'CY', 'CH', 'NO', 'IS', 'DK', 'SE', 'PL', 'CZ', 'HU', 'MC', 'AD', 'SM', 'VA', 'LI', 'RE', 'GP', 'MQ', 'GF', 'YT', 'PF', 'NC'].includes(cc) ? 'Carte d\'identité ou passeport valide pour les voyageurs français.' : 'Passeport, et selon le pays un visa : à vérifier avant de réserver.';
  openPanel(`<div class="cf-sheet"><div class="cf-sh-h"><span class="cf-bigflag">${flag(cc)}</span><div><h2>${esc(c.n)}</h2><p class="small">${volTxt(vol)} depuis ${esc(homeOf().n)}${CONT[cc] ? ` · ${CONT[cc]}` : ''}</p></div></div>
    ${P.seen.has(cc) ? `<p class="cf-flag-note ok">${SV.check}Tu y es déjà allée.</p>` : ''}
    ${RISK.has(cc) ? `<p class="cf-flag-note warn">La situation sur place rend les voyages déconseillés ou très encadrés. Consulte la page Conseils aux voyageurs du ministère des Affaires étrangères avant tout projet.</p>` : ''}
    <div class="cf-styles">${D0.st.map(k => `<span>${STYLE_ICO[k]} ${STYLE_N[k]}</span>`).join('')}</div>
    <div class="sec"><h2>Quand partir</h2></div>
    <div class="cf-months">${MOIS.map((m, i) => `<span class="${D0.mois.includes(i + 1) ? 'ok' : ''} ${i + 1 === now ? 'now' : ''}" title="${m}">${m[0].toUpperCase()}</span>`).join('')}</div>
    <p class="small">Meilleure période : ${esc(moisTxt(D0.mois))}${D0.mois.includes(now) ? '. C\'est le bon moment.' : '.'}</p>
    ${inc.length ? `<div class="sec"><h2>Les incontournables</h2></div><div class="cf-incl">${inc.map(([n, dsc, r]) => `<div><b>${esc(n)}</b>${dsc ? `<span>${esc(dsc)}</span>` : ''}${r ? '<em class="tagr">À réserver</em>' : ''}</div>`).join('')}</div>` : ''}
    <div class="sec"><h2>Bon à savoir</h2></div>
    <div class="cf-facts"><div><span>Monnaie</span><b>${c.code === 'EUR' || c.rate === 1 ? 'Euro' : `${esc(c.code || c.cur)}, 1 € ≈ ${fmtRate(c.rate)} ${esc(c.cur)}`}</b></div><div><span>Papiers</span><b>${esc(papers)}</b></div></div>
    <p class="small cf-note">Les formalités changent : vérifie toujours sur diplomatie.gouv.fr avant de réserver.</p>
    <div class="cf-sh-act"><button class="btn full" data-act="cfTrip" data-c="${cc}">Préparer ce voyage<i>${SV.arrow}</i></button>
    ${wish ? `<span class="small cf-inwish">${SV.heart}Dans tes envies</span>` : `<button class="btn2 wide" data-act="cfWish" data-c="${cc}">${SV.heart}Ajouter à mes envies</button>`}</div></div>${CLOSE('Fermer')}`, null, { nofocus: true }); };
