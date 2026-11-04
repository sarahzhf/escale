/* Escale : statistiques de l'écran Budget, et comparaison de voyages entre amis (écran Carte).
 *
 * Ordre de lecture, du plus général au plus détaillé :
 *   filtres (ce voyage ou tous, période)  >  chiffres clés  >  à retenir (conseils)
 *   >  évolution  >  classements (catégories, commerçants ; en euros ou en nombre)
 *   >  plus grosses dépenses  >  détails repliables.
 * Tout est calculé sur le téléphone à partir de tes propres dépenses (ta part seulement) :
 * rien n'est envoyé ni partagé. Les couleurs des catégories sont vérifiées pour les daltonismes
 * (clair et sombre, voir --c-* dans app.css et dark-extra.css) ; chaque couleur est toujours
 * accompagnée de son nom, et chaque valeur reste lisible sans infobulle. */

let STX = { trip: null, scope: 'trip', p: '', mode: 'eur', k: null, ev: 'cum', sel: null };
const accOpen = () => { try { return JSON.parse(localStorage.getItem('escale:acc') || '{}'); } catch (_) { return {}; } };
document.addEventListener('toggle', e => { const el = e.target; if (!el.dataset || !el.dataset.acc) return; const o = accOpen(); o[el.dataset.acc] = el.open; try { localStorage.setItem('escale:acc', JSON.stringify(o)); } catch (_) { } }, true);

const CATV = k => `var(--c-${k})`;
const pctTxt = (a, b) => b ? Math.round(a / b * 100) + ' %' : '0 %';
const nbTxt = n => n + ' dépense' + (n > 1 ? 's' : '');
const kfmt = v => v >= 10000 ? (Math.round(v / 100) / 10).toLocaleString('fr-FR') + ' k€' : Math.round(v).toLocaleString('fr-FR') + ' €';
const dayDate = (t, j) => addDays(t.du, j - 1);
const SX = {
  bulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M9 7h8v8"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7l10 10M17 9v8H9"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17.5v.01"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  coins: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="9" cy="7" rx="5.5" ry="2.5"/><path d="M3.5 7v4c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5V7M3.5 11v4c0 1.4 2.5 2.5 5.5 2.5M14.5 13.5c3 0 5.5 1.1 5.5 2.5s-2.5 2.5-5.5 2.5S9 17.4 9 16"/></svg>',
  shop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5L5.5 4h13L20 9.5M4 9.5h16M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M5.5 12.5V20h13v-7.5M10 20v-4.5h4V20"/></svg>',
  pie: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/></svg>'
};

/* ---------- données ---------- */
function stDays(t) { // jours du voyage concernés par la période choisie
  const f = info(t), n = f.jours, upto = f.enCours ? f.jour : f.futur ? 0 : n, all = Array.from({ length: n }, (_, i) => i + 1);
  if (STX.p === 'today') return f.enCours ? [f.jour] : [];
  if (STX.p === 'last7') return all.filter(j => j <= upto && j > upto - 7);
  if (STX.p.startsWith('m:')) return all.filter(j => dayDate(t, j).slice(0, 7) === STX.p.slice(2));
  return all;
}
const elapsedOf = t => { const f = info(t); return f.futur ? 0 : f.enCours ? f.jour : f.jours; };
/** Lignes de calcul : { d, t, v (ma part sur la période), date } ; seulement les dépenses qui me coûtent quelque chose. */
function stRows(t) {
  if (STX.scope === 'all') return S.trips.flatMap(x => x.depenses.map(d => ({ d, t: x, v: myPart(d), date: dayDate(x, d.j) }))).filter(r => r.v > 0);
  const days = stDays(t), inP = new Set(days);
  return t.depenses.filter(d => coversAny(d, j => inP.has(j))).map(d => { let v = 0; days.forEach(j => v += dayShare(d, j)); return { d, t, v, date: dayDate(t, d.j) }; }).filter(r => r.v > 0);
}
/** Dépense de chaque jour (logement réparti par nuit) : [{ t, j, date, v }] */
function perDay(t, days) { return days.map(j => ({ t, j, date: dayDate(t, j), v: t.depenses.reduce((a, d) => a + dayShare(d, j), 0) })); }
const keyOf = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
/** Commerçants : le champ commerçant, sinon la description ; même nom écrit autrement = même commerçant. */
function merchants(rows) {
  const g = {};
  rows.forEach(r => { const name = r.d.m || r.d.l, k = keyOf(name); if (!k) return;
    const o = g[k] = g[k] || { k, names: {}, v: 0, n: 0, cats: {} }; o.v += r.v; o.n++; o.names[name] = (o.names[name] || 0) + 1; o.cats[r.d.c] = (o.cats[r.d.c] || 0) + r.v; });
  return Object.values(g).map(o => ({ ...o, name: Object.entries(o.names).sort((a, b) => b[1] - a[1])[0][0], c: Object.entries(o.cats).sort((a, b) => b[1] - a[1])[0][0] }));
}
function otherTripsPerDay(except) {
  return S.trips.filter(x => x.id !== except && elapsedOf(x) && x.depenses.length).map(x => ({ x, v: spentOf(x) / elapsedOf(x) }));
}

/* ---------- conseils tirés des chiffres ---------- */
function insights(t, rows, total) {
  const out = [], add = (score, ic, html) => out.push({ score, ic, html });
  if (!rows.length) return out;
  const trip1 = STX.scope === 'trip';
  // 1. rythme : catégorie partie pour dépasser son budget
  if (trip1 && !STX.p) { const p = projection(t); if (p.worst) add(100, SX.alert, `Au rythme actuel, <b>${esc(CATS[p.worst.k].n.toLowerCase())}</b> finira vers <b class="num">${fmt(p.worst.proj)}</b> pour ${fmt(budgetsOf(t)[p.worst.k])} prévus.`); }
  // 2. coût par jour comparé aux autres voyages
  if (trip1 && !STX.p && elapsedOf(t)) { const o = otherTripsPerDay(t.id); if (o.length) { const avg = o.reduce((a, x) => a + x.v, 0) / o.length, me = spentOf(t) / elapsedOf(t), d = avg ? (me - avg) / avg : 0;
    if (Math.abs(d) >= 0.1) add(80, d > 0 ? SX.up : SX.down, `Ce voyage te coûte <b class="num">${Math.round(Math.abs(d) * 100)} % ${d > 0 ? 'de plus' : 'de moins'}</b> par jour que tes autres voyages (${fmt(me)} contre ${fmt(avg)}).`); } }
  // 3. week-end ou semaine
  const days = STX.scope === 'all' ? S.trips.flatMap(x => perDay(x, Array.from({ length: elapsedOf(x) }, (_, i) => i + 1))) : perDay(t, stDays(t).filter(j => j <= elapsedOf(t)));
  const we = days.filter(x => [0, 6].includes(D(x.date).getDay())), wd = days.filter(x => ![0, 6].includes(D(x.date).getDay()));
  if (we.length >= 2 && wd.length >= 2) { const a = we.reduce((s, x) => s + x.v, 0) / we.length, b = wd.reduce((s, x) => s + x.v, 0) / wd.length, d = b ? (a - b) / b : 0;
    if (Math.abs(d) >= 0.2) add(60, SX.cal, `Tes ${d > 0 ? 'week-ends' : 'jours de semaine'} coûtent <b class="num">${Math.round(Math.abs(d > 0 ? d : (b - a) / a) * 100)} % de plus</b> : ${fmt(Math.max(a, b))} par jour contre ${fmt(Math.min(a, b))}.`); }
  // 4. petites dépenses
  const small = rows.filter(r => r.d.eur < 10), sv = small.reduce((a, r) => a + r.v, 0);
  if (small.length >= 5 && sv / total >= 0.08) add(55, SX.coins, `Les petites dépenses de moins de 10 € : <b class="num">${small.length} achats, ${pctTxt(sv, total)}</b> du total. Elles passent inaperçues mais s'additionnent.`);
  // 5. catégorie dominante (hors logement, qu'on ne choisit pas au jour le jour)
  const c = {}; rows.forEach(r => c[r.d.c] = (c[r.d.c] || 0) + r.v);
  const top = Object.entries(c).filter(([k]) => k !== 'logement').sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] / total >= 0.3) add(45, SX.pie, `${esc(CATS[top[0]].n)} pèse <b class="num">${pctTxt(top[1], total)}</b> de tes dépenses, ton plus gros poste${(c.logement || 0) > top[1] ? ' après le logement' : ''}.`);
  // 6. commerçant fidèle
  const m = merchants(rows).filter(x => x.n >= 3).sort((a, b) => b.n - a.n || b.v - a.v)[0];
  if (m) add(40, SX.shop, `<b>${esc(m.name)}</b> revient ${m.n} fois, pour <b class="num">${fmt(m.v)}</b> au total.`);
  // 7. le jour le plus cher
  const dmax = days.slice().sort((a, b) => b.v - a.v)[0];
  if (dmax && days.length > 2 && dmax.v > 0) { const L = (dmax.t.depenses.filter(d => dayShare(d, dmax.j) > 0)).sort((a, b) => dayShare(b, dmax.j) - dayShare(a, dmax.j))[0];
    add(30, SX.bulb, `Ton jour le plus cher : <b>${fd(dmax.date)}</b>${STX.scope === 'all' ? ` à ${esc(short(dmax.t))}` : ''}, <b class="num">${fmt(dmax.v)}</b>${L ? `, surtout ${esc(L.l)}` : ''}.`); }
  // 8. tous les voyages : le moins cher par jour
  if (!trip1) { const o = otherTripsPerDay(null).sort((a, b) => a.v - b.v); if (o.length > 1) add(50, SX.down, `Ton voyage le plus économe : <b>${esc(short(o[0].x))}</b>, <b class="num">${fmt(o[0].v)}</b> par jour, contre ${fmt(o[o.length - 1].v)} à ${esc(short(o[o.length - 1].x))}.`); }
  return out.sort((a, b) => b.score - a.score).slice(0, 3);
}

/* ---------- graphiques (SVG, échelle commune 320 px de large) ---------- */
const VW = 320;
function niceMax(v) { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p; return ([1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(x => n <= x + 1e-9)) * p; }
const roundTop = (x, y, w, h, r) => { r = Math.min(r, w / 2, h); return `M${x} ${y + h}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h}Z`; };
function axisY(max, H, top, fmtv) { // 3 lignes de repère, fines et discrètes
  return [0, 0.5, 1].map(f => { const y = top + H - f * H; return `<line class="gl" x1="34" x2="${VW}" y1="${y}" y2="${y}"/><text class="ax" x="30" y="${y + 3.5}" text-anchor="end">${fmtv(max * f)}</text>`; }).join('');
}
/** Colonnes : items [{ v, lab, tip, act }] ; une couleur ; ligne de moyenne en option. */
function columns(items, { avg, fmtv = kfmt, sel } = {}) {
  const H = 120, top = 10, left = 38, n = items.length, max = niceMax(Math.max(...items.map(i => i.v), avg || 0, 1)), slot = (VW - left) / n, w = Math.min(24, Math.max(3, slot - 2));
  const every = Math.ceil(n / 8);
  const bars = items.map((it, i) => { const h = it.v / max * H, x = left + i * slot + (slot - w) / 2;
    return `<g class="col ${sel != null && sel === i ? 'on' : ''}" tabindex="0" data-tip="${esc(it.tip)}" ${it.act || ''}><rect class="hit" x="${left + i * slot}" y="${top}" width="${slot}" height="${H + 14}"/>${it.v > 0 ? `<path d="${roundTop(x, top + H - Math.max(h, 2), w, Math.max(h, 2), 4)}"/>` : ''}${i % every === 0 ? `<text class="ax" x="${x + w / 2}" y="${top + H + 13}" text-anchor="middle">${esc(it.lab)}</text>` : ''}</g>`; }).join('');
  const av = avg ? `<line class="avg" x1="${left}" x2="${VW}" y1="${top + H - avg / max * H}" y2="${top + H - avg / max * H}"/><text class="ax avgl" x="${VW}" y="${top + H - avg / max * H - 4}" text-anchor="end">moyenne ${fmtv(avg)}</text>` : '';
  return `<svg class="sx-svg" viewBox="0 0 ${VW} ${H + top + 18}" role="img" aria-label="Diagramme en colonnes">${axisY(max, H, top, fmtv)}${bars}${av}</svg>`;
}
/** Courbe cumulée de la dépense, et le rythme prévu par le budget pour comparaison. */
function cumulChart(t, days) {
  const H = 120, top = 10, left = 38, upto = elapsedOf(t), shown = days.filter(j => j <= upto), pd = perDay(t, days);
  let acc = 0; const cum = pd.map(x => (acc += x.v)), perB = t.budget / info(t).jours, plan = days.map((_, i) => perB * (i + 1));
  const max = niceMax(Math.max(...cum, ...(t.budget ? plan : [0]), 1)), n = days.length, X = i => left + (n === 1 ? (VW - left) / 2 : i / (n - 1) * (VW - left - 6)), Y = v => top + H - v / max * H;
  const k = shown.length, pts = cum.slice(0, k).map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`);
  const line = k > 1 ? `<path class="ar" d="M${X(0)},${top + H}L${pts.join('L')}L${X(k - 1)},${top + H}Z"/><polyline class="ln" points="${pts.join(' ')}"/>` : '';
  const end = k ? `<circle class="dot" cx="${X(k - 1)}" cy="${Y(cum[k - 1])}" r="4"/><text class="lbl" x="${Math.min(X(k - 1), VW - 4)}" y="${Y(cum[k - 1]) - 9}" text-anchor="${X(k - 1) > VW - 40 ? 'end' : 'middle'}">${kfmt(cum[k - 1])}</text>` : '';
  const pl = t.budget ? `<polyline class="pl" points="${plan.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}"/>` : '';
  const every = Math.ceil(n / 6), xl = days.map((j, i) => i % every === 0 || i === n - 1 ? `<text class="ax" x="${X(i)}" y="${top + H + 13}" text-anchor="${i === n - 1 && n > 1 ? 'end' : i === 0 && n > 1 ? 'start' : 'middle'}">${fd(dayDate(t, j))}</text>` : '').join('');
  STX.cum = { X, Y, n, top, H, rows: days.map((j, i) => ({ j, date: dayDate(t, j), day: pd[i].v, cum: i < k ? cum[i] : null, plan: t.budget ? plan[i] : null })) };
  return `<div class="sx-plot" id="sx-cum"><svg class="sx-svg" viewBox="0 0 ${VW} ${H + top + 18}" role="img" aria-label="Dépense cumulée jour après jour${t.budget ? ', comparée au rythme du budget' : ''}">${axisY(max, H, top, kfmt)}${pl}${line}${end}${xl}<line class="xh" id="sx-xh" x1="0" x2="0" y1="${top}" y2="${top + H}" visibility="hidden"/><circle class="dot hov" id="sx-hd" r="4" visibility="hidden"/><rect class="hit" id="sx-hit" x="${left}" y="0" width="${VW - left}" height="${H + top + 18}"/></svg></div>
    ${t.budget ? `<div class="sx-leg"><span><i class="sx-lk a"></i>Dépensé</span><span><i class="sx-lk p"></i>Rythme du budget (${fmt(perB)} par jour)</span></div>` : ''}`;
}
function donut(parts, total, centerTop, centerVal) {
  let ang = 0; const gap = parts.length > 1 ? 0.03 : 0;
  const segs = parts.map(x => { const a0 = ang, a1 = ang + x.val / total * 2 * Math.PI; ang = a1; const on = STX.k === x.k;
    return `<path d="${arcPath(80, 80, on ? 76 : 72, 50, a0 + gap / 2, Math.max(a0 + gap / 2 + 0.001, a1 - gap / 2))}" style="fill:${CATV(x.k)}" class="seg ${STX.k && !on ? 'dim' : ''}" data-act="stCat" data-k="${x.k}" tabindex="0" data-tip="${esc(x.n + ' : ' + x.txt + ', ' + pctTxt(x.val, total))}"></path>`; }).join('');
  return `<svg class="sx-donut" viewBox="0 0 160 160" role="img" aria-label="Répartition par catégorie">${segs}<text x="80" y="74" class="dl">${esc(centerTop)}</text><text x="80" y="96" class="dv">${esc(centerVal)}</text></svg>`;
}
function arcPath(cx, cy, R, r, a0, a1) {
  const big = a1 - a0 > Math.PI ? 1 : 0, p = (rad, a) => [cx + rad * Math.sin(a), cy - rad * Math.cos(a)];
  const [x0, y0] = p(R, a0), [x1, y1] = p(R, a1), [x2, y2] = p(r, a1), [x3, y3] = p(r, a0);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${R} ${R} 0 ${big} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}A${r} ${r} 0 ${big} 0 ${x3.toFixed(2)} ${y3.toFixed(2)}Z`;
}

/* ---------- l'ensemble ---------- */
function statsHTML(t) {
  if (STX.trip !== t.id) STX = { ...STX, trip: t.id, p: '', k: null, sel: null };
  const all = STX.scope === 'all', f = info(t), open = accOpen(), eurM = STX.mode === 'eur';
  // filtres : une seule ligne, au-dessus de tout ce qu'ils filtrent
  const months = [...new Set(Array.from({ length: f.jours }, (_, i) => dayDate(t, i + 1).slice(0, 7)))];
  const popts = all ? [] : [...(f.enCours ? [['today', "Aujourd'hui"], ['last7', '7 derniers jours']] : []), ...(months.length > 1 ? months.map(m => ['m:' + m, monthName(m)]) : [])];
  if (STX.p && !popts.some(o => o[0] === STX.p)) STX.p = '';
  const nTrips = S.trips.filter(x => x.depenses.length).length;
  const head = `<div class="sec st-head"><h2>Statistiques</h2></div>
    <div class="sx-filters"><div class="seg" role="group" aria-label="Voyages pris en compte"><button class="${all ? '' : 'on'}" data-act="sxScope" data-v="trip" aria-pressed="${!all}">Ce voyage</button><button class="${all ? 'on' : ''}" data-act="sxScope" data-v="all" aria-pressed="${all}">Tous les voyages${nTrips > 1 ? ` (${nTrips})` : ''}</button></div>${popts.length ? ddHTML('st-p', 'Tout le voyage', popts, STX.p) : ''}</div>`;
  const rows = stRows(t), total = rows.reduce((a, r) => a + r.v, 0);
  // chiffres clés
  const daysN = all ? S.trips.reduce((a, x) => a + (x.depenses.length ? elapsedOf(x) : 0), 0) : stDays(t).filter(j => !f.futur && j <= elapsedOf(t)).length;
  const perD = total / Math.max(1, daysN), spentAll = spentOf(t), o = all ? [] : otherTripsPerDay(t.id), oAvg = o.length ? o.reduce((a, x) => a + x.v, 0) / o.length : 0, dlt = !STX.p && oAvg && elapsedOf(t) ? (spentAll / elapsedOf(t) - oAvg) / oAvg : null;
  const cost = otherTripsPerDay(null).sort((a, b) => b.v - a.v)[0];
  const tile = (lab, val, sub, cls = '') => `<div class="sx-tile ${cls}"><span class="l">${lab}</span><b>${val}</b>${sub ? `<span class="s">${sub}</span>` : ''}</div>`;
  const kpi = `<div class="sx-tiles">
    ${tile(all ? 'Dépensé au total' : STX.p ? 'Dépensé sur la période' : 'Dépensé', fmt(total), all ? `sur ${nTrips} voyage${nTrips > 1 ? 's' : ''}` : t.budget && !STX.p ? `${pctTxt(spentAll, t.budget)} du budget` : '')}
    ${tile(all ? 'Par jour de voyage' : 'Par jour', fmt(perD), dlt != null && Math.abs(dlt) >= 0.01 ? `<em class="dl ${dlt > 0 ? 'bad' : 'good'}">${dlt > 0 ? SX.up : SX.down}${Math.round(Math.abs(dlt) * 100)} % ${dlt > 0 ? 'de plus' : 'de moins'}</em> que tes autres voyages` : `${daysN} jour${daysN > 1 ? 's' : ''}`)}
    ${tile('Dépenses notées', String(rows.length), rows.length ? `${fmt(total / rows.length)} en moyenne` : '')}
    ${all ? tile('Le plus cher par jour', cost ? esc(short(cost.x)) : '-', cost ? `${fmt(cost.v)} par jour` : '') : tile(spentAll > t.budget ? 'Budget dépassé de' : 'Reste du budget', fmt(Math.abs(t.budget - spentAll)), t.budget ? `sur ${fmt(t.budget)}` : 'aucun budget fixé', spentAll > t.budget ? 'ko' : '')}</div>`;
  if (!total) return `<div id="stwrap">${head}${kpi}<div class="sx-card empty"><p class="small">${t.depenses.length || all ? 'Aucune dépense sur cette période.' : 'Les graphiques apparaîtront dès ta première dépense.'}</p></div></div>`;
  // à retenir
  const ins = insights(t, rows, total);
  const tips = ins.length ? `<section class="sx-card"><h3>À retenir</h3><ul class="sx-tips">${ins.map(i => `<li><span class="ic">${i.ic}</span><p>${i.html}</p></li>`).join('')}</ul></section>` : '';
  // évolution
  let evo = '';
  if (all) {
    const mm = {}; S.trips.forEach(x => { for (let j = 1; j <= info(x).jours; j++) { const v = x.depenses.reduce((a, d) => a + dayShare(d, j), 0); if (v) { const k = dayDate(x, j).slice(0, 7); mm[k] = (mm[k] || 0) + v; } } });
    const ks = Object.keys(mm).sort(); if (ks.length) { const list = []; let cur = ks[0]; const last = ks[ks.length - 1];
      while (cur <= last) { list.push(cur); const d = new Date(cur + '-15'); d.setMonth(d.getMonth() + 1); cur = d.toISOString().slice(0, 7); }
      const L = list.slice(-12), lab = k => new Date(k + '-15').toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
      evo = `<section class="sx-card"><h3>Par mois<em>12 derniers mois de voyage au plus</em></h3>${columns(L.map(k => ({ v: mm[k] || 0, lab: lab(k), tip: `${monthName(k)} : ${fmt(mm[k] || 0)}` })))}</section>`; }
  } else {
    const days = stDays(t);
    if (days.length > 1) {
      const pd = perDay(t, days).filter(x => x.j <= elapsedOf(t)), avg = pd.length ? pd.reduce((a, x) => a + x.v, 0) / pd.length : 0;
      const body = STX.ev === 'cum' ? cumulChart(t, days)
        : columns(perDay(t, days).map(x => ({ v: x.v, lab: String(x.j), tip: `Jour ${x.j}, ${fd(x.date)} : ${fmt(x.v)}` })), { avg });
      evo = `<section class="sx-card"><div class="sx-h"><h3>Évolution<em>${STX.ev === 'cum' ? 'dépense cumulée' : 'logement réparti par nuit'}</em></h3><div class="seg sm" role="group" aria-label="Affichage"><button class="${STX.ev === 'cum' ? 'on' : ''}" data-act="sxEv" data-v="cum">Cumul</button><button class="${STX.ev === 'day' ? 'on' : ''}" data-act="sxEv" data-v="day">Par jour</button></div></div>${body}</section>`;
    }
  }
  // classements
  const val = x => eurM ? x.v : x.n, vtxt = x => eurM ? fmt(x.v) : nbTxt(x.n);
  const cats = Object.keys(CATS).map(k => { const R = rows.filter(r => r.d.c === k); return { k, n: CATS[k].n, v: R.reduce((a, r) => a + r.v, 0), cnt: R.length }; }).map(x => ({ ...x, val: eurM ? x.v : x.cnt, txt: eurM ? fmt(x.v) : nbTxt(x.cnt) })).filter(x => x.val > 0).sort((a, b) => b.val - a.val);
  const catTot = cats.reduce((a, x) => a + x.val, 0), cmax = Math.max(...cats.map(x => x.val), 1);
  if (STX.k && !cats.some(x => x.k === STX.k)) STX.k = null;
  const sel = cats.find(x => x.k === STX.k);
  const catDetail = sel ? (() => { const L = rows.filter(r => r.d.c === sel.k), bySub = {};
      L.forEach(r => { const n = subName(r.d) || 'Sans précision'; bySub[n] = (bySub[n] || 0) + (eurM ? r.v : 1); });
      const subE = Object.entries(bySub).sort((a, b) => b[1] - a[1]), smax = Math.max(...subE.map(e => e[1]), 1), bud = !all && budgetsOf(t)[sel.k], spentK = !all && catsOf(t)[sel.k];
      return `<div class="sx-detail"><p><b>${esc(sel.n)}</b> : ${fmt(sel.v)} en ${nbTxt(sel.cnt)}, ${fmt(sel.v / Math.max(1, sel.cnt))} en moyenne.</p>
        ${subE.length > 1 || (subE[0] && subE[0][0] !== 'Sans précision') ? `<div class="sx-rank sub">${subE.map(([n, v]) => `<div class="r"><span class="n">${esc(n)}</span><span class="tr"><i style="width:${v / smax * 100}%;background:${CATV(sel.k)}"></i></span><b class="num">${eurM ? fmt(v) : v}</b></div>`).join('')}</div>` : ''}
        ${bud ? `<div class="mb2"><i class="${spentK > bud ? 'over' : ''}" style="width:${pct(spentK, bud)}%"></i></div><p class="small num">${fmt(spentK)} sur ${fmt(bud)} prévus pour tout le voyage${spentK > bud ? `, dépassé de ${fmt(spentK - bud)}` : `, reste ${fmt(bud - spentK)}`}</p>` : ''}
        ${!all ? `<button class="link" data-act="catFilter" data-k="${sel.k}">Voir ces dépenses${SV.right}</button>` : ''}</div>`; })() : '';
  const catCard = `<section class="sx-card"><h3>Top catégories<em>${eurM ? 'en euros' : 'en nombre de dépenses'}</em></h3>
    <div class="sx-split">${donut(cats, catTot, sel ? sel.n : eurM ? 'Total' : 'Dépenses', sel ? sel.txt.replace(/ dépenses?$/, '') : eurM ? kfmt(catTot) : String(catTot))}
      <div class="sx-rank">${cats.map((x, i) => `<button class="r ${STX.k === x.k ? 'on' : ''}" data-act="stCat" data-k="${x.k}" aria-pressed="${STX.k === x.k}"><span class="n"><i class="sx-sw" style="background:${CATV(x.k)}"></i>${esc(x.n)}</span><span class="tr"><i style="width:${x.val / cmax * 100}%;background:${CATV(x.k)}"></i></span><b class="num">${eurM ? kfmt(x.v) : x.cnt}</b><em class="num">${pctTxt(x.val, catTot)}</em></button>`).join('')}</div></div>
    ${catDetail || `<p class="small st-hint">Touche une catégorie pour le détail.</p>`}</section>`;
  const mer = merchants(rows).sort((a, b) => val(b) - val(a) || b.v - a.v), mtop = mer.slice(0, 5), mmax = Math.max(...mtop.map(val), 1);
  const merCard = mer.length > 1 ? `<section class="sx-card"><h3>Top commerçants<em>${eurM ? 'en euros' : 'en nombre de passages'}</em></h3>
    <ol class="sx-list">${mtop.map((m, i) => `<li><span class="rk num">${i + 1}</span><span class="ic sm" style="--cc:${CATV(m.c)}">${ico(m.c)}</span><span class="m"><b>${esc(m.name)}</b><span class="tr"><i style="width:${val(m) / mmax * 100}%"></i></span></span><span class="p num">${eurM ? fmt(m.v) : m.n + ' passage' + (m.n > 1 ? 's' : '')}<span>${eurM ? m.n + ' fois' : fmt(m.v)}</span></span></li>`).join('')}</ol>
    <p class="small sx-note">Regroupés par commerçant, ou par description quand le champ commerçant est vide.</p></section>` : '';
  const ranks = `<div class="sec sx-sec"><h2>Classements</h2><div class="seg sm" role="group" aria-label="Classer par"><button class="${eurM ? 'on' : ''}" data-act="sxMode" data-v="eur" aria-pressed="${eurM}">En €</button><button class="${eurM ? '' : 'on'}" data-act="sxMode" data-v="nb" aria-pressed="${!eurM}">En nombre</button></div></div>${catCard}${merCard}`;
  // plus grosses dépenses
  const big = rows.slice().sort((a, b) => b.v - a.v).slice(0, 5);
  const bigCard = `<section class="sx-card"><h3>Plus grosses dépenses<em>${all ? 'tous voyages confondus' : 'ta part'}</em></h3><ol class="sx-list">${big.map((r, i) => `<li><button data-act="editExp" data-trip="${r.t.id}" data-id="${r.d.id}"><span class="rk num">${i + 1}</span><span class="ic sm" style="--cc:${CATV(r.d.c)}">${ico(r.d.c)}</span><span class="m"><b>${esc(r.d.l)}</b><span class="small">${all ? `${flag(r.t.pays)}${esc(short(r.t))}, ` : ''}${fd(r.date)}${r.d.m && r.d.m !== r.d.l ? `, ${esc(r.d.m)}` : ''}</span></span><span class="p num">${fmt(r.v)}<span>${pctTxt(r.v, total)} du total</span></span></button></li>`).join('')}</ol></section>`;
  // détails repliables
  let more = '';
  if (!all) {
    const b = budgetsOf(t), ca = catsOf(t), over = Object.keys(CATS).filter(k => ca[k] > b[k]).length;
    more += `<details class="acc" data-acc="bud" ${open.bud ? 'open' : ''}><summary><span><b>Budget par catégorie</b><em class="num">${over ? over + ' dépassé' + (over > 1 ? 's' : '') : 'tout est dans les clous'}</em></span>${SV.down || ''}</summary>
      <div class="group">${Object.keys(CATS).map(k => `<button class="cat" data-act="catFilter" data-k="${k}"><span class="ic">${ico(k)}</span><span><span class="n"><span>${CATS[k].n}</span><em class="num">sur ${fmt(b[k])}</em></span><span class="mb"><i class="${ca[k] > b[k] ? 'over' : ''}" style="width:${pct(ca[k], b[k])}%"></i></span></span><span class="v num">${fmt(ca[k])}</span></button>`).join('')}</div>
      <button class="link small" data-act="budget" data-trip="${t.id}">Modifier le budget</button></details>`;
  }
  const others = otherTripsPerDay(null).sort((p, q) => q.v - p.v), omax = Math.max(...others.map(x => x.v), 1);
  if (others.length > 1) {
    const inner = `<div class="sx-rank trips">${others.map(x => `<div class="r ${!all && x.x.id === t.id ? 'me' : ''}"><span class="n">${flag(x.x.pays)}${esc(short(x.x))}</span><span class="tr"><i style="width:${x.v / omax * 100}%"></i></span><b class="num">${fmt(x.v)}</b></div>`).join('')}</div>`;
    more += all ? `<section class="sx-card"><h3>Par voyage<em>dépense moyenne par jour</em></h3>${inner}</section>`
      : `<details class="acc" data-acc="cmp" ${open.cmp ? 'open' : ''}><summary><span><b>Comparé à tes autres voyages</b><em>dépense moyenne par jour</em></span>${SV.down || ''}</summary>${inner}</details>`;
  }
  return `<div id="stwrap">${head}${kpi}${tips}${evo}${ranks}${bigCard}${more}</div>`;
}

const reStats = () => { const w = $('stwrap'), t = trip(depId); if (w && t) { w.outerHTML = statsHTML(t); hideTip(); } };
ACT.stCat = d => { STX.k = STX.k === d.k ? null : d.k; reStats(); };
ACT.sxScope = d => { STX.scope = d.v === 'all' ? 'all' : 'trip'; STX.k = null; reStats(); };
ACT.sxMode = d => { STX.mode = d.v === 'nb' ? 'nb' : 'eur'; reStats(); };
ACT.sxEv = d => { STX.ev = d.v === 'day' ? 'day' : 'cum'; reStats(); };
DD['st-p'] = v => { STX.p = v || ''; STX.k = null; reStats(); };

/* ---------- infobulles : au survol, au doigt et au clavier ---------- */
let TIP = null;
function tipEl() { if (TIP && TIP.isConnected) return TIP; TIP = document.createElement('div'); TIP.className = 'sx-tip'; TIP.setAttribute('role', 'status'); ($('phone') || document.body).appendChild(TIP); return TIP; }
function hideTip() { if (TIP) TIP.classList.remove('on'); const xh = $('sx-xh'), hd = $('sx-hd'); if (xh) xh.setAttribute('visibility', 'hidden'); if (hd) hd.setAttribute('visibility', 'hidden'); }
/** Place l'infobulle au-dessus du point (x, y) de l'écran ; lignes = [[valeur, libellé, clé]] écrites en texte brut. */
function showTip(x, y, lines) {
  const el = tipEl(), host = el.parentNode.getBoundingClientRect(); el.textContent = '';
  lines.forEach(([v, l, k]) => { const row = document.createElement('div'); if (k) { const i = document.createElement('i'); i.className = 'sx-lk ' + k; row.appendChild(i); }
    const b = document.createElement('b'); b.textContent = v; row.appendChild(b); if (l) { const s = document.createElement('span'); s.textContent = l; row.appendChild(s); } el.appendChild(row); });
  el.classList.add('on'); const w = el.offsetWidth, h = el.offsetHeight;
  el.style.left = Math.max(8, Math.min(host.width - w - 8, x - host.left - w / 2)) + 'px'; el.style.top = Math.max(8, y - host.top - h - 12) + 'px';
}
function tipFor(target) {
  const g = target.closest && target.closest('#stwrap [data-tip], #fstats [data-tip]'); if (!g) return false;
  const r = g.getBoundingClientRect(), [v, ...rest] = g.dataset.tip.split(' : ').reverse(); showTip(r.left + r.width / 2, r.top, [[v, rest.reverse().join(' : ')]]); return true;
}
function cumAt(e) {
  const plot = e.target.closest && e.target.closest('#sx-cum'); if (!plot || !STX.cum) return false;
  const svg = plot.querySelector('svg'), b = svg.getBoundingClientRect(), sx = (e.clientX - b.left) / b.width * VW, c = STX.cum;
  let i = 0, best = 1e9; for (let k = 0; k < c.n; k++) { const dx = Math.abs(c.X(k) - sx); if (dx < best) { best = dx; i = k; } }
  const r = c.rows[i], xh = $('sx-xh'), hd = $('sx-hd'); xh.setAttribute('x1', c.X(i)); xh.setAttribute('x2', c.X(i)); xh.setAttribute('visibility', 'visible');
  if (r.cum != null) { hd.setAttribute('cx', c.X(i)); hd.setAttribute('cy', c.Y(r.cum)); hd.setAttribute('visibility', 'visible'); } else hd.setAttribute('visibility', 'hidden');
  const lines = [[`Jour ${r.j}, ${fd(r.date)}`, '']]; if (r.cum != null) { lines.push([fmt(r.cum), 'dépensés au total', 'a']); lines.push([fmt(r.day), 'ce jour-là']); } else lines.push(['À venir', '']);
  if (r.plan != null) lines.push([fmt(r.plan), 'prévus à cette date', 'p']);
  showTip(b.left + c.X(i) / VW * b.width, b.top + (c.top / (c.H + c.top + 18)) * b.height, lines); return true;
}
document.addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; if (!cumAt(e) && !tipFor(e.target)) hideTip(); }, { passive: true });
document.addEventListener('pointerdown', e => { if (!cumAt(e) && !tipFor(e.target)) hideTip(); }, { passive: true });
document.addEventListener('focusin', e => { if (!tipFor(e.target)) hideTip(); });
document.addEventListener('scroll', hideTip, { capture: true, passive: true });

/* ---------- entre amis : pays, voyages, jours (jamais d'argent) ---------- */
let FST = { by: 'countries', data: null };
const regionName = (() => { let dn = null; try { dn = new Intl.DisplayNames(['fr'], { type: 'region' }); } catch (_) { } return c => (COUNTRIES[c] && COUNTRIES[c].n) || (dn && dn.of(c)) || c; })();
function friendsStatsHTML() {
  const L = FST.data;
  if (!L) return `<div id="fstats"><p class="small">Chargement…</p></div>`;
  const me = L.find(x => x.me), fr = L.filter(x => !x.me);
  if (!me) return `<div id="fstats"><p class="small">Statistiques indisponibles pour l'instant.</p></div>`;
  const tiles = `<div class="sx-tiles three"><div class="sx-tile"><span class="l">Pays</span><b>${me.countries.length}</b></div><div class="sx-tile"><span class="l">Voyages</span><b>${me.trips}</b></div><div class="sx-tile"><span class="l">Jours en voyage</span><b>${me.days}</b></div></div>`;
  if (!fr.length) return `<div id="fstats">${tiles}<div class="sx-card empty"><p class="small">Ajoute des amis pour comparer vos voyages : pays visités, nombre de voyages, jours sur la route.</p><button class="btn2 g wide" data-act="fsAmis">${SV.users}Trouver des amis</button></div></div>`;
  const by = FST.by, v = x => by === 'countries' ? x.countries.length : x[by], unit = by === 'countries' ? 'pays' : by === 'trips' ? 'voyages' : 'jours';
  const ranked = L.slice().sort((a, b) => v(b) - v(a) || (a.me ? -1 : b.me ? 1 : String(a.display_name).localeCompare(b.display_name, 'fr'))), max = Math.max(...ranked.map(v), 1);
  const rankOf = x => 1 + ranked.filter(y => v(y) > v(x)).length, me1 = rankOf(me), tie = ranked.filter(y => v(y) === v(me)).length > 1;
  const where = me1 === 1 ? (tie ? 'à égalité en tête' : 'tu es en tête') : `tu es ${me1}e sur ${ranked.length}${tie ? ', à égalité' : ''}`;
  const board = `<section class="sx-card"><div class="sx-h"><h3>Classement<em>${where}</em></h3><div class="seg sm" role="group" aria-label="Comparer"><button class="${by === 'countries' ? 'on' : ''}" data-act="fsBy" data-v="countries">Pays</button><button class="${by === 'trips' ? 'on' : ''}" data-act="fsBy" data-v="trips">Voyages</button><button class="${by === 'days' ? 'on' : ''}" data-act="fsBy" data-v="days">Jours</button></div></div>
    <div class="sx-rank people">${ranked.map(x => `<div class="r ${x.me ? 'me' : ''}" tabindex="0" data-tip="${esc((x.me ? 'Toi' : x.display_name) + ' : ' + v(x) + ' ' + unit)}"><span class="n"><span class="rk num">${rankOf(x)}</span>${avatar(x, 'xs')}<span>${x.me ? 'Toi' : esc(x.display_name)}</span></span><span class="tr"><i style="width:${v(x) / max * 100}%"></i></span><b class="num">${v(x)}</b></div>`).join('')}</div></section>`;
  const mine = new Set(me.countries);
  const common = fr.map(x => ({ x, c: x.countries.filter(c => mine.has(c)) })).filter(o => o.c.length).sort((a, b) => b.c.length - a.c.length).slice(0, 4);
  const comCard = common.length ? `<section class="sx-card"><h3>En commun avec toi<em>pays que vous avez tous les deux visités</em></h3><ul class="sx-common">${common.map(o => `<li>${avatar(o.x, 'xs')}<span class="m"><b>${esc(o.x.display_name)}</b><span class="flags">${o.c.slice(0, 8).map(c => `<span title="${esc(regionName(c))}">${flag(c)}</span>`).join('')}${o.c.length > 8 ? `<em>+${o.c.length - 8}</em>` : ''}</span></span><b class="num">${o.c.length}</b></li>`).join('')}</ul></section>` : '';
  const wish = new Set(S.envies.map(w => w.pays)), seen = {};
  fr.forEach(x => x.countries.forEach(c => { if (!mine.has(c)) (seen[c] = seen[c] || []).push(x); }));
  const ideas = Object.entries(seen).sort((a, b) => b[1].length - a[1].length || regionName(a[0]).localeCompare(regionName(b[0]), 'fr')).slice(0, 8);
  const ideaCard = ideas.length ? `<section class="sx-card"><h3>Des idées de voyage<em>vus par tes amis, pas encore par toi</em></h3><ul class="sx-ideas">${ideas.map(([c, who]) => `<li>${flag(c)}<span class="m"><b>${esc(regionName(c))}</b><span class="small">${esc(who.slice(0, 2).map(w => w.display_name).join(', '))}${who.length > 2 ? ` et ${who.length - 2} autre${who.length > 3 ? 's' : ''}` : ''}</span></span>${wish.has(c) ? `<span class="small ok">Dans tes envies</span>` : COUNTRIES[c] ? `<button class="pill sm" data-act="fsWish" data-c="${esc(c)}">${SV.plus}Envie</button>` : ''}</li>`).join('')}</ul></section>` : '';
  return `<div id="fstats">${tiles}${board}${comCard}${ideaCard}<p class="small sx-note">Pour tes amis, seuls les voyages dont l'album est partagé avec toi sont comptés. Aucun montant n'est jamais partagé.</p></div>`;
}
const reFriends = () => { const w = $('fstats'); if (w) w.outerHTML = friendsStatsHTML(); };
ACT.friendStats = async () => {
  openPanel(`<h2>Entre amis</h2><p class="small">Vos voyages comparés, sans parler d'argent.</p>${friendsStatsHTML()}${CLOSE('Fermer')}`, null, { nofocus: true });
  try { FST.data = await rpc('friends_travel_stats') || []; } catch (_) { FST.data = FST.data || null; if (!FST.data) { const w = $('fstats'); if (w) w.innerHTML = `<p class="small">Connexion impossible pour l'instant. Réessaie dans un moment.</p>`; return; } }
  reFriends();
};
ACT.fsBy = d => { FST.by = ['countries', 'trips', 'days'].includes(d.v) ? d.v : 'countries'; reFriends(); };
ACT.fsWish = d => { if (!COUNTRIES[d.c] || S.envies.some(w => w.pays === d.c)) return; S.envies.push({ id: uid(), pays: d.c, note: '' }); save(); reFriends(); toast(`${regionName(d.c)} ajouté à tes envies`); };
ACT.fsAmis = () => { closePanel(); setTimeout(() => ACT.findFriends(), 380); };
