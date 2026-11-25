/* Eskalys : « Le petit mot d'Eskalys ».
   À chaque voyage créé, et quelques jours avant le départ, un mot avec un peu d'humour
   pour rappeler ce qu'il ne faut pas oublier, selon le pays, la saison et la durée. */
(() => {
  const pick = (arr, seed) => arr[Math.abs(seed) % arr.length];
  const seedOf = s => [...String(s || '')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);

  // ce qui rend le mot unique : chaque règle donne une ligne (avec l'objet à ajouter à la valise)
  function motFor(t) {
    if (!t || !t.pays) return [];
    const cc = t.pays, sd = seedOf(t.id || cc), p = typeof pratOf === 'function' ? pratOf(cc) : null;
    const d0 = new Date(t.du || Date.now()), m = d0.getMonth() + 1;
    const days = t.du && t.au ? Math.max(1, Math.round((new Date(t.au) - d0) / 864e5) + 1) : 0;
    const trop = typeof TROP !== 'undefined' && TROP.has(cc), sud = typeof SUD !== 'undefined' && SUD.has(cc);
    const summer = trop || (sud ? (m <= 3 || m >= 11) : (m >= 5 && m <= 9)), winter = !trop && (sud ? (m >= 6 && m <= 8) : (m <= 2 || m >= 11));
    const MILD = new Set('MA TN DZ EG IL JO CY MT AE QA OM SA LB'.split(' ')), cold = winter && !MILD.has(cc);
    const L = [];
    if (trop) L.push({ i: 'Anti-moustiques', t: pick([
      'Les moustiques de là-bas t’attendent avec impatience. Ne leur fais pas ce plaisir : anti-moustiques dans la valise.',
      'Anti-moustiques obligatoire. Sauf si ton rêve, c’est de servir de buffet à volonté.',
      'Petit conseil d’amie : l’anti-moustiques, c’est comme le passeport. On ne part pas sans.'], sd) });
    if (summer) L.push({ i: 'Crème solaire', t: pick([
      'Il va faire chaud, vraiment chaud. Crème solaire, chapeau et lunettes : ton futur toi te dit déjà merci.',
      'Le soleil tape fort là-bas. La marque du maillot, c’est mignon deux jours, pas dix.',
      'Crème solaire en premier dans la valise. Le homard, c’est dans l’assiette, pas sur la plage.'], sd + 1) });
    if (cold) L.push({ i: 'Bonnet, gants et écharpe', t: pick([
      'Ça va cailler. Bonnet, gants, et ce gros pull que tu caches au fond de l’armoire : c’est son moment.',
      'Prévois des couches, beaucoup de couches. Tu ressembleras à un oignon, mais un oignon au chaud.'], sd + 2) });
    if (!summer && !cold) L.push({ i: 'Une veste légère', t: winter ? 'Il fait doux en journée, mais les soirées sont fraîches. Un pull dans le sac, et tu profites des terrasses jusqu’au bout.' : 'La météo de saison est d’humeur changeante. Une petite veste dans le sac, et elle ne pourra rien contre toi.' });
    if (typeof needAdapter === 'function' && needAdapter(cc) && p) L.push({ i: `Adaptateur de prise type ${p[0].split(',')[0].trim()}`, t: pick([
      `Là-bas, les prises sont de type ${p[0]}. Sans adaptateur, ton téléphone fera la grève dès le premier soir.`,
      `Prises de type ${p[0]} sur place. L’adaptateur, c’est 5 € ici, et une galère de deux heures là-bas.`], sd + 3) });
    if (p && !p[5]) L.push({ i: 'Gourde filtrante', t: pick([
      'L’eau du robinet n’y est pas potable. Gourde filtrante ou bouteilles, et on se méfie un peu des glaçons.',
      'Eau du robinet : on admire, on ne boit pas. Une gourde filtrante t’évitera bien des surprises.'], sd + 4) });
    if (p && p[4] === 'g') L.push({ i: '', t: 'On y roule à gauche. Regarde deux fois avant de traverser, et trois si tu loues une voiture.' });
    if (p && p[3] === 2) L.push({ i: '', t: 'Là-bas, le pourboire fait presque partie de l’addition. Garde quelques billets pour ne pas faire la tête au moment de payer.' });
    if (p && p[3] === 3) L.push({ i: '', t: 'Là-bas, le pourboire ne se fait pas, et il peut même gêner. Pour une fois, garde ta monnaie.' });
    if (days > 10) L.push({ i: 'Lessive de voyage', t: `${days} jours, c’est une belle aventure. Prévois une petite lessive plutôt que trois valises.` });
    else if (days && days <= 3) L.push({ i: '', t: 'Petit séjour, petite valise. Six paires de chaussures pour un week-end, ce n’est pas un plan, c’est un déménagement.' });
    // les indispensables qui servent partout, pour finir
    const gen = [
      { i: 'Batterie externe', t: 'Batterie externe chargée, sinon adieu GPS et photos au moment le plus beau.' },
      { i: 'Sacs de congélation', t: 'Glisse deux ou trois sacs de congélation : maillot mouillé, papiers sous la pluie, petite poubelle, ils servent à tout.' },
      { i: 'Masque pour les yeux', t: 'Un masque pour les yeux, parce que les rideaux occultants, ce n’est jamais garanti.' },
      { i: 'Paréo ou grand foulard', t: 'Un paréo, c’est une serviette, une couverture, un châle et un parasol. Le couteau suisse du textile.' },
      { i: 'Photo de tes papiers', t: 'Une photo de ton passeport sur ton téléphone. Tu ne t’en serviras sûrement pas, et c’est tant mieux.' }];
    const g2 = cold ? gen.filter(x => !/paréo/i.test(x.i)) : gen;
    L.push(g2[Math.abs(sd) % g2.length], g2[Math.abs(sd + 2) % g2.length]);
    const seen = new Set(); return L.filter(x => !seen.has(x.t) && seen.add(x.t)).slice(0, 5);
  }

  const card = (t, title) => { const L = motFor(t); if (!L.length) return '';
    return `<div class="mot"><div class="mot-h"><span class="mot-st">${SV.plane || ''}</span><div><b>${title || 'Le petit mot d’Eskalys'}</b><em>pour ${esc(place(t))}</em></div></div>
      <ul>${L.map(x => `<li>${esc(x.t)}</li>`).join('')}</ul><p class="mot-sig">Bon voyage, et n’oublie pas de tout noter dans ton carnet.</p></div>`; };
  window.motCard = card;
  window.motItems = t => motFor(t).filter(x => x.i).map(x => ({ k: 'val', l: x.i, d: '' }));

  // quelques jours avant le départ : le mot revient, une seule fois par voyage
  const KEY = id => 'escale:mot:' + id;
  function check() {
    if (typeof S === 'undefined' || !S.trips || typeof current === 'undefined' || current !== 'home') return false;
    const gt = document.querySelector('.gate'); if ((gt && !gt.hidden) || document.querySelector('.panel.open, .tour, .guide')) return false;
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const t = S.trips.find(x => { if (!x.du) return false; const d = Math.round((new Date(x.du) - now) / 864e5); try { return d >= 0 && d <= 5 && !localStorage.getItem(KEY(x.id)); } catch (_) { return false; } });
    if (!t) return false;
    try { localStorage.setItem(KEY(t.id), '1'); } catch (_) { }
    const d = Math.round((new Date(t.du) - now) / 864e5), when = d === 0 ? 'C’est le grand jour' : d === 1 ? 'Départ demain' : `Départ dans ${d} jours`;
    openPanel(`<h2>${when} !</h2>${card(t, 'Avant de boucler ta valise')}
      <button class="btn full" data-act="prep" data-trip="${t.id}">Voir ma valise et ma checklist<i>${SV.arrow}</i></button>${CLOSE('Merci Eskalys')}`);
    return true;
  }
  let tries = 0; const tm = setInterval(() => { tries++; if (check() || tries > 40) clearInterval(tm); }, 3000);   // essaie pendant 2 minutes, le temps que les voyages soient chargés
})();
