/* Escale : taux de change à jour, statistiques par catégorie et comptes entre amis.
 *
 * Taux de change : récupérés une fois toutes les 12 h (source open.er-api.com, données publiques,
 * aucune donnée personnelle envoyée) et gardés sur l'appareil pour fonctionner hors connexion.
 * Sans réseau et sans taux enregistrés, on garde les taux indicatifs intégrés à l'appli.
 *
 * Comptes entre amis (façon Tricount) : chaque voyage peut avoir des participants (t.membres).
 * Une dépense indique qui a payé (d.by, 'me' pour toi) et pour qui (d.split, liste d'identifiants).
 * Les remboursements effectués sont notés dans t.reglements.
 */
'use strict';
SV.cloudOff = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M7 18h10a4 4 0 0 0 .7-7.9A6 6 0 0 0 6.2 9 4.5 4.5 0 0 0 7 18zM3 3l18 18"/></svg>';
SV.swapArr = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

/* ---------- taux de change ---------- */
const RATES_KEY = 'escale:rates', RATES_TTL = 12 * 3600e3;
let RATES = null; // { at, rates: { USD: 1.08, ... } } pour 1 €
const BASE_RATES = Object.fromEntries(Object.values(COUNTRIES).filter(c => c.code).map(c => [c.code, c.rate]));
function applyRates(r) {
  if (!r || !r.rates) return; RATES = r;
  Object.values(COUNTRIES).forEach(c => { if (c.code && c.code !== 'EUR' && r.rates[c.code]) c.rate = r.rates[c.code]; });
}
async function loadRates(force) {
  try { const c = JSON.parse(localStorage.getItem(RATES_KEY) || 'null'); if (c && !RATES) applyRates(c); if (c && !force && Date.now() - c.at < RATES_TTL) return; } catch (_) { }
  if (!navigator.onLine) return;
  try {
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 8000);
    const res = await fetch('https://open.er-api.com/v6/latest/EUR', { signal: ctl.signal, credentials: 'omit', referrerPolicy: 'no-referrer' }); clearTimeout(to);
    const j = await res.json(); if (j.result !== 'success' || !j.rates) return;
    const r = { at: Date.now(), rates: j.rates }; applyRates(r);
    try { localStorage.setItem(RATES_KEY, JSON.stringify(r)); } catch (_) { }
    if (typeof started !== 'undefined' && started) refresh();
  } catch (_) { /* hors connexion ou service indisponible : on garde les taux connus */ }
}
const rateFor = code => code === 'EUR' ? 1 : (RATES && RATES.rates[code]) || BASE_RATES[code] || 1;
const fmtRate = r => r >= 100 ? Math.round(r).toLocaleString('fr-FR') : r.toLocaleString('fr-FR', { maximumFractionDigits: r < 1 ? 4 : 2 });
function rateNote() {
  if (!RATES) return 'taux indicatif';
  const d = new Date(RATES.at), today = new Date().toDateString() === d.toDateString();
  return `taux du ${today ? "jour" : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
}
/** Devises proposées dans « Autre » : les plus utiles en voyage, puis celles des pays connus. */
function curList() {
  const top = ['USD', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'MAD', 'TND', 'DZD', 'THB', 'TRY'];
  const all = [...new Set([...top, ...Object.values(COUNTRIES).map(c => c.code).filter(Boolean)])].filter(c => c !== 'EUR');
  return all;
}
loadRates();
addEventListener('online', () => loadRates());

/* ---------- statistiques par catégorie ---------- */
const CAT_COL = { logement: '#2E5E3E', repas: '#F0B23C', transport: '#5B8DB8', activites: '#B8452C', shopping: '#9C7BC4' };
function donutSVG(parts, total, label) {
  const R = 52, W = 16, L = 2 * Math.PI * R; let off = 0;
  const arcs = parts.filter(p => p.v > 0).map(p => { const len = p.v / total * L, gap = parts.filter(x => x.v > 0).length > 1 ? 2 : 0;
    const a = `<circle r="${R}" cx="70" cy="70" fill="none" stroke="${p.col}" stroke-width="${W}" stroke-dasharray="${Math.max(0, len - gap)} ${L}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)"><title>${esc(p.n)} : ${fmt(p.v)}</title></circle>`; off += len; return a; }).join('');
  return `<svg class="st-donut" viewBox="0 0 140 140" role="img" aria-label="${esc(label)}"><circle r="${R}" cx="70" cy="70" fill="none" stroke="var(--gray)" stroke-width="${W}"/>${arcs}
    <text x="70" y="66" text-anchor="middle" class="dv">${fmt(total)}</text><text x="70" y="84" text-anchor="middle" class="dl">ta part</text></svg>`;
}
/* ---------- statistiques interactives (écran Budget) ----------
 * Période au choix, chiffres clés, diagramme en anneau cliquable, et des sections
 * repliables pour ne pas tout afficher d'un coup (état mémorisé sur l'appareil). */
let ST = { trip: null, p: '', k: null, d: null };
const accOpen = () => { try { return JSON.parse(localStorage.getItem('escale:acc') || '{}'); } catch (_) { return {}; } };
document.addEventListener('toggle', e => { const el = e.target; if (!el.dataset || !el.dataset.acc) return; const o = accOpen(); o[el.dataset.acc] = el.open; try { localStorage.setItem('escale:acc', JSON.stringify(o)); } catch (_) { } }, true);
function stDays(t) { // jours du voyage concernés par la période choisie
  const f = info(t), n = f.jours, upto = f.enCours ? f.jour : f.futur ? 0 : n, all = Array.from({ length: n }, (_, i) => i + 1);
  if (ST.p === 'today') return f.enCours ? [f.jour] : [];
  if (ST.p === 'last7') return all.filter(j => j <= upto && j > upto - 7);
  if (ST.p.startsWith('m:')) return all.filter(j => addDays(t.du, j - 1).slice(0, 7) === ST.p.slice(2));
  return all;
}
function arcPath(cx, cy, R, r, a0, a1) {
  const big = a1 - a0 > Math.PI ? 1 : 0, p = (rad, a) => [cx + rad * Math.sin(a), cy - rad * Math.cos(a)];
  const [x0, y0] = p(R, a0), [x1, y1] = p(R, a1), [x2, y2] = p(r, a1), [x3, y3] = p(r, a0);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${R} ${R} 0 ${big} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}A${r} ${r} 0 ${big} 0 ${x3.toFixed(2)} ${y3.toFixed(2)}Z`;
}
function statsHTML(t) {
  if (ST.trip !== t.id) ST = { trip: t.id, p: '', k: null, d: null };
  const f = info(t), b = budgetsOf(t), open = accOpen();
  const months = [...new Set(Array.from({ length: f.jours }, (_, i) => addDays(t.du, i).slice(0, 7)))];
  const popts = [...(f.enCours ? [['today', "Aujourd'hui"], ['last7', '7 derniers jours']] : []), ...(months.length > 1 ? months.map(m => ['m:' + m, monthName(m)]) : [])];
  if (ST.p && !popts.some(o => o[0] === ST.p)) ST.p = '';
  const days = stDays(t), inP = new Set(days), list = t.depenses.filter(d => coversAny(d, j => inP.has(j)));
  const shareP = d => { let v = 0; days.forEach(j => v += dayShare(d, j)); return v; };
  const c = {}; Object.keys(CATS).forEach(k => c[k] = 0); list.forEach(d => c[d.c] += shareP(d));
  const total = Object.values(c).reduce((a, v) => a + v, 0), spentAll = spentOf(t), elapsed = days.filter(j => !f.futur && j <= (f.enCours ? f.jour : f.jours)).length || 1;
  const per = {}; days.forEach(j => per[j] = 0); list.forEach(d => days.forEach(j => per[j] += dayShare(d, j)));
  const head = `<div class="sec st-head"><h2>Statistiques</h2>${popts.length ? ddHTML('st-p', 'Tout le voyage', popts, ST.p) : ''}</div>`;
  const kpi = `<div class="kpis num">
     <div><span>Dépensé${ST.p ? ' sur la période' : ''}</span><b>${fmt(total)}</b></div>
     <div><span>Par jour en moyenne</span><b>${fmt(total / elapsed)}</b></div>
     <div class="${spentAll > t.budget ? 'ko' : ''}"><span>${spentAll > t.budget ? 'Budget dépassé de' : 'Reste du budget'}</span><b>${fmt(Math.abs(t.budget - spentAll))}</b></div>
     <div><span>Dépenses notées</span><b>${list.length}</b></div></div>`;
  if (!total) return `<div id="stwrap">${head}${kpi}<div class="st-box empty"><p class="small">${t.depenses.length ? 'Aucune dépense sur cette période.' : 'Les graphiques apparaîtront dès ta première dépense.'}</p></div></div>`;
  // anneau cliquable
  const parts = Object.keys(CATS).map(k => ({ k, n: CATS[k].n, v: c[k], col: CAT_COL[k] })).filter(x => x.v > 0).sort((x, y) => y.v - x.v);
  if (ST.k && !parts.some(x => x.k === ST.k)) ST.k = null;
  let ang = 0; const gap = parts.length > 1 ? 0.025 : 0;
  const segs = parts.map(x => { const a0 = ang, a1 = ang + x.v / total * 2 * Math.PI; ang = a1; const mid = (a0 + a1) / 2, on = ST.k === x.k;
    const dx = on ? 7 * Math.sin(mid) : 0, dy = on ? -7 * Math.cos(mid) : 0;
    return `<path d="${arcPath(90, 90, 74, 48, a0 + gap / 2, Math.max(a0 + gap / 2 + 0.001, a1 - gap / 2))}" fill="${x.col}" class="seg ${on ? 'on' : ST.k ? 'dim' : ''}" style="transform:translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px)" data-act="stCat" data-k="${x.k}" role="button" aria-label="${esc(x.n)} : ${fmt(x.v)}"></path>`; }).join('');
  const sel = parts.find(x => x.k === ST.k);
  const center = sel ? `<text x="90" y="82" class="dl">${esc(sel.n)}</text><text x="90" y="104" class="dv">${fmt(sel.v)}</text><text x="90" y="122" class="dp">${Math.round(sel.v / total * 100)} %</text>`
    : `<text x="90" y="86" class="dl">ta part</text><text x="90" y="108" class="dv">${fmt(total)}</text>`;
  const donut = `<div class="st-box"><div class="st-row"><svg class="st-donut2" viewBox="0 0 180 180" role="img" aria-label="Répartition par catégorie, touche une part pour le détail">${segs}${center}</svg>
     <ul class="st-leg2">${parts.map(x => `<li><button class="${ST.k === x.k ? 'on' : ''}" data-act="stCat" data-k="${x.k}"><i style="background:${x.col}"></i><span>${x.n}</span><b class="num">${Math.round(x.v / total * 100)} %</b></button></li>`).join('')}</ul></div>
     ${sel ? (() => { const L = list.filter(d => d.c === sel.k), top = L.slice().sort((x, y) => myPart(y) - myPart(x))[0], bud = b[sel.k] || 0, all = catsOf(t)[sel.k];
       const bySub = {}; L.forEach(d => { const n = subName(d) || 'Sans précision'; bySub[n] = (bySub[n] || 0) + shareP(d); }); const subE = Object.entries(bySub).sort((x, y) => y[1] - x[1]), smax = Math.max(...subE.map(e => e[1]), 1);
       return `<div class="st-detail"><p><b>${esc(sel.n)}</b> : ${fmt(sel.v)} en ${L.length} dépense${L.length > 1 ? 's' : ''}${top ? `, la plus grosse : ${esc(top.l)} (${fmt(myPart(top))})` : ''}.</p>
         ${subE.length > 1 || (subE[0] && subE[0][0] !== 'Sans précision') ? `<div class="subs">${subE.map(([n, v]) => `<div><span>${esc(n)}</span><i style="width:${v / smax * 100}%;background:${sel.col}"></i><b class="num">${fmt(v)}</b></div>`).join('')}</div>` : ''}
         ${bud ? `<div class="mb2"><i class="${all > bud ? 'over' : ''}" style="width:${pct(all, bud)}%"></i></div><p class="small num">${fmt(all)} sur ${fmt(bud)} prévus pour tout le voyage${all > bud ? `, dépassé de ${fmt(all - bud)}` : `, reste ${fmt(bud - all)}`}</p>` : ''}
         <button class="link" data-act="catFilter" data-k="${sel.k}">Voir ces dépenses${SV.right}</button></div>`; })() : `<p class="small st-hint">Touche une couleur pour voir le détail d'une catégorie.</p>`}</div>`;
  // sections repliables
  const pv = days.map(j => per[j] || 0), max = Math.max(...pv, 1), avgD = pv.reduce((a, v) => a + v, 0) / elapsed;
  if (ST.d && !inP.has(ST.d)) ST.d = null;
  const dsel = ST.d ? (() => { const L = list.filter(d => dayShare(d, ST.d) > 0); return `<p class="st-tip num"><b>Jour ${ST.d}, ${fd(addDays(t.du, ST.d - 1))}</b> : ${fmt(per[ST.d] || 0)}${L.length ? `, ${L.length} dépense${L.length > 1 ? 's' : ''}` : ''}</p>`; })() : `<p class="small st-hint">Touche une barre pour voir le jour.</p>`;
  const daysAcc = days.length > 1 ? `<details class="acc" data-acc="days" ${open.days ? 'open' : ''}><summary><span><b>Par jour</b><em class="num">moyenne ${fmt(avgD)}, logement réparti par nuit</em></span>${SV.down || ''}</summary>
     <div class="st-bars2" style="--n:${days.length}">${days.map((j, i) => `<button class="${ST.d === j ? 'on' : ''} ${pv[i] > avgD * 1.4 ? 'hi' : ''}" data-act="stDay" data-d="${j}" aria-label="Jour ${j} : ${fmt(pv[i])}"><i style="height:${Math.max(3, pv[i] / max * 100)}%"></i><span>${days.length <= 14 || i % Math.ceil(days.length / 10) === 0 ? j : ''}</span></button>`).join('')}</div>${dsel}</details>` : '';
  const ca = catsOf(t);
  const budAcc = `<details class="acc" data-acc="bud" ${open.bud ? 'open' : ''}><summary><span><b>Budget par catégorie</b><em class="num">${Object.keys(CATS).filter(k => ca[k] > b[k]).length ? Object.keys(CATS).filter(k => ca[k] > b[k]).length + ' dépassé' + (Object.keys(CATS).filter(k => ca[k] > b[k]).length > 1 ? 's' : '') : 'tout est dans les clous'}</em></span>${SV.down || ''}</summary>
     <div class="group">${Object.keys(CATS).map(k => `<button class="cat" data-act="catFilter" data-k="${k}"><span class="ic">${ico(k)}</span><span><span class="n"><span>${CATS[k].n}</span><em class="num">sur ${fmt(b[k])}</em></span><span class="mb"><i class="${ca[k] > b[k] ? 'over' : ''}" style="width:${pct(ca[k], b[k])}%"></i></span></span><span class="v num">${fmt(ca[k])}</span></button>`).join('')}</div>
     <button class="link small" data-act="budget" data-trip="${t.id}">Modifier le budget</button></details>`;
  const others = S.trips.filter(x => !info(x).futur && x.depenses.length).map(x => ({ x, v: spentOf(x) / Math.max(1, info(x).enCours ? info(x).jour : info(x).jours) })).sort((p, q) => q.v - p.v);
  const cmax = Math.max(...others.map(o => o.v), 1);
  const cmpAcc = others.length > 1 ? `<details class="acc" data-acc="cmp" ${open.cmp ? 'open' : ''}><summary><span><b>Comparé à tes autres voyages</b><em>dépense moyenne par jour</em></span>${SV.down || ''}</summary>
     <div class="cmp">${others.map(o => `<div class="${o.x.id === t.id ? 'me' : ''}"><span>${flag(o.x.pays)}${esc(short(o.x))}</span><i style="width:${o.v / cmax * 100}%"></i><b class="num">${fmt(o.v)}</b></div>`).join('')}</div></details>` : '';
  return `<div id="stwrap">${head}${kpi}${donut}${daysAcc}${budAcc}${cmpAcc}</div>`;
}
const reStats = () => { const w = $('stwrap'), t = trip(depId); if (w && t) w.outerHTML = statsHTML(t); };
ACT.stCat = d => { ST.k = ST.k === d.k ? null : d.k; reStats(); };
ACT.stDay = d => { ST.d = ST.d === +d.d ? null : +d.d; reStats(); };
DD['st-p'] = v => { ST.p = v || ''; ST.k = null; ST.d = null; reStats(); };

/* ---------- comptes entre amis ---------- */
const memberName = (t, id) => id === 'me' ? 'Moi' : ((t.membres || []).find(m => m.id === id) || { n: 'Ancien membre' }).n;
function balances(t) {
  const ids = ['me', ...(t.membres || []).map(m => m.id)], bal = Object.fromEntries(ids.map(i => [i, 0])); let group = 0;
  t.depenses.forEach(d => { const by = d.by || 'me', sp = d.split && d.split.length ? d.split : (by !== 'me' ? ['me'] : null); if (!sp) return;
    group += d.eur; if (by in bal) bal[by] += d.eur; sp.forEach(i => { if (i in bal) bal[i] -= d.eur / sp.length; }); });
  (t.reglements || []).forEach(r => { if (r.from in bal) bal[r.from] += r.eur; if (r.to in bal) bal[r.to] -= r.eur; });
  return { bal, group };
}
/** Le moins de remboursements possible pour que tout le monde soit quitte. */
function transfers(bal) {
  const deb = Object.entries(bal).filter(([, v]) => v < -0.005).map(([i, v]) => [i, -v]).sort((a, b) => b[1] - a[1]);
  const cre = Object.entries(bal).filter(([, v]) => v > 0.005).map(([i, v]) => [i, v]).sort((a, b) => b[1] - a[1]);
  const out = []; let a = 0, b = 0;
  while (a < deb.length && b < cre.length) { const m = Math.min(deb[a][1], cre[b][1]); if (m >= 0.01) out.push({ from: deb[a][0], to: cre[b][0], eur: Math.round(m * 100) / 100 });
    deb[a][1] -= m; cre[b][1] -= m; if (deb[a][1] < 0.005) a++; if (cre[b][1] < 0.005) b++; }
  return out;
}
function comptesHTML(t) {
  const M = t.membres || [];
  if (!M.length) return `<div class="emptycard ec"><b>Voyage entre amis ?</b><p>Ajoute les personnes qui partent avec toi. Tu noteras qui a payé quoi et pour qui, et Escale calcule qui doit combien à qui.</p><button class="btn2 g wide" data-act="members" data-trip="${t.id}">${SV.userPlus}Ajouter des amis</button></div>`;
  const { bal, group } = balances(t), tr = transfers(bal), shared = t.depenses.filter(d => d.split || (d.by && d.by !== 'me')).slice().sort((a, b) => b.j - a.j);
  return `<div class="sec"><h2>Participants</h2><button class="more" data-act="members" data-trip="${t.id}">Gérer</button></div>
   <div class="tc-who">${['me', ...M.map(m => m.id)].map(id => { const v = bal[id] || 0; return `<div class="tc-wb"><span class="av">${esc(memberName(t, id).slice(0, 1).toUpperCase())}</span><b>${esc(memberName(t, id))}</b><em class="num ${v > 0.005 ? 'pos' : v < -0.005 ? 'neg' : ''}">${v > 0.005 ? '+ ' : v < -0.005 ? '− ' : ''}${fmt(Math.abs(v))}</em></div>`; }).join('')}</div>
   <p class="small">Dépenses communes : <b class="num">${fmt(group)}</b>. En vert, ce qu'on doit à la personne, en rouge ce qu'elle doit.</p>
   <div class="sec"><h2>Pour être quittes</h2></div>
   ${tr.length ? `<div class="group">${tr.map(x => `<div class="tc-row"><span>${x.from === 'me' ? `Tu dois <b class="num">${fmt(x.eur)}</b> à <b>${esc(memberName(t, x.to))}</b>` : x.to === 'me' ? `<b>${esc(memberName(t, x.from))}</b> te doit <b class="num">${fmt(x.eur)}</b>` : `<b>${esc(memberName(t, x.from))}</b> doit <b class="num">${fmt(x.eur)}</b> à <b>${esc(memberName(t, x.to))}</b>`}</span><button class="pill" data-act="settle" data-trip="${t.id}" data-from="${x.from}" data-to="${x.to}" data-eur="${x.eur}">Remboursé</button></div>`).join('')}</div>`
     : `<div class="emptyj">Tout le monde est quitte.</div>`}
   <div class="sec"><h2>Dépenses partagées</h2><button class="pill dark" data-act="addExp" data-trip="${t.id}">${SV.plus}Dépense</button></div>
   <div class="group dexp">${shared.map(d => `<button class="exp" data-act="editExp" data-trip="${t.id}" data-id="${d.id}"><span class="ic">${ico(d.c)}</span><span class="m"><b>${esc(d.l)}</b><span>${esc(memberName(t, d.by || 'me'))} a payé pour ${d.split ? (d.split.length === M.length + 1 ? 'tout le monde' : d.split.map(i => esc(memberName(t, i))).join(', ')) : 'toi'}</span></span><span class="p num">${fmt(d.eur)}<span>ta part ${fmt(myPart(d))}</span></span></button>`).join('') || `<p class="small" style="padding:14px">Aucune dépense partagée. Quand tu ajoutes une dépense, choisis qui a payé et pour qui.</p>`}</div>
   ${(t.reglements || []).length ? `<div class="sec"><h2>Remboursements</h2></div><div class="group">${t.reglements.slice().reverse().map(r => `<div class="tc-row done"><span>${esc(memberName(t, r.from))} a remboursé <b class="num">${fmt(r.eur)}</b> à ${esc(memberName(t, r.to))}</span><button class="link" data-act="unsettle" data-trip="${t.id}" data-id="${r.id}">Annuler</button></div>`).join('')}</div>` : ''}`;
}
function membersSheet(tid) {
  const t = trip(tid); t.membres = t.membres || [];
  const draw = p => { p.querySelector('#m-list').innerHTML = t.membres.map(m => { const used = t.depenses.some(d => d.by === m.id || (d.split || []).includes(m.id));
      return `<div class="mrow"><span class="av">${esc(m.n.slice(0, 1).toUpperCase())}</span><input value="${esc(m.n)}" maxlength="30" data-id="${m.id}" aria-label="Prénom"><button type="button" class="x" data-rm="${m.id}" ${used ? 'disabled title="Utilisé dans des dépenses"' : ''} aria-label="Retirer">${SV.x}</button></div>`; }).join('') || '<p class="small">Personne pour l\'instant.</p>';
    p.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { t.membres = t.membres.filter(m => m.id !== b.dataset.rm); draw(p); });
    p.querySelectorAll('#m-list input').forEach(i => i.oninput = () => { const m = t.membres.find(x => x.id === i.dataset.id); if (m) m.n = i.value.trim().slice(0, 30) || m.n; }); };
  openPanel(`<h2>Qui part avec toi ?</h2><p class="small">${esc(place(t))}. Ajoute juste un prénom : tes amis n'ont pas besoin d'avoir Escale. Leurs noms restent dans ton carnet privé.</p>
   <div id="m-list" class="mlist"></div>
   <form class="madd" id="m-form"><input id="m-new" maxlength="30" placeholder="Prénom, ex. Léa" autocomplete="off"><button class="pill dark" type="submit">${SV.plus}Ajouter</button></form>
   <button class="btn full" id="m-ok">Enregistrer<i>${SV.arrow}</i></button>${CLOSE()}`, p => {
    draw(p);
    p.querySelector('#m-form').onsubmit = e => { e.preventDefault(); const i = p.querySelector('#m-new'), n = i.value.trim().slice(0, 30); if (!n) return;
      if (t.membres.length >= 20) { toast('20 personnes maximum'); return; }
      if (n.toLowerCase() === 'moi' || t.membres.some(m => m.n.toLowerCase() === n.toLowerCase())) { toast('Ce prénom est déjà dans la liste'); return; }
      t.membres.push({ id: uid().slice(0, 8), n }); i.value = ''; draw(p); i.focus(); };
    p.querySelector('#m-ok').onclick = () => { const i = p.querySelector('#m-new'); if (i.value.trim()) p.querySelector('#m-form').requestSubmit(); save(); closePanel(); dTab = 'comptes'; if (current === 'carnet' && openId === t.id) openTrip(t.id, true); else openTrip(t.id); toast('Participants enregistrés'); };
  });
}
ACT.members = d => membersSheet(d.trip);
ACT.settle = d => { const t = trip(d.trip); t.reglements = t.reglements || []; t.reglements.push({ id: uid().slice(0, 8), from: d.from, to: d.to, eur: +d.eur, at: new Date().toISOString().slice(0, 10) }); save(); refresh(); toast(`${memberName(t, d.from)} a remboursé ${fmt(+d.eur)}`); };
ACT.unsettle = d => { const t = trip(d.trip); t.reglements = (t.reglements || []).filter(r => r.id !== d.id); save(); refresh(); toast('Remboursement annulé'); };
['members'].forEach(k => { const f = ACT[k]; ACT[k] = fromPanel(f); });
