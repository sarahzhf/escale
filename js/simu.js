/* Eskalys : simulateur de voyage, avant même de décider de partir.
 *
 * On choisit un pays, une ou plusieurs villes, des dates, le nombre de voyageurs et un style.
 * On coche les vraies activités qui font envie (avec leur tarif), on choisit sa façon de manger,
 * et Eskalys calcule une estimation complète : vol, logement, repas, transports sur place,
 * trajets entre les villes, activités et une marge pour les imprévus.
 * Haute et basse saison sont prises en compte selon les dates.
 *
 * La simulation est personnelle : elle reste sur le téléphone, n'est jamais partagée,
 * et s'attache au pays dans les envies. Le jour où on réserve, elle devient un carnet en un geste.
 * Les prix sont des ordres de grandeur (voir prix.js) : « prix indicatifs, à vérifier ». */
'use strict';
const simuKey = () => `escale:simus:${(typeof ME !== 'undefined' && ME && ME.id) || 'x'}`;
function simus() { try { const L = JSON.parse(localStorage.getItem(simuKey()) || '[]'); return Array.isArray(L) ? L : []; } catch (_) { return []; } }
function saveSimus(L) { try { localStorage.setItem(simuKey(), JSON.stringify(L.slice(-30))); } catch (_) { toast('Simulation non enregistrée sur ce téléphone'); } }
let SIM = null;

const nextBest = cc => { const best = (DEST[cc] && DEST[cc].mois) || [], now = D(TODAY).getMonth() + 1;
  for (let i = 1; i <= 12; i++) { const m = (now - 1 + i) % 12 + 1; if (!best.length || best.includes(m)) { const y = D(TODAY).getFullYear() + (m <= now ? 1 : 0); return `${y}-${String(m).padStart(2, '0')}-10`; } }
  return addDays(TODAY, 30); };
const cityList = s => String(s || '').split(/\s*(?:,|;|\/|\+|→|->)\s*/).map(x => x.trim()).filter(Boolean).slice(0, 8);

/** Nouvelle simulation pour un pays (et une ville si on la connaît). */
function newSim(cc, city, du) {
  const d0 = du || nextBest(cc), m = typeof cfMonth !== 'undefined' && cfMonth ? cfMonth : null;
  let start = d0;
  if (m && !du) { const now = D(TODAY).getMonth() + 1; start = `${D(TODAY).getFullYear() + (m < now ? 1 : 0)}-${String(m).padStart(2, '0')}-10`;
    if (diffDays(TODAY, start) < 7) start = m === now && diffDays(TODAY, addDays(TODAY, 7)) >= 0 && D(addDays(TODAY, 7)).getMonth() + 1 === m ? addDays(TODAY, 7) : `${D(TODAY).getFullYear() + 1}-${String(m).padStart(2, '0')}-10`; }
  const main = city || (placesOf(cc)[0] && Object.keys(PLACES[cc] || {})[0] ? placeName(Object.keys(PLACES[cc])[0]) : '');
  return { id: uid(), cc, city: main, du: start, au: addDays(start, 6), n: 1, style: 'confort', repas: 'mix', acts: (typeof cityInc === 'function' ? cityInc(cc, main) : INC[cc] || []).map(([n, dsc]) => ({ n, d: dsc || '', p: null, on: false })), vol: null, log: null, at: Date.now() };
}

/** Le calcul, par personne puis pour le groupe. */
function simCalc(s) {
  const jours = Math.max(1, diffDays(s.du, s.au) + 1), nuits = Math.max(1, jours - 1), month = D(s.du).getMonth() + 1;
  const st = STYLES_SIMU[s.style] || STYLES_SIMU.confort, pj = pjOf(s.cc) * st.k, sea = seasonOf(s.cc, month), ai = aiCached(s.cc, cityList(s.city)[0]);
  const pts = cityList(s.city).map(n => placeLL(n, s.cc)).filter(Boolean), first = pts[0] || COUNTRIES[s.cc].ll;
  const fl = flightOf(first, month, s.cc), meals = mealsOf(s.cc, ai);
  let legs = 0; for (let i = 1; i < pts.length; i++) legs += legOf(pts[i - 1], pts[i], s.cc);
  const L = {
    vol: s.vol != null ? +s.vol : fl.v,
    log: s.log != null ? +s.log / Math.max(1, s.n) : Math.round(pj * .45 * sea.k * nuits),
    repas: Math.round((meals.resto * .35 + meals[s.repas] * 2) * jours * (s.style === 'luxe' ? 1.2 : 1)),
    trans: Math.round(pj * .08 * jours),
    legs,
    acts: s.acts.filter(a => a.on).reduce((t, a) => t + (+a.p || 0), 0),
  };
  const sub = Object.values(L).reduce((a, b) => a + b, 0), marge = Math.round(sub * .1), pp = sub + marge;
  return { jours, nuits, month, sea, fl, meals, L, marge, pp, total: pp * Math.max(1, s.n), missing: s.acts.filter(a => a.on && (a.p == null || a.p === '')).length };
}

const loc = (v, cc) => { const c = COUNTRIES[cc]; return c && c.rate && c.rate !== 1 ? ` (≈ ${Math.round(v * c.rate).toLocaleString('fr-FR')} ${c.cur})` : ''; };
function simResHTML(s) {
  const r = simCalc(s), row = (l, v, sub) => `<div class="sm-r"><span>${l}${sub ? `<em>${esc(sub)}</em>` : ''}</span><b class="num">${fmt(v)}</b></div>`;
  return `<div class="sm-res" id="sm-res">
    <div class="sm-big"><span>Ton voyage, par personne</span><b class="num">${fmt(r.pp)}</b>${s.n > 1 ? `<em>${fmt(r.total)} pour ${s.n} voyageurs</em>` : ''}</div>
    ${row('Transport aller-retour', r.L.vol, r.fl.n)}
    ${row('Logement', r.L.log, `${r.nuits} nuit${r.nuits > 1 ? 's' : ''}${r.sea.n ? ', ' + r.sea.n.toLowerCase() : ''}`)}
    ${row('Repas', r.L.repas, `${r.jours} jours, ${REPAS[s.repas].n.toLowerCase()}`)}
    ${row('Transports sur place', r.L.trans, 'métro, bus, taxis')}
    ${r.L.legs ? row('Trajets entre les villes', r.L.legs, 'train, bus ou vol intérieur') : ''}
    ${row('Activités', r.L.acts, r.missing ? `${r.missing} sans prix, à compléter` : `${s.acts.filter(a => a.on).length} choisie${s.acts.filter(a => a.on).length > 1 ? 's' : ''}`)}
    ${row('Imprévus', r.marge, '10 %')}
    <p class="small sm-note">${PRIX_NOTE}. ${r.sea.k > 1 ? 'Tes dates tombent en haute saison : réserver tôt fait souvent baisser la note.' : r.sea.k < 1 ? 'Tes dates tombent en basse saison : logement et vols souvent moins chers.' : ''}</p></div>`;
}
function simActsHTML(s) {
  return `<div class="sm-acts" id="sm-acts">${s.acts.map((a, i) => `<div class="sm-act ${a.on ? 'on' : ''}"><button type="button" class="sm-tick" data-i="${i}" aria-pressed="${a.on}" aria-label="${esc(a.n)}"><i>${a.on ? SV.check : ''}</i><span><b>${esc(a.n)}</b>${a.d ? `<em>${esc(a.d)}</em>` : ''}</span></button>
    <label class="sm-price"><input inputmode="decimal" data-p="${i}" value="${a.p == null ? '' : esc(a.p)}" placeholder="?" aria-label="Prix de ${esc(a.n)} par personne"><span>€</span></label></div>`).join('') || '<p class="small">Pas encore d\'activité pour ce pays. Ajoute les tiennes.</p>'}
    <div class="sm-add"><input id="sm-an" maxlength="60" placeholder="Ajouter une activité"><input id="sm-ap" inputmode="decimal" placeholder="Prix"><button type="button" class="btn2" id="sm-ab">${SV.plus}</button></div>
    <p class="small sm-src" id="sm-src">${aiCached(s.cc, cityList(s.city)[0]) ? `Tarifs trouvés par la recherche IA le ${fd(aiCached(s.cc, cityList(s.city)[0]).date)}. ${PRIX_NOTE}.` : 'Coche ce qui te fait envie. Les tarifs officiels s\'affichent quand l\'assistant IA est activé, sinon note le prix toi-même.'}</p></div>`;
}
function simMealsHTML(s) { const m = mealsOf(s.cc, aiCached(s.cc, cityList(s.city)[0]));
  return `<div class="sm-meals" id="sm-meals">${Object.entries(REPAS).map(([k, x]) => `<button type="button" class="sm-meal ${s.repas === k ? 'on' : ''}" data-r="${k}"><b>${x.n}</b><span class="num">${fmt(m[k])}${esc(loc(m[k], s.cc))}</span></button>`).join('')}</div>
    <p class="small">Prix moyen d'un repas ${typeof enPays === 'function' ? enPays(s.cc) : ''}${m.ai ? ', recherché récemment' : ''}. ${PRIX_NOTE}.</p>`; }

function simHTML(s) {
  const c = COUNTRIES[s.cc], saved = simus().some(x => x.id === s.id);
  return `<div class="sm"><div class="cf-sh-h"><span class="cf-bigflag">${flag(s.cc)}</span><div><h2>Simuler un voyage ${typeof enPays === 'function' ? enPays(s.cc) : esc(c.n)}</h2><p class="small">Une estimation avant même de décider. Elle reste à toi.</p></div></div>
   <label class="sm-l">Ville ou étapes<input id="sm-city" list="sm-cities" value="${esc(s.city)}" placeholder="Ex : Lisbonne, Porto" autocomplete="off"></label>
   <datalist id="sm-cities">${placesOf(s.cc).slice(0, 80).map(n => `<option value="${esc(n)}">`).join('')}</datalist>
   <div class="sm-2"><label class="sm-l">Du<input type="date" id="sm-du" value="${s.du}"></label><label class="sm-l">Au<input type="date" id="sm-au" value="${s.au}"></label></div>
   <div class="sm-l">Voyageurs<div class="sm-step"><button type="button" data-n="-1" aria-label="Un voyageur de moins">${SV.minus || '-'}</button><b class="num" id="sm-n">${s.n}</b><button type="button" data-n="1" aria-label="Un voyageur de plus">${SV.plus}</button></div></div>
   <div class="sm-l">Style<div class="seg wide sm-st" id="sm-st">${Object.entries(STYLES_SIMU).map(([k, x]) => `<button type="button" data-v="${k}" class="${s.style === k ? 'on' : ''}">${x.n}</button>`).join('')}</div></div>
   <div class="sec"><h2>Activités</h2></div>${simActsHTML(s)}
   <div class="sec"><h2>Repas</h2></div>${simMealsHTML(s)}
   <details class="sm-fix"><summary>Frais déjà connus (vol, logement)</summary>
     <div class="sm-2"><label class="sm-l">Vol par personne<input id="sm-vol" inputmode="decimal" placeholder="Estimé" value="${s.vol == null ? '' : s.vol}"></label><label class="sm-l">Logement, total<input id="sm-log" inputmode="decimal" placeholder="Estimé" value="${s.log == null ? '' : s.log}"></label></div></details>
   ${simResHTML(s)}
   <div class="cf-sh-act"><button class="btn full" data-act="simuTrip">J'y vais : créer le carnet<i>${SV.arrow}</i></button>
   <button class="btn2 wide" data-act="simuSave">${SV.heart}${saved ? 'Mettre à jour la simulation' : 'Enregistrer dans mes envies'}</button>
   ${saved ? `<button class="ghostbtn" data-act="simuDel">Supprimer cette simulation</button>` : ''}</div></div>${CLOSE('Fermer')}`;
}
function simMount(p) {
  const s = SIM, re = () => { const r = p.querySelector('#sm-res'); if (r) r.outerHTML = simResHTML(s); };
  const num = v => { v = String(v).replace(',', '.').replace(/[^\d.]/g, ''); return v === '' ? null : Math.max(0, Math.round(+v)); };
  const bindActs = () => {
    p.querySelectorAll('.sm-tick').forEach(b => b.onclick = () => { const a = s.acts[+b.dataset.i]; a.on = !a.on; b.parentNode.classList.toggle('on', a.on); b.setAttribute('aria-pressed', a.on); b.querySelector('i').innerHTML = a.on ? SV.check : ''; re(); });
    p.querySelectorAll('[data-p]').forEach(i => i.oninput = () => { const a = s.acts[+i.dataset.p]; a.p = num(i.value); if (a.p != null && !a.on) { a.on = true; const row = i.closest('.sm-act'); row.classList.add('on'); row.querySelector('i').innerHTML = SV.check; } re(); });
    const ab = p.querySelector('#sm-ab'); if (ab) ab.onclick = () => { const n = p.querySelector('#sm-an').value.trim(); if (!n) { p.querySelector('#sm-an').focus(); return; }
      s.acts.push({ n: n.slice(0, 60), d: '', p: num(p.querySelector('#sm-ap').value), on: true, mine: 1 }); redrawActs(); re(); };
  };
  const redrawActs = () => { const w = p.querySelector('#sm-acts'); if (w) { w.outerHTML = simActsHTML(s); bindActs(); } };
  const bindMeals = () => p.querySelectorAll('.sm-meal').forEach(b => b.onclick = () => { s.repas = b.dataset.r; p.querySelectorAll('.sm-meal').forEach(x => x.classList.toggle('on', x === b)); re(); });
  const loadAI = async () => { const city = cityList(s.city)[0]; const src = p.querySelector('#sm-src');
    if (typeof SETTINGS !== 'undefined' && SETTINGS && SETTINGS.ai_enabled && !aiCached(s.cc, city) && src) src.textContent = 'Recherche des tarifs à jour…';
    const ai = await aiPrices(s.cc, city); if (SIM !== s || !p.isConnected) return;
    if (ai && ai.activities.length) { const mine = s.acts.filter(a => a.mine || a.on), names = new Set(mine.map(a => norm(a.n)));
      s.acts = [...mine, ...ai.activities.filter(a => !names.has(norm(a.n))).map(a => ({ n: a.n, d: [a.c !== city ? a.c : '', a.d].filter(Boolean).join(', '), p: a.p || null, on: false }))]; }
    redrawActs(); const m = p.querySelector('#sm-meals'); if (m) { m.nextElementSibling.remove(); m.outerHTML = simMealsHTML(s); bindMeals(); } re(); };
  p.querySelector('#sm-city').onchange = () => { s.city = p.querySelector('#sm-city').value.trim().slice(0, 120); re(); loadAI(); };
  p.querySelector('#sm-du').onchange = e => { const v = e.target.value; if (!v) return; const len = diffDays(s.du, s.au); s.du = v; if (diffDays(s.du, s.au) < 0 || len >= 0) s.au = addDays(v, Math.max(0, len)); p.querySelector('#sm-au').value = s.au; re(); };
  p.querySelector('#sm-au').onchange = e => { const v = e.target.value; if (!v) return; s.au = diffDays(s.du, v) < 0 ? s.du : v; e.target.value = s.au; re(); };
  p.querySelectorAll('.sm-step button').forEach(b => b.onclick = () => { s.n = Math.min(20, Math.max(1, s.n + +b.dataset.n)); p.querySelector('#sm-n').textContent = s.n; re(); });
  p.querySelectorAll('#sm-st button').forEach(b => b.onclick = () => { s.style = b.dataset.v; p.querySelectorAll('#sm-st button').forEach(x => x.classList.toggle('on', x === b)); re(); });
  p.querySelector('#sm-vol').oninput = e => { s.vol = num(e.target.value); re(); };
  p.querySelector('#sm-log').oninput = e => { s.log = num(e.target.value); re(); };
  bindActs(); bindMeals(); loadAI();
}
/** Ouvre le simulateur : nouveau pour un pays, ou une simulation enregistrée. */
function openSim(s) { SIM = s; openPanel(simHTML(s), simMount, { nofocus: true }); }
ACT.simu = d => { const old = d.id ? simus().find(x => x.id === d.id) : null; if (old) return openSim(JSON.parse(JSON.stringify(old)));
  if (!COUNTRIES[d.c]) return; const go1 = () => openSim(newSim(d.c, d.v || ''));
  if ($('panel').classList.contains('open')) { closePanel(); setTimeout(go1, 380); } else go1(); };
ACT.simuSave = () => { const s = SIM; if (!s) return; s.at = Date.now(); const L = simus().filter(x => x.id !== s.id); L.push(s); saveSimus(L);
  if (!S.envies.some(w => w.pays === s.cc)) { S.envies.push({ id: uid(), pays: s.cc, note: '' }); save(); }
  toast(`Simulation enregistrée : ${fmt(simCalc(s).pp)} par personne`); openSim(s); if (current === 'conseil') renderConseil(); };
ACT.simuDel = () => { const s = SIM; if (!s) return; saveSimus(simus().filter(x => x.id !== s.id)); closePanel(); toast('Simulation supprimée'); if (current === 'conseil') renderConseil(); };
ACT.simuTrip = () => { const s = SIM; if (!s) return; const r = simCalc(s), c = COUNTRIES[s.cc];
  closePanel(); setTimeout(() => { tripSheet(); setTimeout(() => {
    const set = (id, v) => { const i = $(id); if (i && v != null) { i.value = v; i.dispatchEvent(new Event('input')); i.dispatchEvent(new Event('change')); } };
    set('f-pays', c.n); setTimeout(() => { set('f-ville', s.city); set('f-du', s.du); set('f-au', s.au); set('f-bud', r.pp); const i = $('f-pays'); if (i) i.blur(); }, 60);
    toast('Le budget de la simulation est repris pour ta part'); }, 80); }, 360); };
/** Liste des simulations enregistrées. */
ACT.simuList = () => { const L = simus().slice().sort((a, b) => b.at - a.at);
  openPanel(`<h2>Mes simulations</h2><p class="small">Elles restent sur ton téléphone et ne sont jamais partagées.</p><div class="menulist">${L.map(s => `<button data-act="simu" data-id="${s.id}">${flag(s.cc)}<span>${esc(s.city || COUNTRIES[s.cc].n)}<span class="small" style="display:block">${fd(s.du)} au ${fd(s.au)}</span></span><b class="num" style="margin-left:auto">${fmt(simCalc(s).pp)}</b></button>`).join('') || '<p class="small">Aucune simulation pour l\'instant.</p>'}</div>${CLOSE('Fermer')}`, null, { nofocus: true }); };
/** Simulation enregistrée pour un pays (la plus récente). */
const simFor = cc => simus().filter(s => s.cc === cc).sort((a, b) => b.at - a.at)[0] || null;

/* ---------- où partir avec mon budget ---------- */
let BUD = { v: 1000, j: 7, style: 'confort' };
try { Object.assign(BUD, JSON.parse(localStorage.getItem('escale:budget') || '{}')); } catch (_) { }
/** Estimation par personne pour un pays et une ville, selon le budget cherché. */
function budEstimate(cc, ll, month) { const pj = pjOf(cc) * (STYLES_SIMU[BUD.style] || STYLES_SIMU.confort).k, sea = seasonOf(cc, month);
  const sub = flightOf(ll, month, cc).v + pj * .45 * sea.k * Math.max(1, BUD.j - 1) + pj * .55 * BUD.j; return Math.round(sub * 1.1); }
function budgetIdeas(month) { const H = homeOf().cc;
  return Object.keys(DEST).filter(cc => COUNTRIES[cc] && cc !== H && !RISK.has(cc) && (!cfStyle || DEST[cc].st.includes(cfStyle))).map(cc => {
    const keys = Object.keys(PLACES[cc] || {}).filter(k => !PLACE_DUP.has(k)).slice(0, 12);
    const cities = keys.map(k => ({ n: placeName(k), est: budEstimate(cc, PLACES[cc][k], month) })).filter(x => x.est <= BUD.v).sort((a, b) => a.est - b.est).slice(0, 4);
    const est = cities.length ? cities[0].est : budEstimate(cc, COUNTRIES[cc].ll, month), good = (DEST[cc].mois || []).includes(month);
    return { cc, est, cities, good, sc: (est <= BUD.v ? 10 : -10) + (good ? 4 : 0) - Math.abs(BUD.v * .8 - est) / Math.max(1, BUD.v) * 6 + (POPULAR.has(cc) ? 1.5 : 0) };
  }).filter(r => r.est <= BUD.v).sort((a, b) => b.sc - a.sc).slice(0, 14);
}
function budgetHTML(month) {
  const L = budgetIdeas(month);
  return `<div class="bud-form"><label class="sm-l">Mon budget par personne<span class="bud-in"><input id="bud-v" inputmode="numeric" value="${BUD.v}"><em>€</em></span></label>
    <label class="sm-l">Durée<span class="bud-in"><input id="bud-j" inputmode="numeric" value="${BUD.j}"><em>jours</em></span></label></div>
   <div class="seg wide sm" id="bud-st">${Object.entries(STYLES_SIMU).map(([k, x]) => `<button type="button" data-v="${k}" class="${BUD.style === k ? 'on' : ''}">${x.n}</button>`).join('')}</div>
   ${L.length ? `<button class="surp-btn" data-act="surprise" data-m="${month}"><span class="surp-dice">${SV.spark || ''}</span><span><b>Surprends-moi</b><em>Une destination au hasard dans ton budget</em></span></button>` : ''}
   <div class="cf-list">${L.map(r => `<div class="cf-card bud-card"><button class="cf-h" data-act="simu" data-c="${r.cc}"><span class="cf-flag">${flag(r.cc)}</span><div><b>${esc(COUNTRIES[r.cc].n)}</b><span>À partir de ${fmt(r.est)} par personne${r.good ? ' · bonne saison' : ''}</span></div>${SV.chev}</button>
     ${r.cities.length ? `<div class="cf-inc bud-cities">${r.cities.map(c => `<button data-act="simu" data-c="${r.cc}" data-v="${esc(c.n)}"><b>${esc(c.n)}</b><em class="num">${fmt(c.est)}</em></button>`).join('')}</div>` : ''}</div>`).join('') || '<p class="small" style="padding:24px 4px">Rien ne rentre dans ce budget pour cette durée. Essaie quelques jours de moins ou le style petit budget.</p>'}</div>
   <p class="small cf-note">Vol, logement, repas, transports et 10 % d'imprévus compris, depuis ${esc(homeOf().n)}. ${PRIX_NOTE}. Touche un pays ou une ville pour la simulation détaillée.</p>`;
}
function budgetMount() {
  const sc = $('s-conseil'); if (!sc) return; const v = $('bud-v'), j = $('bud-j'); if (!v) return;
  const keep = () => { try { localStorage.setItem('escale:budget', JSON.stringify(BUD)); } catch (_) { } };
  let tm = null; const upd = (el, key, min, max) => el.oninput = () => { clearTimeout(tm); tm = setTimeout(() => { const n = parseInt(el.value.replace(/\D/g, ''), 10); if (!n) return; BUD[key] = Math.min(max, Math.max(min, n)); keep(); const id = el.id, pos = el.selectionStart; renderConseil(); const e2 = $(id); if (e2) { e2.focus(); try { e2.setSelectionRange(pos, pos); } catch (_) { } } }, 450); };
  upd(v, 'v', 50, 50000); upd(j, 'j', 1, 90);
  sc.querySelectorAll('#bud-st button').forEach(b => b.onclick = () => { BUD.style = b.dataset.v; keep(); renderConseil(); });
}
