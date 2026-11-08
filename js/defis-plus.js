/* Escale : défis, suite.
   - Le bocal en grand : on le touche, il s'agrandit en 3D et on le fait tourner du doigt (avec élan).
   - Badges de lieux : chaque défi relevé donne le tampon de son pays, et des badges selon l'endroit
     (café, coucher de soleil, plage, musée, marché, sommet...). Calculés à partir de tes défis relevés. */
'use strict';
const PLACE_BADGES = [
  ['cafe', '☕', 'Pause café', /caf[eé]|coffee|espresso|cappuccino|th[eé]\b|salon de th/],
  ['sunset', '🌅', 'Golden hour', /coucher|lever du soleil|sunset|sunrise|aube|cr[eé]puscule/],
  ['beach', '🏖️', 'Pieds dans le sable', /plage|beach|crique|lagon|calanque|mer\b|oc[eé]an/],
  ['museum', '🖼️', 'Esprit curieux', /mus[eé]e|galerie|expo|museum/],
  ['market', '🧺', 'Chineur', /march[eé]|souk|bazar|market|brocante/],
  ['peak', '⛰️', 'Tout là-haut', /sommet|montagne|col\b|volcan|belv[eé]d[eè]re|panorama|vue sur|rooftop|toit/],
  ['food', '🍜', 'Fine bouche', /restaurant|resto|street food|pizza|tapas|sushi|ramen|glace|p[aâ]tisserie|d[iî]ner|d[eé]jeuner|brunch/],
  ['monument', '🏛️', 'Carte postale', /tour |tour$|cath[eé]drale|temple|ch[aâ]teau|pont|colis[eé]e|pyramide|palais|mosqu[eé]e|basilique|monument/],
  ['nature', '🌿', 'Grand air', /\bparcs?\b|jardin|for[eê]t|\blacs?\b|cascade|rando|sentier|gorges/],
  ['night', '🌙', 'Noctambule', /nuit|soir[eé]e|bar\b|concert|club|[eé]toiles/],
];
function placeBadges() {
  const done = (typeof CHALS !== 'undefined' ? CHALS : []).filter(c => c.to_id === ME.id && c.status === 'done');
  const stamps = {}, got = {};
  done.forEach(c => { if (c.country_code && COUNTRIES[c.country_code]) stamps[c.country_code] = (stamps[c.country_code] || 0) + 1;
    const txt = norm(`${c.place || ''} ${c.note || ''}`).replace(/ /g, ' ') + ' ' + String(`${c.place || ''} ${c.note || ''}`).toLowerCase();
    PLACE_BADGES.forEach(([k, , , re]) => { if (re.test(txt)) got[k] = (got[k] || 0) + 1; }); });
  return { stamps, got, n: done.length };
}
function placeBadgesHTML() { const B = placeBadges(), st = Object.entries(B.stamps).sort((a, b) => b[1] - a[1]);
  return `<div class="sec"><h2>Tampons de défis</h2><span class="small">${st.length} pays</span></div>
    ${st.length ? `<div class="stamps">${st.map(([k, n]) => `<div class="stamp" style="--r:${(k.charCodeAt(0) * 7 + k.charCodeAt(1)) % 13 - 6}deg">${flag(k)}<b>${esc(COUNTRIES[k].n)}</b><em class="num">${n} défi${n > 1 ? 's' : ''}</em></div>`).join('')}</div>` : '<p class="small">Relève un défi dans un pays pour obtenir son tampon.</p>'}
    <div class="sec"><h2>Badges de lieux</h2><span class="small">${Object.keys(B.got).length}/${PLACE_BADGES.length}</span></div>
    <div class="pbadges">${PLACE_BADGES.map(([k, e, n]) => `<div class="pb ${B.got[k] ? 'on' : ''}"><i>${e}</i><b>${n}</b><em>${B.got[k] ? `${B.got[k]} défi${B.got[k] > 1 ? 's' : ''}` : 'À débloquer'}</em></div>`).join('')}</div>
    <p class="small">Les badges de lieux se gagnent selon l'endroit du défi relevé : un café, un coucher de soleil, un marché, un sommet...</p>`; }

/* ---------- bocal en 3D ---------- */
ACT.jar3d = () => { const pts = (typeof withMissions === 'function' ? withMissions(myStats()) : myStats()).points;
  const ov = document.createElement('div'); ov.className = 'jar3d'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', `Ton bocal : ${pts} points`);
  ov.innerHTML = `<button class="iconbtn j3-close" aria-label="Fermer">${SV.x || '✕'}</button><canvas></canvas><div class="j3-txt"><b class="num">${pts}</b><span>points dans ton bocal</span><em>Fais-le tourner du doigt</em></div>`;
  document.body.appendChild(ov); requestAnimationFrame(() => ov.classList.add('on'));
  const cv = ov.querySelector('canvas'), dpr = Math.min(2, devicePixelRatio || 1), W = Math.min(innerWidth, 440), H = Math.min(innerHeight * .62, 520);
  cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
  // billes rangées en couches dans un cylindre : rayon RJ, du fond vers le haut
  const inJar = pts % JAR_CAP === 0 && pts ? JAR_CAP : pts % JAR_CAP, n = Math.max(0, Math.round(inJar / 2)), RJ = W * .27, rb = RJ * .2, cx = W / 2, base = H * .86, top = H * .2;
  const M = []; let layer = 0, k = 0;
  while (k < n) { const y = base - rb - layer * rb * 1.62, ring = [[0, 0]], R1 = RJ - rb * .98;
    for (let r = rb * 2.05, ri = 0; r <= R1 + .1; r += rb * 1.98, ri++) { const c = Math.floor(2 * Math.PI * r / (rb * 2.05)); for (let i = 0; i < c; i++) ring.push([r, i / c * 2 * Math.PI + layer * .4 + ri * .2]); }
    for (const [r, a] of ring) { if (k >= n) break; M.push({ r, a, y: y - ((k * 13) % 5) * .6, c: JAR_COLS[(k * 7 + layer) % JAR_COLS.length] }); k++; } layer++; }
  let rot = 0, vel = .004, drag = null, alive = true, tilt = .32;
  const shade = (hex, f) => { const v = parseInt(hex.slice(1), 16), r = v >> 16, g = v >> 8 & 255, b = v & 255; return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`; };
  const ell = (y, rx, ry) => { ctx.beginPath(); ctx.ellipse(cx, y, rx, ry, 0, 0, 7); };
  const frame = () => { if (!alive) return; if (!drag) { rot += vel; vel = vel * .985 + .004 * .015; } ctx.clearRect(0, 0, W, H);
    const ry = RJ * tilt, neckY = top - 8;
    // ombre
    ctx.save(); ctx.filter = 'blur(10px)'; ell(base + 10, RJ * 1.05, ry * .9); ctx.fillStyle = 'rgba(60,40,15,.25)'; ctx.fill(); ctx.restore();
    // paroi arrière
    ell(base, RJ, ry); ctx.fillStyle = 'rgba(200,222,228,.25)'; ctx.fill();
    ctx.fillStyle = 'rgba(210,228,232,.18)'; ctx.fillRect(cx - RJ, top, RJ * 2, base - top);
    // billes triées par profondeur
    const P = M.map(m => { const a = m.a + rot, z = Math.cos(a) * m.r; return { x: cx + Math.sin(a) * m.r, y: m.y + z * tilt * .9, z, c: m.c }; }).sort((a, b) => a.z - b.z);
    P.forEach(p => { const f = .78 + (p.z / RJ + 1) * .14, g = ctx.createRadialGradient(p.x - rb * .35, p.y - rb * .4, rb * .1, p.x, p.y, rb);
      g.addColorStop(0, '#fff'); g.addColorStop(.25, shade(p.c, f + .08)); g.addColorStop(1, shade(p.c, f * .72));
      ctx.beginPath(); ctx.arc(p.x, p.y, rb * (1 + p.z / RJ * .06), 0, 7); ctx.fillStyle = g; ctx.fill(); });
    // verre avant : reflets et bords
    const gl = ctx.createLinearGradient(cx - RJ, 0, cx + RJ, 0); gl.addColorStop(0, 'rgba(255,255,255,.45)'); gl.addColorStop(.18, 'rgba(255,255,255,.06)'); gl.addColorStop(.7, 'rgba(255,255,255,.02)'); gl.addColorStop(.92, 'rgba(255,255,255,.3)'); gl.addColorStop(1, 'rgba(255,255,255,.1)');
    ctx.fillStyle = gl; ctx.fillRect(cx - RJ, top, RJ * 2, base - top); ctx.beginPath(); ctx.ellipse(cx, base, RJ, ry, 0, 0, Math.PI); ctx.fill();
    const hx = cx - RJ * .62 + Math.sin(rot) * 3; ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.roundRect(hx, top + 26, 7, (base - top) * .62, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(120,145,155,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - RJ, top); ctx.lineTo(cx - RJ, base); ctx.moveTo(cx + RJ, top); ctx.lineTo(cx + RJ, base); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, base, RJ, ry, 0, 0, Math.PI); ctx.stroke(); ell(top, RJ, ry); ctx.stroke();
    // col et couvercle doré
    ell(neckY, RJ * .82, ry * .82); ctx.fillStyle = '#E9E2D6'; ctx.fill();
    const lid = ctx.createLinearGradient(cx - RJ * .82, 0, cx + RJ * .82, 0); lid.addColorStop(0, '#B98F3C'); lid.addColorStop(.35, '#E7CB86'); lid.addColorStop(.6, '#C9A55A'); lid.addColorStop(1, '#9C7426');
    ctx.fillStyle = lid; ctx.fillRect(cx - RJ * .82, neckY - 30, RJ * 1.64, 30); ell(neckY, RJ * .82, ry * .82); ctx.fill(); ell(neckY - 30, RJ * .82, ry * .82); ctx.fillStyle = '#E7CB86'; ctx.fill();
    for (let i = 1; i < 3; i++) { ctx.strokeStyle = 'rgba(120,85,30,.45)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(cx, neckY - i * 10, RJ * .82, ry * .82, 0, 0, Math.PI); ctx.stroke(); }
    requestAnimationFrame(frame); };
  cv.onpointerdown = e => { cv.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, t: performance.now(), v: 0 }; };
  cv.onpointermove = e => { if (!drag) return; const dx = e.clientX - drag.x, now = performance.now(); rot += dx / RJ * .9; drag.v = dx / RJ * .9 / Math.max(8, now - drag.t) * 16; tilt = Math.max(.12, Math.min(.55, tilt + (e.clientY - drag.y) / 600)); drag.x = e.clientX; drag.y = e.clientY; drag.t = now; };
  cv.onpointerup = cv.onpointercancel = () => { if (drag) vel = Math.max(-.3, Math.min(.3, drag.v)); drag = null; };
  const close = () => { alive = false; ov.classList.remove('on'); setTimeout(() => ov.remove(), 300); removeEventListener('keydown', esc1); };
  const esc1 = e => { if (e.key === 'Escape') close(); }; addEventListener('keydown', esc1);
  ov.querySelector('.j3-close').onclick = close; ov.onclick = e => { if (e.target === ov) close(); };
  if (REDUCED) vel = 0; frame();
};
