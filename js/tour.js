/* Eskalys : visite guidée DANS l'appli. Met en lumière le vrai bouton, explique dans une bulle,
   et laisse toucher le bouton pour avancer (ou « Suivant »). Une visite par chapitre du guide, « Passer » partout. */
(() => {
  const N = s => `nav [data-go="${s}"]`;
  const TOURS = {
    'Bienvenue': [
      { go: 'home', sel: 'nav', t: 'Les cinq onglets', d: 'Accueil, Voyages, Posts, Budget et Profil : tout Eskalys est ici, en bas de l’écran.' },
      { go: 'home', sel: '#fab', t: 'Le bouton +', d: 'Ajoute une dépense, une page de carnet ou une photo, où que tu sois. Touche-le pour voir.', tap: true },
    ],
    'Tes carnets': [
      { sel: N('carnets'), t: 'Tes voyages', d: 'Touche l’onglet Voyages : chaque voyage y a son carnet.', tap: true },
      { go: 'carnets', sel: '[data-act="newTrip"]', t: 'Créer un voyage', d: 'Pays, ville, dates et budget : ton carnet en cuir apparaît dans la bibliothèque.' },
      { go: 'journal', sel: '.spine, .shelf, #s-journal', t: 'Ta bibliothèque', d: 'Touche un carnet pour l’ouvrir, puis le crayon pour écrire, ajouter des photos et décorer.' },
    ],
    'Ton budget': [
      { sel: N('depenses'), t: 'L’onglet Budget', d: 'Touche-le : la jauge de chaque voyage et où part ton argent.', tap: true },
      { go: 'depenses', sel: '[data-act="addExp"]', t: 'Noter une dépense', d: 'En euros ou en monnaie locale : Eskalys convertit et range par catégorie.' },
      { go: 'depenses', sel: '.sx-card, .gauge, #s-depenses', t: 'Tes statistiques', d: 'Touche une catégorie pour son détail, et compare tes voyages entre eux.' },
    ],
    'Avec tes amis': [
      { sel: N('fil'), t: 'Les posts', d: 'Touche Posts : les souvenirs de tes amis, Découvrir, les Défis et les Adresses.', tap: true },
      { go: 'fil', sel: '.seg2', t: 'Amis, Découvrir, Défis, Adresses', d: 'Les Adresses, ce sont les bonnes adresses de vraies personnes, par pays.' },
      { go: 'fil', sel: '[data-act="compose"]', t: 'Publier un souvenir', d: 'Une photo, un texte, et tu choisis qui le voit : toi, tes amis ou tout le monde.' },
    ],
    'Tout reste à toi': [
      { sel: N('profil'), t: 'Ton profil', d: 'Touche Profil : tes amis, ton passeport de voyageur et tes réglages.', tap: true },
      { go: 'profil', sel: '#s-profil .phead, #s-profil h1, #s-profil', t: 'Tout est à toi', d: 'Tout est privé par défaut. Tu peux télécharger ou supprimer tes données quand tu veux.' },
    ],
  };
  const tourFor = name => TOURS[name] || TOURS[Object.keys(TOURS).find(k => name && name.toLowerCase().includes(k.toLowerCase().split(' ').pop()))] || null;
  let ov = null, steps = [], k = 0, clickOff = null;
  const visible = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < innerHeight; };
  const find = sel => sel.split(',').map(s => [...document.querySelectorAll(s.trim())].find(visible)).find(Boolean);
  function end() { if (clickOff) clickOff(); clickOff = null; if (ov) { ov.classList.remove('on'); const o = ov; setTimeout(() => o.remove(), 250); ov = null; } }
  function show() {
    if (clickOff) { clickOff(); clickOff = null; }
    const s = steps[k]; if (!s) return end();
    if (s.go && typeof current !== 'undefined' && current !== s.go) { try { if (typeof closePanel === 'function') closePanel(); go(s.go); } catch (_) { } return setTimeout(show2, 450); }
    show2();
  }
  function show2() {
    const s = steps[k], el = find(s.sel);
    if (!el) { k++; return k < steps.length ? show() : end(); }   // élément absent (ex. pas encore de voyage) : on passe
    el.scrollIntoView({ block: 'center', behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect(), pad = 6, last = k === steps.length - 1;
      ov.querySelector('.tr-hole').style.cssText = `left:${r.left - pad}px;top:${r.top - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px`;
      const below = r.top < innerHeight * .55, b = ov.querySelector('.tr-bub');
      b.style.cssText = below ? `top:${Math.min(innerHeight - 210, r.bottom + 14)}px` : `bottom:${Math.min(innerHeight - 120, innerHeight - r.top + 14)}px`;
      b.innerHTML = `<p class="tr-n">${k + 1} sur ${steps.length}</p><h3 id="trT">${s.t}</h3><p>${s.d}</p>
        <div class="tr-a"><button class="tr-skip" data-t="skip">Passer</button>${k ? '<button class="btn2" data-t="prev">Retour</button>' : ''}<button class="btn" data-t="next">${last ? 'Terminé' : s.tap ? 'Suivant' : 'Suivant'}</button></div>`;
      b.querySelector('[data-t="next"]').focus({ preventScroll: true });
      // toucher le vrai bouton fait avancer la visite
      const h = () => setTimeout(() => { k++; show(); }, s.tap ? 500 : 50);
      el.addEventListener('click', h, { once: true, capture: true }); clickOff = () => el.removeEventListener('click', h, { capture: true });
    });
  }
  window.startTour = (name, list) => {
    steps = list || tourFor(name) || []; if (!steps.length) return false; k = 0; end();
    ov = document.createElement('div'); ov.className = 'tour'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-labelledby', 'trT');
    ov.innerHTML = '<div class="tr-hole" aria-hidden="true"></div><div class="tr-bub" aria-live="polite"></div>';
    (document.getElementById('phone') || document.body).appendChild(ov); requestAnimationFrame(() => ov.classList.add('on'));
    ov.addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (!b) return; const t = b.dataset.t;
      if (t === 'skip') end(); else { k += t === 'next' ? 1 : -1; if (k >= steps.length) end(); else show(); } });
    ov.addEventListener('keydown', e => { if (e.key === 'Escape') end(); });
    show(); return true;
  };
  window.TOURS = TOURS; window.tourFor = tourFor;
})();
