/* Escale : interface principale (voyages, dépenses, journal, carte, assistant). */
'use strict';

/* ---------- calculs ---------- */
const fmt = n => Math.round(n || 0).toLocaleString('fr-FR') + ' €';
const C = t => COUNTRIES[t.pays] || COUNTRIES.FR;
/** Nom affiché d'un voyage : la ville si elle est renseignée, sinon le pays (roadtrip). */
const place = t => (t && t.ville) || C(t).n;
const fmtL = (n, t) => Math.round(n).toLocaleString('fr-FR') + ' ' + C(t).cur;
const trip = id => S.trips.find(t => t.id === id);
const sorted = () => S.trips.slice().sort((a, b) => D(b.du) - D(a.du));
const currentTrip = () => S.trips.find(t => info(t).enCours) || null;
function budgetsOf(t) { if (t.budgets) return t.budgets; const b = {}; Object.keys(CATS).forEach(k => b[k] = Math.round(t.budget * CATS[k].pct)); return b; }
function catsOf(t) { const c = {}; Object.keys(CATS).forEach(k => c[k] = 0); t.depenses.forEach(d => c[d.c] += myPart(d)); return c; }
const spentOf = t => Object.values(catsOf(t)).reduce((a, b) => a + b, 0);
function daysOf(t) { const n = Math.max(1, info(t).jour || info(t).jours), a = Array(n).fill(0); t.depenses.forEach(d => { if (d.c !== 'logement' && d.j <= n) a[d.j - 1] += myPart(d); }); return a; }
function projection(t) { const f = info(t); if (!f.enCours) return {}; const c = catsOf(t), b = budgetsOf(t); let worst = null;
  const once = {}; t.depenses.forEach(d => { if (d.c === 'transport' && ['avion', 'train', 'voiture', 'bateau'].includes(d.s)) once[d.c] = (once[d.c] || 0) + myPart(d); });
  Object.keys(CATS).forEach(k => { if (k === 'logement') return; const fix = once[k] || 0, proj = fix + (c[k] - fix) / f.jour * f.jours, over = proj - b[k]; if (over > 0 && (!worst || over > worst.over)) worst = { k, proj, over }; }); return { worst }; }
function noteFor(t) {
  const f = info(t), c = catsOf(t), s = spentOf(t);
  if (s === 0) return 'Ajoute tes premières dépenses : je te dirai où part ton argent et si tu tiens ton budget.';
  if (f.enCours) { const p = projection(t); return p.worst ? `Au rythme actuel, le poste ${CATS[p.worst.k].n.toLowerCase()} finira autour de ${fmt(p.worst.proj)} pour ${fmt(budgetsOf(t)[p.worst.k])} prévus. Le reste suit le budget.` : 'Toutes les catégories suivent le budget pour l’instant.'; }
  if (f.futur) return 'Le voyage n’a pas encore commencé.';
  const diff = s - t.budget, pct = t.budget ? Math.round(Math.abs(diff) / t.budget * 100) : 0, big = Object.entries(c).filter(([k]) => k !== 'logement').sort((a, b) => b[1] - a[1])[0];
  return diff <= 0 ? `Voyage bouclé ${pct} % sous le budget. Hors logement, ton plus gros poste a été ${CATS[big[0]].n.toLowerCase()} (${fmt(big[1])}).` : `Dépassement de ${fmt(diff)}, soit ${pct} %. Le logement pèse ${Math.round(c.logement / s * 100)} % du total.`;
}
const caps = s => s.toUpperCase();
const photosCount = t => (t.cover ? 1 : 0) + t.entrees.reduce((a, e) => a + e.photos.filter(Boolean).length, 0);
const short = t => place(t).split(' et ')[0];
/** Ta part d'une dépense : tout si elle n'est pas partagée, sinon ta part du partage. */
const myPart = d => !d.split || !d.split.length ? (d.by && d.by !== 'me' ? 0 : d.eur) : d.split.includes('me') ? d.eur / d.split.length : 0;
/** Montant en devise affiché pour une dépense (devise du pays ou autre devise choisie). */
const fmtD = (d, t) => d.cur ? (Math.round(d.v * 100) / 100).toLocaleString('fr-FR') + ' ' + d.cur : fmtL(d.v, t);
/* sous-catégories (facultatives) et séjours sur plusieurs nuits */
const SUBS = {
  logement: { hotel: 'Hôtel', location: 'Location', auberge: 'Auberge', camping: 'Camping', habitant: "Chez l'habitant" },
  repas: { restaurant: 'Restaurant', cafe: 'Café, snack', courses: 'Courses', bar: 'Bar' },
  transport: { avion: 'Avion', train: 'Train', bus: 'Bus, car', local: 'Métro, tram', taxi: 'Taxi, VTC', voiture: 'Location de voiture', carburant: 'Carburant, péage', bateau: 'Bateau' },
  activites: { visite: 'Visite, musée', excursion: 'Excursion', spectacle: 'Spectacle', sport: 'Sport, loisirs' },
  shopping: { souvenirs: 'Souvenirs', vetements: 'Vêtements', cadeaux: 'Cadeaux' },
};
const subName = d => (d.s && SUBS[d.c] && SUBS[d.c][d.s]) || '';
const nightsOf = d => d.j2 && d.j2 > d.j ? d.j2 - d.j + 1 : 1;
/** Part d'une dépense attribuée au jour j : un séjour est réparti à parts égales sur ses nuits. */
const dayShare = (d, j) => d.j2 && d.j2 > d.j ? (j >= d.j && j <= d.j2 ? myPart(d) / nightsOf(d) : 0) : (d.j === j ? myPart(d) : 0);
const coversAny = (d, ok) => { for (let j = d.j; j <= (d.j2 && d.j2 > d.j ? d.j2 : d.j); j++) if (ok(j)) return true; return false; };
const stayTxt = (d, t) => d.j2 && d.j2 > d.j ? `${nightsOf(d)} nuits, du ${fd(addDays(t.du, d.j - 1))} au ${fd(addDays(t.du, d.j2 - 1))}, ${fmt(d.eur / nightsOf(d))} par nuit` : '';
const expMeta = (d, t) => [d.m, subName(d) || CATS[d.c].n, stayTxt(d, t)].filter(Boolean).join(', ');
const pct = (a, b) => b ? Math.min(100, a / b * 100) : 0;

/* ---------- photos ---------- */
let photoTarget = null;
function phHTML(src, target, label = 'Ajouter une photo') {
  return `<div class="ph ${src ? 'has' : ''}">${src ? IMG(src) : ''}<button class="add" data-photo="${esc(target)}" aria-label="${esc(label)}">${SV.cam}<span>${esc(label)}</span></button>${src ? `<button class="rm" data-rmphoto="${esc(target)}" aria-label="Retirer la photo">${SV.x}</button>` : ''}</div>`;
}
function getPhoto(target) { const [id, kind, ei, pi] = target.split('|'); const t = trip(id); if (!t) return null; if (kind === 'cover') return t.cover; const e = t.entrees.find(x => x.id === ei); return e ? e.photos[+pi] : null; }
function setPhoto(target, val) {
  const [id, kind, ei, pi] = target.split('|'); const t = trip(id); if (!t) return;
  const old = getPhoto(target); if (old && old !== val) releaseMedia(old);
  if (kind === 'cover') t.cover = val; else { const e = t.entrees.find(x => x.id === ei); if (e) e.photos[+pi] = val; }
}
const kindOf = target => target.startsWith('me|') ? target.split('|')[1] : target.startsWith('compose|') || target.startsWith('chal|') ? 'post' : target.split('|')[1] === 'cover' ? 'trip' : 'journal';
function pickPhoto(target) { photoTarget = target; $('file').value = ''; $('file').click(); }
$('file').addEventListener('change', async e => {
  const f = e.target.files[0], target = photoTarget; if (!f || !target) return;
  toast('Envoi de la photo…');
  try { const path = await uploadPhoto(f, kindOf(target)); await onPhoto(target, path); }
  catch (err) { toast(errMsg(err)); }
});
async function onPhoto(target, path) { setPhoto(target, path); save(); refresh(); toast('Photo ajoutée'); }

/* ---------- clics ---------- */
document.addEventListener('click', e => {
  const p = e.target.closest('[data-photo]'); if (p) { e.stopPropagation(); pickPhoto(p.dataset.photo); return; }
  const r = e.target.closest('[data-rmphoto]'); if (r) { e.stopPropagation(); setPhoto(r.dataset.rmphoto, null); save(); refresh(); toast('Photo retirée'); return; }
  const a = e.target.closest('[data-act]'); if (a) { e.stopPropagation(); const f = ACT[a.dataset.act]; if (f) Promise.resolve(f(a.dataset, a, e)).catch(err => { console.warn(err); toast(errMsg(err)); }); return; }
  const o = e.target.closest('[data-open]'); if (o) { openTrip(o.dataset.open); return; }
  const g = e.target.closest('[data-go]'); if (g) { go(g.dataset.go); return; }
  const cl = e.target.closest('[data-close]'); if (cl) { closePanel(); return; }
}, true);
const ACT = {
  newTrip: () => tripSheet(), addExp: d => expSheet(d.trip || (currentTrip() || sorted()[0]).id, null, !!d.trip), addPage: d => pageSheet(d.trip || (currentTrip() || sorted()[0]).id),
  addWish: () => wishSheet(),
  rmWish: d => { S.envies = S.envies.filter(w => w.id !== d.id); save(); refresh(); toast('Envie retirée'); },
  go: d => go(d.to), back: () => go(prev && prev !== current ? prev : 'home'),
  editTrip: d => tripSheet(d.trip), budget: d => budgetSheet(d.trip), pageMenu: d => pageMenu(d.trip, d.entry),
  addSlot: d => { const t = trip(d.trip), e = t.entrees.find(x => x.id === d.entry); if (e.photos.length < 6) { e.photos.push(null); save(); refresh(); } },
  addPlace: d => placeInput(d.trip),
  rmPlace: d => { const t = trip(d.trip), l = t.lieux[+d.i]; t.lieux.splice(+d.i, 1); save(); refresh(); if (l) toast(`${l} retiré des lieux`); },
  fav: d => { const t = trip(d.trip); t.fav = !t.fav; save(); refresh(); toast(t.fav ? 'Ajouté aux favoris' : 'Retiré des favoris'); },
  share: d => { const t = trip(d.trip), txt = `${place(t)}, ${fd(t.du)} au ${fd(t.au)} : ${fmt(spentOf(t))} pour ${info(t).jours} jours.`; copyText(txt, 'Résumé du carnet copié'); },
  depTrip: d => { depId = d.trip; go('depenses'); }, editExp: d => expSheet(d.trip, d.id),
  catFilter: d => { const t = trip(depId); openTrip(t.id); expF = { trip: t.id, y: null, m: null, j: null, c: d.k || null }; dTab = 'depenses'; openTrip(t.id, true); },
  flip: () => $('flipcard').classList.toggle('on'), ask: d => { go('ia'); ask(d.q); },
};
function copyText(txt, ok) { try { navigator.clipboard.writeText(txt).then(() => toast(ok), () => toast('Copie impossible sur cet appareil')); } catch (e) { toast('Copie impossible sur cet appareil'); } }
const fromPanel = fn => (d = {}) => { if ($('panel').classList.contains('open') && !d.keep) { closePanel(); setTimeout(() => fn(d), 380); } else fn(d); };

/* ---------- fenêtres ---------- */
function openPanel(html, mount, opts = {}) {
  const p = $('panel'); p.innerHTML = `<div class="grab"></div>` + html; $('scrim').hidden = false;
  requestAnimationFrame(() => p.classList.add('open')); mount && mount(p);
  if (!opts.nofocus) setTimeout(() => { const f = p.querySelector('input:not([type=checkbox]),select,textarea'); f && f.focus({ preventScroll: true }); }, 350);
}
function closePanel() { $('panel').classList.remove('open'); setTimeout(() => { if (!$('panel').classList.contains('open')) $('scrim').hidden = true; }, 350); }
$('scrim').onclick = closePanel;
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('panel').classList.contains('open')) closePanel(); });
function confirmIn(p, text, yes, label = 'Supprimer') { const old = p.querySelector('.confirm'); if (old) old.remove(); const d = document.createElement('div'); d.className = 'confirm'; d.innerHTML = `<span>${esc(text)}</span><button class="no">Annuler</button><button class="yes">${esc(label)}</button>`; p.appendChild(d); d.querySelector('.no').onclick = () => d.remove(); d.querySelector('.yes').onclick = yes; d.scrollIntoView({ block: 'nearest' }); }
const CLOSE = label => `<button class="ghostbtn" data-close>${label || 'Annuler'}</button>`;

function tripSheet(id) {
  const t = id ? trip(id) : null;
  openPanel(`<h2>${t ? 'Modifier le voyage' : 'Nouveau voyage'}</h2><p class="small">${t ? 'Change les infos de ce carnet.' : 'Un carnet se crée avec des emplacements vides pour tes photos.'} Les champs marqués <span class="req">*</span> sont obligatoires.</p>
   <label class="fld" data-f="pays"><span>Pays <span class="req">*</span></span><input id="f-pays" list="pays-list" autocomplete="off" maxlength="40" placeholder="Tape un pays, ex. Italie" value="${t ? esc(C(t).n) : ''}" required>${paysList()}<em class="ferr"></em></label>
   <label class="fld" data-f="ville"><span>Ville ou région <i class="opt">facultatif</i></span><input id="f-ville" maxlength="80" value="${t ? esc(t.ville) : ''}" placeholder="Ex. Naples, ou laisse vide pour un roadtrip"></label>
   <div class="two"><label class="fld" data-f="du"><span>Départ <span class="req">*</span></span><input id="f-du" type="date" required value="${t ? t.du : addDays(TODAY, 30)}"><em class="ferr"></em></label><label class="fld" data-f="au"><span>Retour <span class="req">*</span></span><input id="f-au" type="date" required value="${t ? t.au : addDays(TODAY, 36)}"><em class="ferr"></em></label></div>
   <label class="fld" data-f="bud"><span>Budget total en euros <span class="req">*</span></span><input id="f-bud" type="number" inputmode="numeric" min="0" max="10000000" required value="${t ? t.budget : 900}"><em class="ferr"></em></label>
   <button class="btn full" id="f-ok">${t ? 'Enregistrer' : 'Créer le carnet'}<i>${SV.arrow}</i></button>
   ${t ? `<button class="danger" id="f-del">Supprimer ce carnet</button>` : ''}${CLOSE()}`, p => {
    const bad = (k, msg) => { const f = p.querySelector(`[data-f="${k}"]`); f.classList.add('bad'); f.querySelector('.ferr').textContent = msg; return true; };
    p.querySelectorAll('.fld input').forEach(i => i.addEventListener('input', () => { const f = i.closest('.fld'); f.classList.remove('bad'); const e = f.querySelector('.ferr'); if (e) e.textContent = ''; }));
    p.querySelector('#f-ok').onclick = () => {
      p.querySelectorAll('.fld.bad').forEach(f => { f.classList.remove('bad'); f.querySelector('.ferr').textContent = ''; });
      const ville = p.querySelector('#f-ville').value.trim(), du = p.querySelector('#f-du').value, au = p.querySelector('#f-au').value, bt = p.querySelector('#f-bud').value, b = +bt, praw = p.querySelector('#f-pays').value.trim(), pays = paysCode(praw);
      let ko = false;
      if (!praw) ko = bad('pays', 'Indique le pays du voyage');
      else if (!pays) ko = bad('pays', 'Pays non reconnu, choisis-le dans les suggestions');
      if (!du) ko = bad('du', 'Indique la date de départ');
      if (!au) ko = bad('au', 'Indique la date de retour');
      else if (du && D(au) < D(du)) ko = bad('au', 'Le retour doit suivre le départ');
      else if (du && diffDays(du, au) > 365) ko = bad('au', 'Un voyage dure un an au maximum');
      if (bt === '' || !(b >= 0) || b > 1e7) ko = bad('bud', 'Indique un budget, même approximatif (0 accepté)');
      if (ko) { const f = p.querySelector('.fld.bad input'); f && f.focus(); toast('Il manque des informations'); return; }
      if (t) { Object.assign(t, { pays, ville, du, au, budget: b }); if (t.budgets) { const tot = Object.values(t.budgets).reduce((a, c) => a + c, 0); if (tot !== b) t.budgets = null; } save(); closePanel(); refresh(); toast('Carnet mis à jour'); }
      else { const nt = { id: uid(), pays, ville, du, au, budget: b, cover: null, fav: false, vis: 'prive', lieux: [], membres: [], reglements: [], entrees: [{ id: uid(), j: 1, t: 'Premier jour', n: '', photos: [null, null] }], depenses: [] };
        S.trips.push(nt); S.envies = S.envies.filter(w => w.pays !== pays); save(); closePanel(); setTimeout(() => openTrip(nt.id), 380); toast('Carnet créé'); }
    };
    const del = p.querySelector('#f-del'); if (del) del.onclick = () => confirmIn(p, 'Supprimer ce carnet, ses dépenses et ses photos ?', () => {
      [t.cover, ...t.entrees.flatMap(e => e.photos)].forEach(releaseMedia);
      S.trips = S.trips.filter(x => x.id !== t.id); save(); closePanel(); go('home'); toast('Carnet supprimé'); });
  });
}
/* commerçant : texte libre, espaces et caractères invisibles retirés ; propositions = ceux déjà utilisés */
const cleanMerchant = v => { const m = String(v || '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60); return m || null; };
function merchantsUsed() { const n = {}; S.trips.forEach(t => t.depenses.forEach(d => { if (d.m) n[d.m] = (n[d.m] || 0) + 1; })); return Object.keys(n).sort((a, b) => n[b] - n[a] || a.localeCompare(b, 'fr')).slice(0, 40); }
function expSheet(tid, eid, lock) {
  let t = trip(tid); const d = eid ? t.depenses.find(x => x.id === eid) : null;
  // E = euros, L = devise du pays, X = autre devise (ex. dollars au Cambodge, roadtrip sur plusieurs pays)
  let cur = d ? (d.v == null ? 'E' : d.cur ? 'X' : 'L') : (C(t).rate !== 1 ? 'L' : 'E'), xcur = d && d.cur ? d.cur : 'USD', cat = d ? d.c : 'repas';
  let by = d ? d.by || 'me' : 'me', split = d && d.split ? d.split.slice() : null;
  let sub = d ? d.s || null : null, stay = d && d.j2 && d.j2 > d.j ? (d.j === 1 && d.j2 === info(t).jours ? 'all' : 'n') : '1';
  openPanel(`<h2>${d ? 'Modifier la dépense' : 'Nouvelle dépense'}</h2>${d || lock ? `<p class="small">${esc(place(t))}</p>` : ''}
   ${d || lock ? '' : `<label class="fld"><span>Voyage</span><select id="e-trip">${sorted().map(x => `<option value="${x.id}" ${x.id === tid ? 'selected' : ''}>${esc(place(x))}</option>`).join('')}</select></label>`}
   <div style="display:flex;justify-content:center;margin-top:12px"><div class="seg" id="e-cur"></div></div>
   <div class="xcur" id="e-xwrap" hidden><select id="e-x" aria-label="Devise">${curList().map(c => `<option value="${c}" ${c === xcur ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
   <div class="amount"><input id="e-amt" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0" aria-label="Montant" value="${d ? (d.v != null ? d.v : Math.round(d.eur * 100) / 100) : ''}"></div>
   <p class="conv num" id="e-conv"></p>
   <div class="fld"><span>Catégorie</span><div class="picker" id="e-cat">${Object.keys(CATS).map(k => `<button class="pill ${k === cat ? 'on' : ''}" data-c="${k}" type="button">${CATS[k].n}</button>`).join('')}</div></div>
   <div class="fld"><span>Précision <i class="opt">facultatif</i></span><div class="picker sub" id="e-sub"></div></div>
   <label class="fld"><span>Description</span><input id="e-lbl" maxlength="80" value="${d ? esc(d.l) : ''}" placeholder="Ex. Dîner à Gion"></label>
   <label class="fld"><span>Commerçant <i class="opt">facultatif</i></span><input id="e-mer" maxlength="60" list="e-merl" autocomplete="off" value="${d && d.m ? esc(d.m) : ''}" placeholder="Ex. Nishiki Market, Uber, Hôtel Kyoto"><datalist id="e-merl">${merchantsUsed().map(m => `<option value="${esc(m)}"></option>`).join('')}</datalist></label>
   <div id="e-stay" hidden><div class="fld"><span>Durée du séjour</span><div class="seg wide" id="e-stayk"><button type="button" data-v="1">Une nuit</button><button type="button" data-v="n">Plusieurs nuits</button><button type="button" data-v="all">Tout le voyage</button></div></div></div>
   <div class="two"><label class="fld"><span id="e-dayl">Jour</span><select id="e-day"></select></label><label class="fld" id="e-day2w" hidden><span>Dernière nuit</span><select id="e-day2"></select></label></div>
   <p class="small num" id="e-pernight"></p>
   <div id="e-grp"></div>
   ${!navigator.onLine ? `<p class="offnote">${SV.cloudOff}Hors connexion : la dépense est gardée sur ton téléphone et partira toute seule au retour du réseau.</p>` : ''}
   <button class="btn full" id="e-ok">${d ? 'Enregistrer' : 'Ajouter au carnet'}<i>${SV.arrow}</i></button>
   ${d ? `<button class="danger" id="e-del">Supprimer cette dépense</button>` : ''}${CLOSE()}`, p => {
    const rate = () => cur === 'L' ? C(t).rate : cur === 'X' ? rateFor(xcur) : 1;
    const curName = () => cur === 'L' ? C(t).cur : cur === 'X' ? xcur : '€';
    const segs = () => { const l = C(t).rate !== 1;
      if (cur === 'L' && !l) cur = 'E';
      p.querySelector('#e-cur').innerHTML = `<button type="button" data-v="E" class="${cur === 'E' ? 'on' : ''}">Euros</button>` + (l ? `<button type="button" data-v="L" class="${cur === 'L' ? 'on' : ''}">${esc(C(t).cur)}</button>` : '') + `<button type="button" data-v="X" class="${cur === 'X' ? 'on' : ''}">Autre</button>`;
      p.querySelector('#e-xwrap').hidden = cur !== 'X';
      p.querySelectorAll('#e-cur button').forEach(b => b.onclick = () => { cur = b.dataset.v; segs(); conv(); }); };
    const days = () => { const n = info(t).jours, cd = info(t).enCours ? info(t).jour : 1, opt = sel => Array.from({ length: n }, (_, i) => `<option value="${i + 1}" ${sel === i + 1 ? 'selected' : ''}>Jour ${i + 1}, ${fd(addDays(t.du, i))}</option>`).join('');
      p.querySelector('#e-day').innerHTML = opt(d ? d.j : cd); p.querySelector('#e-day2').innerHTML = opt(d && d.j2 ? d.j2 : Math.min(n, (d ? d.j : cd) + 1)); };
    const subs = () => { const L = SUBS[cat] || {}; if (sub && !L[sub]) sub = null;
      p.querySelector('#e-sub').innerHTML = Object.entries(L).map(([k, n]) => `<button type="button" class="pill ${sub === k ? 'on' : ''}" data-s="${k}">${n}</button>`).join('');
      p.querySelectorAll('#e-sub .pill').forEach(b => b.onclick = () => { sub = sub === b.dataset.s ? null : b.dataset.s; subs(); }); };
    const stayUI = () => { const lg = cat === 'logement', n = info(t).jours; p.querySelector('#e-stay').hidden = !lg; if (!lg) stay = '1';
      p.querySelectorAll('#e-stayk button').forEach(b => b.classList.toggle('on', b.dataset.v === stay));
      if (stay === 'all') { p.querySelector('#e-day').value = '1'; p.querySelector('#e-day2').value = String(n); }
      p.querySelector('#e-day2w').hidden = !(lg && stay !== '1'); p.querySelector('#e-dayl').textContent = lg ? (stay === '1' ? 'Nuit du' : 'Première nuit') : 'Jour';
      p.querySelector('#e-day').disabled = p.querySelector('#e-day2').disabled = stay === 'all';
      p.querySelector('.amount input').setAttribute('aria-label', lg && stay !== '1' ? 'Prix total du séjour' : 'Montant'); perNight(); };
    const nights = () => { if (cat !== 'logement' || stay === '1') return 1; const a = +p.querySelector('#e-day').value, b = +p.querySelector('#e-day2').value; return b > a ? b - a + 1 : 1; };
    const perNight = () => { const el = p.querySelector('#e-pernight'), v = +p.querySelector('#e-amt').value / rate(), n = nights();
      el.textContent = cat === 'logement' && stay !== '1' ? (n > 1 ? (v ? `Prix total du séjour : ${n} nuits, soit ${fmt(v / n)} par nuit, réparti automatiquement jour par jour.` : `Indique le prix total pour les ${n} nuits : Escale le répartit par nuit.`) : 'Choisis une dernière nuit après la première.') : ''; };
    const conv = () => { const v = +p.querySelector('#e-amt').value, r = rate(); const out = p.querySelector('#e-conv');
      if (!v) { out.textContent = cur === 'E' ? '' : `1 € = ${fmtRate(r)} ${curName()}, ${rateNote()}`; return; }
      out.textContent = cur === 'E' ? (C(t).rate !== 1 ? `soit ${fmtL(v * C(t).rate, t)}, ${rateNote()}` : '') : `soit ${(v / r).toFixed(2).replace('.', ',')} €, 1 € = ${fmtRate(r)} ${curName()} (${rateNote()})`; };
    const grp = () => { const box = p.querySelector('#e-grp'), M = t.membres || []; if (!M.length) { box.innerHTML = `<button type="button" class="link small" id="e-addm">${SV.userPlus}Dépense partagée ? Ajoute des amis au voyage</button>`; box.querySelector('#e-addm').onclick = () => { closePanel(); setTimeout(() => membersSheet(t.id), 380); }; return; }
      const all = ['me', ...M.map(m => m.id)]; if (!split) split = all.slice();
      box.innerHTML = `<div class="fld"><span>Payé par</span><div class="picker" id="e-by">${all.map(id => `<button type="button" class="pill ${by === id ? 'on' : ''}" data-id="${id}">${esc(memberName(t, id))}</button>`).join('')}</div></div>
        <div class="fld"><span>Pour qui <i class="opt">touche pour retirer</i></span><div class="picker" id="e-sp">${all.map(id => `<button type="button" class="pill ${split.includes(id) ? 'on' : ''}" data-id="${id}">${esc(memberName(t, id))}</button>`).join('')}</div><em class="small" id="e-each"></em></div>`;
      box.querySelectorAll('#e-by .pill').forEach(b => b.onclick = () => { by = b.dataset.id; grp(); });
      box.querySelectorAll('#e-sp .pill').forEach(b => b.onclick = () => { const id = b.dataset.id; split = split.includes(id) ? split.filter(x => x !== id) : [...split, id]; if (!split.length) { split = [id]; toast('Au moins une personne'); } grp(); });
      each(); };
    const each = () => { const e = p.querySelector('#e-each'); if (!e || !split) return; const v = +p.querySelector('#e-amt').value / rate(); e.textContent = v ? `${fmt(v / split.length)} par personne (${split.length})` : ''; };
    segs(); days(); conv(); grp(); subs(); stayUI();
    p.querySelectorAll('#e-stayk button').forEach(b => b.onclick = () => { stay = b.dataset.v; stayUI(); });
    p.querySelector('#e-day').onchange = p.querySelector('#e-day2').onchange = () => { const a = p.querySelector('#e-day'), b = p.querySelector('#e-day2'); if (+b.value < +a.value) b.value = a.value; perNight(); };
    p.querySelector('#e-amt').oninput = () => { conv(); each(); perNight(); };
    p.querySelector('#e-x').onchange = e => { xcur = e.target.value; conv(); each(); };
    const ts = p.querySelector('#e-trip'); if (ts) ts.onchange = () => { t = trip(ts.value); cur = C(t).rate !== 1 ? 'L' : 'E'; by = 'me'; split = null; segs(); days(); conv(); grp(); stayUI(); };
    p.querySelectorAll('#e-cat .pill').forEach(b => b.onclick = () => { cat = b.dataset.c; p.querySelectorAll('#e-cat .pill').forEach(x => x.classList.toggle('on', x === b)); subs(); stayUI(); });
    p.querySelector('#e-ok').onclick = () => {
      const v = +p.querySelector('#e-amt').value; if (!(v > 0) || v > 1e9) { toast('Indique un montant'); p.querySelector('#e-amt').focus(); return; }
      const eur = v / rate(); if (eur > 1e7) { toast('Montant trop élevé'); return; }
      const M = t.membres || [], shared = M.length && split && !(split.length === 1 && split[0] === 'me' && by === 'me');
      const j1 = +p.querySelector('#e-day').value, j2 = cat === 'logement' && stay !== '1' && +p.querySelector('#e-day2').value > j1 ? +p.querySelector('#e-day2').value : null;
      if (cat === 'logement' && stay === 'n' && !j2) { toast('Choisis une dernière nuit après la première'); return; }
      const rec = { j: j1, j2, s: sub, l: p.querySelector('#e-lbl').value.trim().slice(0, 80) || (sub ? SUBS[cat][sub] : CATS[cat].n), c: cat, m: cleanMerchant(p.querySelector('#e-mer').value), v: cur === 'E' ? null : v, cur: cur === 'X' ? xcur : null, eur, by: M.length ? by : 'me', split: shared ? split : null };
      if (d) { Object.assign(d, rec); save(); closePanel(); refresh(); toast(navigator.onLine ? 'Dépense mise à jour' : 'Dépense mise à jour sur ton téléphone'); return; }
      t.depenses.push({ id: uid(), ...rec, at: new Date().toISOString() }); save(); flyAndDone(rec, t);
    };
    const del = p.querySelector('#e-del'); if (del) del.onclick = () => confirmIn(p, 'Supprimer cette dépense ?', () => { t.depenses = t.depenses.filter(x => x.id !== d.id); save(); closePanel(); refresh(); toast('Dépense supprimée'); });
  });
}
function flyAndDone(rec, t) {
  const ph = $('phone').getBoundingClientRect(), from = $('e-ok').getBoundingClientRect(), nb = document.querySelector('nav [data-go=depenses]'), to = nb.getBoundingClientRect();
  const f = document.createElement('div'); f.className = 'flyer num'; f.textContent = (rec.v != null ? fmtD(rec, t) : fmt(rec.eur)) + '  ' + rec.l; $('phone').appendChild(f);
  f.style.left = (from.left - ph.left + from.width / 2 - 70) + 'px'; f.style.top = (from.top - ph.top - 40) + 'px'; closePanel();
  const done = () => { f.remove(); nb.classList.remove('ping'); void nb.offsetWidth; nb.classList.add('ping'); depId = t.id; if (current === 'carnet' && openId === t.id) openTrip(t.id, true); else if (current === 'depenses') renderDepenses(true); else go('depenses'); toast(navigator.onLine ? 'Dépense ajoutée' : 'Dépense notée, elle partira au retour du réseau'); };
  if (window.gsap && !REDUCED && !document.querySelector('nav').hidden) gsap.timeline({ onComplete: done }).to(f, { y: -60, rotation: -5, scale: 1.08, duration: .35, ease: 'power2.out' }).to(f, { x: to.left - from.left + to.width / 2 - from.width / 2, y: to.top - from.top + 40, scale: .2, opacity: 0, duration: .6, ease: 'power2.in' });
  else done();
}
function pageSheet(tid, eid) {
  const t = trip(tid), e = eid ? t.entrees.find(x => x.id === eid) : null, n = info(t).jours;
  let k = e ? e.photos.length : 2;
  openPanel(`<h2>${e ? 'Modifier la page' : 'Nouvelle page'}</h2><p class="small">${esc(place(t))}</p>
   <label class="fld"><span>Titre</span><input id="p-t" maxlength="80" value="${e ? esc(e.t) : ''}" placeholder="Ex. Balade à Trastevere"></label>
   <label class="fld"><span>Description <i class="opt">facultatif</i></span><input id="p-d" maxlength="200" value="${e ? esc(e.d || '') : ''}" placeholder="Ex. Pique-nique au bord du Tibre"></label>
   <label class="fld"><span>Ton texte, tes notes</span><textarea id="p-n" maxlength="2000" placeholder="Ce que tu veux retenir de cette journée">${e ? esc(e.n) : ''}</textarea></label>
   <div class="two"><label class="fld"><span>Jour</span><select id="p-j">${Array.from({ length: n }, (_, i) => `<option value="${i + 1}" ${(e ? e.j : Math.min(n, (info(t).jour || 1))) === i + 1 ? 'selected' : ''}>Jour ${i + 1}, ${fd(addDays(t.du, i))}</option>`).join('')}</select></label>
   <div class="fld"><span>Emplacements photo</span><div class="seg" id="p-k">${[1, 2, 3, 4].map(i => `<button type="button" data-k="${i}" class="${i === k ? 'on' : ''}">${i}</button>`).join('')}</div></div></div>
   <button class="btn full" id="p-ok">${e ? 'Enregistrer' : 'Ajouter la page'}<i>${SV.arrow}</i></button>
   ${e ? `<button class="danger" id="p-del">Supprimer cette page</button>` : ''}${CLOSE()}`, p => {
    p.querySelectorAll('#p-k button').forEach(b => b.onclick = () => { k = +b.dataset.k; p.querySelectorAll('#p-k button').forEach(x => x.classList.toggle('on', x === b)); });
    p.querySelector('#p-ok').onclick = () => { const ti = p.querySelector('#p-t').value.trim(); if (!ti) { toast('Donne un titre à la page'); return; }
      const rec = { t: ti.slice(0, 80), d: p.querySelector('#p-d').value.trim().slice(0, 200), n: p.querySelector('#p-n').value.trim().slice(0, 2000), j: +p.querySelector('#p-j').value };
      if (e) { Object.assign(e, rec); if (k > e.photos.length) e.photos = e.photos.concat(Array(k - e.photos.length).fill(null)); else if (k < e.photos.length) { const kept = e.photos.filter(Boolean); e.photos = kept.slice(0, Math.max(k, kept.length)).concat(Array(Math.max(0, k - kept.length)).fill(null)); } }
      else t.entrees.push({ id: uid(), ...rec, st: [], photos: Array(k).fill(null) });
      t.entrees.sort((a, b) => a.j - b.j); save(); closePanel(); refresh(); toast(e ? 'Page mise à jour' : 'Page ajoutée, ajoute tes photos'); };
    const del = p.querySelector('#p-del'); if (del) del.onclick = () => confirmIn(p, 'Supprimer cette page et ses photos ?', () => { e.photos.forEach(releaseMedia); (e.st || []).forEach(x => releaseMedia(x.p)); t.entrees = t.entrees.filter(x => x.id !== e.id); save(); closePanel(); refresh(); toast('Page supprimée'); });
  });
}
function pageMenu(tid, eid) {
  openPanel(`<h2>Cette page</h2><div class="menulist">
    <button id="m-edit">${SV.edit}Modifier le texte et le jour</button>
    <button id="m-photo">${SV.cam}Ajouter un emplacement photo</button>
    <button id="m-del" class="red">${SV.trash}Supprimer la page</button></div>${CLOSE('Fermer')}`, p => {
    p.querySelector('#m-edit').onclick = () => { closePanel(); setTimeout(() => pageSheet(tid, eid), 360); };
    p.querySelector('#m-photo').onclick = () => { ACT.addSlot({ trip: tid, entry: eid }); closePanel(); };
    p.querySelector('#m-del').onclick = () => confirmIn(p, 'Supprimer cette page ?', () => { const t = trip(tid), e = t.entrees.find(x => x.id === eid); if (e) e.photos.forEach(releaseMedia); t.entrees = t.entrees.filter(x => x.id !== eid); save(); closePanel(); refresh(); toast('Page supprimée'); });
  }, { nofocus: true });
}
function budgetSheet(tid) {
  const t = trip(tid), b = budgetsOf(t);
  openPanel(`<h2>Budget</h2><p class="small">${esc(place(t))}, en euros</p>
   <label class="fld"><span>Budget total</span><input id="b-tot" type="number" inputmode="numeric" min="0" value="${t.budget}"></label>
   ${Object.keys(CATS).map(k => `<label class="fld"><span>${CATS[k].n}</span><input data-k="${k}" class="b-cat" type="number" inputmode="numeric" min="0" value="${b[k]}"></label>`).join('')}
   <p class="small" id="b-sum" style="margin-top:10px"></p>
   <button class="btn full" id="b-ok">Enregistrer<i>${SV.arrow}</i></button>${CLOSE()}`, p => {
    const sum = () => { const s = [...p.querySelectorAll('.b-cat')].reduce((a, i) => a + (+i.value || 0), 0); p.querySelector('#b-sum').textContent = `Total des catégories : ${fmt(s)}${s !== +p.querySelector('#b-tot').value ? ', différent du budget total' : ''}`; };
    p.querySelectorAll('input').forEach(i => i.oninput = sum); sum();
    p.querySelector('#b-ok').onclick = () => { const tot = +p.querySelector('#b-tot').value; if (!(tot > 0) || tot > 1e7) { toast('Indique un budget'); return; }
      t.budget = tot; t.budgets = {}; p.querySelectorAll('.b-cat').forEach(i => t.budgets[i.dataset.k] = Math.max(0, Math.min(1e7, +i.value || 0))); save(); closePanel(); refresh(); toast('Budget mis à jour'); };
  });
}
function wishSheet() {
  openPanel(`<h2>Nouvelle envie</h2><p class="small">Elle apparaîtra sur ta carte et ton globe.</p>
   <label class="fld"><span>Pays</span><input id="w-p" list="pays-list" autocomplete="off" maxlength="40" placeholder="Tape un pays, ex. Mexique">${paysList()}</label>
   <label class="fld"><span>Note</span><input id="w-n" maxlength="80" placeholder="Ex. Pour mes 30 ans"></label>
   <button class="btn full" id="w-ok">Ajouter l'envie<i>${SV.arrow}</i></button>${CLOSE()}`, p => {
    p.querySelector('#w-ok').onclick = () => { const pays = paysCode(p.querySelector('#w-p').value); if (!pays) { toast('Pays non reconnu, choisis-le dans les suggestions'); return; }
      if (S.envies.some(w => w.pays === pays)) { toast('Ce pays est déjà dans tes envies'); return; }
      S.envies.push({ id: uid(), pays, note: p.querySelector('#w-n').value.trim().slice(0, 80) }); save(); closePanel(); refresh(); toast('Envie ajoutée'); };
  });
}
function placeInput(tid) {
  const wrap = document.querySelector('.screen:not([hidden]) .tags'), btn = wrap && wrap.querySelector('[data-act=addPlace]'); if (!btn) return;
  const inp = document.createElement('input'); inp.placeholder = 'Nouveau lieu'; inp.maxLength = 60; btn.replaceWith(inp); inp.focus();
  let fired = false; const done = () => { if (fired) return; fired = true; const v = inp.value.trim().slice(0, 60); const t = trip(tid); if (v && t.lieux.length < 50 && !t.lieux.includes(v)) { t.lieux.push(v); save(); } refresh(); };
  inp.onkeydown = e => { if (e.key === 'Enter') done(); if (e.key === 'Escape') { fired = true; refresh(); } }; inp.onblur = done;
}

/* ---------- fiche voyage ---------- */
let openId = null, dTab = 'apercu';
function openTrip(id, keep) {
  const t = trip(id); if (!t) return; if (openId !== id && !keep) dTab = 'apercu'; openId = id;
  const sc = $('s-carnet'), y = keep ? sc.scrollTop : 0;
  const f = info(t), c = catsOf(t), s = spentOf(t), diff = s - t.budget, pc = t.budget ? Math.round(Math.abs(diff) / t.budget * 100) : 0, d = daysOf(t), b = budgetsOf(t);
  const status = f.futur ? `Départ dans ${diffDays(TODAY, t.du)} jours` : f.enCours ? `En cours, jour ${f.jour} sur ${f.jours}` : diff <= 0 ? 'Budget tenu' : 'Budget dépassé';
  const allPh = [[t.cover, `${t.id}|cover`], ...t.entrees.flatMap(e => e.photos.map((p, i) => [p, `${t.id}|e|${e.id}|${i}`]))];
  const dayMap = {}; d.forEach((v, i) => dayMap[i + 1] = v);
  const top = Object.entries(c).sort((a, b2) => b2[1] - a[1])[0];
  let body = '';
  if (dTab === 'apercu') body = `
    <div class="igrid num"><button data-act="dtab" data-v="journal"><i>${SV.cal}</i><b>${f.jours} jours</b><span>${fd(t.du)}</span></button><button data-act="dtab" data-v="journal"><i>${SV.page}</i><b>${t.entrees.length} page${t.entrees.length > 1 ? 's' : ''}</b><span>Journal</span></button><button data-act="dtab" data-v="photos"><i>${SV.img}</i><b>${photosCount(t)}</b><span>Photo${photosCount(t) > 1 ? 's' : ''}</span></button><button data-act="dtab" data-v="depenses"><i>${SV.wallet}</i><b>${fmt(f.futur ? t.budget / f.jours : s / Math.max(1, f.jour))}</b><span>par jour</span></button></div>
    <div class="sec"><h2>À propos de ce voyage</h2><button class="more" data-act="editTrip" data-trip="${t.id}">Modifier</button></div>
    <p class="about">${t.entrees[0] && t.entrees[0].n ? esc(t.entrees[0].n) + ' ' : ''}${t.entrees.length} page${t.entrees.length > 1 ? 's' : ''} de souvenirs, ${t.lieux.length} lieu${t.lieux.length > 1 ? 'x' : ''} noté${t.lieux.length > 1 ? 's' : ''} et ${photosCount(t)} photo${photosCount(t) > 1 ? 's' : ''}.</p>
    <div class="tags">${t.lieux.map((l, i) => `<span class="pill">${esc(l)}<button class="x" data-act="rmPlace" data-trip="${t.id}" data-i="${i}" aria-label="Retirer ${esc(l)}">${SV.x.replace('<svg', '<svg width="11" height="11"')}</button></span>`).join('')}<button class="pill add" data-act="addPlace" data-trip="${t.id}">${SV.plus}Lieu</button></div>
    <div class="sec"><h2>Album</h2><button class="more" data-act="albumVis" data-trip="${t.id}">${esc(VISN[t.vis || 'prive'])}</button></div>
    <p class="small">${t.vis === 'public' ? 'Tout le monde peut voir les photos et les pages de ce carnet (jamais les dépenses).' : t.vis === 'amis' ? 'Tes amis peuvent voir les photos et les pages de ce carnet (jamais les dépenses).' : 'Ce carnet est privé : toi seule le vois.'}</p>
    <div class="sec"><h2>Budget</h2><button class="more" data-act="budget" data-trip="${t.id}">Modifier</button></div>
    <button class="bud num" data-act="depTrip" data-trip="${t.id}" aria-label="Voir l'analyse du budget"><div class="t"><b>${fmt(s)}</b><span>sur ${fmt(t.budget)}</span></div><div class="tr"><i class="${s > t.budget ? 'ko' : ''}" style="width:${pct(s, t.budget)}%"></i></div><div class="rw"><span>${f.futur ? 'Pas encore de dépenses' : f.enCours ? fmt(t.budget - s) + ' restants' : (diff <= 0 ? pc + ' % sous le budget' : pc + ' % au-dessus')}</span><span>${top[1] ? 'plus gros poste : ' + CATS[top[0]].n.toLowerCase() : ''}</span></div></button>
    <div class="sec"><h2>Moments</h2><button class="more" data-act="dtab" data-v="photos">Tout voir</button></div>
    <div class="mstrip">${allPh.slice(0, 12).map(([p, tg]) => phHTML(p, tg)).join('')}</div>
    <div class="ai-note"><b>Le mot de l'assistant</b>${esc(noteFor(t))}</div>`;
  else if (dTab === 'journal') body = `
    <button class="bookbanner" data-act="openBook" data-trip="${t.id}"><span class="mini-book">${t.cover ? IMG(t.cover) : ''}<i></i></span><span><b>Ouvrir le carnet</b><em>Feuillette ton journal page par page, ajoute photos, textes et stickers</em></span>${SV.right}</button>
    <div class="sec"><h2>${t.entrees.length} page${t.entrees.length > 1 ? 's' : ''}</h2><button class="pill dark" data-act="addPage" data-trip="${t.id}">${SV.plus}Page</button></div>
    ${journalTabHTML(t)}`;
  else if (dTab === 'depenses') body = expListHTML(t);
  else if (dTab === 'comptes') body = comptesHTML(t);
  else body = `<div class="sec"><h2>${photosCount(t)} photos</h2><button class="pill dark" data-act="photoTrip" data-trip="${t.id}">${SV.plus}Photo</button></div><div class="photogrid">${allPh.map(([p, tg]) => phHTML(p, tg)).join('')}</div>`;
  sc.innerHTML = `
   <div class="dhero">${phHTML(t.cover, `${t.id}|cover`, 'Ajouter une couverture')}<span class="sh"></span>
     <div class="dtb"><button data-act="back" aria-label="Retour">${SV.back}</button><span class="sp"></span>
       <button data-photo="${t.id}|cover" aria-label="Changer la couverture">${SV.cam}</button>
       <button class="${t.fav ? 'on' : ''}" data-act="fav" data-trip="${t.id}" aria-label="Favori">${t.fav ? SV.heartF : SV.heart}</button>
       <button data-act="share" data-trip="${t.id}" aria-label="Copier le résumé">${SV.share}</button></div>
     <div class="dtitle"><h1>${esc(place(t))}</h1><p class="m"><span>${SV.place}${esc(C(t).n)}</span><span>${SV.cal}${f.jours} jours, ${fd(t.du)} au ${fd(t.au)}</span></p><p class="r">${SV.star}<b>${status}</b><span>${f.futur || f.enCours ? '' : '(' + pc + ' % ' + (diff <= 0 ? 'sous le' : 'au-dessus du') + ' budget)'}</span></p></div></div>
   <div class="dsheet"><div class="dtabs">${[['apercu', 'Aperçu'], ['journal', 'Journal'], ['depenses', 'Dépenses'], ['comptes', 'Entre amis'], ['photos', 'Photos']].map(([k, l]) => `<button data-act="dtab" data-v="${k}" class="${dTab === k ? 'on' : ''}">${l}</button>`).join('')}</div>${body}<div style="height:110px"></div></div>`;
  const act = { apercu: ['addExp', 'Ajouter une dépense'], journal: ['addPage', 'Nouvelle page'], depenses: ['addExp', 'Ajouter une dépense'], photos: ['photoTrip', 'Ajouter une photo'], comptes: (t.membres || []).length ? ['addExp', 'Dépense partagée'] : ['members', 'Inviter des amis'] }[dTab];
  $('dock').innerHTML = `<div class="l num"><b>${fmt(f.futur ? t.budget : s)}</b><small>${f.futur ? 'de budget' : f.enCours ? 'dépensés à ce jour' : 'dépensés'}</small></div><button class="btn" data-act="${act[0]}" data-trip="${t.id}">${act[1]}<i>${SV.right}</i></button>`;
  if (!keep) { go('carnet', 'flip'); sc.scrollTop = 0; } else sc.scrollTop = y;
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { root: sc, threshold: .2 });
  sc.querySelectorAll('.entry').forEach(el => io.observe(el));
}


/* ---------- menu déroulant en forme de pastille (année, mois, jour, catégorie, période) ---------- */
const ddHTML = (key, label, opts, val) => `<label class="dd ${val != null && val !== '' ? 'on' : ''}"><select data-dd="${key}" aria-label="${esc(label)}"><option value="">${esc(label)}</option>${opts.map(([v, l]) => `<option value="${esc(String(v))}" ${String(v) === String(val ?? '') ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>${SV.down || ''}</label>`;
const DD = {};
document.addEventListener('change', e => { const k = e.target.dataset && e.target.dataset.dd; if (k && DD[k]) DD[k](e.target.value); });
/* ---------- liste des dépenses d'un voyage, avec filtres mois / jour / catégorie ---------- */
let expF = { trip: null, y: null, m: null, j: null, c: null };
const monthKey = (t, j) => addDays(t.du, j - 1).slice(0, 7);
const monthName = k => { const s = new Date(k + '-15').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }); return s[0].toUpperCase() + s.slice(1); };
function expListHTML(t) {
  if (expF.trip !== t.id) expF = { trip: t.id, y: null, m: null, j: null, c: null };
  const n = info(t).jours, allDays = Array.from({ length: n }, (_, i) => i + 1);
  const years = [...new Set(allDays.map(j => monthKey(t, j).slice(0, 4)))];
  if (expF.y && !years.includes(expF.y)) expF.y = null;
  const months = [...new Set(allDays.map(j => monthKey(t, j)))].filter(m => !expF.y || m.startsWith(expF.y));
  if (expF.m && !months.includes(expF.m)) expF.m = null;
  const okDay = j => (!expF.y || monthKey(t, j).startsWith(expF.y)) && (!expF.m || monthKey(t, j) === expF.m);
  const days = allDays.filter(okDay);
  if (expF.j && !days.includes(expF.j)) expF.j = null;
  const dayOk = j => okDay(j) && (!expF.j || j === expF.j);
  const list = t.depenses.filter(d => coversAny(d, dayOk) && (!expF.c || d.c === expF.c));
  const share = d => { let v = 0; for (let j = d.j; j <= (d.j2 && d.j2 > d.j ? d.j2 : d.j); j++) if (dayOk(j)) v += dayShare(d, j); return v; };
  const byDay = {}; list.forEach(d => { let k = d.j; while (!dayOk(k) && k < (d.j2 || d.j)) k++; (byDay[k] = byDay[k] || []).push(d); });
  const tot = list.reduce((a, d) => a + share(d), 0), any = expF.y || expF.m || expF.j || expF.c;
  return `<div class="sec"><h2>${list.length} dépense${list.length > 1 ? 's' : ''}</h2><button class="pill dark" data-act="addExp" data-trip="${t.id}">${SV.plus}Dépense</button></div>
    <div class="ddrow">${years.length ? ddHTML('exp-y', 'Année', years.map(y => [y, y]), expF.y) : ''}${months.length > 1 ? ddHTML('exp-m', 'Mois', months.map(m => [m, monthName(m)]), expF.m) : ''}${ddHTML('exp-j', 'Jour', days.map(j => [j, `Jour ${j}, ${fd(addDays(t.du, j - 1))}`]), expF.j)}${ddHTML('exp-c', 'Catégorie', Object.keys(CATS).map(k => [k, CATS[k].n]), expF.c)}</div>
    <div class="exptot num"><span>${any ? 'Total filtré, ta part' : 'Total, ta part'}</span><b>${fmt(tot)}</b>${any ? `<button class="link" data-act="expClear">Effacer les filtres</button>` : ''}</div>
    ${Object.keys(byDay).length ? Object.keys(byDay).sort((a, b2) => b2 - a).map(j => { const L = byDay[j], dt = L.reduce((a, d) => a + share(d), 0);
      return `<div class="dayh"><span>Jour ${j}, ${fd(addDays(t.du, j - 1))}</span><span class="num">${fmt(dt)}</span></div><div class="group">` + L.slice().reverse().map(d => `<button class="exp" data-act="editExp" data-trip="${t.id}" data-id="${d.id}"><span class="ic">${ico(d.c)}</span><span class="m"><b>${esc(d.l)}</b><span>${esc(expMeta(d, t))}${d.split || (d.by && d.by !== 'me') ? `, payé par ${esc(memberName(t, d.by || 'me'))}${d.split ? `, ta part ${fmt(myPart(d))}` : ''}` : ''}</span></span><span class="p num">${fmt(d.eur)}${d.v != null ? `<span>${fmtD(d, t)}</span>` : ''}</span>${PENDING.has(d.id) ? `<em class="pend" title="En attente d'envoi">${SV.cloudOff}</em>` : ''}</button>`).join('') + '</div>'; }).join('')
      : `<div class="emptyj">${t.depenses.length ? 'Aucune dépense avec ces filtres.' : 'Aucune dépense pour ce voyage.'}<br><button class="pill dark" style="margin-top:12px" data-act="addExp" data-trip="${t.id}">${SV.plus}Ajouter une dépense</button></div>`}
    <button class="link small" style="margin-top:16px" data-act="depTrip" data-trip="${t.id}">${SV.chart || ''}Voir l'analyse du budget</button>`;
}
ACT.expClear = () => { expF = { trip: expF.trip, y: null, m: null, j: null, c: null }; refresh(); };
DD['exp-y'] = v => { expF.y = v || null; expF.m = null; expF.j = null; refresh(); };
DD['exp-m'] = v => { expF.m = v || null; expF.j = null; refresh(); };
DD['exp-j'] = v => { expF.j = +v || null; refresh(); };
DD['exp-c'] = v => { expF.c = v || null; refresh(); };
const VISN = { public: 'Public', amis: 'Amis', prive: 'Privé' };
ACT.dtab = d => { dTab = d.v; const sc = $('s-carnet'); openTrip(openId, true); const top = sc.querySelector('.dsheet').offsetTop - 60; if (sc.scrollTop > top) sc.scrollTop = top; };
ACT.photoTrip = d => { const t = trip(d.trip); if (!t.cover) { pickPhoto(`${t.id}|cover`); return; } for (const e of t.entrees) { const i = e.photos.findIndex(p => !p); if (i >= 0) { pickPhoto(`${t.id}|e|${e.id}|${i}`); return; } } const e = t.entrees[t.entrees.length - 1]; if (!e) { pageSheet(t.id); return; } e.photos.push(null); save(); pickPhoto(`${t.id}|e|${e.id}|${e.photos.length - 1}`); };
ACT.albumVis = d => { const t = trip(d.trip);
  openPanel(`<h2>Qui peut voir cet album ?</h2><p class="small">Les photos et les pages du journal. Tes dépenses et ton budget restent toujours privés.</p><div class="visopts">${[['public', 'Public', 'Tout le monde', SV.globeS], ['amis', 'Amis', 'Tes amis seulement', SV.users], ['prive', 'Privé', 'Toi seule', SV.lock]].map(([k, n, s2, ic]) => `<button class="${(t.vis || 'prive') === k ? 'on' : ''}" data-act="setAlbumVis" data-trip="${t.id}" data-v="${k}">${ic}${n}<span>${s2}</span></button>`).join('')}</div>${CLOSE('Fermer')}`, null, { nofocus: true }); };
ACT.setAlbumVis = d => { const t = trip(d.trip); t.vis = d.v; save(); closePanel(); refresh(); toast(`Album ${short(t)} : ${VISN[d.v]}`); };

/* ---------- budget ---------- */
let depId = null, catF = null;
function renderDepenses(keep) {
  const sc = $('s-depenses'), y = keep ? sc.scrollTop : 0;
  if (!S.trips.length) { sc.innerHTML = `<h1 class="bigtitle sans">Budget</h1><div class="emptycard"><b>Aucun voyage pour l'instant</b><p>Crée un voyage pour suivre ton budget, tes dépenses par jour et par catégorie, avec conversion de devise.</p><button class="btn2 g wide" data-act="newTrip">${SV.plus}Créer un voyage</button></div>`; return; }
  if (!depId || !trip(depId)) depId = (currentTrip() || sorted()[0]).id;
  const t = trip(depId), f = info(t), c = catsOf(t), s = spentOf(t), b = budgetsOf(t), left = t.budget - s, remDays = f.enCours ? f.jours - f.jour + 1 : f.futur ? f.jours : 0, per = remDays ? left / remDays : 0, p = projection(t), loc = C(t).rate !== 1;
  const list = t.depenses.filter(d => !catF || d.c === catF), byDay = {}; list.forEach(d => (byDay[d.j] = byDay[d.j] || []).push(d));
  sc.innerHTML = `
   <h1 class="bigtitle sans">Budget</h1>
   <div class="tripchips">${sorted().map(x => `<button class="${x.id === t.id ? 'on' : ''}" data-dep="${x.id}">${flag(x.pays)}${esc(short(x))}</button>`).join('')}</div>
   <div class="titlebar"><h1>${esc(place(t))}</h1><button class="pill dark" data-act="addExp" data-trip="${t.id}">${SV.plus}Dépense</button></div>
   <div class="flipcard" id="flipcard"><div class="inner">
     <div class="face a"><div class="top"><span>${f.futur ? 'Budget du voyage' : f.enCours ? `Il te reste, jour ${f.jour} sur ${f.jours}` : 'Bilan du voyage'}</span>${loc ? `<button class="swap" data-act="flip">Voir en ${esc(C(t).cur)}</button>` : ''}</div>
       <p class="big num" data-count="${Math.round(f.enCours || f.futur ? left : s)}">${fmt(f.enCours || f.futur ? left : s)}</p>
       <div class="track"><i style="width:${pct(s, t.budget)}%"></i>${f.enCours ? `<u style="left:${f.jour / f.jours * 100}%"></u>` : ''}</div>
       <div class="row num"><span>${fmt(s)} dépensés</span><span>sur ${fmt(t.budget)}</span></div>
       <div class="pills">${f.enCours || f.futur ? `<div class="s"><b class="num">${fmt(per)}</b><span>par jour ${f.futur ? 'sur place' : "jusqu'au retour"}</span></div><div><b class="num">${remDays} jours</b><span>${f.futur ? 'de voyage' : 'restants'}</span></div>` : `<div class="s"><b class="num">${fmt(s / f.jours)}</b><span>par jour en moyenne</span></div><div><b class="num">${s - t.budget > 0 ? '+ ' : '− '}${fmt(Math.abs(s - t.budget))}</b><span>par rapport au budget</span></div>`}</div>
       ${p.worst ? `<div class="warn">${SV.warn || '!'}<span>Au rythme actuel, <b>${CATS[p.worst.k].n.toLowerCase()}</b> finira vers ${fmt(p.worst.proj)} pour ${fmt(b[p.worst.k])} prévus.</span></div>` : ''}
       <div class="actions"><button class="pill" data-act="budget" data-trip="${t.id}">Modifier le budget</button><button class="pill" data-open="${t.id}">Ouvrir le carnet</button></div>
     </div>
     ${loc ? `<div class="face b"><div class="top"><span>En monnaie locale, 1 € = ${fmtRate(C(t).rate)} ${esc(C(t).cur)} (${rateNote()})</span><button class="swap" data-act="flip">Voir en euros</button></div>
       <p class="big num">${fmtL((f.enCours || f.futur ? left : s) * C(t).rate, t)}</p>
       <div class="pills"><div><b class="num">${fmtL(per * C(t).rate, t)}</b><span>par jour</span></div><div><b class="num">${fmtL(s * C(t).rate, t)}</b><span>déjà dépensés</span></div></div></div>` : ''}
   </div></div>
   ${statsHTML(t)}
<div class="sec"><h2>Dernières dépenses</h2>${t.depenses.length > 5 ? `<button class="link" data-act="catFilter" data-k="">Tout voir (${t.depenses.length})</button>` : ''}</div>
   ${t.depenses.length ? '<div class="group">' + t.depenses.slice().sort((a, b2) => b2.j - a.j || String(b2.at || '').localeCompare(String(a.at || ''))).slice(0, 5).map(d => `<button class="exp" data-act="editExp" data-trip="${t.id}" data-id="${d.id}"><span class="ic">${ico(d.c)}</span><span class="m"><b>${esc(d.l)}</b><span>Jour ${d.j}, ${esc(expMeta(d, t))}</span></span><span class="p num">${fmt(d.eur)}${d.v != null ? `<span>${fmtD(d, t)}</span>` : ''}</span>${PENDING.has(d.id) ? `<em class="pend" title="En attente d'envoi">${SV.cloudOff}</em>` : ''}</button>`).join('') + '</div>'
     : `<div class="emptyj">Aucune dépense pour ce voyage.<br><button class="pill dark" style="margin-top:12px" data-act="addExp" data-trip="${t.id}">${SV.plus}Ajouter une dépense</button></div>`}
   ${t.depenses.length ? `<button class="btn2 wide" style="margin-top:14px" data-act="catFilter" data-k="">Toutes les dépenses, par mois et par jour</button>` : ''}`;
  sc.querySelectorAll('[data-dep]').forEach(bn => bn.onclick = () => { depId = bn.dataset.dep; catF = null; renderDepenses(); });
  if (keep) sc.scrollTop = y; else countUp(sc.querySelector('[data-count]'));
  const on = sc.querySelector('.tripchips .on'); on && on.scrollIntoView({ inline: 'center', block: 'nearest' });
}
function countUp(el) { if (!el || REDUCED) return; const end = +el.dataset.count, t0 = performance.now(), dur = 900;
  const step = t => { const k = Math.min(1, (t - t0) / dur); el.textContent = fmt(end * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }

/* ---------- assistant ---------- */
function renderScope() {
  const pages = S.trips.reduce((a, t) => a + t.entrees.length, 0), deps = S.trips.reduce((a, t) => a + t.depenses.length, 0);
  $('scope').innerHTML = `${SETTINGS && SETTINGS.ai_enabled ? 'L’assistant lit les totaux de tes voyages et de tes dépenses, jamais tes notes, tes photos ni tes amis.' : 'Mode simple : les réponses sont calculées sur ton téléphone. Active l’assistant IA dans les réglages pour des réponses plus riches.'}<div class="chips"><span>${S.trips.length} carnets</span><span>${pages} pages</span><span>${deps} dépenses</span><span>${S.envies.length} envies</span></div>`;
}
const SUGG = () => { const t = currentTrip(), past = sorted().filter(x => !info(x).enCours && !info(x).futur);
  return [t ? `Est-ce que je tiens mon budget à ${short(t)} ?` : null, past.length ? "Quel voyage m'a coûté le plus cher par jour ?" : null, past.length > 1 ? `Compare ${short(past[0])} et ${short(past[past.length - 1])}` : null, S.envies[0] ? `Combien prévoir pour ${C(S.envies[0]).n} ?` : null, 'Où est-ce que je dépense le plus ?'].filter(Boolean); };
function renderSugg() { $('sugg').innerHTML = SUGG().map(s => `<button class="pill" type="button">${esc(s)}</button>`).join(''); $('sugg').querySelectorAll('button').forEach(b => b.onclick = () => ask(b.textContent)); }
let turns = [], asking = false;
function bubble(cls, text) { const d = document.createElement('div'); d.className = 'msg ' + cls; d.textContent = text; $('chat').appendChild(d); $('s-ia').scrollTop = 1e6; return d; }
function greet() { $('chat').innerHTML = ''; bubble('ai', S.trips.length ? `Bonjour ${S.user}. Demande-moi où part ton argent, compare deux voyages ou prépare le prochain.` : `Bonjour ${S.user}. Crée ton premier voyage et ajoute quelques dépenses : je pourrai ensuite te dire où part ton argent.`); }
$('clearChat').onclick = () => { turns = []; greet(); toast('Conversation effacée'); };
/* Mode simple (sans IA) : réponses calculées sur le téléphone, avec une compréhension souple de la question. */
function local(q) {
  if (!S.trips.length) return "Tu n'as encore aucun voyage. Crée ton premier carnet avec le bouton +, ajoute quelques dépenses, et je pourrai te dire où part ton argent.";
  try {
    const n = String(q || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(), has = (...w) => w.some(x => n.includes(x));
    const named = S.trips.filter(t => { const a = [short(t), place(t), C(t).n].map(x => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()); return a.some(x => x.length > 2 && n.includes(x)); });
    const t = named[0] || currentTrip() || sorted().find(x => x.depenses.length) || sorted()[0], f = info(t), s = spentOf(t), c = catsOf(t);
    const days = Math.max(1, f.enCours ? f.jour : f.futur ? 0 : f.jours) || 1, where = `pour ${place(t)}`;
    const topCats = Object.entries(c).filter(([, v]) => v > 0).sort((x, y) => y[1] - x[1]);
    const catWord = { logement: ['logement', 'hotel', 'hebergement', 'airbnb', 'nuit'], repas: ['repas', 'restau', 'manger', 'nourriture', 'bouffe', 'diner', 'dejeuner', 'cafe'], transport: ['transport', 'avion', 'train', 'taxi', 'bus', 'metro', 'uber', 'voiture'], activites: ['activit', 'visite', 'musee', 'excursion', 'sortie'], shopping: ['shopping', 'achat', 'souvenir', 'vetement', 'cadeau'] };
    const askedCat = Object.keys(catWord).find(k => has(...catWord[k]));
    const past = S.trips.filter(x => !info(x).futur && spentOf(x) > 0), perDay = past.map(x => [x, spentOf(x) / Math.max(1, info(x).enCours ? info(x).jour : info(x).jours)]).sort((x, y) => y[1] - x[1]);
    if (has('compar') && (named.length >= 2 || past.length >= 2)) { const [x, y] = named.length >= 2 ? named : [perDay[0][0], perDay[perDay.length - 1][0]]; const px = spentOf(x) / Math.max(1, info(x).jours), py = spentOf(y) / Math.max(1, info(y).jours);
      return `${place(x)} : ${fmt(spentOf(x))} en ${info(x).jours} jours, soit ${fmt(px)} par jour. ${place(y)} : ${fmt(spentOf(y))} en ${info(y).jours} jours, soit ${fmt(py)} par jour. ${px > py ? place(x) : place(y)} t'a coûté ${fmt(Math.abs(px - py))} de plus par jour.`; }
    if (has('plus cher', 'moins cher', 'quel voyage') && perDay.length) return `Par jour, c'est ${place(perDay[0][0])} qui t'a coûté le plus : ${fmt(perDay[0][1])} en moyenne.${perDay.length > 1 ? ` Le moins cher est ${place(perDay[perDay.length - 1][0])}, avec ${fmt(perDay[perDay.length - 1][1])} par jour.` : ''}`;
    if (askedCat) { const L = t.depenses.filter(d => d.c === askedCat), b = budgetsOf(t)[askedCat], subs = {}; L.forEach(d => { const k = subName(d); if (k) subs[k] = (subs[k] || 0) + myPart(d); });
      const sub = Object.entries(subs).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([k, v]) => `${k.toLowerCase()} ${fmt(v)}`).join(', ');
      return L.length ? `${CATS[askedCat].n} ${where} : ${fmt(c[askedCat])} en ${L.length} dépense${L.length > 1 ? 's' : ''}${sub ? ` (${sub})` : ''}. ${b ? (c[askedCat] > b ? `C'est ${fmt(c[askedCat] - b)} de plus que les ${fmt(b)} prévus.` : `Il te reste ${fmt(b - c[askedCat])} sur les ${fmt(b)} prévus.`) : ''}${has('pu', 'peux', 'possible', 'assez') ? ` Ton budget total ${t.budget - s >= 0 ? `laisse encore ${fmt(t.budget - s)}` : `est dépassé de ${fmt(s - t.budget)}`}.` : ''}` : `Tu n'as noté aucune dépense de ${CATS[askedCat].n.toLowerCase()} ${where}.`; }
    if (has('plus', 'principal', 'gros poste', 'ou part')) { if (!topCats.length) return `Tu n'as pas encore de dépense ${where}.`; const [k, v] = topCats[0];
      return `${where[0].toUpperCase() + where.slice(1)}, ton plus gros poste est ${CATS[k].n.toLowerCase()} : ${fmt(v)}, soit ${Math.round(v / s * 100)} % de tes dépenses.${topCats[1] ? ` Viennent ensuite ${CATS[topCats[1][0]].n.toLowerCase()} (${fmt(topCats[1][1])})${topCats[2] ? ` et ${CATS[topCats[2][0]].n.toLowerCase()} (${fmt(topCats[2][1])})` : ''}.` : ''}`; }
    if (has('par jour', 'moyenne', 'quotidien')) return `${where[0].toUpperCase() + where.slice(1)}, tu dépenses en moyenne ${fmt(s / days)} par jour.${f.enCours ? ` Pour finir dans ton budget, il te reste ${fmt((t.budget - s) / (f.jours - f.jour + 1))} par jour jusqu'au retour.` : ''}`;
    if (has('budget', 'reste', 'tiens', 'depasse', 'combien il')) return `Tu as dépensé ${fmt(s)} sur ${fmt(t.budget)} ${where}. ${s > t.budget ? `Ton budget est dépassé de ${fmt(s - t.budget)}.` : `Il te reste ${fmt(t.budget - s)}${f.enCours ? `, soit ${fmt((t.budget - s) / (f.jours - f.jour + 1))} par jour jusqu'au retour` : ''}.`}`;
    if (has('prevoir', 'combien pour', 'estimer')) { const avg = perDay.length ? perDay.reduce((a, [, v]) => a + v, 0) / perDay.length : 0; return avg ? `D'après tes carnets, tu dépenses en moyenne ${fmt(avg)} par jour. Pour une semaine, prévois autour de ${fmt(avg * 7)}, à ajuster selon le coût de la vie sur place.` : "Note quelques dépenses dans un voyage et je pourrai t'aider à prévoir les suivants."; }
    if (has('total', 'combien', 'depense')) return `Tu as dépensé ${fmt(s)} ${where}${topCats[0] ? `, surtout en ${CATS[topCats[0][0]].n.toLowerCase()} (${fmt(topCats[0][1])})` : ''}.`;
    return `${place(t)} : ${fmt(s)} dépensés sur ${fmt(t.budget)}${topCats[0] ? `, surtout en ${CATS[topCats[0][0]].n.toLowerCase()}` : ''}. Demande-moi par exemple ce qu'il te reste, ta moyenne par jour, une catégorie comme les repas ou le transport, ou de comparer deux voyages.`;
  } catch (e) { return "Je n'ai pas assez de données pour répondre à ça. Ajoute des dépenses à tes voyages, ou essaie une des suggestions."; }
}
async function ask(q) {
  q = (q || '').trim().slice(0, 500); if (!q) { $('askIn').focus(); toast('Écris ta question ou touche une suggestion'); return; }
  if (asking) return; $('askIn').value = '';
  bubble('me', q); const out = bubble('ai', ''); out.innerHTML = '<span class="thinking">Je feuillette tes carnets…</span>';
  if (!(SETTINGS && SETTINGS.ai_enabled)) { setTimeout(() => { out.textContent = local(q); $('s-ia').scrollTop = 1e6; }, 400); return; }
  asking = true;
  try {
    const { data, error } = await sb.functions.invoke('assistant', { body: { question: q, history: turns.slice(-12) } });
    if (error) { let msg = 'L’assistant est indisponible, voici une réponse simple : ' + local(q); try { const j = await error.context.json(); if (j && j.error && error.context.status !== 502) msg = j.error; } catch (_) { } out.textContent = msg; }
    else if (!data || !data.answer || !String(data.answer).trim()) out.textContent = local(q);
    else { out.textContent = data.answer; turns.push({ role: 'user', content: q }, { role: 'assistant', content: data.answer }); }
  } catch (e) { out.textContent = local(q); }
  finally { asking = false; $('s-ia').scrollTop = 1e6; }
}
$('askForm').onsubmit = e => { e.preventDefault(); ask($('askIn').value); };

/* ---------- accueil ---------- */
let homeF = 'all';
DD.hy = v => { homeF = v || 'all'; document.querySelectorAll('#homeChips button').forEach(x => x.classList.toggle('on', !v && x.dataset.hf === 'all')); const hy = document.querySelector('#homeChips [data-dd=hy]'); if (hy) hy.parentNode.classList.toggle('on', !!v); renderPicks($('q') ? $('q').value : ''); };
function renderHome() {
  const cur = currentTrip(), next = S.trips.filter(x => info(x).futur).sort((a, b) => D(a.du) - D(b.du))[0], t = cur || next || sorted()[0];
  const heroT = (t && t.cover) ? t : (S.trips.find(x => x.cover) || t);
  const years = [...new Set(S.trips.map(x => D(x.du).getFullYear()))].sort((a, b) => b - a);
  const exps = cur ? cur.depenses.slice().reverse().slice(0, 3) : [];
  const first = !S.trips.length;
  $('s-home').innerHTML = `
   <div class="hhero ${heroT && heroT.cover ? '' : 'nophoto'}">${heroT && heroT.cover ? phHTML(heroT.cover, `${heroT.id}|cover`, 'Ajouter une photo') : ''}<span class="hshade"></span>
     <div class="htop"><span class="logo">${SV.planeO}Escale</span><div class="r"><button class="ghost-ic" data-act="go" data-to="carte" aria-label="Carte">${SV.globe}</button><button class="ghost-ic" data-act="go" data-to="ia" aria-label="Assistant">${SV.spark}</button><button class="ghost-ic bellbtn" data-act="notifs" aria-label="Notifications">${SV.bell}<span class="bdg" id="notifBadge" hidden></span></button><button class="avatar" data-act="go" data-to="profil" aria-label="Mon profil">${PROFILE && PROFILE.avatar_path ? IMG(PROFILE.avatar_path) : esc((S.user[0] || 'E').toUpperCase())}</button></div></div>
     <div class="htext"><h1>${first ? `Bienvenue,<br>${esc(S.user)}.` : 'Tes voyages,<br>ton histoire.'}</h1><p>${first ? 'Crée ton premier carnet : photos, souvenirs et dépenses au même endroit.' : 'Carnets, photos et dépenses de chacune de tes escales.'}</p>
       ${first ? `<button class="hcta" data-act="newTrip">${SV.plus}Créer mon premier voyage</button>` : `<label class="hsearch" for="q">${SV.search}<input id="q" placeholder="Chercher un voyage, un lieu" autocomplete="off" maxlength="60"><button type="button" data-act="go" data-to="carnets" aria-label="Voir mes voyages">${SV.right}</button></label>`}</div></div>
   <div class="hsheet">
     ${first ? `<div class="steps"><div class="step"><b>1</b><span><strong>Crée un voyage</strong>Pays, dates et budget.</span></div><div class="step"><b>2</b><span><strong>Note tes dépenses</strong>En euros ou en monnaie locale, en deux secondes.</span></div><div class="step"><b>3</b><span><strong>Garde tes souvenirs</strong>Pages, photos, lieux, et partage avec tes amis si tu veux.</span></div></div>` : `
     <div class="chipsrow" id="homeChips">${years.length ? ddHTML('hy', 'Année', years.map(y => [y, String(y)]), /^\d{4}$/.test(homeF) ? homeF : '') : ''}${[['all', 'Tous'], ['cur', 'En cours'], ['fut', 'À venir'], ['fav', 'Favoris']].map(([k, l]) => `<button data-hf="${k}" class="${homeF === k ? 'on' : ''}">${l}</button>`).join('')}</div>
     <div class="sec"><h2>Mes voyages</h2><button class="more" data-act="go" data-to="carnets">Tout voir</button></div>
     <div class="dest" id="picks"></div>
     ${first ? '' : (() => { const vis = new Set(S.trips.filter(x => !info(x).futur).map(x => x.pays)).size, pc = Math.round(vis / 195 * 1000) / 10;
       return `<div class="hfeat"><button class="hf map" data-act="go" data-to="carte"><span class="ic">${SV.globe}</span><b>Ma carte du monde</b><span><strong class="num">${vis}</strong> pays visité${vis > 1 ? 's' : ''}${vis ? `, ${String(pc).replace('.', ',')} % du monde` : ''}, ${S.envies.length} envie${S.envies.length > 1 ? 's' : ''}</span><em>Voir le globe${SV.right}</em></button>
         <button class="hf ai" data-act="go" data-to="ia"><span class="ic">${SV.spark}</span><b>Assistant de voyage</b><span>${cur ? 'Combien il me reste par jour ?' : 'Quel voyage m\'a coûté le plus ?'}</span><em>Poser une question${SV.right}</em></button></div>`; })()}
     ${S.trips.length ? `<div class="sec"><h2>${next && !cur ? 'Prochain départ' : 'Calendrier des voyages'}</h2>${next && !cur ? `<span class="small">${esc(place(next))}, dans ${diffDays(TODAY, next.du)} jour${diffDays(TODAY, next.du) > 1 ? 's' : ''}</span>` : ''}</div>${calHTML()}` : ''}
     ${t && cur ? `<div class="sec"><h2>En ce moment</h2><button class="more" data-open="${t.id}">Ouvrir</button></div>
     <div class="rec" data-open="${t.id}">${phHTML(t.cover, `${t.id}|cover`, 'Ajouter une photo')}<span class="sh"></span>
       <button class="heart ${t.fav ? 'on' : ''}" data-act="fav" data-trip="${t.id}" aria-label="Favori">${t.fav ? SV.heartF : SV.heart}</button>
       <div class="tx"><span class="badge">${SV.leaf}${cur ? `En cours, jour ${info(t).jour} sur ${info(t).jours}` : next ? `Départ dans ${diffDays(TODAY, t.du)} jours` : 'Terminé'}</span>
         <h3>${esc(place(t))} ${flag(t.pays)}</h3><p class="sub">${esc(C(t).n)}, ${fd(t.du)} au ${fd(t.au)}</p>
         <p class="row num"><span>${SV.page}${t.entrees.length} page${t.entrees.length > 1 ? 's' : ''}</span><span>${SV.clock}${info(t).jours} jours</span><span>${cur ? `Reste <b>${fmt(t.budget - spentOf(t))}</b>` : `Budget <b>${fmt(t.budget)}</b>`}</span></p></div></div>` : ''}
     ${exps.length ? `<div class="sec"><h2>Dernières dépenses</h2><button class="more" data-act="depTrip" data-trip="${cur.id}">Tout voir</button></div>
     <div class="xlist">${exps.map(d => `<button class="xrow" data-act="editExp" data-trip="${cur.id}" data-id="${d.id}"><span class="ic">${ico(d.c)}</span><span class="m"><b>${esc(d.l)}</b><span>${esc(short(cur))}, jour ${d.j}, ${CATS[d.c].n}</span><strong class="num">${fmt(d.eur)}</strong></span><span class="r"><span>${d.v != null ? fmtL(d.v, cur) : ''}</span><span>${SV.dots.replace('<svg', '<svg width="16" height="16"')}</span></span></button>`).join('')}</div>` : ''}`}
     <div class="sec"><h2>Mes envies</h2><button class="more" data-act="addWish">Ajouter</button></div>
     <div class="wishes">${S.envies.map(w => `<span class="pill">${flag(w.pays)}${esc(C(w).n)}${w.note ? `<span class="small">${esc(w.note)}</span>` : ''}<button class="x" data-act="rmWish" data-id="${w.id}" aria-label="Retirer ${esc(C(w).n)}">${SV.x.replace('<svg', '<svg width="11" height="11"')}</button></span>`).join('')}<button class="pill add" data-act="addWish">${SV.plus}Une envie</button></div>
   </div>`;
  if (!first) {
    document.querySelectorAll('#homeChips button').forEach(b => b.onclick = () => { homeF = b.dataset.hf; document.querySelectorAll('#homeChips button').forEach(x => x.classList.toggle('on', x === b)); const hy = document.querySelector('#homeChips [data-dd=hy]'); if (hy) { hy.value = ''; hy.parentNode.classList.remove('on'); } renderPicks($('q').value); });
    renderPicks(''); $('q').addEventListener('input', e => renderPicks(e.target.value));
  }
  if (typeof updateBadges === 'function') updateBadges();
}
function renderPicks(q) {
  q = (q || '').trim().toLowerCase();
  const list = sorted().filter(t => { const f = info(t); return homeF === 'all' || (homeF === 'cur' && f.enCours) || (homeF === 'fut' && f.futur) || (homeF === 'fav' && t.fav) || String(D(t.du).getFullYear()) === homeF; })
    .filter(t => !q || norm(place(t) + ' ' + C(t).n + ' ' + t.lieux.join(' ')).includes(norm(q)));
  $('picks').innerHTML = list.map(t => `<div class="dcard">${phHTML(t.cover, `${t.id}|cover`, 'Photo')}<span class="sh"></span><button class="open" data-open="${t.id}"><b>${esc(short(t))}</b><span>${esc(C(t).n)}</span><em class="num">${SV.star}${photosCount(t)} photo${photosCount(t) > 1 ? 's' : ''}</em></button></div>`).join('')
    + (list.length ? '' : `<p class="small" style="padding:30px 0">Aucun voyage ne correspond.</p>`)
    + `<button class="dcard new" data-act="newTrip"><i>${SV.plus}</i>Nouveau</button>`;
}

/* ---------- liste des voyages ---------- */
// filtres combinables : statut (tous, en cours, à venir, passés, favoris) et année
let vF = { s: 'all', y: 'all' };
const V_STATUS = [['all', 'Tous', () => true], ['cur', 'En cours', t => info(t).enCours], ['fut', 'À venir', t => info(t).futur], ['past', 'Passés', t => !info(t).enCours && !info(t).futur], ['fav', 'Favoris', t => t.fav]];
function renderCards() {
  const years = [...new Set(S.trips.map(x => D(x.du).getFullYear()))].sort((a, b) => b - a);
  if (vF.y !== 'all' && !years.includes(+vF.y)) vF.y = 'all';
  const inYear = t => vF.y === 'all' || String(D(t.du).getFullYear()) === vF.y, stF = (V_STATUS.find(x => x[0] === vF.s) || V_STATUS[0])[2];
  const list = sorted().filter(t => inYear(t) && stF(t));
  const days = S.trips.reduce((a, t) => a + info(t).jours, 0);
  $('s-carnets').innerHTML = `
   <div class="vtop"><button class="iconbtn" data-act="back" aria-label="Retour">${SV.back}</button><h1>Mes voyages</h1><div class="r"><button class="iconbtn" data-act="go" data-to="journal" aria-label="Journal">${SV.book}</button><button class="iconbtn" data-act="go" data-to="carte" aria-label="Carte">${SV.globe}</button><button class="iconbtn" data-act="newTrip" aria-label="Nouveau voyage">${SV.plus}</button></div></div>
   <div class="vsearch">${SV.globe}<div><b>${S.trips.length} carnet${S.trips.length > 1 ? 's' : ''}, ${new Set(S.trips.map(x => x.pays)).size} pays</b><span>${days} jours de voyage, ${fmt(S.trips.reduce((a, x) => a + spentOf(x), 0))} dépensés</span></div></div>
   ${typeof shelfBanner === 'function' ? shelfBanner() : ''}
   ${S.trips.length ? `<div class="vchips">${years.length ? ddHTML('vy', 'Année', years.map(y => [y, String(y)]), vF.y === 'all' ? '' : vF.y) : ''}${V_STATUS.map(([k, l, fn]) => { const n = S.trips.filter(t => inYear(t) && fn(t)).length; return `<button data-act="vf" data-k="s" data-v="${k}" class="${vF.s === k ? 'on' : ''}" ${n || k === 'all' ? '' : 'disabled'}>${l}<i class="num">${n}</i></button>`; }).join('')}</div>
` : ''}
   ${S.trips.length && !list.length ? `<div class="emptyj">Aucun voyage avec ces filtres. <button class="link" data-act="vf" data-k="reset">Tout afficher</button></div>` : ''}
   <div class="vlist">${list.map(t => { const f = info(t), s = spentOf(t);
     return `<div class="vcard"><div style="position:relative">${phHTML(t.cover, `${t.id}|cover`, 'Ajouter une couverture')}<button class="heart ${t.fav ? 'on' : ''}" data-act="fav" data-trip="${t.id}" aria-label="Favori">${t.fav ? SV.heartF : SV.heart}</button></div>
       <button class="bd" data-open="${t.id}"><span class="l1"><b>${esc(place(t))}</b><span class="num">${SV.star}${photosCount(t)}</span></span><span class="l2">${esc(C(t).n)}, ${fd(t.du)} au ${fd(t.au)} ${D(t.du).getFullYear()}, ${f.jours} jours</span>
       <span class="l3 num">${f.futur ? `Budget <b>${fmt(t.budget)}</b>` : s <= t.budget ? `<s>${fmt(t.budget)}</s><b>${fmt(s)}</b> dépensés` : `<b>${fmt(s)}</b> dépensés, budget ${fmt(t.budget)}`}</span></button></div>`; }).join('')}
     <button class="vcard new" data-act="newTrip">${SV.plus}Nouveau voyage</button></div>`;
}
DD.vy = v => { vF.y = v || 'all'; renderCards(); };
ACT.vf = d => { if (d.k === 'reset') vF = { s: 'all', y: 'all' }; else vF[d.k] = d.v; renderCards(); };

/* ---------- journal d'un voyage : dossiers ou pile de photos ---------- */
let pileIdx = 0, pileTrip = null, pileDay = null;
function journalTabHTML(t) {
  if (!t.entrees.length) return `<div class="emptyj">Aucune page pour l'instant. Ajoute ta première journée : ses photos formeront une petite pile.</div>`;
  return `<div class="dpiles">${t.entrees.map(e => {
    const ph = e.photos.filter(Boolean), txt = (e.n ? 1 : 0) + (e.st || []).filter(x => x.k === 'x').length;
    return `<div class="dpile"><div class="dp-stack n${Math.min(3, ph.length)}" data-act="dayPile" data-trip="${t.id}" data-entry="${e.id}" role="button" tabindex="0" aria-label="Jour ${e.j}, ${esc(e.t)} : ${ph.length} photo${ph.length > 1 ? 's' : ''}">
        ${ph.length ? ph.slice(0, 3).reverse().map(p => `<span>${IMG(p)}</span>`).join('') : `<span class="none">${SV.img}<em>Ajouter des photos</em></span>`}
        ${ph.length > 3 ? `<i class="dp-more num">+${ph.length - 3}</i>` : ''}
        <button class="fold-add" data-act="foldAdd" data-trip="${t.id}" data-entry="${e.id}" aria-label="Ajouter une photo au jour ${e.j}">${SV.plus}</button></div>
      <div class="fold-meta"><div><b>Jour ${e.j} · ${esc(e.t)}</b><span>${ph.length} photo${ph.length > 1 ? 's' : ''}${txt ? `, ${txt} texte${txt > 1 ? 's' : ''}` : ''}</span></div><button class="menu" data-act="pageMenu" data-trip="${t.id}" data-entry="${e.id}" aria-label="Options de la page">${SV.dots}</button></div></div>`; }).join('')}
    <div class="dpile"><button class="dp-stack new" data-act="addPage" data-trip="${t.id}" aria-label="Nouvelle page">${SV.plus}<b>Nouvelle page</b></button></div></div>`;
}
/** Toucher une pile : ses photos s'ouvrent en grand, à faire défiler du doigt. */
ACT.dayPile = d => { const t = trip(d.trip), e = t && t.entrees.find(x => x.id === d.entry); if (!e) return;
  if (!e.photos.some(Boolean)) { ACT.openBook({ trip: t.id, entry: e.id }); return; }
  pileTrip = t.id; pileDay = e.id; pileIdx = 0;
  openPanel(`<div class="pile-head"><b>Jour ${e.j} · ${esc(e.t)}</b><button class="more" data-act="pileOpenPage" data-trip="${t.id}" data-entry="${e.id}">Ouvrir la page</button></div>${pileCards(t, pileList(t))}${CLOSE('Fermer')}`, () => pileLayout(), { nofocus: true }); };
ACT.pileOpenPage = d => { closePanel(); setTimeout(() => ACT.openBook({ trip: d.trip, entry: d.entry }), 250); };
const pileList = t => t.entrees.filter(e => !pileDay || e.id === pileDay).flatMap(e => e.photos.filter(Boolean).map(p => ({ p, e })));
function pileCards(t, L) {
  pileIdx = ((pileIdx % L.length) + L.length) % L.length;
  return `<div class="pile" id="pile" data-trip="${t.id}">${L.map((o, i) => `<div class="pcard" data-i="${i}" data-entry="${o.e.id}">${IMG(o.p)}<span class="pcap"><b>${esc(o.e.t)}</b><i>Jour ${o.e.j}</i></span></div>`).join('')}</div>
    <div class="pile-bar"><button class="cal-nav" data-act="pileGo" data-d="-1" aria-label="Photo précédente">${SV.back}</button><span class="num" id="pileN">${pileIdx + 1} / ${L.length}</span><button class="cal-nav" data-act="pileGo" data-d="1" aria-label="Photo suivante">${SV.right}</button></div>
    <p class="small" style="text-align:center;margin-top:6px">Fais glisser la photo du doigt, touche-la pour ouvrir la page.</p>`;
}
/** Place les cartes : celle du dessus au centre, les suivantes en éventail derrière. */
function pileLayout() {
  const el = $('pile'); if (!el) return; const cards = [...el.querySelectorAll('.pcard')], n = cards.length;
  cards.forEach((c, i) => { let k = (i - pileIdx + n) % n; if (k > n / 2) k -= n; const a = Math.abs(k), vis = a <= 2;
    c.style.zIndex = 10 - a; c.style.opacity = vis ? 1 : 0; c.style.pointerEvents = k === 0 ? 'auto' : 'none';
    c.style.transform = k === 0 ? 'none' : `translateX(${k * 34}%) rotate(${k * 5}deg) scale(${1 - a * .1})`;
    c.style.filter = k === 0 ? '' : `brightness(${1 - a * .08})`; c.classList.toggle('top', k === 0); });
  const nEl = $('pileN'); if (nEl) nEl.textContent = `${pileIdx + 1} / ${n}`;
}
function pileStep(d) { const el = $('pile'); if (!el) return; const n = el.querySelectorAll('.pcard').length; pileIdx = (pileIdx + d + n) % n; pileLayout(); }
ACT.pileGo = d => pileStep(+d.d);
ACT.foldAdd = d => { const t = trip(d.trip), e = t && t.entrees.find(x => x.id === d.entry); if (!e) return; let i = e.photos.findIndex(x => !x); if (i < 0) { if (e.photos.length >= 6) { toast('6 photos maximum par page'); return; } e.photos.push(null); i = e.photos.length - 1; save(); } pickPhoto(`${t.id}|e|${e.id}|${i}`); };
// glisser les cartes du doigt, façon Tinder
(() => { let g = null;
  document.addEventListener('pointerdown', ev => { const c = ev.target.closest && ev.target.closest('.pcard.top'); if (!c) return; g = { c, x: ev.clientX, y: ev.clientY, dx: 0, moved: false, id: ev.pointerId }; c.style.transition = 'none'; try { c.setPointerCapture(ev.pointerId); } catch (_) { } });
  document.addEventListener('pointermove', ev => { if (!g || ev.pointerId !== g.id) return; g.dx = ev.clientX - g.x; if (Math.abs(g.dx) > 6) g.moved = true; g.c.style.transform = `translateX(${g.dx}px) rotate(${g.dx / 14}deg)`; });
  const end = ev => { if (!g || ev.pointerId !== g.id) return; const { c, dx, moved } = g; g = null; c.style.transition = '';
    if (Math.abs(dx) > 70) { c.style.transform = `translateX(${dx > 0 ? 140 : -140}%) rotate(${dx > 0 ? 24 : -24}deg)`; c.style.opacity = 0; setTimeout(() => pileStep(dx < 0 ? 1 : -1), 230); }
    else if (!moved && ev.type === 'pointerup') { const p = $('pile'); ACT.pileOpenPage({ trip: p.dataset.trip, entry: c.dataset.entry }); }
    else pileLayout(); };
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
})();

/* ---------- calendrier des voyages (accueil) ---------- */
let calM = null; // 'AAAA-MM' affiché
function calHTML() {
  const nx = sorted().filter(t => t.du >= TODAY).sort((a, b) => a.du < b.du ? -1 : 1)[0];
  if (!calM) calM = (nx ? nx.du : TODAY).slice(0, 7);
  const [y, m] = calM.split('-').map(Number), first = new Date(y, m - 1, 1), days = new Date(y, m, 0).getDate(), lead = first.getDay();
  const ds = d => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push('<span class="cd empty"></span>');
  for (let d = 1; d <= days; d++) {
    const day = ds(d), start = S.trips.filter(t => t.du === day), inT = S.trips.find(t => t.du <= day && t.au >= day), t = start[0];
    const dep = t && t.du > TODAY && nx && t.id === nx.id, wk = (lead + d - 1) % 7;
    cells.push(`<${t ? `button data-open="${t.id}" aria-label="${esc(place(t))}, départ le ${d}"` : 'span'} class="cd${inT ? ' in' : ''}${day === TODAY ? ' today' : ''}${wk === 0 ? ' sun' : ''}${dep ? ' dep' : ''}${inT && inT.du === day ? ' s' : ''}${inT && inT.au === day ? ' e' : ''}"><b>${d}</b>${t ? `<span class="cv">${t.cover ? IMG(t.cover) : `<i>${flag(t.pays)}</i>`}</span><em>${esc(short(t))}</em>` : ''}</${t ? 'button' : 'span'}>`);
  }
  const nDep = nx && nx.du.slice(0, 7) === calM ? diffDays(TODAY, nx.du) : null;
  return `<div class="cal" id="homeCal"><div class="cal-h"><b class="num">${m}/${y}</b><span class="sp"></span><button class="cal-nav" data-act="calMove" data-d="-1" aria-label="Mois précédent">${SV.back}</button><button class="cal-nav" data-act="calMove" data-d="1" aria-label="Mois suivant">${SV.right}</button></div>
    <div class="cal-w">${['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((w, i) => `<span class="${i ? '' : 'sun'}">${w}</span>`).join('')}</div>
    <div class="cal-g">${cells.join('')}</div>
    ${nDep != null ? `<p class="cal-f"><i></i>Départ pour ${esc(place(nx))} dans <b>${nDep} jour${nDep > 1 ? 's' : ''}</b></p>` : ''}</div>`;
}
ACT.calMove = d => { const [y, m] = calM.split('-').map(Number), n = new Date(y, m - 1 + (+d.d), 1); calM = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`; const el = $('homeCal'); if (el) el.outerHTML = calHTML(); };

/* ---------- journal ---------- */
let jId = null, jView = 'pages';
function renderJournal() {
  if (!jId || !trip(jId)) jId = (currentTrip() || sorted()[0] || {}).id;
  const t = trip(jId), sc = $('s-journal');
  if (!t) { sc.innerHTML = `<div class="navrow"><button class="iconbtn" data-act="back" aria-label="Retour">${SV.back}</button></div><h1 class="bigtitle sans">Journal</h1><div class="emptycard"><b>Pas encore de journal</b><p>Crée ton premier voyage pour commencer à écrire tes souvenirs.</p><button class="btn2 g wide" data-act="newTrip">${SV.plus}Créer un voyage</button></div>`; return; }
  sc.innerHTML = `
   <div class="navrow"><button class="iconbtn" data-act="back" aria-label="Retour">${SV.back}</button><button class="picker-btn" data-act="pickJournal">${flag(t.pays)}${esc(short(t))} ${SV.down}</button><button class="pill dark" data-act="addPage" data-trip="${t.id}">${SV.plus}Page</button></div>
   <h1 class="bigtitle sans" style="margin-top:8px">Journal</h1>
   <div class="filters"><button class="${jView === 'pages' ? 'on' : ''}" data-act="jview" data-v="pages">Moments</button><button class="${jView === 'photos' ? 'on' : ''}" data-act="jview" data-v="photos">Photos</button><button class="${jView === 'lieux' ? 'on' : ''}" data-act="jview" data-v="lieux">Lieux</button></div>
   ${jView === 'pages' ? (t.entrees.length ? `<div class="tl">${t.entrees.map(e => `<div class="jentry">
       <div class="h"><span class="d">${caps(fd(addDays(t.du, e.j - 1)))}</span><div><h3>${esc(e.t)}</h3>${e.n ? `<p class="n">${esc(e.n)}</p>` : ''}</div><button class="menu" data-act="pageMenu" data-trip="${t.id}" data-entry="${e.id}" aria-label="Options">${SV.dots}</button></div>
       <div class="gal">${e.photos.map((p, i) => phHTML(p, `${t.id}|e|${e.id}|${i}`)).join('')}${e.photos.length < 6 ? `<button class="slot" data-act="addSlot" data-trip="${t.id}" data-entry="${e.id}" aria-label="Ajouter un cadre">${SV.plus}</button>` : ''}</div>
       <p class="sp num">Jour ${e.j}, ${fmt(daysOf(t)[e.j - 1] || 0)} dépensés hors logement</p></div>`).join('')}</div>`
       : `<div class="emptyj">Pas encore de page. Ajoute ton premier moment.<br><button class="pill dark" style="margin-top:12px" data-act="addPage" data-trip="${t.id}">${SV.plus}Ajouter une page</button></div>`)
   : jView === 'photos' ? `<div class="photogrid">${phHTML(t.cover, `${t.id}|cover`)}${t.entrees.flatMap(e => e.photos.map((p, i) => phHTML(p, `${t.id}|e|${e.id}|${i}`))).join('')}</div><p class="small" style="margin-top:12px">${photosCount(t)} photos. Touche un cadre gris pour en ajouter.</p>`
   : `<div class="tags">${t.lieux.map((l, i) => `<span class="pill">${esc(l)}<button class="x" data-act="rmPlace" data-trip="${t.id}" data-i="${i}" aria-label="Retirer ${esc(l)}">${SV.x.replace('<svg', '<svg width="11" height="11"')}</button></span>`).join('')}<button class="pill add" data-act="addPlace" data-trip="${t.id}">${SV.plus}Lieu</button></div>`}
   <button class="btn full" data-open="${t.id}" style="margin-top:24px">Ouvrir la fiche du voyage<i>${SV.arrow}</i></button>`;
}
ACT.jview = d => { jView = d.v; renderJournal(); };
ACT.pickJournal = () => openPanel(`<h2>Choisir un voyage</h2><div class="menulist">${sorted().map(t => `<button data-act="setJournal" data-trip="${t.id}">${flag(t.pays)}${esc(place(t))}<span class="small" style="margin-left:auto">${fd(t.du)}</span></button>`).join('')}</div>${CLOSE()}`, null, { nofocus: true });
ACT.setJournal = d => { jId = d.trip; closePanel(); renderJournal(); };

/* ---------- carte à plat ---------- */
let mapSel = null, mapT = { x: 0, y: 0, k: 1 }, mapBuilt = false, mproj = null;
let mapMode = (() => { try { return localStorage.getItem('escale:map') || 'globe'; } catch (e) { return 'globe'; } })();
const mapToggle = () => `<div class="mtoggle" role="tablist"><button class="${mapMode === 'globe' ? 'on' : ''}" data-act="mapMode" data-v="globe">${SV.globe}Globe 3D</button><button class="${mapMode === 'plan' ? 'on' : ''}" data-act="mapMode" data-v="plan">${SV.flatmap}Plan</button></div>`;
ACT.mapMode = d => { if (d.v === mapMode) return; mapMode = d.v; try { localStorage.setItem('escale:map', d.v); } catch (e) { } mapBuilt = false; renderCarte(); };
// légende lisible : couleurs franches et nombre de pays dans chaque groupe
const mapLegend = () => { const cur = currentTrip(), vis = new Set(S.trips.filter(t => !info(t).futur && t !== cur).map(t => t.pays)), wi = new Set(S.envies.map(w => w.pays));
  return `<div class="glegend"><span><i class="v"></i>Visités <b class="num">${vis.size}</b></span>${cur ? `<span><i class="c"></i>En cours</span>` : ''}<span><i class="w"></i>Envies <b class="num">${wi.size}</b></span></div>`; };
const mapItems = () => [...S.trips.map(t => ({ t, wish: false })), ...S.envies.map(w => ({ t: w, wish: true }))];
const pinHTML = ({ t, wish }, extra = '') => `<button class="mpin ${wish ? 'wish' : ''} ${!wish && t.id === mapSel ? 'on' : ''}" ${extra} data-pin="${wish ? '' : t.id}" data-wish="${wish ? esc(C(t).n) : ''}" aria-label="${wish ? 'Envie : ' + esc(C(t).n) : esc(place(t))}"><span class="c">${!wish && t.cover ? IMG(t.cover) : flag(t.pays)}</span></button>`;
function renderCarte() {
  if (mapMode !== 'plan') return renderGlobe();
  const sc = $('s-carte');
  if (!window.d3 || !window.topojson) { sc.innerHTML = `<div style="padding:70px 20px"><h1 class="bigtitle">Carte</h1><p class="small" style="margin-top:12px">La carte n'a pas pu se charger.</p></div>`; return; }
  const W = 1400, H = 720;
  if (!mproj) mproj = d3.geoNaturalEarth1().fitExtent([[0, 0], [W, H]], { type: 'Sphere' });
  const feats = topojson.feature(WORLD, WORLD.objects.countries).features.filter(f => f.id !== '010');
  const path = d3.geoPath(mproj), cur = currentTrip(), visited = new Set(S.trips.map(t => C(t).iso)), wish = new Set(S.envies.map(w => C(w).iso));
  if (!mapSel || !trip(mapSel)) mapSel = (cur || sorted()[0] || {}).id;
  sc.innerHTML = `<div class="mapwrap" id="mapwrap"><div class="mapinner" id="mapinner"><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-label="Carte du monde de tes voyages">${feats.map(f => `<path class="land ${cur && f.id === C(cur).iso ? 'c' : visited.has(f.id) ? 'v' : wish.has(f.id) ? 'w' : ''}" d="${path(f)}"/>`).join('')}</svg>
     ${mapItems().map(it => { const [x, y] = mproj(C(it.t).ll); return pinHTML(it, `style="left:${x}px;top:${y}px"`) + `<span class="mlabel" style="left:${x}px;top:${y}px">${esc(it.wish ? C(it.t).n : short(it.t))}</span>`; }).join('')}</div></div>
   <div class="maphead"><div class="mh-row"><h1 class="bigtitle">Carte</h1><button class="pill fs-btn" data-act="friendStats">${SV.users}Entre amis</button></div><p class="caps" style="margin-top:6px">${new Set(S.trips.map(t => t.pays)).size} pays visités, ${S.envies.length} envie${S.envies.length > 1 ? 's' : ''}</p></div>
   ${mapToggle()}${mapLegend()}
   <div class="zoom"><button data-act="zoom" data-z="1.4" aria-label="Zoomer">${SV.plus}</button><button data-act="zoom" data-z="0.7" aria-label="Dézoomer">${SV.minus}</button><button data-act="zoomAll" aria-label="Tout afficher">${SV.globe}</button></div>
   <div id="mapcard"></div>`;
  const wrap = $('mapwrap');
  if (!mapBuilt) { mapBuilt = true; const t = trip(mapSel); centerOn(t ? C(t).ll : [10, 40], t ? 2.2 : .62, false); }
  applyMap();
  let p0 = null, start = null, moved = false, pinch = null; const pts = new Map();
  // pincer à deux doigts pour zoomer ou dézoomer, autour du point entre les doigts
  const pinchInfo = () => { const [a, b] = [...pts.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
  wrap.addEventListener('pointerdown', e => { pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) { pinch = { ...pinchInfo(), k: mapT.k }; moved = true; p0 = null; return; }
    if (pts.size === 1) { p0 = { x: e.clientX, y: e.clientY }; start = { ...mapT }; moved = false; } });
  wrap.addEventListener('pointermove', e => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pts.size >= 2) { const n = pinchInfo(), r = wrap.getBoundingClientRect(), k = Math.max(.6, Math.min(8, pinch.k * n.d / pinch.d));
      mapT.x += n.x - pinch.x; mapT.y += n.y - pinch.y; zoomAt(k / mapT.k, n.x, n.y); pinch.x = n.x; pinch.y = n.y; return; }
    if (!p0) return; const dx = e.clientX - p0.x, dy = e.clientY - p0.y; if (Math.abs(dx) + Math.abs(dy) > 4) { if (!moved) { moved = true; try { wrap.setPointerCapture(e.pointerId); } catch (_) { } } mapT.x = start.x + dx; mapT.y = start.y + dy; applyMap(); } });
  const lift = e => { pts.delete(e.pointerId); if (pts.size < 2 && pinch) { pinch = null; if (pts.size === 1) { const [q] = [...pts.values()]; p0 = { x: q.x, y: q.y }; start = { ...mapT }; } } };
  wrap.addEventListener('pointerup', lift); wrap.addEventListener('pointercancel', lift);
  const end = e => { if (!p0) return; const was = moved; p0 = null; if (!was) { const pin = e.target.closest('.mpin'); if (pin) { if (pin.dataset.pin) { if (mapSel === pin.dataset.pin && pin.classList.contains('on')) { openTrip(mapSel); return; } mapSel = pin.dataset.pin; document.querySelectorAll('.mpin').forEach(x => x.classList.toggle('on', x === pin)); renderMapCard(); } else toast(pin.dataset.wish + ' est dans tes envies'); } } };
  wrap.addEventListener('pointerup', end); wrap.addEventListener('pointercancel', () => p0 = null);
  wrap.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.deltaY < 0 ? 1.15 : .87, e.clientX, e.clientY); }, { passive: false });
  renderMapCard();
}
function applyMap() { const el = $('mapinner'); if (el) el.style.transform = `translate(${mapT.x}px,${mapT.y}px) scale(${mapT.k})`; document.querySelectorAll('#mapinner .mpin,#mapinner .mlabel').forEach(p => { p.style.transform = (p.classList.contains('mlabel') ? 'translate(10px,-6px) ' : '') + `scale(${1 / mapT.k})`; p.style.transformOrigin = p.classList.contains('mpin') ? '50% 100%' : '0 50%'; }); }
function centerOn(ll, k, anim) { const wrap = $('mapwrap'); if (!wrap) return; const r = wrap.getBoundingClientRect(), [x, y] = mproj(ll); const to = { k, x: r.width / 2 - x * k, y: r.height * .48 - y * k };
  if (anim && window.gsap && !REDUCED) gsap.to(mapT, { ...to, duration: .8, ease: 'power2.inOut', onUpdate: applyMap }); else { Object.assign(mapT, to); applyMap(); } }
function zoomAt(f, cx, cy) { const r = $('mapwrap').getBoundingClientRect(), px = (cx ?? r.left + r.width / 2) - r.left, py = (cy ?? r.top + r.height / 2) - r.top, k = Math.max(.6, Math.min(8, mapT.k * f)); mapT.x = px - (px - mapT.x) * (k / mapT.k); mapT.y = py - (py - mapT.y) * (k / mapT.k); mapT.k = k; applyMap(); }
ACT.zoom = d => { if (mapMode === 'globe' && $('gwrap')) { const z = Math.max(.8, Math.min(4, GL.z * (+d.z > 1 ? 1.4 : 1 / 1.4))); GL.fly = null; if (window.gsap && !REDUCED) gsap.to(GL, { z, duration: .35, ease: 'power2.out' }); else GL.z = z; return; } zoomAt(+d.z); };
ACT.zoomAll = () => { if (mapMode === 'globe' && $('gwrap')) { const t = trip(mapSel); glFly(t ? C(t).ll : [10, 35], 1); return; } centerOn([20, 30], .62, true); };
function renderMapCard() { const t = trip(mapSel), host = $('mapcard'); if (!host) return; if (!t) { host.innerHTML = S.trips.length ? '' : `<div class="mapcard"><div class="m"><h3>Ta carte est vide</h3><p class="small">Chaque voyage ajoute un repère sur la carte.</p></div><button class="go" data-act="newTrip" aria-label="Créer un voyage">${SV.plus}</button></div>`; return; } const f = info(t);
  host.innerHTML = `<div class="mapcard">${phHTML(t.cover, `${t.id}|cover`)}<div class="m"><h3>${esc(place(t))}</h3><p class="small">${esc(C(t).n)}, ${f.enCours ? 'en cours' : f.futur ? 'à venir' : 'visité'} le ${fd(t.du)} ${D(t.du).getFullYear()}</p><p class="small num">${fmt(f.futur ? t.budget : spentOf(t))}, ${f.jours} jours</p></div><button class="go" data-open="${t.id}" aria-label="Ouvrir ${esc(place(t))}">${SV.chev}</button></div>`;
  if (mapMode === 'plan') centerOn(C(t).ll, Math.max(mapT.k, 2.2), true); }

/* ---------- globe 3D ---------- */
const GL = { rot: [-15, -38, 0], vel: 0, drag: false, idle: true, fly: null, z: 1, run: false, sel: null };
let glFeats, glGrat, glProj, glPath, glCtx, glPins = [], glW = 0, glH = 0, glDpr = 1;
function renderGlobe() {
  const sc = $('s-carte');
  if (!window.d3 || !window.topojson) { sc.innerHTML = `<div style="padding:70px 20px"><h1 class="bigtitle">Carte</h1><p class="small" style="margin-top:12px">Le globe n'a pas pu se charger.</p></div>${mapToggle()}`; return; }
  if (!glFeats) { glFeats = topojson.feature(WORLD, WORLD.objects.countries).features.filter(f => f.id !== '010'); glGrat = d3.geoGraticule10(); glProj = d3.geoOrthographic().clipAngle(90).precision(.5); }
  const items = mapItems();
  if (!mapSel || !trip(mapSel)) mapSel = (currentTrip() || sorted()[0] || {}).id;
  sc.innerHTML = `<div class="gwrap" id="gwrap"><canvas id="gcv2"></canvas><div class="gpins2" id="gpins2">${items.map(it => pinHTML(it, 'data-act="gpin"')).join('')}</div></div>
   <div class="maphead"><div class="mh-row"><h1 class="bigtitle">Carte</h1><button class="pill fs-btn" data-act="friendStats">${SV.users}Entre amis</button></div><p class="caps" style="margin-top:6px">${new Set(S.trips.map(t => t.pays)).size} pays visités, ${S.envies.length} envie${S.envies.length > 1 ? 's' : ''}</p></div>
   ${mapToggle()}${mapLegend()}
   <div class="zoom"><button data-act="zoom" data-z="1.4" aria-label="Zoomer">${SV.plus}</button><button data-act="zoom" data-z="0.7" aria-label="Dézoomer">${SV.minus}</button><button data-act="zoomAll" aria-label="Recentrer">${SV.globe}</button></div>
   <div id="mapcard"></div>`;
  glPins = [...sc.querySelectorAll('.gpins2 .mpin')].map((b, i) => ({ b, ll: C(items[i].t).ll }));
  glCtx = $('gcv2').getContext('2d'); glPath = d3.geoPath(glProj, glCtx); glW = 0;
  const box = $('gwrap'), pts = new Map(); let pinch = null;
  box.addEventListener('pointerdown', e => { if (e.target.closest('.mpin')) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { box.setPointerCapture(e.pointerId); } catch (_) { }
    GL.drag = true; GL.idle = false; GL.fly = null; GL.vel = 0;
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: GL.z }; } });
  box.addEventListener('pointermove', e => { const o = pts.get(e.pointerId); if (!o) return; const dx = e.clientX - o.x, dy = e.clientY - o.y; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size >= 2 && pinch) { const [a, b] = [...pts.values()]; GL.z = Math.max(.8, Math.min(4, pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d)); return; }
    const k = .32 / GL.z; GL.rot[0] += dx * k; GL.rot[1] = Math.max(-75, Math.min(75, GL.rot[1] - dy * k)); GL.vel = dx * k; });
  const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) GL.drag = false; };
  box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
  box.addEventListener('wheel', e => { e.preventDefault(); GL.z = Math.max(.8, Math.min(4, GL.z * (e.deltaY < 0 ? 1.12 : .89))); }, { passive: false });
  if (!GL.run) { GL.run = true; requestAnimationFrame(glLoop); addEventListener('resize', () => glW = 0); }
  const t = trip(mapSel); if (t && !GL.placed) { GL.placed = true; GL.rot = [-C(t).ll[0], -C(t).ll[1] + 8, 0]; }
  renderMapCard();
}
function glDraw() {
  const box = $('gwrap'), cv = $('gcv2'); if (!box || !cv) return;
  if (!glW) { const r = box.getBoundingClientRect(); glW = r.width; glH = r.height; glDpr = Math.min(2, devicePixelRatio || 1); cv.width = glW * glDpr; cv.height = glH * glDpr; }
  const W = glW, H = glH; if (!W) return; const R = Math.min(W * .46, H * .36) * GL.z, cx = W / 2, cy = H * .5, ctx = glCtx;
  glProj.scale(R).translate([cx, cy]).rotate(GL.rot);
  ctx.setTransform(glDpr, 0, 0, glDpr, 0, 0); ctx.clearRect(0, 0, W, H);
  let g = ctx.createRadialGradient(cx, cy, R * .95, cx, cy, R * 1.22); g.addColorStop(0, 'rgba(46,94,62,.16)'); g.addColorStop(1, 'rgba(46,94,62,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.22, 0, 7); ctx.fill();
  g = ctx.createRadialGradient(cx - R * .35, cy - R * .4, R * .1, cx, cy, R); g.addColorStop(0, '#EEF4F3'); g.addColorStop(1, '#C2D4D3');
  ctx.beginPath(); glPath({ type: 'Sphere' }); ctx.fillStyle = g; ctx.fill();
  ctx.beginPath(); glPath(glGrat); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = .6; ctx.stroke();
  const visited = new Set(S.trips.map(t => C(t).iso)), cur = currentTrip(), curIso = cur ? C(cur).iso : null, wish = new Set(S.envies.map(w => C(w).iso));
  glFeats.forEach(f => { ctx.beginPath(); glPath(f); const isW = !visited.has(f.id) && f.id !== curIso && wish.has(f.id); ctx.fillStyle = f.id === curIso ? '#2E5E3E' : visited.has(f.id) ? '#6FA882' : isW ? '#F3C979' : '#FBFAF7'; ctx.fill(); ctx.strokeStyle = isW ? '#D9962B' : 'rgba(120,125,115,.35)'; ctx.lineWidth = isW ? 1.1 : .5; ctx.stroke(); });
  g = ctx.createRadialGradient(cx - R * .3, cy - R * .35, R * .2, cx, cy, R * 1.02); g.addColorStop(0, 'rgba(255,255,255,.14)'); g.addColorStop(.7, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(15,25,20,.25)');
  ctx.beginPath(); glPath({ type: 'Sphere' }); ctx.fillStyle = g; ctx.fill();
  const center = [-GL.rot[0], -GL.rot[1]];
  glPins.forEach(({ b, ll }) => { const dist = d3.geoDistance(ll, center), vis = dist < 1.45, [x, y] = glProj(ll), depth = Math.cos(Math.min(dist, 1.57));
    b.style.transform = `translate(${x}px,${y}px) scale(${.55 + .45 * depth})`; b.style.opacity = vis ? Math.min(1, depth * 1.8) : 0; b.style.pointerEvents = vis ? 'auto' : 'none'; b.style.zIndex = Math.round(depth * 100) + (b.classList.contains('on') ? 100 : 0); });
}
function glLoop() {
  if (current === 'carte' && mapMode === 'globe' && $('gcv2')) {
    if (GL.fly) { const k = Math.min(1, (performance.now() - GL.fly.t0) / GL.fly.dur), e = d3.easeCubicInOut(k); GL.rot = GL.fly.r(e); if (GL.fly.z) GL.z = GL.fly.z(e); if (k >= 1) GL.fly = null; }
    else if (!GL.drag) { if (Math.abs(GL.vel) > .01) { GL.rot[0] += GL.vel; GL.vel *= .94; } else if (GL.idle && !REDUCED) GL.rot[0] += .06; }
    glDraw();
  }
  requestAnimationFrame(glLoop);
}
function glFly(ll, z) { GL.idle = false; const to = [-ll[0], -ll[1] + 8, 0], from = GL.rot.slice(); while (to[0] - from[0] > 180) to[0] -= 360; while (from[0] - to[0] > 180) to[0] += 360;
  if (REDUCED) { GL.rot = to; if (z) GL.z = z; return; } GL.fly = { r: d3.interpolate(from, to), z: z ? d3.interpolate(GL.z, z) : null, t0: performance.now(), dur: 1100 }; }
ACT.gpin = d => { if (!d.pin) { const w = S.envies.find(x => C(x).n === d.wish); toast(`${d.wish} est dans tes envies${w && w.note ? ' : ' + w.note : ''}`); if (w) glFly(C(w).ll); return; }
  if (d.pin === mapSel && GL.sel === d.pin) { openTrip(d.pin); return; }
  mapSel = d.pin; GL.sel = d.pin; document.querySelectorAll('#gpins2 .mpin').forEach(x => x.classList.toggle('on', x.dataset.pin === d.pin)); renderMapCard(); glFly(C(trip(d.pin)).ll, Math.max(GL.z, 1.6)); };

/* ---------- navigation ---------- */
let current = 'home', prev = 'home';
const SCREENS = { home: renderHome, journal: renderJournal, carte: renderCarte, carnets: renderCards, depenses: () => renderDepenses() };
function go(s, mode) {
  if (!$('s-' + s)) return;
  if (s !== current) prev = current;
  current = s;
  document.querySelectorAll('.screen').forEach(x => { x.hidden = x.id !== 's-' + s; x.classList.remove('enter', 'push', 'flip'); });
  const el = $('s-' + s); if (s !== 'carnet') el.scrollTop = 0; void el.offsetWidth; el.classList.add(mode === 'flip' ? 'push' : (mode || 'enter'));
  const tab = { home: 'home', carnets: 'carnets', carnet: 'carnets', journal: 'carnets', carte: 'home', depenses: 'depenses', ia: 'home', fil: 'fil', profil: 'profil', ami: 'fil' }[s];
  document.querySelectorAll('nav [data-go]').forEach(b => b.classList.toggle('on', b.dataset.go === tab));
  document.querySelector('nav').hidden = s === 'carnet';
  $('fab').hidden = ['carnet', 'ia', 'carte', 'ami', 'fil', 'profil'].includes(s);
  $('askbar').hidden = s !== 'ia'; $('dock').hidden = s !== 'carnet';
  if (SCREENS[s]) SCREENS[s]();
  if (s === 'ia') { renderScope(); renderSugg(); if (!$('chat').children.length) greet(); }
}
function refresh() { if (current === 'carnet') openTrip(openId, true); else if (current === 'depenses') renderDepenses(true); else if (current === 'ia') renderScope(); else if (SCREENS[current]) SCREENS[current](); }
function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2800); }

/* ---------- menu + ---------- */
const noTrip = () => { if (S.trips.length) return false; closePanel(); setTimeout(() => { tripSheet(); toast("Crée d'abord ton premier voyage"); }, $('panel').classList.contains('open') ? 380 : 0); return true; };
ACT.plusMenu = () => { const t = currentTrip() || sorted()[0];
  openPanel(`<h2>Ajouter</h2><p class="small">${t ? 'Au voyage ' + esc(place(t)) : ''}</p><div class="menulist">
    <button data-act="compose">${SV.send}Publier un souvenir</button>
    <button data-act="addExp">${SV.receipt}Une dépense</button>
    <button data-act="addPage">${SV.page}Une page de journal</button>
    <button data-act="photoNow">${SV.cam}Une photo</button>
    <button data-act="newTrip">${SV.plane}Un nouveau voyage</button>
    <button data-act="addWish">${SV.heart}Une envie</button></div>${CLOSE()}`, null, { nofocus: true }); };
['addExp', 'newTrip', 'addWish', 'addPage'].forEach(k => { const f = ACT[k]; ACT[k] = fromPanel(f); });
ACT.photoNow = fromPanel(() => { const t = currentTrip() || sorted()[0]; ACT.photoTrip({ trip: t.id }); });
['addExp', 'addPage', 'photoNow', 'photoTrip'].forEach(k => { const f = ACT[k]; ACT[k] = d => { if (noTrip()) return; return f(d || {}); }; });
SV.minus = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg>';
SV.warn = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17v.5"/></svg>';
