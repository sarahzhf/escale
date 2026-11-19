/* Eskalys : le guide complet de l'appli, montré une fois aux nouveaux comptes (sans voyage) sur l'appareil,
 * relançable depuis l'aide. Organisé en chapitres : on peut passer d'un chapitre à l'autre, revenir, ou tout passer.
 * Chaque étape dit ce que fait la fonction et le geste pour s'en servir. */
(() => {
  const CH = [
    ['Bienvenue', '#2E5E3E', [
      ['plane', 'Bienvenue dans Eskalys', 'Un carnet par voyage pour garder au même endroit tes souvenirs, tes photos et ce que tu as dépensé. Ce guide te montre tout en deux minutes.', ['Balaye vers la gauche ou touche Suivant pour avancer', 'Touche un chapitre en haut pour y aller directement']],
      ['menu', 'Se repérer', 'En bas, cinq onglets : Accueil, Voyages, Posts, Budget et Profil. Le bouton rond + ajoute ce dont tu as besoin, où que tu sois.', ['+ : une dépense, une page, une photo, un voyage', 'Balaye depuis le bord gauche pour revenir en arrière']],
    ]],
    ['Tes carnets', '#8B6B4A', [
      ['book', 'Un carnet par voyage', 'Crée un voyage avec + : pays, ville, dates et budget. Il devient un carnet en cuir, rangé debout dans ta bibliothèque en bois (écran Voyages, puis Journal).', ['Fais défiler l’étagère du doigt pour choisir un carnet', 'Touche un carnet pour l’ouvrir', 'Touche un objet de l’étagère pour le changer']],
      ['book', 'Des pages qui se tournent', 'Le carnet s’ouvre sur une double page : à gauche les photos du jour, à droite le titre et ton texte. Les pages se tournent par-dessus la reliure, comme un vrai carnet.', ['Balaye vers la gauche : page suivante', 'Balaye vers la droite : page précédente', 'Touche une page pour zoomer dessus, touche à côté pour refermer'], 'book'],
      ['pencil', 'Écris et décore', 'Touche le crayon en haut du carnet. Touche l’endroit de la page où tu veux écrire : une zone de texte s’ouvre à cet endroit. Ajoute tes photos, puis des stickers : émojis, masking tape, étiquettes, ou stickers découpés dans tes propres photos.', ['Glisse un sticker pour le déplacer', 'Pince avec deux doigts pour l’agrandir ou le tourner', 'Touche Terminé quand ta page est prête']],
      ['star', 'Un carnet à ton style', 'Choisis la couleur du cuir de chaque carnet, le modèle de pages (crème lignées ou blanches à pinces dorées), la typographie, le papier et les cadres des photos.', ['Dans le carnet, en mode modification : le bouton Aa', 'Dans l’aperçu du voyage : la couverture se change avec l’appareil photo']],
    ]],
    ['Ton budget', '#B8452C', [
      ['wallet', 'Tes dépenses en deux secondes', 'Note une dépense en euros ou en monnaie locale : Eskalys convertit au taux du jour, répartit les nuits d’hôtel sur leurs jours et te dit combien il te reste par jour.', ['+ puis Dépense, ou le bouton du bas dans un voyage', 'Photographie un ticket : il est lu sur ton téléphone, rien n’est envoyé']],
      ['target', 'Où part ton argent', 'L’onglet Budget montre la jauge de chaque voyage, les catégories qui risquent de dépasser, tes plus grosses dépenses et l’évolution d’un voyage à l’autre.', ['Touche une catégorie pour voir le détail', 'Change le budget par catégorie dans Modifier']],
      ['users', 'Entre amis', 'Dans l’onglet Entre amis d’un voyage, ajoute tes compagnons. Pour chaque dépense, indique qui a payé et pour qui : Eskalys calcule qui doit combien à qui, en un minimum de remboursements.', ['Invite par un lien, même quelqu’un sans compte', 'Coche un remboursement quand il est fait']],
    ]],
    ['Avant de partir', '#3F4E8C', [
      ['clock', 'Prépare ton voyage', 'Dans l’aperçu d’un voyage à venir : le compte à rebours avant le départ, l’heure sur place, la météo des jours du voyage, les incontournables du pays et ta checklist.', ['La météo apparaît environ deux semaines avant le départ', 'Coche chaque élément de la checklist quand il est prêt']],
      ['lock', 'Tes documents au même endroit', 'Le dossier Documents du voyage range tes billets d’avion ou de train, et tes fichiers : réservations, assurance, visa. Il reste toujours privé, même si l’album est partagé.', ['Importe un PDF ou une photo de billet : Eskalys le met au format carte d’embarquement', 'Garde toujours tes papiers originaux sur toi']],
      ['wallet', 'Simule ton voyage', 'Avant même de décider : choisis un pays, tes villes et tes dates, coche les vraies activités qui te tentent avec leur tarif, et ta façon de manger. Eskalys estime tout : transport, logement, repas, trajets entre les villes et imprévus, haute ou basse saison comprise.', ['Conseils, fiche d’un pays, puis Simuler ce voyage', 'Enregistre-la dans tes envies : elle reste à toi, jamais partagée', 'Le jour où tu réserves, elle devient un carnet en un geste', 'Prix indicatifs, à vérifier']],
    ]],
    ['Ton monde', '#1E8C8E', [
      ['globe', 'Ta carte du monde', 'Tous tes voyages s’affichent sur un globe en 3D ou sur une carte à plat : les pays visités, ceux qui te font envie, et tes voyages en chiffres (pays, jours, kilomètres).', ['Fais tourner le globe du doigt', 'Ajoute un pays à tes envies avec une petite note']],
      ['page', 'Ton passeport Eskalys', 'À chaque nouveau pays, un tampon tombe dans ton passeport. Tu le retrouves sur ton profil, à côté de ton prénom.', ['Tourne ses pages au doigt', 'Choisis sa couleur, ta photo et qui peut le voir']],
      ['spark', 'Assistant et idées de voyage', 'L’assistant répond à tes questions sur tes dépenses et t’aide à choisir ta prochaine destination. L’écran Où partir ensuite ? propose des pays selon tes goûts et ton budget.', ['Pose une question comme à un ami : « Combien il me reste par jour ? »', 'L’assistant ne lit jamais tes notes, tes photos ni tes amis']],
      ['star', 'Où partir, quand et avec quel budget', 'Dans Conseils, l’onglet Mon budget propose des pays et des villes qui rentrent dans ton budget, vol compris. Le filtre Quand ? suit la bonne saison du mois choisi. Près de chez moi propose des villes de ton propre pays, qui n’apparaît plus dans les autres suggestions.', ['Ton lieu de vie se règle dans les réglages', 'Touche une ville pour sa simulation détaillée']],
      ['pin', 'Ton itinéraire en 3D', 'Dans Carte, puis Itinéraire : ton voyage sur une vraie carte en relief. Ajoute chaque endroit visité avec une photo : le trajet se dessine petit à petit, avec un pin et un polaroïd sur chaque lieu.', ['Cherche le lieu exact : musée, café, plage', 'Une photo par lieu, choisie dans ton carnet ou ajoutée', 'Tourne, incline et zoome au doigt']],
    ]],
    ['Avec tes amis', '#C9476A', [
      ['comment', 'Partage tes souvenirs', 'Dans Posts, publie des photos et partage tes albums. Tes amis réagissent avec des émojis et laissent des commentaires, et leurs albums s’ouvrent dans le même carnet, en lecture seule.', ['Ajoute des amis depuis ton profil', 'Signale un contenu ou bloque quelqu’un depuis ses trois points']],
      ['target', 'Défis et missions', 'Lance un défi photo à un ami, avec un temps limité pour le relever. Pendant un voyage, une mission surprise arrive chaque jour : deux heures pour la relever. Les points remplissent ton bocal.', ['Points, badges, séries et classement entre amis', 'Choisis tes notifications dans Profil, Réglages']],
      ['globe', 'Leurs itinéraires en carte', 'Dans Carte, le bouton Entre amis ouvre les itinéraires de tes amis : choisis un ami, puis un de ses voyages, et suis son trajet en 3D avec ses photos.', ['Seuls les voyages qu’ils partagent avec toi apparaissent', 'Touche un lieu en bas pour t’y envoler']],
    ]],
    ['Tout reste à toi', '#20243A', [
      ['lock', 'Privé par défaut', 'Tout est privé au départ. Pour chaque album ou publication, tu choisis : toi seule, tes amis ou tout le monde. Tes dépenses et tes documents ne sont jamais montrés.', ['Même sans réseau, tu peux tout noter : c’est envoyé au retour de la connexion', 'Profil, Réglages : télécharge ou supprime toutes tes données quand tu veux']],
      ['star', 'Ton avis compte', 'Dans les réglages, note l’appli ou envoie une idée d’amélioration, un bug ou une remarque : tout arrive directement à l’équipe d’Eskalys.', ['Réglages, puis Ton avis']],
    ]],
  ];
  const STEPS = CH.flatMap(([n, c, L], ci) => L.map(([ic, t, d, tips, ill]) => ({ ci, n, c, ic, t, d, tips, ill })));
  // nouveautés des versions 2.8 et 2.9 : montrées une fois aux comptes qui ont déjà vu le guide
  const NEWS = new Set(['Simule ton voyage', 'Où partir, quand et avec quel budget', 'Ton itinéraire en 3D', 'Leurs itinéraires en carte', 'Ton avis compte']), NEWS_V = 'v2.9';
  let LIST = STEPS, newsMode = false;
  const key = () => `escale:guide2:${(typeof ME !== 'undefined' && ME && ME.id) || 'x'}`;
  const seen = () => { try { return localStorage.getItem(key()) === '1' || localStorage.getItem('escale-guide-seen') === '1'; } catch (_) { return true; } };
  const nkey = () => `escale:guide-news:${NEWS_V}:${(typeof ME !== 'undefined' && ME && ME.id) || 'x'}`;
  const newsSeen = () => { try { return localStorage.getItem(nkey()) === '1'; } catch (_) { return true; } };
  const mark = () => { try { localStorage.setItem(nkey(), '1'); } catch (_) { } try { localStorage.setItem(key(), '1'); localStorage.setItem('escale-guide-seen', '1'); } catch (_) { } };
  const BOOK = `<div class="gd-book" aria-hidden="true"><i class="l"></i><i class="r"></i><i class="leaf"></i></div>`;
  let el = null, i = 0;
  function draw() {
    const s = LIST[i], last = i === LIST.length - 1, none = !S.trips || !S.trips.length;
    el.innerHTML = `<div class="gd-card" role="dialog" aria-modal="true" aria-labelledby="gdT">
      <button class="gd-skip" data-g="skip">Passer</button>
      <div class="gd-chs" role="tablist">${CH.map(([n], k) => `<button role="tab" data-g="ch" data-k="${k}" class="${k === s.ci ? 'on' : ''}" aria-selected="${k === s.ci}">${n}</button>`).join('')}</div>
      <div class="gd-ill" style="--c:${s.c}">${s.ill === 'book' ? BOOK : `<span>${SV[s.ic] || SV.star || ''}</span>`}</div>
      <p class="gd-n">${newsMode ? 'Nouveauté' : s.n}, ${i + 1} sur ${LIST.length}</p>${NEWS.has(s.t) ? '<em class="gd-new">Nouveau</em>' : ''}<h2 id="gdT">${s.t}</h2><p class="gd-d">${s.d}</p>
      ${s.tips && s.tips.length ? `<ul class="gd-tips">${s.tips.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}
      <div class="gd-bar"><i style="width:${Math.round((i + 1) / LIST.length * 100)}%"></i></div>
      <div class="gd-acts">${i ? '<button class="btn2" data-g="prev">Retour</button>' : '<span></span>'}<button class="btn" data-g="${last ? 'end' : 'next'}">${last ? (none ? 'Créer mon premier voyage' : 'C’est parti') : 'Suivant'}<i>${SV.arrow}</i></button></div></div>`;
    const on = el.querySelector('.gd-chs .on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
    el.querySelector('[data-g="' + (last ? 'end' : 'next') + '"]').focus({ preventScroll: true });
  }
  function close(go) { mark(); el.classList.remove('on'); setTimeout(() => { el.remove(); el = null; }, 250); if (go && (!S.trips || !S.trips.length)) setTimeout(() => ACT.newTrip({}), 300); }
  window.showGuide = (start, news) => {
    if (el) return; i = start || 0; newsMode = !!news; LIST = news ? STEPS.filter(x => NEWS.has(x.t)) : STEPS; el = document.createElement('div'); el.className = 'guide';
    (document.getElementById('phone') || document.body).appendChild(el); draw(); requestAnimationFrame(() => el.classList.add('on'));
    el.addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (!b) return; const g = b.dataset.g;
      if (g === 'skip') close(false); else if (g === 'end') close(true);
      else if (g === 'ch') { if (newsMode) { newsMode = false; LIST = STEPS; } i = Math.max(0, LIST.findIndex(x => x.ci === +b.dataset.k)); draw(); }
      else { i += g === 'next' ? 1 : -1; draw(); } });
    let x0 = null; el.addEventListener('touchstart', e => { x0 = e.target.closest('.gd-chs') ? null : e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) < 50) return; if (dx < 0 && i < LIST.length - 1) { i++; draw(); } else if (dx > 0 && i > 0) { i--; draw(); } });
    el.addEventListener('keydown', e => { if (e.key === 'Escape') close(false); if (e.key === 'ArrowRight' && i < LIST.length - 1) { i++; draw(); } if (e.key === 'ArrowLeft' && i) { i--; draw(); } });
  };
  ACT.guide = () => { closePanel(); setTimeout(() => showGuide(0), 300); };
  // première arrivée sur l'accueil après la connexion
  const go0 = go;
  go = (s, mode) => { go0(s, mode); if (s === 'home' && typeof ME !== 'undefined' && ME && !document.body.classList.contains('gated') && !(S.trips && S.trips.length) && !seen()) setTimeout(() => { if (!seen() && current === 'home') showGuide(); }, 700);
    else if (s === 'home' && typeof ME !== 'undefined' && ME && !document.body.classList.contains('gated') && seen() && !newsSeen()) setTimeout(() => { if (!newsSeen() && current === 'home' && !$('panel').classList.contains('open')) showGuide(0, true); }, 900); };
})();
