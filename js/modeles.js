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
    { k: 'sauge', n: 'Sauge et crème', pro: 0, paper: 'quadrille', font: 'carnet', pal: ['#AFC3AC', '#3f5240', '#F3EBDD'], el: () => [
      tx('l', 26, 46, 'Escapade', 'Ton titre', 'carnet', '#3f5240', 40, 17),
      tp('l', 95, 102, W.sauge, 64, -4), ph('l', 95, 200, 128, 'portrait', 'arche'),
      tp('l', 228, 160, W.jaune, 50, 6), ph('l', 228, 212, 78, 'carre', 'polaroid', 5),
      lt('l', 205, 300, 'souvenirs', 'label', '#2E5E3E', -3),
      dd('l', 42, 372, 'leaf', 40, '#6f8a6c', -12), dd('l', 258, 372, 'heart', 30, '#B8452C', 8),
      tp('r', 150, 236, W.sauge, 70, -3), ph('r', 150, 305, 170, 'paysage', 'blanc', -1),
      dd('r', 268, 392, 'sparkles', 30, '#B07A2A'), dd('r', 34, 392, 'hearts', 28, '#E8A9B8')] },
    { k: 'bleu', n: 'Bleu Méditerranée', pro: 0, paper: 'blanc', font: 'machine', pal: ['#A9C2DA', '#3C6E8F', '#FBF6EA'], el: () => [
      lt('l', 150, 66, 'VOYAGE', 'tile', '#20243A'),
      tp('l', 150, 92, W.bleu, 70, -2), ph('l', 150, 170, 215, 'paysage', 'blanc', 1),
      ph('l', 82, 322, 105, 'carre', 'blanc', -3), ph('l', 218, 326, 105, 'carre', 'blanc', 3),
      dd('l', 150, 395, 'stars', 30, '#3C6E8F'),
      ph('r', 82, 312, 105, 'carre', 'rond'), tp('r', 215, 240, W.sauge, 55, 6), ph('r', 215, 305, 92, 'portrait', 'polaroid', 6),
      dd('r', 34, 396, 'sparkles', 28, '#E3A51A'), dd('r', 268, 396, 'star', 26, '#3C6E8F')] },
    { k: 'ete', n: 'Été pastel', pro: 0, paper: 'blanc', font: 'carnet', pal: ['#A9C2DA', '#F3C979', '#A9C4AF'], el: () => [
      tx('l', 74, 44, 'Summer', 'Ton titre', 'carnet', '#2f4a66', 40, 16),
      tp('l', 150, 118, W.jaune, 66, -3), ph('l', 150, 200, 205, 'paysage', 'blanc', -1),
      ph('l', 150, 342, 92, 'carre', 'rond'), dd('l', 46, 350, 'sparkles', 34, '#E3A51A'), dd('l', 256, 330, 'heartf', 26, '#E8A9B8', 10),
      tp('r', 85, 238, W.sauge, 55, -5), ph('r', 85, 305, 96, 'portrait', 'polaroid', -4),
      tp('r', 215, 238, W.bleu, 55, 5), ph('r', 215, 305, 96, 'portrait', 'polaroid', 4),
      dd('r', 150, 400, 'stars', 26, '#9EC3E6')] },
    { k: 'rose', n: 'Rose poudré', pro: 1, paper: 'rose', font: 'romantique', pal: ['#E9BCC3', '#b05a6a', '#F8E7E5'], el: () => [
      tx('l', 62, 42, 'Douceur', 'Ton titre', 'romantique', '#b05a6a', 40, 16),
      ph('l', 150, 222, 150, 'o', 'coeur-rose'), st('l', 150, 126, 'nd-satin-rose', 70),
      st('l', 58, 362, 'fl-cerisier', 90, -10), st('l', 246, 358, 'fl-pivoine-poudre', 78, 8),
      tp('r', 82, 244, W.rose, 55, -6), ph('r', 82, 305, 92, 'carre', 'polaroid', -5),
      tp('r', 216, 248, W.lilas, 55, 6), ph('r', 216, 308, 92, 'carre', 'polaroid', 5),
      st('r', 58, 392, 'baiser-framboise', 52, -12), st('r', 248, 392, 'cire-rose-cygne', 50)] },
    { k: 'bordeaux', n: 'Bordeaux et or', pro: 1, paper: 'blanc', font: 'oldmoney', pal: ['#6E1F2A', '#C9A15A', '#ffffff'], el: () => [
      ph('l', 150, 165, 190, 'o', 'bordeaux'),
      tx('l', 52, 292, 'Souvenirs', 'Ton titre', 'oldmoney', '#6E1F2A', 40, 17),
      tx('l', 60, 346, '', 'ton sous-titre ici', 'oldmoney', '#9a7a3a', 17, 30),
      st('l', 150, 396, 'cire-bordeaux-rose', 46),
      ph('r', 86, 300, 110, 'o', 'or-cadre', -3), ph('r', 216, 300, 104, 'o', 'or-ovale', 3),
      st('r', 42, 388, 'nd2-bourgogne', 56, -8), st('r', 262, 386, 'fl-lys-bordeaux', 56, 10)] },
    { k: 'terracotta', n: 'Terracotta', pro: 1, paper: 'kraft', font: 'carnet', pal: ['#CDAF86', '#B8452C', '#7a3a1f'], el: () => [
      tx('l', 26, 46, 'Évasion', 'Ton titre', 'carnet', '#7a3a1f', 40, 16),
      ph('l', 95, 205, 130, 'portrait', 'arche'), tp('l', 232, 160, W.peche, 50, 6), ph('l', 232, 212, 78, 'carre', 'polaroid', 5),
      st('l', 236, 300, 'nd2-vichy-terracotta', 68, -6), dd('l', 40, 372, 'sun', 36, '#B8452C'), st('l', 252, 388, 'empreinte-terracotta', 54, -10),
      ph('r', 84, 305, 100, 'carre', 'festonne', -3), ph('r', 216, 305, 100, 'carre', 'festonne', 3),
      lt('r', 84, 386, 'À voir', 'label', '#B8452C', -2), lt('r', 216, 386, 'À goûter', 'label', '#B07A2A', 2)] },
    { k: 'lilas', n: 'Lilas', pro: 1, paper: 'quadrille', font: 'calligraphie', pal: ['#CDBDE3', '#4e3f68', '#C9B6E4'], el: () => [
      lt('l', 76, 66, 'CITY', 'bead', '#4e3f68', -3), tx('l', 140, 46, 'break', 'Ton titre', 'romantique', '#6a5590', 34, 14),
      tp('l', 100, 106, W.lilas, 60, -4), ph('l', 100, 196, 140, 'portrait', 'blanc', -2),
      ph('l', 236, 214, 82, 'portrait', 'polaroid', 6), st('l', 236, 302, 'nd2-vichy-lilas', 68, -8), dd('l', 42, 372, 'butterfly', 34, '#8a73b8'),
      ph('r', 84, 312, 100, 'carre', 'rond'), ph('r', 216, 310, 96, 'portrait', 'arche'),
      st('r', 40, 388, 'fl-gypsophile', 56), st('r', 266, 388, 'fl-lys-rose', 58, 10)] },
    { k: 'nuit', n: 'Noir et or', pro: 1, paper: 'blanc', font: 'magazine', pal: ['#2C2B2E', '#C9A15A', '#ffffff'], el: () => [
      tx('l', 26, 46, 'La nuit', 'Ton titre', 'magazine', '#20243A', 40, 16), dd('l', 268, 62, 'stars', 28, '#B07A2A'),
      ph('l', 150, 198, 215, 'paysage', 'blanc'), ph('l', 86, 345, 104, 'paysage', 'blanc'), ph('l', 216, 345, 104, 'paysage', 'blanc'),
      ph('r', 100, 308, 118, 'o', 'or-cadre'), st('r', 228, 300, 'cire-or-lune', 58),
      dd('r', 262, 390, 'moon', 26, '#B07A2A'), dd('r', 196, 396, 'sparkles', 22, '#B07A2A')] },
    { k: 'vintage', n: 'Vintage', pro: 1, paper: 'kraft', font: 'machine', pal: ['#CDAF86', '#3a2c1c', '#EFE4D0'], el: () => [
      lt('l', 150, 62, 'CARNET DE ROUTE', 'label', '#20243A'),
      ph('l', 82, 150, 105, 'portrait', 'timbre', -4), ph('l', 218, 156, 105, 'portrait', 'timbre', 3),
      st('l', 150, 232, 'cire-creme-noeud', 54), tp('l', 150, 262, W.jaune, 64, -2), ph('l', 150, 328, 215, 'paysage', 'blanc', 1),
      tp('r', 90, 244, W.peche, 55, -5), ph('r', 90, 310, 104, 'portrait', 'polaroid', -3),
      st('r', 226, 296, 'empreinte-prune', 58, -10), st('r', 214, 378, 'dentelle-creme-guipure', 120), dd('r', 270, 400, 'envelope', 26, '#6b5638', -6)] },
    { k: 'automne', n: 'Automne', pro: 1, paper: 'ligne', font: 'carnet', pal: ['#6E1F2A', '#B07A2A', '#F3C979'], el: () => [
      tx('l', 26, 46, 'Saison', 'Ton titre', 'carnet', '#6b3a1c', 40, 14), st('l', 258, 64, 'erable-rousse', 70, 18),
      ph('l', 100, 205, 135, 'portrait', 'festonne', -2), tp('l', 236, 164, W.jaune, 50, 6), ph('l', 236, 216, 78, 'carre', 'polaroid', 5),
      st('l', 232, 300, 'pomme-pin-espresso', 44, -10), st('l', 40, 372, 'erable-ambre', 50, -20), st('l', 132, 388, 'nd-satin-chocolat', 70), st('l', 252, 386, 'erable-terracotta', 50, 20),
      tp('r', 86, 244, W.peche, 55, -4), ph('r', 86, 312, 104, 'portrait', 'blanc', -3),
      tp('r', 216, 244, W.jaune, 55, 4), ph('r', 216, 312, 104, 'portrait', 'blanc', 3), st('r', 150, 402, 'nd2-moutarde', 58)] },
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
