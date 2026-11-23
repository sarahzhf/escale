/* Eskalys : visite guidée DANS l'appli. Met en lumière le vrai bouton, explique dans une bulle,
   et laisse toucher le bouton pour avancer (ou « Suivant »). Une visite par chapitre du guide, « Passer » partout. */
(() => {
  const TOURS = {
    'Bienvenue': [
      { go: 'home', sel: '.htext, .hhero', t: 'Ton accueil', d: 'Ton prochain voyage ou celui en cours, en grand, dès que tu ouvres Eskalys.' },
      { go: 'home', sel: '.hfeat', t: 'Ta carte et tes chiffres', d: 'Les pays que tu as visités sur un globe, et tes voyages en chiffres.' },
      { go: 'home', sel: '.hf-wide', t: 'Où partir ensuite ?', d: 'Des idées de voyages selon tes goûts et ton budget.' },
      { go: 'home', sel: '#homeCal', t: 'Ton calendrier', d: 'Tes voyages passés et à venir, mois par mois.' },
      { go: 'home', sel: '.wishes', t: 'Tes envies', d: 'Les pays qui te font rêver, avec une petite note pour chacun.' },
      { go: 'home', sel: '#fab', t: 'Le bouton +', d: 'Ajoute une dépense, une page de carnet ou une photo, où que tu sois.' },
    ],
    'Tes carnets': [
      { go: 'journal', sel: '.bookcase', t: 'Ta bibliothèque', d: 'Chaque voyage est un carnet en cuir rangé debout. Touche-en un pour l’ouvrir, puis le crayon pour écrire et décorer.' },
      { go: 'journal', sel: '.shelf-info', t: 'Le carnet choisi', d: 'Son titre, ses dates, et le bouton pour l’ouvrir.' },
      { go: 'journal', sel: '.collab-shelf', t: 'Les carnets à plusieurs', d: 'Les carnets que tu remplis avec les amis qui étaient du voyage.' },
      { go: 'journal', sel: '.pinwall', t: 'Ton mur de souvenirs', d: 'Tes plus belles pages, épinglées comme sur un tableau.' },
      { go: 'carnets', sel: '.vsearch', t: 'Retrouver un voyage', d: 'Cherche par pays, par ville ou par année.' },
      { go: 'carnets', sel: '.vchips', t: 'Trier tes voyages', d: 'En cours, à venir, passés ou favoris.' },
      { go: 'carnets', sel: '.vcard.new, [data-act="newTrip"]', t: 'Créer un voyage', d: 'Pays, ville, dates et budget : ton nouveau carnet apparaît dans la bibliothèque.' },
    ],
    'Ton budget': [
      { go: 'depenses', sel: '.tripchips', t: 'Choisis ton voyage', d: 'Passe d’un voyage à l’autre pour voir son budget.' },
      { go: 'depenses', sel: '#gauge', t: 'La jauge', d: 'Ce que tu as dépensé par rapport à ton budget, et ce qu’il te reste par jour.' },
      { go: 'depenses', sel: '.titlebar [data-act="addExp"], [data-act="addExp"]', t: 'Noter une dépense', d: 'En euros ou en monnaie locale : Eskalys convertit et range par catégorie.' },
      { go: 'depenses', sel: '.g-act, [data-act="budget"]', t: 'Ton budget', d: 'Fixe un budget total ou par catégorie, et sois prévenue si tu dépasses.' },
      { go: 'depenses', sel: '.sx-tiles, .st-head', t: 'Tes statistiques', d: 'Où part ton argent : touche une catégorie pour son détail, et compare tes voyages.' },
    ],
    'Avant de partir': [
      { go: 'carnets', sel: '.vlist .vcard:not(.new)', t: 'Ouvre un voyage à venir', d: 'Tu y trouves le compte à rebours, l’heure sur place, la météo, les incontournables et ta checklist.' },
      { go: 'home', sel: '.hf-wide', t: 'Des idées et des conseils', d: 'Les infos pratiques de chaque pays : monnaie, prises, urgences, pourboires et quand partir.' },
    ],
    'Ton monde': [
      { go: 'monde', sel: '.mw-hero', t: 'Tes pays visités', d: 'Combien de pays tu as vus, et quelle part du monde.' },
      { go: 'monde', sel: '.mw-grid', t: 'Tes voyages en chiffres', d: 'Jours de voyage, kilomètres parcourus et le voyage le plus lointain.' },
      { go: 'monde', sel: '#flagbox', t: 'Ta collection de drapeaux', d: 'Un drapeau par pays visité. Lance-les du doigt ou penche ton téléphone.' },
      { go: 'monde', sel: '.mw-conts', t: 'Les continents', d: 'Ta progression sur chaque continent.' },
    ],
    'Avec tes amis': [
      { go: 'fil', sel: '.stories', t: 'Tes amis', d: 'Les derniers souvenirs de tes amis, en un coup d’œil.' },
      { go: 'fil', sel: '.seg2', t: 'Amis, Découvrir, Défis, Adresses', d: 'Les Défis photo à relever, et les bonnes adresses de vraies personnes, par pays.' },
      { go: 'fil', sel: '.fhead [data-act="compose"], [data-act="compose"]', t: 'Publier un souvenir', d: 'Une photo, un texte, et tu choisis qui le voit : toi, tes amis ou tout le monde.' },
      { go: 'fil', sel: '.fhead [data-act="findFriends"], [data-act="findFriends"]', t: 'Trouver des amis', d: 'Cherche tes amis par leur pseudo et ajoute-les.' },
    ],
    'Tout reste à toi': [
      { go: 'profil', sel: '.pmain, .prow', t: 'Ton profil', d: 'Ta photo, ton nom et ton passeport de voyageur.' },
      { go: 'profil', sel: '.pstats', t: 'Tes chiffres', d: 'Tes pays, tes publications et tes amis.' },
      { go: 'profil', sel: '.tb2 [data-act="profile"]', t: 'Tes réglages', d: 'Tout est privé par défaut. Ici, tu peux télécharger ou supprimer toutes tes données quand tu veux.' },
    ],
  };
  const tourFor = name => TOURS[name] || TOURS[Object.keys(TOURS).find(k => name && name.toLowerCase().includes(k.toLowerCase().split(' ').pop()))] || null;
  let ov = null, steps = [], k = 0, dir = 1, clickOff = null;
  const visible = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < innerHeight; };
  const find = sel => sel.split(',').map(s => [...document.querySelectorAll(s.trim())].find(visible)).find(Boolean);
  function end() { if (clickOff) clickOff(); clickOff = null; if (ov && typeof current !== 'undefined' && current !== 'home') { const sc = document.querySelector('#s-' + current); if (sc) sc.scrollTop = 0; } if (ov) { ov.classList.remove('on'); const o = ov; setTimeout(() => o.remove(), 250); ov = null; } }
  function show() {
    const s = steps[k]; if (!s) return end();
    try { if (typeof closePanel === 'function') closePanel(); } catch (_) { }
    if (s.go && typeof current !== 'undefined' && current !== s.go) { try { go(s.go); } catch (_) { } return setTimeout(show2, 500); }
    show2();
  }
  function show2() {
    if (!ov) return;
    const s = steps[k], el = find(s.sel) || [...document.querySelectorAll(s.sel)].find(e => { const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4; });
    if (!el) { k += dir; return k >= 0 && k < steps.length ? show() : end(); }   // élément absent (ex. pas encore de voyage) : on passe
    el.scrollIntoView({ block: 'center' }); const ph = document.querySelector('.phone'); if (ph) ph.scrollTop = 0; scrollTo(0, 0);
    setTimeout(() => requestAnimationFrame(() => {
      if (!ov) return;
      const host = ov.getBoundingClientRect(), r0 = el.getBoundingClientRect(), H = host.height || innerHeight;
      const r = { left: r0.left - host.left, top: r0.top - host.top, width: r0.width, height: r0.height }; r.bottom = r.top + r.height;
      const pad = 6, last = k === steps.length - 1, top = Math.max(4, r.top - pad), bot = Math.min(H - 4, r.bottom + pad);
      ov.querySelector('.tr-hole').style.cssText = `left:${Math.max(4, r.left - pad)}px;top:${top}px;width:${Math.min(host.width - 8, r.width + pad * 2)}px;height:${bot - top}px`;
      const b = ov.querySelector('.tr-bub'); b.style.cssText = 'top:0;visibility:hidden';
      b.innerHTML = `<p class="tr-n">${k + 1} sur ${steps.length}</p><h3 id="trT">${s.t}</h3><p>${s.d}</p>
        <div class="tr-a"><button class="tr-skip" data-t="skip">Passer</button>${k ? '<button class="btn2" data-t="prev">Retour</button>' : ''}<button class="btn" data-t="next">${last ? 'Terminé' : 'Suivant'}</button></div>`;
      const bh = b.offsetHeight + 14;
      b.style.cssText = H - bot >= bh ? `top:${bot + 14}px` : top >= bh ? `top:${top - bh}px` : `bottom:12px`;
      b.querySelector('[data-t="next"]').focus({ preventScroll: true });
    }), 120);
  }
  window.startTour = (name, list) => {
    steps = list || tourFor(name) || []; if (!steps.length) return false; k = 0; dir = 1; end();
    ov = document.createElement('div'); ov.className = 'tour'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-labelledby', 'trT');
    ov.innerHTML = '<div class="tr-hole" aria-hidden="true"></div><div class="tr-bub" aria-live="polite"></div>';
    (document.getElementById('phone') || document.body).appendChild(ov); requestAnimationFrame(() => ov.classList.add('on'));
    ov.addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (!b) return; const t = b.dataset.t;
      if (t === 'skip') end(); else { dir = t === 'next' ? 1 : -1; k += dir; if (k >= steps.length) end(); else show(); } });
    ov.addEventListener('keydown', e => { if (e.key === 'Escape') end(); });
    show(); return true;
  };
  window.TOURS = TOURS; window.tourFor = tourFor;
})();
/* garde-fou : sur iPhone, un focus ou un scrollIntoView pouvait faire glisser tout l'écran vers le haut
   et laisser voir un panneau fermé sous la barre d'onglets. On remet l'écran en place aussitôt. */
(() => {
  const fix = el => () => { if (el.scrollTop || el.scrollLeft) { el.scrollTop = 0; el.scrollLeft = 0; } };
  const hook = () => { const ph = document.querySelector('.phone'); if (ph) ph.addEventListener('scroll', fix(ph), { passive: true });
    addEventListener('scroll', () => { if (scrollY || scrollX) scrollTo(0, 0); }, { passive: true }); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', hook) : hook();
})();
