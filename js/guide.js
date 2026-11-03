/* Escale : petit guide de découverte, montré une fois aux nouveaux comptes (sans voyage) sur l'appareil, relançable depuis l'aide. */
(() => {
  const STEPS = [
    ['plane', 'Un carnet par voyage', 'Crée un voyage avec le bouton + : pays, dates et budget. Il devient un carnet en cuir rangé dans ta bibliothèque.', '#2E5E3E'],
    ['wallet', 'Tes dépenses en deux secondes', 'Note chaque dépense en euros ou en monnaie locale. Escale convertit, répartit les nuits d’hôtel et te dit combien il te reste par jour.', '#B8452C'],
    ['book', 'Un journal qui se feuillette', 'Ouvre ton carnet, touche une page et écris où tu veux. Ajoute photos, stickers et décos, puis tourne les pages du doigt.', '#8B6B4A'],
    ['target', 'Tes amis et leurs défis', 'Partage tes souvenirs, réagis aux leurs et lance des défis photo. Points, badges et classement entre amis.', '#3F4E8C'],
    ['lock', 'Tout reste à toi', 'Tout est privé par défaut. Tu choisis pour chaque album ou publication : toi seule, tes amis ou tout le monde. Tes dépenses ne sont jamais montrées.', '#20243A']
  ];
  const key = () => `escale:guide:${(typeof ME !== 'undefined' && ME && ME.id) || 'x'}`;
  const seen = () => { try { return localStorage.getItem(key()) === '1' || localStorage.getItem('escale-guide-seen') === '1'; } catch (_) { return true; } };
  const mark = () => { try { localStorage.setItem(key(), '1'); localStorage.setItem('escale-guide-seen', '1'); } catch (_) { } };
  let el = null, i = 0;
  function draw() {
    const [ic, t, d, c] = STEPS[i], last = i === STEPS.length - 1, none = !S.trips || !S.trips.length;
    el.innerHTML = `<div class="gd-card" role="dialog" aria-modal="true" aria-labelledby="gdT">
      <button class="gd-skip" data-g="skip">Passer</button>
      <div class="gd-ill" style="--c:${c}"><span>${SV[ic] || ''}</span></div>
      <p class="gd-n">${i + 1} sur ${STEPS.length}</p><h2 id="gdT">${t}</h2><p class="gd-d">${d}</p>
      <div class="gd-dots">${STEPS.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
      <div class="gd-acts">${i ? '<button class="btn2" data-g="prev">Retour</button>' : '<span></span>'}<button class="btn" data-g="${last ? 'end' : 'next'}">${last ? (none ? 'Créer mon premier voyage' : 'C’est parti') : 'Suivant'}<i>${SV.arrow}</i></button></div></div>`;
    el.querySelector('[data-g="' + (last ? 'end' : 'next') + '"]').focus({ preventScroll: true });
  }
  function close(go) { mark(); el.classList.remove('on'); setTimeout(() => { el.remove(); el = null; }, 250); if (go && (!S.trips || !S.trips.length)) setTimeout(() => ACT.newTrip({}), 300); }
  window.showGuide = () => {
    if (el) return; i = 0; el = document.createElement('div'); el.className = 'guide';
    (document.getElementById('phone') || document.body).appendChild(el); draw(); requestAnimationFrame(() => el.classList.add('on'));
    el.addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (!b) return; const g = b.dataset.g;
      if (g === 'skip') close(false); else if (g === 'end') close(true); else { i += g === 'next' ? 1 : -1; draw(); } });
    let x0 = null; el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) < 50) return; if (dx < 0 && i < STEPS.length - 1) { i++; draw(); } else if (dx > 0 && i > 0) { i--; draw(); } });
    el.addEventListener('keydown', e => { if (e.key === 'Escape') close(false); if (e.key === 'ArrowRight' && i < STEPS.length - 1) { i++; draw(); } if (e.key === 'ArrowLeft' && i) { i--; draw(); } });
  };
  ACT.guide = () => { closePanel(); setTimeout(showGuide, 300); };
  // première arrivée sur l'accueil après la connexion
  const go0 = go;
  go = (s, mode) => { go0(s, mode); if (s === 'home' && typeof ME !== 'undefined' && ME && !document.body.classList.contains('gated') && !(S.trips && S.trips.length) && !seen()) setTimeout(() => { if (!seen() && current === 'home') showGuide(); }, 700); };
})();
