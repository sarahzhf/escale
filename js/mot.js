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
    if (trop) L.push({ m: 1, i: 'Anti-moustiques', t: pick([
      'Les moustiques de là-bas t’attendent avec impatience. Ne leur fais pas ce plaisir : anti-moustiques dans la valise.',
      'Anti-moustiques obligatoire. Sauf si ton rêve, c’est de servir de buffet à volonté.',
      'Petit conseil d’amie : l’anti-moustiques, c’est comme le passeport. On ne part pas sans.'], sd) });
    if (summer) L.push({ w: 1, i: 'Crème solaire', t: pick([
      'Il va faire chaud, vraiment chaud. Crème solaire, chapeau et lunettes : ton futur toi te dit déjà merci.',
      'Le soleil tape fort là-bas. La marque du maillot, c’est mignon deux jours, pas dix.',
      'Crème solaire en premier dans la valise. Le homard, c’est dans l’assiette, pas sur la plage.'], sd + 1) });
    if (cold) L.push({ w: 1, i: 'Bonnet, gants et écharpe', t: pick([
      'Ça va cailler. Bonnet, gants, et ce gros pull que tu caches au fond de l’armoire : c’est son moment.',
      'Prévois des couches, beaucoup de couches. Tu ressembleras à un oignon, mais un oignon au chaud.'], sd + 2) });
    if (!summer && !cold) L.push({ w: 1, i: 'Une veste légère', t: winter ? 'Il fait doux en journée, mais les soirées sont fraîches. Un pull dans le sac, et tu profites des terrasses jusqu’au bout.' : 'La météo de saison est d’humeur changeante. Une petite veste dans le sac, et elle ne pourra rien contre toi.' });
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
      <ul>${L.map(x => `<li${x.w ? ' data-w' : ''}${x.m ? ' data-moust' : ''}>${esc(x.t)}</li>`).join('')}</ul><div class="ip-slot" data-mode="mot" data-c="${t.pays}" data-trip="${t.id}"></div><div class="mot-wx" data-trip="${t.id}"></div><p class="mot-sig">Bon voyage, et n’oublie pas de tout noter dans ton carnet.</p></div>`; };
  window.motCard = card;
  const iso = d => d.toISOString().slice(0, 10);
  async function climat(t) {
    const ll = typeof coordsOf === 'function' ? coordsOf(t) : null; if (!ll || !t.du || !navigator.onLine) return null;
    const k = 'escale:climat:' + t.id + t.du + (t.au || ''); try { const c = JSON.parse(localStorage.getItem(k) || 'null'); if (c && Date.now() - c.at < 6 * 3600e3) return c; } catch (_) { }
    const now = new Date(); now.setHours(0, 0, 0, 0); let a = new Date(t.du), b = new Date(t.au || t.du); if (b - a > 13 * 864e5) b = new Date(a.getTime() + 13 * 864e5);
    const gap = Math.round((a - now) / 864e5); if (b < now) return null;
    let u, prev = false;
    if (gap <= 14) { if (a < now) a = now; if (b - now > 15 * 864e5) b = new Date(now.getTime() + 15 * 864e5);
      u = `https://api.open-meteo.com/v1/forecast?latitude=${ll[1]}&longitude=${ll[0]}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&start_date=${iso(a)}&end_date=${iso(b)}`; }
    else { prev = true; let yrs = a.getFullYear() - now.getFullYear() + 1;
      const sh = (d, n) => { const x = new Date(d); x.setFullYear(x.getFullYear() - n); return x; };
      if (sh(b, yrs) > new Date(now.getTime() - 5 * 864e5)) yrs++;
      const A = sh(a, yrs), B = sh(b, yrs);
      u = `https://archive-api.open-meteo.com/v1/archive?latitude=${ll[1]}&longitude=${ll[0]}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&start_date=${iso(A)}&end_date=${iso(B)}`; }
    try { const r = await fetch(u, { credentials: 'omit', referrerPolicy: 'no-referrer' }); if (!r.ok) return null; const j = await r.json(), D = j.daily || {};
      const mx = (D.temperature_2m_max || []).filter(x => x != null), mn = (D.temperature_2m_min || []).filter(x => x != null), pr = (D.precipitation_sum || []).filter(x => x != null);
      if (!mx.length) return null; const avg = v => v.reduce((x, y) => x + y, 0) / v.length;
      const c = { at: Date.now(), prev, max: Math.round(avg(mx)), min: Math.round(avg(mn)), lo: Math.round(Math.min(...mn)), rain: pr.filter(x => x >= 2).length, n: pr.length };
      try { localStorage.setItem(k, JSON.stringify(c)); } catch (_) { } return c; } catch (_) { return null; }
  }
  function wxLine(c, sd) {
    const src = c.prev ? 'D’après la météo de l’an dernier aux mêmes dates' : 'D’après les prévisions';
    let t;
    if (c.max >= 30) t = pick([`${src}, il fera autour de ${c.max}°C. Crème solaire, chapeau, et de l’eau toujours sur toi : la chaleur ne prévient pas.`, `${src} : ${c.max}°C en journée. Ton ventilateur portable va enfin servir à quelque chose.`], sd);
    else if (c.max >= 24) t = pick([`${src}, autour de ${c.max}°C en journée : short, lunettes et crème solaire, le combo gagnant.`, `${src} : autour de ${c.max}°C. Le temps parfait pour les terrasses, pense quand même à la crème solaire.`], sd);
    else if (c.max >= 15) t = `${src}, entre ${c.min} et ${c.max}°C. Un pull pour le soir, une veste légère, et c’est bon.`;
    else if (c.lo > 0) t = pick([`${src} : pas plus de ${c.max}°C. Manteau, écharpe, et le droit de râler un peu contre le froid.`, `${src}, ${c.max}°C au mieux. Le gros pull a enfin son heure de gloire.`], sd);
    else t = `${src}, ça descend jusqu’à ${c.lo}°C. Bonnet, gants, chaussettes chaudes : tu ressembleras à un oignon, mais un oignon au chaud.`;
    const L = [t];
    if (c.n && c.rain / c.n >= .4) L.push(`Il ${c.prev ? 'a plu' : 'devrait pleuvoir'} ${c.rain} jour${c.rain > 1 ? 's' : ''} sur ${c.n}${c.prev ? ' l’an dernier à cette période' : ''}. Parapluie ou k-way, sinon c’est douche gratuite.`);
    return L;
  }
  async function fillWx(el) { el.classList.add('done'); const t = typeof trip === 'function' ? trip(el.dataset.trip) : null; if (!t) return;
    const c = await climat(t); if (!c || !el.isConnected) return; const L = wxLine(c, seedOf(t.id)), ul = el.closest('.mot').querySelector('ul'), w = ul.querySelector('[data-w]');
    if (w) { w.textContent = L[0]; w.classList.add('mot-new'); } else ul.insertAdjacentHTML('afterbegin', `<li class="mot-new">${esc(L[0])}</li>`);
    if (L[1]) (w || ul.firstElementChild).insertAdjacentHTML('afterend', `<li class="mot-new">${esc(L[1])}</li>`); }
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1 && n.querySelectorAll) n.querySelectorAll('.mot-wx:not(.done)').forEach(fillWx); }))).observe(document.documentElement, { childList: true, subtree: true });
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
