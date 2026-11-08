/* Escale : écran « Mes voyages en chiffres ». Pays visités, jours, kilomètres, voyage le plus loin
   de chez soi, continents, et les drapeaux collectés : des balles qu'on lance du doigt et qui roulent
   quand on penche le téléphone. Tout est calculé sur le téléphone. */
'use strict';
const EARTH_KM = 40075, UN_COUNTRIES = 195;
const kmBetween = (a, b) => { const r = Math.PI / 180, la1 = a[1] * r, la2 = b[1] * r, dl = (b[0] - a[0]) * r, dp = la2 - la1;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dl / 2) ** 2; return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h))); };
const CONT = (() => { const m = {}, L = {
  'Europe': 'FR IT ES PT GR HR NL DE GB IS BE CH IE NO SE DK FI PL CZ AT HU ME AL MT CY AD BA BG BY EE LI LT LU LV MC MD MK RO RS RU SI SK SM UA VA XK',
  'Afrique': 'MA TN DZ EG SN ZA KE TZ MG MU AO BF BI BJ BW CD CF CG CI CM CV DJ ER ET GA GH GM GN GQ GW KM LR LS LY ML MR MW MZ NA NE NG RE RW SC SD SL SO SS ST SZ TD TG UG YT ZM ZW',
  'Asie': 'JP VN TH ID TR CN KR IN LK MV AE JO PH MY SG KH NP AF AM AZ BD BH BN BT GE HK IQ IR KG KP KW KZ LA LB MM MN MO OM PK PS QA SA SY TJ TL TM TW UZ YE',
  'Amériques': 'US MX BR CA AR CL PE CO CU CR AG BB BO BS BZ DM DO EC GD GF GL GP GT GY HN HT JM KN LC MQ NI PA PR PY SR SV TT UY VC VE',
  'Océanie': 'AU NZ FJ FM KI MH NC NR PF PG PW SB TO TV VU WS' };
  Object.entries(L).forEach(([c, s]) => s.split(' ').forEach(k => m[k] = c)); return m; })();
const CONT_N = { 'Europe': 44, 'Afrique': 54, 'Asie': 48, 'Amériques': 35, 'Océanie': 14 };
/** Lieu de vie : réglage du compte, Paris par défaut. */
function homeOf() { const h = typeof SETTINGS !== 'undefined' && SETTINGS && SETTINGS.home && COUNTRIES[SETTINGS.home.cc] ? SETTINGS.home : { cc: 'FR', n: 'Paris' };
  return { ...h, ll: placeLL(h.n, h.cc) || COUNTRIES[h.cc].ll }; }
function worldStats() {
  const H = homeOf(), done = S.trips.filter(t => !info(t).futur), cc = new Set(done.map(t => t.pays).filter(k => COUNTRIES[k]));
  let days = 0, km = 0, far = null;
  done.forEach(t => { const f = info(t); days += f.enCours ? f.jour : f.jours;
    const pts = tripPlaces(t).map(p => p.ll); if (!pts.length) pts.push(tripLL(t));
    let prev = H.ll; pts.forEach(p => { km += kmBetween(prev, p); prev = p; }); km += kmBetween(prev, H.ll);
    pts.forEach((p, i) => { const d = kmBetween(H.ll, p); if (!far || d > far.km) far = { km: d, t, n: (tripPlaces(t)[i] || {}).n || t.ville || C(t).n }; }); });
  const conts = {}; cc.forEach(k => { const c = CONT[k]; if (c) conts[c] = (conts[c] || 0) + 1; });
  return { H, n: cc.size, cc: [...cc], trips: done.length, days, km: Math.round(km), far, conts, pct: cc.size / UN_COUNTRIES * 100 };
}
const kmTxt = v => Math.round(v).toLocaleString('fr-FR') + ' km';
function renderMonde() {
  const W = worldStats(), sc = $('s-monde');
  const tile = (v, l, sub) => `<div class="mw-tile"><b class="num">${v}</b><span>${l}</span>${sub ? `<em>${sub}</em>` : ''}</div>`;
  sc.innerHTML = `<div class="vtop"><button class="iconbtn" data-act="back" aria-label="Retour">${SV.back}</button><h1>En chiffres</h1><div class="r"></div></div>
   <section class="mw-hero"><div><b class="num">${W.n}</b><span>pays visité${W.n > 1 ? 's' : ''}</span></div><div class="mw-pct"><svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="18"/><circle cx="22" cy="22" r="18" class="on" stroke-dasharray="${(Math.min(100, W.pct) / 100 * 113.1).toFixed(1)} 113.1"/></svg><span class="num">${W.pct < 1 && W.n ? W.pct.toFixed(1).replace('.', ',') : Math.round(W.pct)} %</span><em>du monde</em></div></section>
   <p class="small mw-base">Sur les ${UN_COUNTRIES} pays reconnus par l'ONU.</p>
   <div class="mw-grid">${tile(W.days, 'jours de voyage', W.days >= 30 ? `soit ${(W.days / 30.4).toFixed(1).replace('.', ',')} mois` : '')}${tile(kmTxt(W.km), 'parcourus', W.km ? `${(W.km / EARTH_KM).toFixed(2).replace('.', ',')} fois le tour de la Terre` : 'aller et retour depuis chez toi')}${tile(W.trips, `voyage${W.trips > 1 ? 's' : ''}`, W.trips ? `${Math.round(W.days / W.trips)} jours en moyenne` : '')}
     ${W.far ? `<div class="mw-tile far">${flag(W.far.t.pays)}<b class="num">${kmTxt(W.far.km)}</b><span>le plus loin de chez toi</span><em>${esc(W.far.n)}</em></div>` : tile('–', 'le plus loin de chez toi', '')}</div>
   <button class="mw-home" data-act="homeSet">${SV.place}<span>Tu habites à <b>${esc(W.H.n)}</b>, ${esc(C({ pays: W.H.cc }).n)}</span><em>Modifier</em></button>
   <div class="sec"><h2>Drapeaux collectés</h2><span class="small">${W.n} / ${Object.keys(COUNTRIES).length}</span></div>
   <div class="flagbox" id="flagbox">${W.n ? '' : '<p class="small">Tes drapeaux tomberont ici après ton premier voyage.</p>'}<canvas id="flagcv" aria-label="${W.n} drapeaux collectés : ${W.cc.map(k => C({ pays: k }).n).join(', ')}" role="img"></canvas></div>
   <p class="small mw-tip">Lance les drapeaux du doigt, ou penche ton téléphone.</p>
   <div class="sec"><h2>Continents</h2></div>
   <div class="mw-conts">${Object.entries(CONT_N).map(([c, tot]) => { const v = W.conts[c] || 0; return `<div class="mw-ct ${v ? 'on' : ''}"><span>${c}</span><span class="bar"><i style="width:${Math.max(v ? 4 : 0, v / tot * 100)}%"></i></span><b class="num">${v}/${tot}</b></div>`; }).join('')}</div>`;
  if (W.n) setTimeout(() => flagBalls($('flagcv'), W.cc), 30);
}
SCREENS.monde = renderMonde;
ACT.homeSet = () => { const H = homeOf();
  openPanel(`<h2>Où habites-tu ?</h2><p class="small">Sert à calculer les kilomètres parcourus et le voyage le plus loin de chez toi. Ce réglage reste privé.</p>
   <label class="fld"><span>Pays</span><input id="h-cc" autocomplete="off" maxlength="40" value="${esc(COUNTRIES[H.cc].n)}"></label>
   <label class="fld"><span>Ville</span><input id="h-n" autocomplete="off" maxlength="60" value="${esc(H.n)}"></label>
   <button class="btn full" id="h-ok">Enregistrer<i>${SV.arrow}</i></button>${CLOSE()}`, p => {
    combo(p.querySelector('#h-cc'), countryItems); combo(p.querySelector('#h-n'), () => cityItems(paysCode(p.querySelector('#h-cc').value))());
    p.querySelector('#h-ok').onclick = async () => { const cc = paysCode(p.querySelector('#h-cc').value), n = p.querySelector('#h-n').value.trim().slice(0, 60);
      if (!cc) { toast('Choisis ton pays dans la liste'); return; } if (!n) { toast('Indique ta ville'); return; }
      if (!placeLL(n, cc)) toast('Ville inconnue : on prend le centre du pays pour les distances');
      SETTINGS.home = { cc, n }; writeCache(); closePanel(); renderMonde();
      try { const { error } = await sb.from('account_settings').update({ home: { cc, n } }).eq('user_id', ME.id); if (error) throw error; } catch (e) { toast('Enregistré sur ce téléphone, synchronisation plus tard'); } };
  }, { nofocus: true });
};

/* ---------- drapeaux en balles : petite physique 2D (gravité, rebonds, chocs, lancer au doigt) ---------- */
let FB = null, FBperm = false;
function flagBalls(cv, codes) {
  if (FB) FB.stop(); if (!cv || !cv.isConnected) return;
  const box = cv.parentElement, dpr = Math.min(2, devicePixelRatio || 1), W = box.clientWidth, H = Math.max(220, Math.min(340, 140 + codes.length * 9));
  cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
  const R = codes.length > 40 ? 17 : codes.length > 18 ? 21 : 26;
  const balls = codes.map((k, i) => { const img = new Image(); img.src = `vendor/flags/${k.toLowerCase()}.svg`;
    return { k, img, r: R, x: R + (i * 53) % Math.max(1, W - 2 * R), y: -R - i * (R * 1.2), vx: (Math.random() - .5) * 2, vy: 0 }; });
  let g = [0, .45], drag = null, raf = 0, last = 0, alive = true, still = 0;
  const step = () => {
    balls.forEach(b => { if (b === (drag && drag.b)) return; b.vx += g[0]; b.vy += g[1]; b.vx *= .995; b.vy *= .995; b.x += b.vx; b.y += b.vy;
      if (b.x < b.r) { b.x = b.r; b.vx *= -.6; } if (b.x > W - b.r) { b.x = W - b.r; b.vx *= -.6; }
      if (b.y > H - b.r) { b.y = H - b.r; b.vy *= -.45; b.vx *= .96; } if (b.y < b.r && b.vy < 0 && b.y > -b.r) { b.y = b.r; b.vy *= -.5; } });
    for (let it = 0; it < 3; it++) for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i], b = balls[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = a.r + b.r;
      if (d > 0 && d < m) { const nx = dx / d, ny = dy / d, o = (m - d) / 2, fa = drag && drag.b === a ? 0 : 1, fb = drag && drag.b === b ? 0 : 1;
        a.x -= nx * o * fa * (fb ? 1 : 2); a.y -= ny * o * fa * (fb ? 1 : 2); b.x += nx * o * fb * (fa ? 1 : 2); b.y += ny * o * fb * (fa ? 1 : 2);
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny; if (rv < 0) { const imp = -rv * .85; if (fa) { a.vx -= imp * nx / 2; a.vy -= imp * ny / 2; } if (fb) { b.vx += imp * nx / 2; b.vy += imp * ny / 2; } } } }
  };
  const draw = () => { ctx.clearRect(0, 0, W, H);
    balls.forEach(b => { ctx.save(); ctx.translate(b.x, b.y);
      ctx.beginPath(); ctx.ellipse(0, b.r * .92, b.r * .8, b.r * .18, 0, 0, 7); ctx.fillStyle = 'rgba(30,40,30,.10)'; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, b.r, 0, 7); ctx.closePath(); ctx.save(); ctx.clip();
      if (b.img.complete && b.img.naturalWidth) ctx.drawImage(b.img, -b.r, -b.r, b.r * 2, b.r * 2); else { ctx.fillStyle = '#ddd'; ctx.fillRect(-b.r, -b.r, b.r * 2, b.r * 2); }
      const sh = ctx.createRadialGradient(-b.r * .35, -b.r * .4, b.r * .1, 0, 0, b.r); sh.addColorStop(0, 'rgba(255,255,255,.55)'); sh.addColorStop(.45, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,.28)');
      ctx.fillStyle = sh; ctx.fillRect(-b.r, -b.r, b.r * 2, b.r * 2); ctx.restore();
      ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.stroke(); ctx.restore(); }); };
  const loop = t => { if (!alive || !cv.isConnected) { FB && FB.stop(); return; } const n = Math.min(3, Math.round((t - last) / 16.7) || 1); last = t; for (let i = 0; i < n; i++) step(); draw();
    const e = balls.reduce((a, b) => a + Math.abs(b.vx) + Math.abs(b.vy), 0); still = e < balls.length * .08 && !drag ? still + 1 : 0;
    raf = still > 90 ? 0 : requestAnimationFrame(loop); };
  const wake = () => { still = 0; if (!raf && alive) { last = performance.now(); raf = requestAnimationFrame(loop); } };
  const pt = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.onpointerdown = e => { const [x, y] = pt(e), b = balls.slice().reverse().find(b => Math.hypot(b.x - x, b.y - y) < b.r + 6); if (!b) return;
    e.preventDefault(); cv.setPointerCapture(e.pointerId);
    if (!FBperm && typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') { FBperm = true; DeviceOrientationEvent.requestPermission().catch(() => { }); } drag = { b, hist: [[x, y, performance.now()]] }; b.vx = b.vy = 0; wake(); if (navigator.vibrate) try { navigator.vibrate(8); } catch (_) { } };
  cv.onpointermove = e => { if (!drag) return; const [x, y] = pt(e); drag.b.x = Math.max(drag.b.r, Math.min(W - drag.b.r, x)); drag.b.y = Math.max(drag.b.r, Math.min(H - drag.b.r, y)); drag.hist.push([x, y, performance.now()]); if (drag.hist.length > 5) drag.hist.shift(); wake(); };
  cv.onpointerup = cv.onpointercancel = () => { if (!drag) return; const h = drag.hist, a = h[0], z = h[h.length - 1], dt = Math.max(16, z[2] - a[2]);
    drag.b.vx = Math.max(-28, Math.min(28, (z[0] - a[0]) / dt * 16)); drag.b.vy = Math.max(-28, Math.min(28, (z[1] - a[1]) / dt * 16));
    if (Math.hypot(z[0] - a[0], z[1] - a[1]) < 4) { drag.b.vy = -9; drag.b.vx = (Math.random() - .5) * 6; toast(C({ pays: drag.b.k }).n); }
    drag = null; wake(); };
  const tilt = e => { if (e.gamma == null) return; g = [Math.max(-.5, Math.min(.5, e.gamma / 60)), Math.max(.1, Math.min(.6, (e.beta || 45) / 90))]; wake(); };
  addEventListener('deviceorientation', tilt);
  balls.forEach(b => b.img.onload = wake);
  if (REDUCED) { balls.forEach((b, i) => { b.x = b.r + (i * b.r * 2.1) % (W - 2 * b.r); b.y = H - b.r - Math.floor(i * b.r * 2.1 / (W - 2 * b.r)) * b.r * 2.05; }); draw(); }
  wake();
  FB = { stop: () => { alive = false; cancelAnimationFrame(raf); removeEventListener('deviceorientation', tilt); } };
}
