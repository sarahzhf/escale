/* Escale : gestes du téléphone.
 *  - glisser depuis le bord gauche vers la droite = retour (ferme aussi un carnet ou une feuille ouverte) ;
 *  - tirer vers le bas tout en haut d'un écran = recharger ses données ;
 *  - bouton « retour en haut » sur les écrans longs. */
(() => {
  const phone = document.getElementById('phone') || document.body;
  const edge = document.createElement('div'); edge.className = 'edge-back'; edge.setAttribute('aria-hidden', 'true'); edge.innerHTML = SV.back; phone.appendChild(edge);
  const ptr = document.createElement('div'); ptr.className = 'ptr'; ptr.setAttribute('aria-hidden', 'true'); ptr.innerHTML = '<i></i>'; phone.appendChild(ptr);
  const top = document.createElement('button'); top.className = 'to-top'; top.type = 'button'; top.hidden = true; top.setAttribute('aria-label', 'Revenir en haut'); top.innerHTML = SV.back; phone.appendChild(top);

  const panelOpen = () => document.getElementById('panel').classList.contains('open');
  const bookOpen = () => typeof BK !== 'undefined' && !!BK;
  const screenEl = () => document.querySelector('.screen:not([hidden])');
  const gated = () => document.body.classList.contains('gated');

  /* retour par le bord gauche */
  let eg = null;
  document.addEventListener('touchstart', e => {
    const t = e.touches[0]; if (e.touches.length !== 1 || gated()) return;
    const r = phone.getBoundingClientRect();
    if (t.clientX - r.left <= 24) eg = { x: t.clientX, y: t.clientY, dx: 0 };
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!eg) return; const t = e.touches[0]; eg.dx = t.clientX - eg.x; const dy = Math.abs(t.clientY - eg.y);
    if (dy > 40 && dy > eg.dx) { eg = null; edge.style.cssText = ''; return; }
    const d = Math.max(0, Math.min(90, eg.dx * .6)); edge.style.transform = `translate(${d - 44}px,-50%) scale(${.7 + d / 300})`; edge.style.opacity = Math.min(1, d / 40); edge.classList.toggle('ready', eg.dx > 80);
  }, { passive: true });
  document.addEventListener('touchend', () => {
    if (!eg) return; const go = eg.dx > 80; eg = null; edge.style.cssText = ''; edge.classList.remove('ready');
    if (!go) return;
    if (panelOpen()) closePanel();
    else if (bookOpen()) { if (BK.zoom && !BK.wide) { if (BK.edit) ACT.bkEdit(); bkZoom(null); } else closeBook(); }
    else if (current !== 'home') ACT.back();
  });

  /* tirer vers le bas pour recharger */
  let pg = null, busy = false;
  document.addEventListener('touchstart', e => {
    if (e.touches.length !== 1 || busy || gated() || panelOpen() || bookOpen() || eg) return;
    const sc = screenEl(); if (!sc || sc.id === 's-carte' || sc.scrollTop > 0 || !sc.contains(e.target)) return;
    if (e.target.closest('.pile,.bc-row,.chipsrow,.vchips,.dest,.mstrip,input,textarea,select')) return;
    pg = { y: e.touches[0].clientY, x: e.touches[0].clientX, d: 0, sc };
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!pg) return; const t = e.touches[0], dy = t.clientY - pg.y, dx = Math.abs(t.clientX - pg.x);
    if (pg.sc.scrollTop > 0 || dy <= 0 || (dx > dy && pg.d < 10)) { if (dy <= 0 || dx > dy) { pg = null; ptr.style.cssText = ''; } return; }
    e.preventDefault(); pg.d = Math.min(110, dy * .5);
    ptr.style.transform = `translate(-50%,${pg.d - 50}px) rotate(${pg.d * 4}deg)`; ptr.style.opacity = Math.min(1, pg.d / 50); ptr.classList.toggle('ready', pg.d > 64);
  }, { passive: false });
  document.addEventListener('touchend', async () => {
    if (!pg) return; const ok = pg.d > 64; pg = null; ptr.classList.remove('ready');
    if (!ok) { ptr.style.cssText = ''; return; }
    busy = true; ptr.classList.add('spin'); ptr.style.transform = 'translate(-50%,18px)'; ptr.style.opacity = 1;
    try { if (typeof hasPending === 'function' && hasPending()) await sync(); await loadData(); refresh(); toast('À jour'); }
    catch (_) { toast('Pas de connexion pour le moment'); }
    finally { busy = false; ptr.classList.remove('spin'); ptr.style.cssText = ''; }
  });

  /* retour en haut */
  document.addEventListener('scroll', e => {
    const sc = e.target; if (!sc.classList || !sc.classList.contains('screen') || sc.hidden) return;
    top.hidden = sc.scrollTop < sc.clientHeight * 1.5;
  }, true);
  top.onclick = () => { const sc = screenEl(); if (sc) sc.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); top.hidden = true; };
  // toucher l'onglet déjà ouvert remonte aussi en haut
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('nav [data-go]'); if (b && b.classList.contains('on')) { const sc = screenEl(); if (sc) sc.scrollTo({ top: 0, behavior: 'smooth' }); } }, true);
})();

/* lien d'évitement : place le clavier dans l'écran affiché */
(() => { const sk = document.getElementById('skipLink'); if (!sk) return;
  sk.addEventListener('click', e => { e.preventDefault(); const sc = document.querySelector('.screen:not([hidden])'); if (!sc) return; sc.setAttribute('tabindex', '-1'); sc.focus({ preventScroll: true }); }); })();

/* barre de progression pendant l'envoi des photos */
(() => { if (typeof uploadPhoto !== 'function') return;
  const bar = document.createElement('div'); bar.className = 'upbar'; bar.hidden = true; bar.setAttribute('role', 'status'); bar.innerHTML = '<i></i><span></span>';
  (document.getElementById('phone') || document.body).appendChild(bar);
  let n = 0; const show = () => { bar.hidden = n === 0; bar.querySelector('span').textContent = n > 1 ? `Envoi de ${n} photos…` : 'Envoi de la photo…'; };
  const up0 = uploadPhoto;
  uploadPhoto = async (...a) => { n++; show(); try { return await up0(...a); } finally { n--; show(); } };
})();
