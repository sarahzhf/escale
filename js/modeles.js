/* Eskalys : modèles de pages pour le carnet.
   Un modèle pose sur la double page un papier, une typographie, des emplacements photo vides,
   du masking tape, des stickers et des textes à remplir. On touche un emplacement pour y mettre sa photo.
   Tout reste déplaçable, agrandissable et supprimable comme le reste du carnet.
   Coordonnées : chaque page fait 300 x 417 ; les éléments sont posés par leur centre (les textes par leur coin). */
'use strict';
(() => {
  const W = { jaune: '#F3C979', rose: '#E8A9B8', sauge: '#A9C4AF', bleu: '#9EC3E6', lilas: '#C9B6E4', peche: '#F2A68B' };
  const r1 = n => Math.round(n * 10) / 10;
  const X = (sd, x) => r1(((sd === 'r' ? 300 : 0) + x) / 600 * 100), Y = y => r1(y / 417 * 100);
  const STW = n => { const f = n.split('-')[0]; return { cire: 92, empreinte: 100, baiser: 100, erable: 120, pomme: 84, dentelle: 230, nd2: 104 }[f] || 118; };
  const ph = (sd, x, y, w, ar = 'carre', fr = 'blanc', r = 0) => ({ k: 'f', p: '', x: X(sd, x), y: Y(y), s: r1(w / (FP_ORN && FP_ORN[fr] ? 150 : 118)), r, fr, ar, cx: 50, cy: 50, cz: 1, tpl: 1 });
  const st = (sd, x, y, v, w, r = 0) => ({ k: 'd', v, x: X(sd, x), y: Y(y), s: r1(w / STW(v)), r, tpl: 1 });
  const dd = (sd, x, y, v, size, c, r = 0) => ({ k: 'd', v, c, x: X(sd, x), y: Y(y), s: r1(size / 58), r, tpl: 1 });
  const tp = (sd, x, y, c, w = 60, r = 0) => ({ k: 'w', c, x: X(sd, x), y: Y(y), s: r1(w / 100), r, tpl: 1 });
  const lt = (sd, x, y, v, f, c, r = 0, s = 1) => ({ k: 't', v, f, c, x: X(sd, x), y: Y(y), s, r, tpl: 1 });
  const tx = (sd, x, y, v, ph_, f, c, size = 17, w = 30, r = 0) => ({ k: 'x', v, ph: ph_, f, c, x: X(sd, x), y: Y(y), s: r1(size / 17), r, w, tpl: 1 });

  const MODELES = [
    { k: 'moodboard', n: 'Mood board', pro: 0, paper: 'blanc', font: 'carnet', pal: ['#E8A9B8', '#20243A', '#FBF6EA'], el: () => [
      tx('l', 52, 40, 'Mood board', 'Ton titre', 'carnet', '#20243A', 32, 18), dd('l', 34, 58, 'sparkles', 22, '#C26B7A'), dd('l', 268, 58, 'sparkles', 22, '#C26B7A'),
      ...[[55, 128], [150, 128], [245, 128], [55, 222], [150, 222], [245, 222], [55, 316], [150, 316], [245, 316]].map(([x, y]) => ph('l', x, y, 84, 'carre', 'arrondi')),
      dd('l', 150, 394, 'hearts', 28, '#C26B7A'), tp('l', 245, 84, W.rose, 46, 8),
      ph('r', 58, 290, 82, 'portrait', 'arrondi'), ph('r', 150, 276, 82, 'carre', 'arrondi'), ph('r', 242, 290, 82, 'portrait', 'arrondi'),
      ph('r', 150, 368, 82, 'carre', 'arrondi'), dd('r', 50, 388, 'heartf', 24, '#E8A9B8', -10), dd('r', 252, 390, 'stars', 26, '#20243A')] },
    { k: 'sauge', n: 'Sauge et crème', pro: 0, paper: 'quadrille', font: 'carnet', pal: ['#AFC3AC', '#3f5240', '#F3EBDD'], el: () => [
      tx('l', 26, 46, 'Escapade', 'Ton titre', 'carnet', '#3f5240', 36, 16),
      tp('l', 80, 112, W.sauge, 56, -4), ph('l', 80, 186, 108, 'portrait', 'arche'),
      tp('l', 214, 106, W.jaune, 46, 6), ph('l', 214, 152, 78, 'carre', 'polaroid', 5),
      ph('l', 222, 262, 72, 'carre', 'polaroid', -4), ph('l', 88, 312, 80, 'carre', 'blanc', -3),
      lt('l', 210, 340, 'souvenirs', 'label', '#2E5E3E', -3),
      dd('l', 36, 392, 'leaf', 32, '#6f8a6c', -12), dd('l', 160, 394, 'heart', 24, '#B8452C', 8), dd('l', 268, 390, 'sparkles', 26, '#B07A2A'),
      tp('r', 62, 250, W.sauge, 46, -6), ph('r', 62, 304, 82, 'carre', 'polaroid', -5),
      ph('r', 150, 296, 76, 'portrait', 'blanc'), tp('r', 238, 250, W.jaune, 46, 6), ph('r', 238, 304, 82, 'carre', 'polaroid', 5),
      dd('r', 150, 398, 'stars', 26, '#6f8a6c'), dd('r', 40, 396, 'hearts', 22, '#E8A9B8')] },
    { k: 'bleu', n: 'Bleu Méditerranée', pro: 0, paper: 'blanc', font: 'machine', pal: ['#A9C2DA', '#3C6E8F', '#FBF6EA'], el: () => [
      lt('l', 150, 62, 'VOYAGE', 'tile', '#20243A'),
      tp('l', 150, 98, W.bleu, 64, -2), ph('l', 150, 160, 196, 'paysage', 'blanc', 1),
      ph('l', 58, 288, 76, 'carre', 'blanc', -4), ph('l', 150, 296, 76, 'carre', 'blanc', 2), ph('l', 242, 288, 76, 'carre', 'blanc', 4),
      lt('l', 150, 372, 'été', 'label', '#3C6E8F', -2), dd('l', 40, 392, 'stars', 26, '#3C6E8F'), dd('l', 262, 392, 'sparkles', 26, '#E3A51A'),
      ph('r', 64, 300, 86, 'carre', 'rond'), tp('r', 160, 240, W.sauge, 46, 5), ph('r', 160, 290, 80, 'portrait', 'polaroid', 4),
      ph('r', 248, 322, 66, 'carre', 'blanc', -4), dd('r', 268, 396, 'star', 24, '#3C6E8F'), dd('r', 40, 396, 'heart', 22, '#3C6E8F')] },
    { k: 'ete', n: 'Été pastel', pro: 0, paper: 'blanc', font: 'carnet', pal: ['#A9C2DA', '#F3C979', '#A9C4AF'], el: () => [
      tx('l', 74, 44, 'Summer', 'Ton titre', 'carnet', '#2f4a66', 38, 16),
      tp('l', 150, 116, W.jaune, 62, -3), ph('l', 150, 190, 190, 'paysage', 'blanc', -1),
      ph('l', 64, 330, 78, 'carre', 'rond'), ph('l', 158, 334, 74, 'carre', 'polaroid', -4), ph('l', 246, 326, 74, 'carre', 'polaroid', 5),
      dd('l', 40, 96, 'sparkles', 26, '#E3A51A'), dd('l', 262, 92, 'heartf', 22, '#E8A9B8', 10),
      tp('r', 62, 246, W.sauge, 46, -5), ph('r', 62, 304, 80, 'portrait', 'polaroid', -5),
      tp('r', 150, 236, W.bleu, 46, 3), ph('r', 150, 292, 80, 'portrait', 'polaroid', 2),
      tp('r', 238, 246, W.jaune, 46, 5), ph('r', 238, 304, 80, 'portrait', 'polaroid', 5), dd('r', 150, 402, 'stars', 24, '#9EC3E6')] },
    { k: 'raisons', n: 'Raisons de repartir', pro: 1, paper: 'blanc', font: 'oldmoney', pal: ['#E8A9B8', '#C26B7A', '#ffffff'], el: () => [
      tx('l', 24, 40, 'Quatre raisons', 'Ton titre', 'oldmoney', '#2a2320', 28, 20), tx('l', 60, 78, '… de repartir', '', 'romantique', '#C26B7A', 22, 26),
      ...[0, 1, 2, 3].flatMap(i => { const y = 150 + i * 66; return [tx('l', 20, y - 26, String(i + 1), '', 'oldmoney', '#E8A9B8', 38, 3), tx('l', 62, y - 16, '', 'ta raison…', 'carnet', '#5a4a52', 15, 20), ph('l', i % 2 ? 216 : 248, y, 62, 'carre', 'polaroid', i % 2 ? -6 : 6)]; }),
      st('l', 34, 400, 'fl-fleur-rose', 44, -10), st('l', 150, 402, 'fl-pivoine-rose', 46), st('l', 270, 404, 'fl-cerisier', 46, 14),
      st('r', 268, 236, 'nd2-vichy-rose', 52, 12),
      ph('r', 58, 272, 80, 'carre', 'arrondi'), ph('r', 150, 262, 80, 'portrait', 'arrondi'), ph('r', 242, 276, 72, 'carre', 'arrondi'),
      ph('r', 96, 362, 116, 'paysage', 'arrondi'), ph('r', 236, 360, 70, 'carre', 'arrondi'), st('r', 30, 404, 'fl-hibiscus-rouge', 46, -8)] },
    { k: 'rose', n: 'Rose poudré', pro: 1, paper: 'rose', font: 'romantique', pal: ['#E9BCC3', '#b05a6a', '#F8E7E5'], el: () => [
      tx('l', 62, 42, 'Douceur', 'Ton titre', 'romantique', '#b05a6a', 38, 16),
      st('l', 92, 118, 'nd-satin-rose', 58), ph('l', 92, 204, 128, 'o', 'coeur-rose'),
      ph('l', 232, 150, 70, 'carre', 'polaroid', 6), ph('l', 228, 268, 70, 'carre', 'polaroid', -5),
      st('l', 46, 352, 'fl-cerisier', 66, -10), st('l', 150, 372, 'fl-pivoine-poudre', 58, 6), st('l', 258, 370, 'baiser-framboise', 44, -12),
      tp('r', 58, 246, W.rose, 44, -6), ph('r', 58, 296, 76, 'carre', 'arrondi', -3), tp('r', 150, 240, W.lilas, 44, 3), ph('r', 150, 290, 76, 'carre', 'arrondi'),
      tp('r', 242, 246, W.rose, 44, 6), ph('r', 242, 296, 76, 'carre', 'arrondi', 3), st('r', 150, 388, 'cire-rose-cygne', 48), st('r', 50, 392, 'fl-gypsophile', 44), st('r', 254, 392, 'dentelle-rose-eventail', 80)] },
    { k: 'bordeaux', n: 'Bordeaux et or', pro: 1, paper: 'blanc', font: 'oldmoney', pal: ['#6E1F2A', '#C9A15A', '#ffffff'], el: () => [
      ph('l', 104, 168, 168, 'o', 'bordeaux'), ph('l', 246, 128, 72, 'o', 'or-ovale', 4), ph('l', 246, 236, 72, 'o', 'or-rond', -4),
      tx('l', 30, 296, 'Souvenirs', 'Ton titre', 'oldmoney', '#6E1F2A', 36, 18),
      tx('l', 36, 344, '', 'ton sous-titre ici', 'oldmoney', '#9a7a3a', 16, 30),
      st('l', 262, 384, 'cire-bordeaux-rose', 44), st('l', 40, 392, 'nd2-bourgogne', 44, -10),
      ph('r', 62, 300, 86, 'o', 'or-cadre', -3), ph('r', 152, 296, 82, 'o', 'argent', 2), ph('r', 242, 300, 84, 'o', 'coeur-or', 3),
      st('r', 150, 396, 'dentelle-bordeaux-ornement', 120), st('r', 266, 390, 'fl-lys-bordeaux', 42, 10)] },
    { k: 'terracotta', n: 'Terracotta', pro: 1, paper: 'kraft', font: 'carnet', pal: ['#CDAF86', '#B8452C', '#7a3a1f'], el: () => [
      tx('l', 26, 46, 'Évasion', 'Ton titre', 'carnet', '#7a3a1f', 36, 16),
      ph('l', 72, 180, 108, 'portrait', 'arche'), tp('l', 206, 104, W.peche, 46, 6), ph('l', 206, 150, 78, 'carre', 'polaroid', 5),
      ph('l', 208, 262, 76, 'carre', 'festonne', -3), st('l', 96, 296, 'nd2-vichy-terracotta', 54, -6),
      dd('l', 40, 384, 'sun', 30, '#B8452C'), st('l', 150, 388, 'empreinte-terracotta', 44, -10), dd('l', 258, 386, 'palm', 32, '#2E5E3E'),
      ph('r', 58, 296, 78, 'carre', 'festonne', -3), ph('r', 150, 290, 78, 'carre', 'festonne', 2), ph('r', 242, 296, 78, 'carre', 'festonne', 3),
      lt('r', 58, 370, 'À voir', 'label', '#B8452C', -2), lt('r', 150, 370, 'À goûter', 'label', '#B07A2A', 1), lt('r', 242, 370, 'À refaire', 'label', '#2E5E3E', 2)] },
    { k: 'lilas', n: 'Lilas', pro: 1, paper: 'quadrille', font: 'calligraphie', pal: ['#CDBDE3', '#4e3f68', '#C9B6E4'], el: () => [
      lt('l', 76, 66, 'CITY', 'bead', '#4e3f68', -3), tx('l', 140, 46, 'break', 'Ton titre', 'romantique', '#6a5590', 32, 14),
      tp('l', 86, 112, W.lilas, 52, -4), ph('l', 86, 196, 116, 'portrait', 'blanc', -2),
      ph('l', 226, 160, 72, 'carre', 'polaroid', 6), ph('l', 226, 276, 72, 'carre', 'polaroid', -4),
      st('l', 90, 312, 'nd2-vichy-lilas', 56, -8), dd('l', 40, 392, 'butterfly', 30, '#8a73b8'), st('l', 150, 396, 'fl-gypsophile', 44), st('l', 262, 390, 'fl-lys-rose', 46, 10),
      ph('r', 58, 300, 78, 'carre', 'rond'), ph('r', 150, 296, 76, 'portrait', 'arche'), ph('r', 242, 300, 78, 'carre', 'rond'),
      dd('r', 150, 400, 'sparkles', 24, '#b8a6d3'), dd('r', 40, 398, 'heart', 22, '#C26B7A')] },
    { k: 'nuit', n: 'Noir et or', pro: 1, paper: 'blanc', font: 'magazine', pal: ['#2C2B2E', '#C9A15A', '#ffffff'], el: () => [
      tx('l', 26, 46, 'La nuit', 'Ton titre', 'magazine', '#20243A', 36, 16), dd('l', 268, 62, 'stars', 26, '#B07A2A'),
      ph('l', 150, 180, 206, 'paysage', 'blanc'), ph('l', 82, 318, 112, 'paysage', 'film'), ph('l', 218, 318, 112, 'paysage', 'film'),
      dd('l', 150, 398, 'moon', 24, '#B07A2A'),
      ph('r', 72, 304, 96, 'o', 'or-cadre'), ph('r', 182, 280, 70, 'carre', 'blanc', 4), ph('r', 252, 336, 62, 'carre', 'blanc', -4),
      st('r', 170, 372, 'cire-or-lune', 46), dd('r', 262, 400, 'sparkles', 22, '#B07A2A')] },
    { k: 'vintage', n: 'Vintage', pro: 1, paper: 'kraft', font: 'machine', pal: ['#CDAF86', '#3a2c1c', '#EFE4D0'], el: () => [
      lt('l', 150, 62, 'CARNET DE ROUTE', 'label', '#20243A'),
      ph('l', 80, 152, 94, 'portrait', 'timbre', -4), ph('l', 220, 156, 94, 'portrait', 'timbre', 3),
      st('l', 150, 232, 'cire-creme-noeud', 46), tp('l', 150, 262, W.jaune, 60, -2), ph('l', 150, 326, 200, 'paysage', 'blanc', 1),
      tp('r', 62, 246, W.peche, 46, -5), ph('r', 62, 304, 84, 'portrait', 'polaroid', -3),
      ph('r', 160, 292, 72, 'carre', 'timbre', 4), ph('r', 246, 314, 72, 'carre', 'timbre', -4),
      st('r', 176, 384, 'empreinte-prune', 44, -10), st('r', 64, 396, 'dentelle-creme-guipure', 100), dd('r', 266, 400, 'envelope', 24, '#6b5638', -6)] },
    { k: 'automne', n: 'Automne', pro: 1, paper: 'ligne', font: 'carnet', pal: ['#6E1F2A', '#B07A2A', '#F3C979'], el: () => [
      tx('l', 26, 46, 'Saison', 'Ton titre', 'carnet', '#6b3a1c', 36, 14), st('l', 258, 64, 'erable-rousse', 60, 18),
      ph('l', 84, 196, 112, 'portrait', 'festonne', -2), tp('l', 222, 112, W.jaune, 44, 6), ph('l', 222, 158, 72, 'carre', 'polaroid', 5),
      ph('l', 224, 272, 72, 'carre', 'polaroid', -4), st('l', 140, 318, 'pomme-pin-espresso', 36, -10),
      st('l', 36, 380, 'erable-ambre', 44, -20), st('l', 140, 392, 'nd-satin-chocolat', 58), st('l', 256, 384, 'erable-terracotta', 44, 20),
      tp('r', 58, 246, W.peche, 44, -4), ph('r', 58, 304, 78, 'portrait', 'blanc', -3), tp('r', 150, 240, W.jaune, 44, 2), ph('r', 150, 298, 78, 'portrait', 'blanc'),
      tp('r', 242, 246, W.peche, 44, 4), ph('r', 242, 304, 78, 'portrait', 'blanc', 3), st('r', 150, 404, 'nd2-moutarde', 50)] },
  ];
  window.MODELES = MODELES;
  if (window.FP_FRAMES) { FP_FRAMES.arche = 'Arche'; FP_FRAMES.festonne = 'Festonné'; }

  /* ---------- emplacements photo vides ---------- */
  const CAM = '<svg viewBox="0 0 24 20" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="1" y="4" width="22" height="15" rx="3"/><circle cx="12" cy="11.5" r="4.3"/><path d="M8 4l1.6-3h4.8L16 4"/></svg>';
  const AR = { carre: '1 / 1', portrait: '3 / 4', paysage: '4 / 3', large: '16 / 9', story: '9 / 16' };
  { const f0 = window.freePhotoHTML; window.freePhotoHTML = s => {
    if (s.p) return f0(s);
    if (window.FP_ORN && FP_ORN[s.fr]) { const [, [Wd, Hd], [l, t, w, h]] = FP_ORN[s.fr], u = `icons/cadres/${s.fr}`;
      return `<figure class="fp fr-orn fp-slot" style="aspect-ratio:${Wd} / ${Hd}"><span class="fpc" style="left:${l}%;top:${t}%;width:${w}%;height:${h}%;-webkit-mask-image:url(${u}-m.png);mask-image:url(${u}-m.png)"><i class="fps">${CAM}<em>Ta photo</em></i></span><img class="orn" src="${u}.webp" alt="" draggable="false" decoding="async"></figure>`; }
    const fr = (window.FP_FRAMES && FP_FRAMES[s.fr]) ? s.fr : 'blanc', ar = fr === 'rond' ? '1 / 1' : AR[s.ar] || '1 / 1';
    return `<figure class="fp fr-${fr} fp-slot"><span class="fpc" style="aspect-ratio:${ar}"><i class="fps">${CAM}<em>Ta photo</em></i></span></figure>`; }; }
  // hors modification, un emplacement vide ne s'affiche pas (le carnet fini ne montre jamais de trou)
  { const s0 = stickerHTML; stickerHTML = (s, i, edit) => (s && s.k === 'f' && !s.p && !edit) ? '' : s0(s, i, edit); }

  // toucher un emplacement vide (sans le déplacer) ouvre le choix de la photo
  let down = null;
  document.addEventListener('pointerdown', e => { const st_ = e.target.closest && e.target.closest('#bkStk .stk'); down = st_ && st_.querySelector('.fp-slot') && BK && BK.edit ? { x: e.clientX, y: e.clientY, t: Date.now(), i: +st_.dataset.si } : null; }, true);
  document.addEventListener('pointerup', e => { const d = down; down = null; if (!d || !BK || !BK.edit) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8 || Date.now() - d.t > 600) return;
    const t = bookTrip(), en = curEntry(), s = en && en.st[d.i]; if (!t || !s || s.k !== 'f' || s.p) return;
    if (en.photos.filter(Boolean).length >= 12) { toast('12 photos maximum par page'); return; }
    pickPhoto(`fs|${t.id}|${en.id}|${d.i}`); }, true);
  { const on0 = onPhoto; onPhoto = async (target, path) => {
    if (!String(target).startsWith('fs|')) return on0(target, path);
    const [, tid, eid, i] = target.split('|'), t = trip(tid), en = t && t.entrees.find(x => x.id === eid), s = en && en.st[+i]; if (!s) return;
    s.p = path; en.photos = en.photos.filter(Boolean); if (!en.photos.includes(path)) en.photos.push(path);
    save(); if (BK) bkRender(); toast('Photo posée'); }; }

  /* ---------- le bouton « Modèles » et le choix ---------- */
  { const b0 = bkBar; bkBar = () => { b0(); const bar = document.querySelector('#bkBot .bk-tools.wide'); if (!bar || bar.querySelector('[data-act="bkModeles"]')) return;
    const ok = bar.querySelector('[data-act="bkEdit"]'); ok.insertAdjacentHTML('beforebegin', `<button data-act="bkModeles"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="4" width="8" height="16" rx="1.5"/><rect x="13" y="4" width="8" height="7" rx="1.5"/><rect x="13" y="13" width="8" height="7" rx="1.5"/></svg><span>Modèles</span></button>`); }; }
  const proLock = () => typeof PRO !== 'undefined' && PRO.lock && !PRO.has();
  ACT.bkModeles = () => { const en = curEntry(); if (!en) { toast('Ouvre une page de journée pour choisir un modèle'); return; }
    openPanel(`<h2>Modèles</h2><p class="small">La page arrive décorée. Touche ensuite chaque emplacement pour y mettre ta photo. Tes photos déjà posées prennent place toutes seules, et ton texte est gardé.</p>
      <div class="mdl-grid">${MODELES.map(m => `<button class="mdl" data-mdl="${m.k}"><img src="icons/modeles/${m.k}.webp" alt="" loading="lazy" onerror="this.remove()"><span class="mdl-pal">${m.pal.map(c => `<i style="background:${c}"></i>`).join('')}</span><b>${esc(m.n)}</b>${m.pro ? '<span class="pro-tag">PRO</span>' : ''}</button>`).join('')}</div>${CLOSE('Fermer')}`, p => {
      p.querySelectorAll('[data-mdl]').forEach(b => b.onclick = () => { const m = MODELES.find(x => x.k === b.dataset.mdl); if (!m) return;
        if (m.pro && proLock()) { ACT.carnetPaywall(); return; } closePanel(); setTimeout(() => apply(m), 300); }); }, { nofocus: true });
  };
  function apply(m) {
    const en = curEntry(); if (!en) return; en.st = en.st || [];
    const deco = en.st.filter(s => !(s.k === 'f' && s.p) && !(s.k === 'x' && String(s.v || '').trim() && !s.tpl));
    if (deco.length && !confirm('Ce modèle remplace la décoration de cette page. Tes photos et ton texte sont gardés. Continuer ?')) return;
    const keepTx = en.st.filter(s => s.k === 'x' && String(s.v || '').trim() && !s.tpl);
    const photos = [...new Set([...en.st.filter(s => s.k === 'f' && s.p).map(s => s.p), ...en.photos.filter(Boolean)])];
    const el = m.el(); let k = 0;
    el.forEach(s => { if (s.k === 'f' && k < photos.length) s.p = photos[k++]; });
    // les photos en trop restent sur la page, en polaroïd dans un coin
    const extra = photos.slice(k).map((p, i) => ({ k: 'f', p, x: r1(8 + i * 6), y: r1(90 - i * 4), s: .5, r: i % 2 ? 6 : -6, fr: 'polaroid', ar: 'carre', cx: 50, cy: 50, cz: 1 }));
    en.st = [...el, ...extra, ...keepTx]; en.photos = photos;
    en.lay = Object.assign({}, en.lay, { paper: m.paper, font: m.font, free: 1, mdl: m.k }); delete en.lay.fr;
    BK.sel = null; save(); bkRender(); toast(`Modèle « ${m.n} » posé : touche un emplacement pour ta photo`);
  }
})();
