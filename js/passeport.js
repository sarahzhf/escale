/* Escale : le passeport.
   Un livret qui s'ouvre et se feuillette, une page d'identité (photo, nom, pays tamponnés) et un tampon par pays visité.
   Le tampon tombe en direct (son, secousse, encre) le jour où un voyage commence dans un nouveau pays.
   Les tampons sont dessinés par l'appli : forme, encre et motif propres à chaque pays, sans emblème officiel. */
'use strict';
const PP_COLORS = [['#22283A', '#C9A85C', 'Nuit'], ['#5B2230', '#D4B57A', 'Bordeaux'], ['#2E3B33', '#CBB178', 'Forêt'], ['#1E1D1B', '#BFA46A', 'Noir'], ['#8E9A94', '#F1ECE0', 'Sauge'], ['#B89468', '#FBF5E8', 'Sable']];
const PP_INK = ['#27426E', '#A13A35', '#2F6447', '#5E3F78', '#6E4A2B', '#B04A72', '#2A2A2E', '#1F5F6B'];
const PP_M = {
  tour: '<path d="M50 24l-3 10h6zM47 34l-5 18h16l-5-18M42 52l-6 14M58 52l6 14M44 60h12M40 66h20M46 66q4-8 8 0"/>',
  colisee: '<path d="M26 64V40q24-8 48 0v24M26 48q24-7 48 0M26 56q24-6 48 0"/><path d="M32 64v-6m6 6v-6m6 6v-6m6 6v-6m6 6v-6m6 6v-6m6 6v-6M32 54v-5m6 5v-5m6 5v-5m6 5v-5m6 5v-5m6 5v-5m6 5v-5"/>',
  torii: '<path d="M26 34q24 4 48 0M30 40h40M36 34v32M64 34v32M48 40v-6M52 40v-6M30 66h40"/><circle cx="72" cy="28" r="5"/>',
  arche: '<path d="M30 66V40h40v26M38 66V52q12-16 24 0v14M44 40q6-12 12 0M50 28v4M30 40l-2-4h44l-2 4"/>',
  soleil: '<circle cx="50" cy="46" r="9"/><path d="M50 28v6M50 58v6M32 46h6M62 46h6M37 33l4 4M59 55l4 4M63 33l-4 4M41 55l-4 4"/><path d="M28 68q11-6 22 0t22 0"/>',
  montagne: '<path d="M24 66l16-26 8 10 10-18 18 34z"/><path d="M53 40l5-8 5 9-4-2-3 3zM36 46l4-6 4 5"/>',
  vague: '<path d="M38 42h22l-4 8H42zM49 42V28l8 10h-8"/><path d="M24 56q6-6 13 0t13 0t13 0t13 0M24 64q6-6 13 0t13 0t13 0t13 0"/>',
  palmier: '<path d="M52 66q-4-14 0-28M52 38q-12-6-20 2M52 38q12-6 20 2M52 38q-8-10-18-8M52 38q8-10 18-8"/><path d="M26 66h48M70 66l4-10 4 10"/>',
  temple: '<path d="M28 40l22-12 22 12zM30 40h40M32 44v18M41 44v18M50 44v18M59 44v18M68 44v18M28 64h44M26 68h48"/>',
  pagode: '<path d="M50 24v6M38 34h24l-4-4H42zM40 36v6h20v-6M34 46h32l-5-4H39zM38 48v8h24v-8M30 60h40l-6-4H36zM34 62v6h32v-6"/>',
  animal: '<path d="M30 60V48q0-12 14-12h10q12 0 14 10v16M30 48q-6 4-4 14M68 52q8 0 6 12M40 60v6M58 60v6"/><circle cx="44" cy="44" r="1.2"/>',
  cactus: '<path d="M50 66V32q0-6 4 0v34M54 44h6q3 0 3-4v-6M50 50h-6q-3 0-3-4v-6M30 66h40"/><circle cx="72" cy="32" r="5"/>',
  avion: '<path d="M26 54l48-16-6 8-20 6 4 12-6 2-6-10-10 3-2 6-4 1z"/><path d="M28 66h44" stroke-dasharray="3 3"/>',
  boussole: '<circle cx="50" cy="48" r="16"/><path d="M50 34l4 14-4 14-4-14z"/><path d="M50 28v4M50 64v4M30 48h4M66 48h4"/>',
  phare: '<path d="M44 66l3-30h6l3 30zM45 36h10l-2-6h-6zM50 30v-4M56 32l12-4M56 34l12 4M30 66q20-6 40 0"/>',
  pyramide: '<path d="M22 66l20-30 14 18 8-10 14 22z"/><path d="M42 36l4 30M64 44l-4 22"/><circle cx="70" cy="30" r="5"/>',
  moulin: '<path d="M44 66l2-20h8l2 20zM50 46l-14-14M50 46l14-14M50 46l-14 12M50 46l14 12M28 66h44"/>',
  feuille: '<path d="M50 66V44M50 30l4 8 8-3-3 8 7 4-9 3 2 7-9-4-9 4 2-7-9-3 7-4-3-8 8 3z"/>'
};
const PP_SPECIAL = { FR: 'tour', IT: 'colisee', JP: 'torii', MA: 'arche', ES: 'soleil', NO: 'montagne', CH: 'montagne', AT: 'montagne', NP: 'montagne', PT: 'vague', GR: 'temple', VN: 'pagode', CN: 'pagode', TH: 'pagode', KR: 'pagode', KE: 'animal', TZ: 'animal', ZA: 'animal', IN: 'animal', MX: 'cactus', DZ: 'palmier', TN: 'palmier', EG: 'pyramide', NL: 'moulin', CA: 'feuille', HR: 'phare', IE: 'phare', IS: 'montagne', PE: 'montagne', US: 'avion' };
const PP_GENERIC = ['avion', 'boussole', 'soleil', 'vague', 'palmier', 'montagne', 'phare'];
const ppHash = s => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const ppNorm = s => s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const PP_MOIS = ['JANV.', 'FÉV.', 'MARS', 'AVR.', 'MAI', 'JUIN', 'JUIL.', 'AOÛT', 'SEPT.', 'OCT.', 'NOV.', 'DÉC.'];
const ppDate = d => { const x = D(d); return `${String(x.getDate()).padStart(2, '0')} ${PP_MOIS[x.getMonth()]} ${x.getFullYear()}`; };

let ppUid = 0;
const ppArc = (txt, r, top, fs) => { const id = 'ppa' + (ppUid++), d = top ? `M${50 - r} 50a${r} ${r} 0 0 1 ${2 * r} 0` : `M${50 - r} 50a${r} ${r} 0 0 0 ${2 * r} 0`;
  return `<path id="${id}" d="${d}" stroke="none"/><text font-size="${fs}" letter-spacing="1.6" dominant-baseline="${top ? 'auto' : 'hanging'}"><textPath href="#${id}" startOffset="50%" text-anchor="middle">${txt}</textPath></text>`; };
const ppStar = (x, y) => `<path d="M${x} ${y - 3}l.9 2.1 2.3.2-1.8 1.5.6 2.2-2-1.2-2 1.2.6-2.2-1.8-1.5 2.3-.2z" stroke="none" class="fillink"/>`;
const PP_S = {
  rond: p => `<circle cx="50" cy="50" r="47" stroke-width="2.6"/><circle cx="50" cy="50" r="42.5" stroke-width=".9"/><circle cx="50" cy="50" r="30" stroke-width=".9" stroke-dasharray="1.5 2"/>${ppArc(p.c, 36, true, p.fs)}${ppArc(p.k, 36, false, 5.4)}${ppStar(13, 52)}${ppStar(87, 52)}<g transform="translate(14 12) scale(.72)">${p.m}</g><rect x="22" y="57" width="56" height="10" stroke-width="1.1" fill="#F4F0E4"/><text x="50" y="64.6" font-size="6.2" text-anchor="middle" letter-spacing=".8">${p.d}</text>`,
  ovale: p => `<ellipse cx="50" cy="50" rx="48" ry="36" stroke-width="2.6"/><ellipse cx="50" cy="50" rx="43" ry="31" stroke-width=".9"/><text x="50" y="28" font-size="${p.fs}" text-anchor="middle" letter-spacing="2">${p.c}</text><path d="M26 31h48" stroke-width=".8"/><g transform="translate(23 17) scale(.55)">${p.m}</g><text x="50" y="66" font-size="6.2" text-anchor="middle" letter-spacing=".8">${p.d}</text><text x="50" y="74" font-size="4.6" text-anchor="middle" letter-spacing="1.3">${p.k}</text>`,
  rect: p => `<path d="M10 6h80l4 4v80l-4 4H10l-4-4V10z" stroke-width="2.6"/><rect x="11" y="11" width="78" height="78" stroke-width=".9"/><rect x="11" y="11" width="78" height="15" stroke="none" class="fillink"/><text x="50" y="22" font-size="${p.fs}" text-anchor="middle" letter-spacing="2" class="knock">${p.c}</text><g transform="translate(17 19) scale(.66)">${p.m}</g><path d="M17 72h66" stroke-width=".8"/><text x="50" y="80" font-size="6.2" text-anchor="middle" letter-spacing=".8">${p.d}</text><text x="50" y="87" font-size="4.6" text-anchor="middle" letter-spacing="1.3">${p.k}</text>`,
  tri: p => `<path d="M50 5l46 84H4z" stroke-width="2.6"/><path d="M50 15l37 68H13z" stroke-width=".9"/><g transform="translate(26 30) scale(.48)">${p.m}</g><text x="50" y="72" font-size="${Math.min(p.fs, 7.4)}" text-anchor="middle" letter-spacing="1.4">${p.c}</text><text x="50" y="80" font-size="5" text-anchor="middle" letter-spacing=".8">${p.d}</text>`,
  hex: p => `<path d="M27 6h46l23 44-23 44H27L4 50z" stroke-width="2.6"/><path d="M30 11h40l20 39-20 39H30L10 50z" stroke-width=".9"/><text x="50" y="25" font-size="${p.fs}" text-anchor="middle" letter-spacing="2">${p.c}</text><g transform="translate(20 18) scale(.6)">${p.m}</g><text x="50" y="72" font-size="6.2" text-anchor="middle" letter-spacing=".8">${p.d}</text><text x="50" y="80" font-size="4.6" text-anchor="middle" letter-spacing="1.3">${p.k}</text>`,
  oct: p => `<path d="M31 4h38l27 27v38L69 96H31L4 69V31z" stroke-width="2.6"/><path d="M33 9h34l24 24v34L67 91H33L9 67V33z" stroke-width=".9"/>${ppArc(p.c, 34, true, p.fs)}<g transform="translate(17 15) scale(.66)">${p.m}</g><text x="50" y="74" font-size="6.2" text-anchor="middle" letter-spacing=".8">${p.d}</text><text x="50" y="82" font-size="4.6" text-anchor="middle" letter-spacing="1.3">${p.k}</text>`
};
const PP_SHAPES = Object.keys(PP_S);
function ppStamp(v, n, isNew) {
  const h = ppHash(v.cc), ink = PP_INK[h % PP_INK.length], shape = PP_SHAPES[(h >> 3) % PP_SHAPES.length];
  const name = ppNorm((COUNTRIES[v.cc] || {}).n || v.cc), city = ppNorm(((v.city || '').split(',')[0] || '').trim()).slice(0, 18);
  const p = { c: name, fs: name.length > 12 ? 6 : name.length > 9 ? 7.2 : 8.5, k: city ? `${city} · ARRIVÉE` : 'ARRIVÉE', d: ppDate(v.du), m: PP_M[PP_SPECIAL[v.cc] || PP_GENERIC[h % PP_GENERIC.length]] };
  const rot = [-7, 5, 4, -6, 8, -3, -4, 6][(n * 3 + h) % 8];
  return `<svg class="pp-stamp${isNew ? ' new' : ''}" viewBox="-2 -2 104 104" style="transform:rotate(${rot}deg)" role="img" aria-label="Tampon ${esc((COUNTRIES[v.cc] || {}).n || v.cc)}, ${ppDate(v.du)}"><g filter="url(#ppink)" fill="none" stroke="${ink}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity=".93">${PP_S[shape](p)
    .replace(/<text ([^>]*?)class="knock"/g, '<text fill="#F4F0E4" stroke="none" font-family="Josefin Sans,Inter,sans-serif" font-weight="700" $1')
    .replace(/<text (?!fill)/g, `<text fill="${ink}" stroke="none" font-family="Josefin Sans,Inter,sans-serif" font-weight="700" `).replace(/class="fillink"/g, `fill="${ink}"`)}</g></svg>`;
}

/* les visas : premier passage dans chaque pays, du plus ancien au plus récent (voyages commencés seulement) */
const ppVisas = () => { const seen = new Map(); S.trips.filter(t => t.du <= TODAY).slice().sort((a, b) => a.du.localeCompare(b.du)).forEach(t => { if (!seen.has(t.pays)) seen.set(t.pays, { cc: t.pays, du: t.du, city: t.ville }); }); return [...seen.values()]; };
const ppPrefs = () => (SETTINGS && SETTINGS.passport) || {};
const ppGuil = s => { let w = ''; for (let y = 6; y < 340; y += 7) w += `<path d="M0 ${y} Q 20 ${y - 5 - s} 40 ${y} T 80 ${y} T 120 ${y} T 160 ${y} T 200 ${y} T 240 ${y}"/>`; let r = ''; for (let i = 0; i < 18; i++) r += `<ellipse cx="120" cy="175" rx="95" ry="32" transform="rotate(${i * 10} 120 175)"/>`;
  return `<svg class="pp-guil" viewBox="0 0 240 340" preserveAspectRatio="none" fill="none" aria-hidden="true"><g stroke="#D5CCB2" stroke-width=".35">${w}</g><g stroke="#D9CFB4" stroke-width=".3">${r}</g><circle cx="120" cy="175" r="22" stroke="#D2C7AB" stroke-width=".5"/><text x="120" y="181" text-anchor="middle" font-family="Cormorant Garamond,serif" font-size="16" fill="#E2D9C2">E</text></svg>`; };
const PP_POS = [[5, 14], [50, 18], [7, 50], [49, 54]], PP_PER = 4;

function ppOpen(stampCC) {
  const V = ppVisas(), pref = ppPrefs(), col = PP_COLORS.find(c => c[0] === pref.cover) || PP_COLORS[0];
  const full = (PROFILE && PROFILE.display_name) || S.user || '', [fn, ...rest] = full.split(' '), ln = rest.join(' ');
  const newIdx = stampCC ? V.findIndex(v => v.cc === stampCC) : -1;
  let shown = newIdx >= 0 ? newIdx : V.length;      // le tampon nouveau n'est pas encore posé
  const visaPages = Math.max(6, Math.ceil((V.length + 1) / PP_PER) + (Math.ceil((V.length + 1) / PP_PER) % 2));
  const NL = 2 + visaPages / 2;                       // couverture, identité + visa 0, puis 2 visas par feuille, dernière page
  const ov = document.createElement('div'); ov.className = 'pp-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Mon passeport');
  ov.style.setProperty('--cover', col[0]); ov.style.setProperty('--foil', col[1]);
  const mrzOf = () => { const c = s => ppNorm(s || 'X').replace(/[^A-Z]/g, ''), pad = (s, n) => (s + '<'.repeat(n)).slice(0, n); return pad(`P<ESC${c(ln || fn)}<<${c(fn)}`, 32) + '\n' + pad(`ESC${(ME && ME.id || '').replace(/[^0-9]/g, '').slice(0, 7)}<<${V.length}PAYS`, 32); };
  const identity = () => `${ppGuil(1)}<div class="pp-ph pp-id"><h2>Escale</h2><div class="pp-hd"><span>Passeport</span><span>N° ESC-${String(V.length).padStart(3, '0')}</span></div>
    <div class="pp-grid"><div class="pp-photo">${pref.photo ? IMG(pref.photo, 'Ta photo') : '<svg viewBox="0 0 30 40" aria-hidden="true"><circle cx="15" cy="15" r="7" fill="#B9B09D"/><path d="M3 40q2-14 12-14t12 14z" fill="#B9B09D"/></svg>'}</div>
    <dl><div><dt>Nom</dt><dd>${esc(ln || '·')}</dd></div><div><dt>Prénom</dt><dd>${esc(fn || '·')}</dd></div><div><dt>Port d'attache</dt><dd>${esc((SETTINGS && SETTINGS.home && (SETTINGS.home.city || SETTINGS.home.n)) || 'Paris')}</dd></div><div><dt>Pays tamponnés</dt><dd>${V.length} / 207</dd></div><div><dt>Premier voyage</dt><dd>${V[0] ? ppDate(V[0].du) : '·'}</dd></div></dl></div>
    <div class="pp-sign">${esc(fn)} ${ln ? esc(ln[0]) + '.' : ''}</div><div class="pp-holo"></div><div class="pp-mrz">${esc(mrzOf())}</div></div><div class="pp-no">1</div>`;
  const visa = k => { let h = `${ppGuil(k % 3)}<div class="pp-ph"><h2>Visas</h2><div class="pp-hd"><span>Entrées</span><span>Arrivées</span></div></div>`;
    V.forEach((v, n) => { if (n >= shown) return; if (Math.floor(n / PP_PER) !== k) return; const [x, y] = PP_POS[n % PP_PER];
      h += `<div class="pp-slot" style="left:${x}%;top:${y}%">${ppStamp(v, n, n === justNew)}</div>`; });
    return h + `<div class="pp-no">${k + 2}</div>`; };
  let justNew = -1;
  const face = (i, side) => {
    if (i === 0 && side === 0) return `<div class="pp-cover"><div class="pp-rep pp-foil">Escale<br>République des voyageurs</div><h1 class="pp-foil">Passeport</h1><div class="pp-sub pp-foil">Carnet de voyage</div><svg class="pp-foil" viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="60" cy="60" r="54"/><circle cx="60" cy="60" r="48" stroke-dasharray="1 3"/><circle cx="60" cy="60" r="28"/><ellipse cx="60" cy="60" rx="12" ry="28"/><path d="M32 60h56M36 46h48M36 74h48"/><path d="M60 4l4 10h-8zM60 116l4-10h-8zM4 60l10 4v-8zM116 60l-10 4v-8z" fill="currentColor"/></svg><div class="pp-sub pp-foil">Titulaire</div><div class="pp-who pp-foil">${esc(full.toUpperCase())}</div><div class="pp-bio"></div></div>`;
    if (i === 0) return `${ppGuil(2)}<div class="pp-ph pp-inside"><p>Chaque tampon est un pays foulé, chaque page une histoire à raconter.</p><div class="pp-sig">bon voyage</div></div>`;
    if (i === 1 && side === 0) return identity();
    const k = side === 1 ? (i - 1) * 2 : (i - 1) * 2 - 1;
    return k >= visaPages ? `${ppGuil(0)}<div class="pp-ph pp-inside"><p>Il reste tant de pays à tamponner.</p></div>` : visa(k);
  };
  ov.innerHTML = `<div class="pp-top"><button class="pp-x" aria-label="Fermer">${SV.x}</button><button class="pp-perso">Personnaliser</button></div>
    <div class="pp-stage"><div class="pp-book"><div class="pp-back"></div>${Array.from({ length: NL }, () => '<div class="pp-leaf"><div class="pp-face f"></div><div class="pp-face b"></div><div class="pp-shade"></div></div>').join('')}</div></div>
    <div class="pp-nav"><button class="pp-b" data-d="-1" aria-label="Page précédente">‹</button><span class="pp-pg">Touche la couverture</span><button class="pp-b" data-d="1" aria-label="Page suivante">›</button></div>`;
  document.body.appendChild(ov);
  const book = ov.querySelector('.pp-book'), L = [...ov.querySelectorAll('.pp-leaf')];
  const paint = () => L.forEach((l, i) => { l.children[0].innerHTML = face(i, 0); l.children[1].innerHTML = face(i, 1); });
  const size = () => ov.style.setProperty('--w', Math.min(300, (Math.min(820, innerWidth) - 32) / 2, (innerHeight - 170) * 88 / 125 / (innerWidth < 640 ? 1 : 1)) + 'px');
  size(); addEventListener('resize', size); paint();
  let at = 0;
  const setZ = () => L.forEach((l, i) => l.style.zIndex = i < at ? i + 1 : NL - i + 10);
  const lbl = () => at === 0 ? 'Couverture' : at === 1 ? 'Identité' : at >= NL ? 'Fin' : `Visas ${(at - 2) * 2 + 1} et ${(at - 2) * 2 + 2}`;
  const go = n => new Promise(res => { n = Math.max(0, Math.min(NL, n)); if (n === at) return res(); const dir = n > at ? 1 : -1, l = L[dir > 0 ? at : at - 1];
    l.classList.add('turning'); at += dir; l.classList.toggle('flip', dir > 0); book.classList.toggle('open', at > 0 && at < NL); setTimeout(setZ, dir > 0 ? 0 : 550); ov.querySelector('.pp-pg').textContent = lbl();
    setTimeout(() => { l.classList.remove('turning'); n !== at ? go(n).then(res) : res(); }, 650); });
  setZ();
  L[0].children[0].addEventListener('click', () => { if (at === 0) go(1); });
  ov.querySelectorAll('.pp-b').forEach(b => b.onclick = () => go(at + +b.dataset.d));
  const close = () => { removeEventListener('resize', size); removeEventListener('keydown', key); ov.classList.add('out'); setTimeout(() => ov.remove(), 300); };
  const key = e => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') go(at + 1); if (e.key === 'ArrowLeft') go(at - 1); };
  addEventListener('keydown', key);
  ov.querySelector('.pp-x').onclick = close;
  ov.querySelector('.pp-perso').onclick = () => ppCustom(() => { close(); setTimeout(() => ppOpen(), 320); });
  requestAnimationFrame(() => ov.classList.add('in'));

  if (newIdx >= 0) setTimeout(async () => {      // le coup de tampon
    const k = Math.floor(newIdx / PP_PER), target = k % 2 === 0 ? k / 2 + 2 : (k + 1) / 2 + 1;
    await go(1); await new Promise(r => setTimeout(r, 500)); await go(target);
    const fc = k % 2 === 0 ? L[k / 2 + 1].children[1] : L[(k + 1) / 2 + 1].children[0];
    const fr = fc.getBoundingClientRect(), br = book.getBoundingClientRect(), sx = br.width / book.offsetWidth, [x, y] = PP_POS[newIdx % PP_PER];
    const rub = document.createElement('div'); rub.className = 'pp-rub'; rub.innerHTML = `<div class="sh"></div><svg class="body" viewBox="0 0 84 120" aria-hidden="true"><defs><linearGradient id="ppwd" x1="0" x2="1"><stop offset="0" stop-color="#8E5E33"/><stop offset=".45" stop-color="#D2A06B"/><stop offset="1" stop-color="#7E5029"/></linearGradient></defs><ellipse cx="42" cy="16" rx="17" ry="15" fill="url(#ppwd)"/><path d="M34 28h16l3 40H31z" fill="url(#ppwd)"/><rect x="6" y="66" width="72" height="36" rx="4" fill="url(#ppwd)"/><rect x="6" y="66" width="72" height="5" fill="rgba(255,255,255,.2)"/><rect x="4" y="100" width="76" height="12" rx="2" fill="#2E2622"/></svg>`;
    book.appendChild(rub); const w = Math.max(56, fr.width / sx * .3); rub.style.width = w + 'px';
    rub.style.left = ((fr.left - br.left) / sx + fr.width / sx * (x / 100 + .22) - w / 2) + 'px'; rub.style.top = ((fr.top - br.top) / sx + fr.height / sx * (y / 100) + fr.width / sx * .22 - w * 1.33) + 'px';
    requestAnimationFrame(() => rub.classList.add('go'));
    setTimeout(() => { shown = V.length; justNew = newIdx; paint(); justNew = -1; ppThump(); book.classList.add('thud'); try { navigator.vibrate && navigator.vibrate(35); } catch (_) { }
      toast(`Nouveau tampon : ${(COUNTRIES[stampCC] || {}).n || stampCC}`); }, 530);
    setTimeout(() => rub.remove(), 1300);
  }, 450);
}
let ppAc; function ppThump() { try { ppAc = ppAc || new (window.AudioContext || window.webkitAudioContext)(); const t = ppAc.currentTime, o = ppAc.createOscillator(), g = ppAc.createGain();
  o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(40, t + .14); g.gain.setValueAtTime(.6, t); g.gain.exponentialRampToValueAtTime(.001, t + .18); o.connect(g).connect(ppAc.destination); o.start(t); o.stop(t + .2);
  const b = ppAc.createBuffer(1, ppAc.sampleRate * .05, ppAc.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = ppAc.createBufferSource(), g2 = ppAc.createGain(); g2.gain.value = .25; s.buffer = b; s.connect(g2).connect(ppAc.destination); s.start(t); } catch (_) { } }

/* personnaliser : couleur de couverture et photo d'identité */
function ppCustom(done) { const pref = { ...ppPrefs() };
  openPanel(`<h2>Mon passeport</h2><p class="small">Choisis la couleur de ta couverture et ta photo d'identité.</p>
    <div class="pp-sws" role="group" aria-label="Couleur">${PP_COLORS.map(([c, , n]) => `<button type="button" class="pp-sw ${(pref.cover || PP_COLORS[0][0]) === c ? 'on' : ''}" style="background:${c}" data-c="${c}" aria-label="${n}"></button>`).join('')}</div>
    <button class="btn full" id="pp-pic" style="margin-top:14px">${pref.photo ? 'Changer ma photo' : 'Ajouter ma photo'}<i>${SV.cam || SV.arrow}</i></button>
    <button class="btn full" id="pp-ok" style="margin-top:10px">Enregistrer<i>${SV.check}</i></button>${CLOSE()}`, p => {
    p.querySelectorAll('.pp-sw').forEach(b => b.onclick = () => { pref.cover = b.dataset.c; p.querySelectorAll('.pp-sw').forEach(x => x.classList.toggle('on', x === b)); });
    p.querySelector('#pp-pic').onclick = () => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = async () => { const f = i.files && i.files[0]; if (!f) return; toast('Envoi de la photo…');
      try { pref.photo = await uploadPhoto(f, 'avatar', { max: 600 }); p.querySelector('#pp-pic').firstChild.textContent = 'Photo ajoutée '; toast('Photo prête, enregistre'); } catch (e) { toast(errMsg(e)); } }; i.click(); };
    p.querySelector('#pp-ok').onclick = async () => { const { error } = await sb.from('account_settings').update({ passport: pref }).eq('user_id', ME.id); if (error) { toast('Non enregistré, réessaie'); return; }
      if (SETTINGS) SETTINGS.passport = pref; closePanel(); toast('Passeport mis à jour'); done && done(); };
  }); }

ACT.passport = () => ppOpen();

/* le coup de tampon automatique : le jour où un voyage commence dans un nouveau pays */
const ppSeenKey = () => ME ? 'escale:pp:' + ME.id : null;
function ppCheckNew() { try { const k = ppSeenKey(); if (!k || document.querySelector('.pp-ov')) return; const V = ppVisas().map(v => v.cc), raw = localStorage.getItem(k);
  if (raw === null) { localStorage.setItem(k, JSON.stringify(V)); return; }      // première fois : on mémorise sans tamponner
  const seen = new Set(JSON.parse(raw)), nw = V.find(c => !seen.has(c)); if (!nw) return; seen.add(nw); localStorage.setItem(k, JSON.stringify([...seen])); setTimeout(() => ppOpen(nw), 900); } catch (_) { } }
{ const rh = SCREENS.home; SCREENS.home = (...a) => { const r = rh(...a); ppCheckNew(); try { const sh = document.querySelector('#s-home .hsheet'); } catch (_) { } return r; }; }

/* l'entrée : en haut de l'écran En chiffres */
{ const rm = SCREENS.monde; SCREENS.monde = (...a) => { const r = rm(...a); const sc = $('s-monde'), n = ppVisas().length;
  if (sc && !sc.querySelector('.pp-entry')) { const h = sc.querySelector('.sec'); const html = `<button class="pp-entry" data-act="passport"><span class="pp-mini" style="--cover:${(PP_COLORS.find(c => c[0] === ppPrefs().cover) || PP_COLORS[0])[0]}"></span><span><b>Mon passeport</b><em>${n} tampon${n > 1 ? 's' : ''} · ouvre-le et feuillette</em></span>${SV.arrow}</button>`; h ? h.insertAdjacentHTML('beforebegin', html) : sc.insertAdjacentHTML('afterbegin', html); }
  return r; }; }
document.body.insertAdjacentHTML('beforeend', `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="ppink" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="3" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.5 1.55" result="m"/><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="8" result="big"/><feColorMatrix in="big" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1 1.5" result="bm"/><feComposite in="m" in2="bm" operator="in" result="mask"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" result="d"/><feComposite in="d" in2="mask" operator="in"/></filter></svg>`);
