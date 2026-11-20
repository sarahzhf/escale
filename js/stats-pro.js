/* Eskalys : statistiques avancées (plan PRO). Un vrai tableau de bord, interactif, avec seulement des chiffres utiles :
   (La prévision avec son curseur est gratuite : voir forecastFreeHTML.)
   2. Calendrier : chaque jour coloré selon ce qu'il a coûté, touche un jour pour le détail.
   3. Habitudes : taille de tes achats, semaine ou week-end, panier moyen par catégorie.
   4. Change : ce que chaque devise t'a coûté, et ce que le taux du jour t'a fait gagner ou perdre.
   5. Entre amis : qui a avancé quoi.
   6. Top commerçants.
   La version gratuite garde les chiffres clés, l'évolution, les catégories, le budget et les plus grosses dépenses. */
'use strict';
const SPX = { day: null, sim: null };
const proOn = () => typeof proLocked !== 'function' || !proLocked();
const proBadge = () => '<span class="pro-tag sm">PRO</span>';

function statsProHTML(t, rows, total) {
  if (STX.scope === 'all') return proSection(proCompareHTML(rows, total));
  const f = info(t), days = Array.from({ length: f.jours }, (_, i) => i + 1), pd = perDay(t, days), el = elapsedOf(t);
  const parts = [proCalendarHTML(t, f, pd, el), proHabitsHTML(t, rows, total, pd, el), proFxHTML(t), proGroupHTML(t), proMerchantsHTML(rows)].filter(Boolean);
  return proSection(parts.join(''));
}
/** La prévision avec son simulateur reste gratuite pour tous (choix de Sarah, 20 nov. 2026). */
function forecastFreeHTML(t) { if (STX.scope === 'all' || STX.p) return ''; const f = info(t), days = Array.from({ length: f.jours }, (_, i) => i + 1); return proForecastHTML(t, f, perDay(t, days), elapsedOf(t)); }
function proSection(inner) {
  if (!inner) return '';
  const head = `<div class="sec sx-sec pro-head"><h2>Tableau de bord ${proBadge()}</h2></div>`;
  if (proOn()) return head + inner;
  return `${head}<div class="pro-lock"><div class="pro-blur" aria-hidden="true">${inner}</div><div class="pro-cta"><span class="pro-tag big">PRO</span><b>Ton tableau de bord complet</b><p>Calendrier de tes dépenses, habitudes, change, comptes entre amis, adresses fidèles et comparaison de tes voyages.</p><button class="btn" data-act="statsPaywall">Découvrir PRO</button></div></div>`;
}

/* 1. Prévision et simulateur */
function proForecastHTML(t, f, pd, el) {
  const spent = spentOf(t), B = +t.budget || 0, left = f.jours - el;
  if (!B && !left) return '';
  if (!left) { // voyage terminé : le bilan
    const perB = B / f.jours, over = pd.filter(x => x.v > perB).length, diff = spent - B;
    return `<section class="sx-card"><h3>Bilan du voyage</h3><div class="pf-big ${diff > 0 ? 'ko' : 'ok'}"><b class="num">${diff > 0 ? '+' : '-'}${fmt(Math.abs(diff))}</b><span>${diff > 0 ? 'au-dessus' : 'en dessous'} du budget de ${fmt(B)}</span></div>
      ${B ? `<p class="small">${over} jour${over > 1 ? 's' : ''} sur ${f.jours} au-dessus de ton budget journalier de ${fmt(perB)}.</p>` : ''}</section>`; }
  const avg = el ? spent / el : (B / f.jours) || 0, per = B ? Math.max(0, (B - spent) / left) : 0;
  const v0 = SPX.sim != null && SPX.sim.trip === t.id ? SPX.sim.v : Math.round(avg), max = Math.max(50, Math.round(Math.max(avg, B / f.jours) * 2.5 / 10) * 10);
  const proj = spent + v0 * left, d = B ? proj - B : 0;
  return `<section class="sx-card pf" data-trip="${t.id}"><h3>Prévision<em>${f.futur ? 'avant le départ' : `il reste ${left} jour${left > 1 ? 's' : ''}`}</em></h3>
    ${B ? `<div class="pf-row"><div><span>Tu peux encore dépenser</span><b class="num ${per < avg && el ? 'warn' : ''}">${fmt(per)}<small> par jour</small></b></div><div><span>Ton rythme actuel</span><b class="num">${el ? fmt(avg) : '-'}<small>${el ? ' par jour' : ''}</small></b></div></div>` : ''}
    <label class="pf-sim"><span>Si je dépense <b class="num" id="pf-v">${fmt(v0)}</b> par jour d'ici la fin</span><input type="range" id="pf-r" min="0" max="${max}" step="5" value="${Math.min(v0, max)}" aria-label="Dépense par jour simulée"></label>
    <div class="pf-out"><span>je finirai à</span><b class="num" id="pf-p">${fmt(proj)}</b>${B ? `<em class="num ${d > 0 ? 'ko' : 'ok'}" id="pf-d">${d > 0 ? `${fmt(d)} au-dessus du budget` : `${fmt(-d)} sous le budget`}</em>` : ''}</div>
    ${B ? `<div class="pf-bar"><i style="width:${Math.min(100, spent / Math.max(B, proj) * 100)}%"></i><i class="p" id="pf-pb" style="width:${Math.min(100, (proj - spent) / Math.max(B, proj) * 100)}%"></i><s style="left:${Math.min(100, B / Math.max(B, proj) * 100)}%"></s></div><p class="small pf-leg"><span class="a"></span>dépensé <span class="b"></span>prévu <span class="c"></span>budget</p>` : ''}</section>`;
}
document.addEventListener('input', e => { if (!e.target || e.target.id !== 'pf-r') return; const box = e.target.closest('.pf'), t = box && trip(box.dataset.trip); if (!t) return;
  const f = info(t), left = f.jours - elapsedOf(t), spent = spentOf(t), B = +t.budget || 0, v = +e.target.value, proj = spent + v * left, d = proj - B; SPX.sim = { trip: t.id, v };
  box.querySelector('#pf-v').textContent = fmt(v); box.querySelector('#pf-p').textContent = fmt(proj);
  const el = box.querySelector('#pf-d'); if (el) { el.textContent = d > 0 ? `${fmt(d)} au-dessus du budget` : `${fmt(-d)} sous le budget`; el.className = 'num ' + (d > 0 ? 'ko' : 'ok'); }
  const pb = box.querySelector('#pf-pb'); if (pb) { const m = Math.max(B, proj); pb.style.width = Math.min(100, (proj - spent) / m * 100) + '%'; pb.previousElementSibling.style.width = Math.min(100, spent / m * 100) + '%'; box.querySelector('.pf-bar s').style.left = Math.min(100, B / m * 100) + '%'; } });
ACT.tripComptes = d => { dTab = 'comptes'; openTrip(d.trip, true); };

/* 2. Calendrier des dépenses */
function proCalendarHTML(t, f, pd, el) {
  if (f.jours < 2) return '';
  const max = Math.max(...pd.map(x => x.v), 1), perB = t.budget ? t.budget / f.jours : 0, first = (D(t.du).getDay() + 6) % 7;
  const cells = Array.from({ length: first }, () => '<i class="pc-e"></i>').join('') + pd.map(x => { const fut = x.j > el, lvl = x.v ? Math.max(1, Math.ceil(x.v / max * 4)) : 0;
    return `<button class="pc-d l${fut ? 'f' : lvl}${perB && x.v > perB ? ' over' : ''}${SPX.day === x.j ? ' on' : ''}" data-act="pcDay" data-j="${x.j}" ${fut ? 'disabled' : ''} aria-label="Jour ${x.j}, ${fd(x.date)} : ${fmt(x.v)}"><span>${D(x.date).getDate()}</span>${x.v && !fut ? `<em class="num">${kfmt(x.v)}</em>` : ''}</button>`; }).join('');
  const sel = SPX.day && pd.find(x => x.j === SPX.day);
  const det = sel ? (() => { const L = t.depenses.filter(d => dayShare(d, sel.j) > 0).sort((a, b) => dayShare(b, sel.j) - dayShare(a, sel.j));
    return `<div class="pc-det"><p><b>Jour ${sel.j}, ${fd(sel.date)}</b> : ${fmt(sel.v)}${perB ? `, ${sel.v > perB ? `<span class="ko">${fmt(sel.v - perB)} au-dessus</span>` : `<span class="ok">${fmt(perB - sel.v)} sous</span>`} de ton budget du jour` : ''}</p>
      <ul>${L.map(d => `<li><button data-act="editExp" data-trip="${t.id}" data-id="${d.id}"><span class="ic sm" style="--cc:${CATV(d.c)}">${ico(d.c)}</span><span>${esc(d.l)}${d.j2 && d.j2 > d.j ? ' <em>(réparti par nuit)</em>' : ''}</span><b class="num">${fmt(dayShare(d, sel.j))}</b></button></li>`).join('') || '<li class="small">Aucune dépense ce jour-là.</li>'}</ul></div>`; })() : '<p class="small st-hint">Touche un jour pour voir ses dépenses.</p>';
  const over = perB ? pd.filter(x => x.j <= el && x.v > perB).length : 0;
  return `<section class="sx-card"><h3>Calendrier<em>${perB ? `${over} jour${over > 1 ? 's' : ''} sur ${el} au-dessus de ${fmt(perB)}` : 'plus c’est foncé, plus c’est cher'}</em></h3>
    <div class="pc-wk">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(x => `<span>${x}</span>`).join('')}</div><div class="pc-grid">${cells}</div>${det}</section>`;
}
ACT.pcDay = d => { const j = +d.j; SPX.day = SPX.day === j ? null : j; reStats(); };

/* 3. Habitudes */
function proHabitsHTML(t, rows, total, pd, el) {
  if (rows.length < 3) return '';
  const B = [['Moins de 10 €', 0, 10], ['10 à 50 €', 10, 50], ['50 à 150 €', 50, 150], ['Plus de 150 €', 150, 1e9]].map(([n, a, b]) => { const L = rows.filter(r => r.d.eur >= a && r.d.eur < b); return { n, nb: L.length, v: L.reduce((s, r) => s + r.v, 0) }; });
  const bmax = Math.max(...B.map(x => x.v), 1);
  const done = pd.filter(x => x.j <= el), we = done.filter(x => [0, 6].includes(D(x.date).getDay())), wd = done.filter(x => ![0, 6].includes(D(x.date).getDay()));
  const avg = L => L.length ? L.reduce((a, x) => a + x.v, 0) / L.length : 0;
  const cats = Object.keys(CATS).map(k => { const L = rows.filter(r => r.d.c === k && k !== 'logement'); return { k, n: CATS[k].n, nb: L.length, m: L.length ? L.reduce((a, r) => a + r.v, 0) / L.length : 0 }; }).filter(x => x.nb).sort((a, b) => b.m - a.m);
  return `<section class="sx-card"><h3>Tes habitudes</h3>
    <p class="sx-sub">Taille de tes achats</p><div class="sx-rank">${B.map(x => `<div class="r"><span class="n">${x.n}</span><span class="tr"><i style="width:${x.v / bmax * 100}%"></i></span><b class="num">${kfmt(x.v)}</b><em class="num">${x.nb}×</em></div>`).join('')}</div>
    ${we.length && wd.length ? `<div class="pf-row"><div><span>En semaine</span><b class="num">${fmt(avg(wd))}<small> par jour</small></b></div><div><span>Le week-end</span><b class="num">${fmt(avg(we))}<small> par jour</small></b></div></div>` : ''}
    ${cats.length ? `<p class="sx-sub">Panier moyen <em>(hors logement)</em></p><div class="ph-chips">${cats.map(x => `<span style="--cc:${CATV(x.k)}"><i class="sx-sw" style="background:${CATV(x.k)}"></i>${esc(x.n)}<b class="num">${fmt(x.m)}</b></span>`).join('')}</div>` : ''}
    <p class="small sx-note">Ticket moyen de toutes tes dépenses : <b class="num">${fmt(total / rows.length)}</b>.</p></section>`;
}

/* 4. Devises et effet du change */
function proFxHTML(t) {
  const g = {}; t.depenses.forEach(d => { const code = d.v != null ? (d.cur || C(t).code) : null; if (!code || code === 'EUR') return; const o = g[code] = g[code] || { code, loc: 0, eur: 0, n: 0 }; o.loc += d.v; o.eur += +d.eur || 0; o.n++; });
  const L = Object.values(g); if (!L.length) return '';
  let gain = 0; const lines = L.map(o => { const now = o.loc / (typeof rateFor === 'function' ? rateFor(o.code) : o.loc / o.eur), dif = now - o.eur; gain += dif;
    return `<div class="fx-l"><b>${o.code}</b><span class="num">${Math.round(o.loc).toLocaleString('fr-FR')} ${o.code}</span><span class="num">${fmt(o.eur)}</span><em class="num">1 € = ${typeof fmtRate === 'function' ? fmtRate(o.loc / o.eur) : (o.loc / o.eur).toFixed(2)} ${o.code}</em></div>`; }).join('');
  return `<section class="sx-card"><h3>Devises<em>au taux enregistré pour chaque dépense</em></h3><div class="fx">${lines}</div>
    ${Math.abs(gain) >= 1 ? `<p class="small">Au taux d'aujourd'hui, ces dépenses vaudraient <b class="num ${gain > 0 ? 'ok' : 'ko'}">${fmt(Math.abs(gain))} ${gain > 0 ? 'de plus' : 'de moins'}</b> : le change ${gain > 0 ? 'a joué en ta faveur' : 'a joué contre toi'} au moment de payer.</p>` : '<p class="small">Le taux n’a presque pas bougé depuis tes achats.</p>'}</section>`;
}

/* 5. Entre amis */
function proGroupHTML(t) {
  const M = t.membres || []; if (!M.length) return '';
  const ids = ['me', ...M.map(m => m.id)], paid = Object.fromEntries(ids.map(i => [i, 0])); let tot = 0;
  t.depenses.forEach(d => { const by = d.by || 'me'; if (paid[by] != null) paid[by] += +d.eur || 0; tot += +d.eur || 0; });
  const max = Math.max(...Object.values(paid), 1), mine = spentOf(t);
  return `<section class="sx-card"><h3>Entre amis<em>qui a avancé l’argent</em></h3><div class="sx-rank">${ids.map(i => `<div class="r ${i === 'me' ? 'me' : ''}"><span class="n">${esc(memberName(t, i))}</span><span class="tr"><i style="width:${paid[i] / max * 100}%"></i></span><b class="num">${kfmt(paid[i])}</b><em class="num">${pctTxt(paid[i], tot)}</em></div>`).join('')}</div>
    <div class="pf-row"><div><span>Dépenses du groupe</span><b class="num">${fmt(tot)}</b></div><div><span>Ta part</span><b class="num">${fmt(mine)}<small> soit ${pctTxt(mine, tot)}</small></b></div></div>
    <button class="link small" data-act="tripComptes" data-trip="${t.id}">Voir les comptes${SV.right || ''}</button></section>`;
}

/* 6. Top commerçants */
function proMerchantsHTML(rows) {
  const mer = merchants(rows).filter(m => m.n >= 2).sort((a, b) => b.v - a.v || b.n - a.n); if (!mer.length) return ''; // seulement les commerçants où tu es revenu
  const top = mer.slice(0, 5), mmax = Math.max(...top.map(m => m.v), 1);
  return `<section class="sx-card"><h3>Tes adresses fidèles<em>les commerçants où tu es revenu</em></h3><ol class="sx-list">${top.map((m, i) => `<li><span class="rk num">${i + 1}</span><span class="ic sm" style="--cc:${CATV(m.c)}">${ico(m.c)}</span><span class="m"><b>${esc(m.name)}</b><span class="tr"><i style="width:${m.v / mmax * 100}%"></i></span></span><span class="p num">${fmt(m.v)}<span>${m.n} fois</span></span></li>`).join('')}</ol></section>`;
}

/* Tous les voyages : la comparaison */
function proCompareHTML(rows, total) {
  const T = S.trips.filter(x => x.depenses.length && elapsedOf(x)); if (T.length < 2) return '';
  const L = T.map(x => ({ x, per: spentOf(x) / elapsedOf(x), tot: spentOf(x), cats: catsOf(x), days: elapsedOf(x) })).sort((a, b) => b.per - a.per), pmax = Math.max(...L.map(o => o.per), 1);
  const yr = {}; T.forEach(x => { const y = (x.du || '').slice(0, 4); yr[y] = yr[y] || { y, tot: 0, n: 0, days: 0 }; yr[y].tot += spentOf(x); yr[y].n++; yr[y].days += elapsedOf(x); });
  const Y = Object.values(yr).sort((a, b) => a.y.localeCompare(b.y));
  return `<section class="sx-card"><h3>Coût par jour<em>du plus cher au plus économe</em></h3><div class="tcmp">${L.map(o => `<div class="cmp-r"><div class="cmp-t"><span class="n">${flag(o.x.pays)}${esc(short(o.x))}</span><b class="num">${fmt(o.per)}<small> / jour</small></b></div><div class="stk-w"><span class="cmp-bar" style="width:${o.per / pmax * 100}%">${Object.keys(CATS).map(k => o.cats[k] ? `<i style="flex:${Math.round(o.cats[k])} 1 0;background:${CATV(k)}" title="${CATS[k].n}"></i>` : '').join('')}</span></div></div>`).join('')}</div>
    <div class="cmp-leg">${Object.keys(CATS).map(k => `<span><i class="sx-sw" style="background:${CATV(k)}"></i>${CATS[k].n}</span>`).join('')}</div></section>
    ${Y.length > 1 ? `<section class="sx-card"><h3>Année par année</h3><div class="yr">${Y.map(y => `<div><span>${y.y}</span><b class="num">${kfmt(y.tot)}</b><em>${y.n} voyage${y.n > 1 ? 's' : ''}, ${y.days} j</em><em class="num">${fmt(y.tot / Math.max(1, y.days))} / jour</em></div>`).join('')}</div></section>` : ''}`;
}

/* verrou : écran PRO pour les statistiques */
ACT.statsPaywall = () => openPanel(`<div class="exp-pay"><span class="pro-tag big">PRO</span><h2>Ton tableau de bord complet</h2>
  <p class="small">Comprends vraiment où part ton argent, et garde le contrôle pendant le voyage.</p>
  <ul class="exp-list"><li><b>Calendrier</b> : chaque jour coloré selon ce qu’il a coûté, et son détail en un geste.</li><li><b>Habitudes</b> : taille de tes achats, semaine ou week-end, panier moyen.</li><li><b>Change, entre amis, commerçants</b>, et la comparaison de tous tes voyages année par année.</li></ul>
  <button class="btn full" disabled>Passer à PRO (bientôt disponible)</button>${CLOSE()}</div>`, () => { }, { nofocus: true });
