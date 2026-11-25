/* Eskalys : entrée dans le pays (visa), situation et santé, à jour.
   Les infos viennent de la fonction « infos-pays », qui lit la fiche officielle « Conseils aux voyageurs »
   (diplomatie.gouv.fr) et la garde 3 jours. Ici, on les garde aussi 1 jour sur le téléphone.
   Tout élément .ip-slot[data-c] ajouté à la page est rempli tout seul. */
(() => {
  const PKEY = 'escale:passport', CKEY = 'escale:infos:', TTL = 864e5, PENDING = new Map();
  const passport = () => { try { return localStorage.getItem(PKEY) || 'FR'; } catch (_) { return 'FR'; } };
  window.myPassport = passport;
  const cget = k => { try { return JSON.parse(localStorage.getItem(CKEY + k) || 'null'); } catch (_) { return null; } };

  async function infosPays(cc) {
    const pp = passport(), k = pp + cc, c = cget(k);
    if (c && Date.now() - c.at < TTL) return c.d;
    if (!navigator.onLine || typeof sb === 'undefined' || !sb) return c ? c.d : null;
    if (PENDING.has(k)) return PENDING.get(k);
    const p = (async () => {
      try { const { data, error } = await sb.functions.invoke('infos-pays', { body: { country: cc, passport: pp } });
        if (error || !data || data.error) return c ? c.d : null;
        try { localStorage.setItem(CKEY + k, JSON.stringify({ at: Date.now(), d: data })); } catch (_) { }
        return data; } catch (_) { return c ? c.d : null; } finally { PENDING.delete(k); }
    })();
    PENDING.set(k, p); return p;
  }
  window.infosPays = infosPays;

  const VB = { aucun: ['ok', 'Pas de visa'], autorisation: ['warn', 'Autorisation obligatoire'], evisa: ['warn', 'E-visa obligatoire'], visa_arrivee: ['warn', 'Visa à l’arrivée'], visa: ['bad', 'Visa obligatoire'], inconnu: ['grey', 'À vérifier'] };
  const SB = { normal: ['ok', 'Vigilance normale'], vigilance: ['warn', 'Vigilance renforcée'], deconseille_sauf: ['bad', 'Certaines zones déconseillées'], formellement_deconseille: ['bad', 'Pays formellement déconseillé'], inconnu: ['grey', 'Situation à vérifier'] };
  const fdate = s => { if (!s) return ''; const d = new Date(s + 'T12:00:00'); return isNaN(d) ? '' : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); };
  const officiel = cc => `https://www.diplomatie.gouv.fr/fr/conseils-aux-voyageurs/conseils-par-pays-destination/`;
  window.visaNeeded = d => d && d.visa && ['autorisation', 'evisa', 'visa_arrivee', 'visa'].includes(d.visa.statut);

  // bloc complet (page du pays dans Conseils, préparation du voyage)
  function fullHTML(cc, d) {
    if (!d) return `<div class="ip ip-off"><b>Formalités et situation</b><p>Impossible de vérifier pour l’instant. Avant de réserver, regarde la fiche officielle.</p><a href="${officiel(cc)}" target="_blank" rel="noopener">Ouvrir les Conseils aux voyageurs</a></div>`;
    const v = d.visa || {}, s = d.situation || {}, vb = VB[v.statut] || VB.inconnu, sb_ = SB[s.niveau] || SB.inconnu;
    const pp = passport(), who = pp === 'FR' ? 'voyageurs français' : `passeport ${typeof COUNTRIES !== 'undefined' && COUNTRIES[pp] ? COUNTRIES[pp].n : pp}`;
    return `<div class="ip">
      <div class="ip-row"><span class="ip-b ${vb[0]}">${vb[1]}</span><div><b>${esc(v.titre || vb[1])}</b><em>Pour les ${esc(who)}${v.duree ? `, ${esc(v.duree)}` : ''}</em>
        ${v.demarche ? `<p>${esc(v.demarche)}${v.cout ? ` Coût : ${esc(v.cout)}.` : ''}</p>` : ''}${v.lien ? `<a href="${esc(v.lien)}" target="_blank" rel="noopener">Faire la demande sur le site officiel</a>` : ''}</div></div>
      ${d.papiers ? `<div class="ip-row"><span class="ip-b grey">Papiers</span><div><b>${esc(d.papiers)}</b></div></div>` : ''}
      <div class="ip-row"><span class="ip-b ${sb_[0]}">${sb_[1]}</span><div>${s.resume && !/^vigilance normale\.?$/i.test(s.resume) ? `<p>${esc(s.resume)}</p>` : ''}${s.zones ? `<p class="ip-z">À éviter : ${esc(s.zones)}</p>` : ''}</div></div>
      ${d.sante && d.sante.resume ? `<div class="ip-row"><span class="ip-b grey">Santé</span><div><p>${esc(d.sante.resume)}</p></div></div>` : ''}
      <p class="ip-src">Source : France Diplomatie${d.mise_a_jour ? `, fiche mise à jour le ${fdate(d.mise_a_jour)}` : ''}. Vérifié par Eskalys le ${fdate(d.verifie_le)}. <a href="${esc(d.source || officiel(cc))}" target="_blank" rel="noopener">Voir la fiche officielle</a></p></div>`;
  }
  window.infosHTML = fullHTML;

  // version courte dans le petit mot : seulement ce qui compte vraiment
  function motLines(d, t) {
    if (!d) return [];
    const L = [], v = d.visa || {}, s = d.situation || {};
    if (visaNeeded(d)) L.push(`<li class="mot-imp"><b>Le plus important :</b> ${esc(v.titre)}${v.demarche ? `. ${esc(v.demarche)}` : '.'}</li>`);
    if (s.niveau === 'vigilance') L.push(`<li class="mot-imp">Petit point sérieux : la vigilance est renforcée en ce moment. Jette un œil à la fiche officielle avant de partir.</li>`);
    if (s.niveau === 'deconseille_sauf') L.push(`<li class="mot-imp">Petit point sérieux : certaines zones sont déconseillées en ce moment${s.zones ? ` (${esc(s.zones)})` : ''}. Vérifie que ton itinéraire n’y passe pas.</li>`);
    if (s.niveau === 'formellement_deconseille') L.push(`<li class="mot-imp"><b>Attention :</b> le ministère déconseille formellement de se rendre dans ce pays en ce moment. Vérifie la fiche officielle avant de maintenir ton voyage.</li>`);
    if (d.sante && d.sante.moustiques && !(t && t._moust)) L.push(`<li>La fiche santé signale des maladies transmises par les moustiques. Anti-moustiques et vêtements longs le soir, sans négocier.</li>`);
    return L;
  }

  async function fill(el) {
    el.classList.add('done'); const cc = el.dataset.c; if (!cc || cc === 'FR' && passport() === 'FR') { el.remove(); return; }
    if (el.dataset.mode !== 'mot') el.innerHTML = `<div class="ip ip-load"><span></span><p>Vérification des formalités et de la situation…</p></div>`;
    const d = await infosPays(cc);
    if (!el.isConnected) return;
    if (el.dataset.mode === 'mot') { const t = typeof trip === 'function' ? trip(el.dataset.trip) : null; const L = motLines(d, t && { _moust: !!el.closest('.mot')?.querySelector('[data-moust]') });
      if (!L.length) { el.remove(); return; } const ul = el.closest('.mot')?.querySelector('ul'); if (ul) { ul.insertAdjacentHTML('afterbegin', L.filter(x => x.includes('mot-imp')).join('')); ul.insertAdjacentHTML('beforeend', L.filter(x => !x.includes('mot-imp')).join('')); } el.remove(); return; }
    el.innerHTML = fullHTML(cc, d);
    if (d) { const pap = el.closest('.panel')?.querySelector('.cf-pap'); if (pap) pap.hidden = true; }   // l'info à jour remplace l'ancienne ligne « Papiers »
  }
  const scan = root => (root.querySelectorAll ? root.querySelectorAll('.ip-slot:not(.done)') : []).forEach(fill);
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) { if (n.matches && n.matches('.ip-slot:not(.done)')) fill(n); scan(n); } }))).observe(document.documentElement, { childList: true, subtree: true });

  // réglage : ma nationalité (le passeport décide du visa)
  ACT.passSet = () => { const cur = passport(), L = Object.entries(typeof COUNTRIES !== 'undefined' ? COUNTRIES : {}).sort((a, b) => a[1].n.localeCompare(b[1].n, 'fr'));
    openPanel(`<h2>Mon passeport</h2><p class="small">Le visa dépend de la nationalité de ton passeport. Eskalys s’en sert seulement pour t’indiquer les bonnes formalités, rien n’est envoyé avec ton nom.</p>
      <label class="fld"><span>Nationalité</span><select id="pp-sel">${L.map(([k, c]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${esc(c.n)}</option>`).join('')}</select></label>
      <button class="btn full" id="pp-ok">Enregistrer<i>${SV.arrow}</i></button>${CLOSE('Annuler')}`, p => {
      p.querySelector('#pp-ok').onclick = () => { try { localStorage.setItem(PKEY, p.querySelector('#pp-sel').value); } catch (_) { } closePanel(); toast('Nationalité enregistrée'); if (typeof render === 'function') try { render(); } catch (_) { } };
    });
  };
})();
