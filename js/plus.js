/* Escale : météo et heure locale, compte à rebours avant le départ, coffre à documents du voyage.
 *
 * Météo : Open-Meteo (api.open-meteo.com), service public et gratuit, sans compte ni clé.
 *   Seules les coordonnées de la ville du voyage sont envoyées (jamais l'identité ni les données
 *   de la personne). Réponse gardée 1 h sur l'appareil pour fonctionner hors connexion.
 * Heure locale : calculée sur le téléphone à partir du fuseau horaire renvoyé par Open-Meteo.
 * Coffre : les documents (photo ou PDF) sont rangés dans l'espace privé de la personne.
 *   Ils ne sont jamais montrés à personne, même quand l'album du voyage est partagé.
 *   Les fiches sont gardées avec les billets du voyage (champ tickets, type « doc »). */
'use strict';
(() => {
  /* ---------- outils ---------- */
  const ico = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const W_IC = {
    sun: ico('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    part: ico('<path d="M8 4.5v1M3.5 9h1M4.8 5.8l.7.7M11.2 5.8l-.7.7"/><path d="M5.6 11.5A3 3 0 0 1 11 9"/><path d="M7 19h10a3.5 3.5 0 0 0 .5-7 5 5 0 0 0-9.6.6A3.2 3.2 0 0 0 7 19z"/>'),
    cloud: ico('<path d="M7 18h10a4 4 0 0 0 .7-7.9A6 6 0 0 0 6.2 9 4.5 4.5 0 0 0 7 18z"/>'),
    fog: ico('<path d="M4 9h16M3 13h18M5 17h14"/>'),
    rain: ico('<path d="M7 14h10a3.5 3.5 0 0 0 .5-7 5 5 0 0 0-9.6.6A3.2 3.2 0 0 0 7 14z"/><path d="M8 17l-1 3M12 17l-1 3M16 17l-1 3"/>'),
    snow: ico('<path d="M7 14h10a3.5 3.5 0 0 0 .5-7 5 5 0 0 0-9.6.6A3.2 3.2 0 0 0 7 14z"/><path d="M8 18h.01M12 20h.01M16 18h.01"/>'),
    storm: ico('<path d="M7 14h10a3.5 3.5 0 0 0 .5-7 5 5 0 0 0-9.6.6A3.2 3.2 0 0 0 7 14z"/><path d="M12 15l-2 4h3l-2 3"/>'),
    clock: ico('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    folder: ico('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
    file: ico('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>'),
    lock: ico('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  };
  // codes météo de l'OMS (WMO) utilisés par Open-Meteo
  const wx = c => c === 0 ? ['sun', 'Ensoleillé'] : c <= 2 ? ['part', 'Éclaircies'] : c === 3 ? ['cloud', 'Couvert'] : c <= 48 ? ['fog', 'Brouillard']
    : c <= 67 || (c >= 80 && c <= 82) ? ['rain', c <= 57 ? 'Bruine' : 'Pluie'] : c <= 77 || c === 85 || c === 86 ? ['snow', 'Neige'] : ['storm', 'Orages'];

  /** Coordonnées [lon, lat] de la ville du voyage, sinon de la capitale du pays. */
  function coordsOf(t) {
    const P = (typeof PLACES !== 'undefined' && PLACES[t.pays]) || {};
    if (t.ville) { const k = norm(t.ville); if (P[k]) return P[k]; const hit = Object.keys(P).find(x => k.startsWith(x) || x.startsWith(k)); if (hit) return P[hit]; }
    return C(t).ll || null;
  }

  /* ---------- météo et heure locale ---------- */
  const WKEY = 'escale:meteo:', WTTL = 3600e3, LOADING = new Set();
  const cacheGet = k => { try { return JSON.parse(localStorage.getItem(WKEY + k) || 'null'); } catch (_) { return null; } };
  async function loadWeather(ll) {
    const k = ll.map(x => (+x).toFixed(2)).join(','), c = cacheGet(k);
    if (c && Date.now() - c.at < WTTL) return c;
    if (!navigator.onLine || LOADING.has(k)) return c;
    LOADING.add(k);
    try {
      const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 8000);
      const u = `https://api.open-meteo.com/v1/forecast?latitude=${ll[1]}&longitude=${ll[0]}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=16`;
      const r = await fetch(u, { signal: ctl.signal, credentials: 'omit', referrerPolicy: 'no-referrer' }); clearTimeout(to);
      if (!r.ok) return c; const j = await r.json();
      const v = { at: Date.now(), tz: j.timezone, off: j.utc_offset_seconds, now: j.current && { t: j.current.temperature_2m, c: j.current.weather_code },
        days: (j.daily && j.daily.time || []).map((d, i) => ({ d, c: j.daily.weather_code[i], max: j.daily.temperature_2m_max[i], min: j.daily.temperature_2m_min[i] })) };
      try { localStorage.setItem(WKEY + k, JSON.stringify(v)); } catch (_) { }
      return v;
    } catch (_) { return c; } finally { LOADING.delete(k); }
  }
  function localTime(w) {
    const now = new Date();
    try { if (w && w.tz) return now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: w.tz }); } catch (_) { }
    if (w && typeof w.off === 'number') { const d = new Date(now.getTime() + now.getTimezoneOffset() * 6e4 + w.off * 1e3); return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }
    return '';
  }
  function gapText(w) {
    if (!w || typeof w.off !== 'number') return '';
    const h = Math.round((w.off / 60 + new Date().getTimezoneOffset()) / 60 * 2) / 2;
    if (!h) return 'Même heure qu’ici';
    const a = Math.abs(h), n = String(a).replace('.5', ' h 30').replace(/^(\d+)$/, '$1 h');
    return h > 0 ? `${n} de plus qu’ici` : `${n} de moins qu’ici`;
  }
  const deg = x => `${Math.round(x)}°`;
  function meteoInner(t, w) {
    const f = info(t), time = localTime(w), gap = gapText(w);
    let wHTML = '';
    if (w) {
      const nowH = lbl => { if (!w.now) return ''; const [ic, n] = wx(w.now.c), d0 = w.days[0];
        return `<div class="mt-w"><i>${W_IC[ic]}</i><b class="num">${deg(w.now.t)}</b><span>${lbl ? `<small>${lbl}</small>` : ''}${n}${d0 ? `, ${deg(d0.min)} à ${deg(d0.max)}` : ''}</span></div>`; };
      const ds = f.futur ? w.days.filter(x => x.d >= t.du && x.d <= t.au).slice(0, 5) : [];
      if (f.enCours) wHTML = nowH('');
      else if (ds.length) wHTML = `<div class="mt-days">${ds.map(x => { const [ic, n] = wx(x.c); return `<span title="${n}"><em>${D(x.d).toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}</em><i>${W_IC[ic]}</i><b class="num">${deg(x.max)}</b><small class="num">${deg(x.min)}</small></span>`; }).join('')}</div>`;
      else wHTML = nowH(`En ce moment à ${esc(place(t))}`) + (f.futur ? `<p class="mt-soon">Les prévisions de tes dates apparaissent environ deux semaines avant le départ.</p>` : '');
    } else wHTML = `<p class="mt-soon">${navigator.onLine ? 'Chargement de la météo…' : 'Météo indisponible hors connexion.'}</p>`;
    return `<div class="mt-head"><span>${W_IC.clock}</span><div><b class="num">${time || '--:--'}</b><em>Heure à ${esc(place(t))}${gap ? `, ${gap}` : ''}</em></div></div>${wHTML}${w ? '<a class="mt-src" href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Météo : Open-Meteo.com (CC BY 4.0)</a>' : ''}`;
  }
  /** Bloc météo et heure : pour tous les voyages, passés, en cours ou à venir. */
  window.meteoHTML = t => {
    const f = info(t);
    const ll = coordsOf(t); if (!ll) return '';
    const k = ll.map(x => (+x).toFixed(2)).join(','), w = cacheGet(k);
    if (!w || Date.now() - w.at >= WTTL) loadWeather(ll).then(v => { const el = document.querySelector(`.meteo[data-trip="${t.id}"]`); if (v && el) el.innerHTML = meteoInner(t, v); });
    return `<div class="meteo" data-trip="${t.id}">${meteoInner(t, w)}</div>`;
  };
  // l'heure avance toute seule tant que la page du voyage est ouverte
  setInterval(() => document.querySelectorAll('.meteo[data-trip]').forEach(el => { const t = trip(el.dataset.trip); const b = el.querySelector('.mt-head b'); if (t && b) { const w = cacheGet((coordsOf(t) || []).map(x => (+x).toFixed(2)).join(',')); const v = localTime(w); if (v) b.textContent = v; } }), 30e3);

  /* ---------- compte à rebours animé ----------
   * Cible : l'heure de départ du premier billet du jour du départ s'il y en a un, sinon minuit (heure du téléphone).
   * Jours, heures, minutes et secondes défilent ; chaque chiffre qui change glisse vers le bas. */
  function departAt(t) {
    const k = (typeof ticketsOf === 'function' ? ticketsOf(t) : []).filter(x => x.kind !== 'doc' && x.date === t.du && /^\d{1,2}:\d{2}/.test(x.dep || ''))
      .sort((a, b) => a.dep.localeCompare(b.dep))[0];
    const [y, m, d] = t.du.split('-').map(Number), [hh, mm] = k ? k.dep.split(':').map(Number) : [0, 0];
    return { at: new Date(y, m - 1, d, hh, mm).getTime(), k };
  }
  const pad = n => String(n).padStart(2, '0');
  function parts(ms) { const s = Math.max(0, Math.floor(ms / 1000)); return [Math.floor(s / 86400), Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60]; }
  const UNITS = [['j', 'jours', 'jour'], ['h', 'heures', 'heure'], ['m', 'minutes', 'minute'], ['s', 'secondes', 'seconde']];
  const digits = v => [...v].map(c => `<span class="cd-dg"><i>${c}</i></span>`).join('');
  window.countdownHTML = (t, home) => {
    if (!info(t).futur) return '';
    const { at, k } = departAt(t), p = parts(at - Date.now());
    const what = k ? (k.kind === 'train' ? 'avant ton train pour ' : 'avant le décollage pour ') : 'avant le départ pour ';
    const tag = home ? `button data-open="${t.id}"` : 'div';
    return `<${tag} class="cdown${home ? ' home' : ''}" data-at="${at}" role="timer" aria-label="Départ dans ${p[0]} jours">
      <span class="cd-t">${what}<b>${esc(place(t))}</b></span>
      <span class="cd-row">${UNITS.map(([u, pl], i) => `<span class="cd-c" data-u="${u}"><span class="cd-v num">${digits(i ? pad(p[i]) : String(p[i]))}</span><em>${pl}</em></span>`).join('')}</span>
    </${home ? 'button' : 'div'}>`;
  };
  function tick() {
    document.querySelectorAll('.cdown[data-at]').forEach(el => {
      const ms = +el.dataset.at - Date.now();
      if (ms <= 0) { el.classList.add('done'); const r = el.querySelector('.cd-row'); if (r && !el.dataset.over) { el.dataset.over = '1'; r.innerHTML = '<span class="cd-go">C’est le grand jour, bon voyage !</span>'; } return; }
      const p = parts(ms);
      el.querySelectorAll('.cd-c').forEach((c, i) => {
        const v = i ? pad(p[i]) : String(p[i]), box = c.querySelector('.cd-v'), cur = [...box.querySelectorAll('.cd-dg i')].map(x => x.textContent).join('');
        if (cur === v) return;
        if (cur.length !== v.length) { box.innerHTML = digits(v); return; }
        box.querySelectorAll('.cd-dg').forEach((dg, j) => { if (dg.textContent === v[j]) return;
          const old = dg.querySelector('i'); old.classList.add('out'); const n = document.createElement('i'); n.className = 'in'; n.textContent = v[j]; dg.appendChild(n);
          setTimeout(() => { old.remove(); n.classList.remove('in'); }, 420); });
        const em = c.querySelector('em'), u = UNITS[i]; if (em) em.textContent = +v > 1 ? u[1] : u[2];
      });
    });
  }
  setInterval(tick, 1000);

  /* ---------- coffre à documents ---------- */
  const DOC_CATS = { reservation: 'Réservation', assurance: 'Assurance', identite: 'Identité et visa', transport: 'Transport sur place', autre: 'Autre' };
  const docsOf = t => ticketsOf(t).filter(x => x.kind === 'doc');
  const passesOf = t => ticketsOf(t).filter(x => x.kind !== 'doc');
  window.docsOf = docsOf;
  // dans l'aperçu : un dossier « Documents du voyage » remplace la liste des billets
  ticketsHTML = t => {
    const f = info(t), P = passesOf(t), Dc = docsOf(t), n = P.length + Dc.length;
    if (!n && !f.futur && !f.enCours) return '';
    return `<div class="sec"><h2>Documents du voyage</h2><button class="more" data-act="coffre" data-trip="${t.id}">${n ? 'Ouvrir' : 'Ajouter'}</button></div>
      <button class="coffre" data-act="coffre" data-trip="${t.id}"><i>${W_IC.folder}</i><span><b>${n ? `${n} document${n > 1 ? 's' : ''}` : 'Ton dossier de voyage'}</b>
      <em>${n ? [P.length && `${P.length} billet${P.length > 1 ? 's' : ''}`, Dc.length && `${Dc.length} fichier${Dc.length > 1 ? 's' : ''}`].filter(Boolean).join(', ') + ', privé' : 'Billets, réservations, assurance : tout au même endroit, privé'}</em></span>${SV.right}</button>`;
  };
  function docRow(t, x) {
    return `<button class="docrow" data-act="docOpen" data-trip="${t.id}" data-id="${x.id}"><i>${/^image\//.test(x.mime || 'image/') ? IMG(x.p, '') : W_IC.file}</i><span><b>${esc(x.name || 'Document')}</b><em>${esc(DOC_CATS[x.cat] || 'Autre')}${x.at ? ', ajouté le ' + fd(x.at.slice(0, 10)) : ''}</em></span>${SV.right}</button>`;
  }
  ACT.coffre = d => { const t = trip(d.trip); if (!t) return;
    const P = passesOf(t), Dc = docsOf(t);
    const groups = Object.keys(DOC_CATS).map(k => [k, Dc.filter(x => (x.cat || 'autre') === k)]).filter(([, L]) => L.length);
    openPanel(`<h2>Documents du voyage</h2><p class="small coffre-priv">${W_IC.lock}Ce dossier reste privé, même si l'album du voyage est partagé. Personne d'autre que toi ne peut l'ouvrir.</p>
      <div class="sec"><h2>Billets</h2><button class="more" data-act="ticketAdd" data-trip="${t.id}">Ajouter</button></div>
      ${P.length ? `<div class="bpasses">${P.slice().sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(a.dep || '').localeCompare(String(b.dep || ''))).map(k => ticketHTML(k, t)).join('')}</div>` : `<p class="small">Avion, train ou bus : importe le PDF ou une photo, Escale le met au format billet.</p>`}
      <div class="sec"><h2>Fichiers</h2><button class="more" data-act="docAdd" data-trip="${t.id}">Ajouter</button></div>
      ${groups.length ? groups.map(([k, L]) => `<p class="caps">${DOC_CATS[k]}</p><div class="docs">${L.map(x => docRow(t, x)).join('')}</div>`).join('') : `<button class="prep-cta" data-act="docAdd" data-trip="${t.id}"><i>${W_IC.file}</i><span><b>Ajoute un document</b><em>Confirmation d'hôtel, attestation d'assurance, visa… en photo ou en PDF</em></span>${SV.right}</button>`}
      ${CLOSE('Fermer')}`, null, { nofocus: true });
  };
  ACT.docAdd = d => { const t = trip(d.trip); if (!t) return;
    if (docsOf(t).length >= 30) { toast('30 documents au maximum par voyage'); return; }
    let cat = 'reservation';
    openPanel(`<h2>Ajouter un document</h2><p class="small">Une photo ou un PDF (10 Mo maximum). Le fichier est rangé dans ton espace privé.</p>
      <label class="fld"><span>Nom du document</span><input id="dc-n" maxlength="60" placeholder="Ex. Réservation hôtel Lisbonne"></label>
      <p class="setsec" style="margin-top:14px">Type</p><div class="seg wide wrap" id="dc-c">${Object.entries(DOC_CATS).map(([k, n]) => `<button type="button" data-c="${k}" class="${k === cat ? 'on' : ''}">${n}</button>`).join('')}</div>
      <p class="small dc-warn" hidden id="dc-w">Pour une pièce d'identité, une simple photo suffit en secours. Garde toujours l'original sur toi.</p>
      <button class="btn full" id="dc-f" style="margin-top:14px">Choisir une photo ou un PDF<i>${SV.arrow}</i></button>${CLOSE()}`, p => {
      p.querySelectorAll('#dc-c button').forEach(b => b.onclick = () => { cat = b.dataset.c; p.querySelectorAll('#dc-c button').forEach(x => x.classList.toggle('on', x === b)); p.querySelector('#dc-w').hidden = cat !== 'identite'; });
      p.querySelector('#dc-f').onclick = () => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'application/pdf,image/*';
        i.onchange = async () => { const file = i.files && i.files[0]; if (!file) return; const btn = p.querySelector('#dc-f');
          if (file.size > 10e6) { toast('Fichier trop lourd (10 Mo maximum)'); return; }
          const pdf = /pdf/.test(file.type) || /\.pdf$/i.test(file.name);
          btn.disabled = true; btn.firstChild.textContent = 'Envoi du document…';
          try {
            let path;
            if (pdf) {
              path = `${ME.id}/docs/${uid().replace(/-/g, '')}.pdf`;
              const { error } = await sb.storage.from('media').upload(path, file, { contentType: 'application/pdf', upsert: false, cacheControl: '3600' });
              if (error) throw new Error(isNetwork(error) ? 'Pas de connexion, réessaie plus tard' : 'Les PDF ne sont pas encore acceptés : ajoute une photo du document');
            } else path = await uploadPhoto(file, 'docs', { max: 2200 });
            const name = (p.querySelector('#dc-n').value.trim() || file.name.replace(/\.[a-z0-9]+$/i, '') || 'Document').slice(0, 60);
            ticketsOf(t).push({ id: uid(), kind: 'doc', cat, name, p: path, mime: pdf ? 'application/pdf' : 'image/jpeg', at: new Date().toISOString() });
            save(); closePanel(); toast('Document rangé dans le dossier'); setTimeout(() => { refresh(); ACT.coffre({ trip: t.id }); }, 360);
          } catch (e) { btn.disabled = false; btn.firstChild.textContent = 'Choisir une photo ou un PDF'; toast(errMsg(e)); } };
        i.click(); };
    }, { nofocus: true });
  };
  ACT.docOpen = async d => { const t = trip(d.trip), x = t && docsOf(t).find(k => k.id === d.id); if (!x) return;
    const isImg = /^image\//.test(x.mime || '');
    openPanel(`<h2>${esc(x.name || 'Document')}</h2><p class="small">${esc(DOC_CATS[x.cat] || 'Autre')}</p>
      ${isImg ? `<div class="docview">${IMG(x.p, x.name || '')}</div>` : `<div class="docview pdf"><i>${W_IC.file}</i><span>Document PDF</span></div>`}
      <button class="btn full" id="dc-o">${isImg ? 'Ouvrir en grand' : 'Ouvrir le PDF'}<i>${SV.arrow}</i></button>
      <button class="danger" id="dc-del">Supprimer ce document</button>${CLOSE('Fermer')}`, p => {
      p.querySelector('#dc-o').onclick = async () => { const w = window.open('', '_blank');
        const { data, error } = await sb.storage.from('media').createSignedUrl(x.p, 600);
        if (error || !data) { if (w) w.close(); toast(navigator.onLine ? 'Ouverture impossible' : 'Pas de connexion : le document s’ouvrira au retour du réseau'); return; }
        if (w) w.location = data.signedUrl; else location.assign(data.signedUrl); };
      p.querySelector('#dc-del').onclick = () => { if (!confirmTwice(p.querySelector('#dc-del'))) return;
        t.tickets = ticketsOf(t).filter(k => k.id !== x.id); releaseMedia(x.p); save(); closePanel(); toast('Document supprimé'); setTimeout(() => { refresh(); ACT.coffre({ trip: t.id }); }, 360); };
    }, { nofocus: true });
  };
  // suppression en deux temps, sans boîte de dialogue du navigateur
  function confirmTwice(b) { if (b.dataset.sure) return true; b.dataset.sure = '1'; b.textContent = 'Touche encore pour confirmer'; setTimeout(() => { if (b.isConnected) { delete b.dataset.sure; b.textContent = 'Supprimer ce document'; } }, 4000); return false; }

  /* ---------- branchement sur les écrans ---------- */
  const open0 = openTrip;
  openTrip = (id, keep) => {
    open0(id, keep);
    if (typeof dTab !== 'undefined' && dTab !== 'apercu') return;
    const t = trip(id), g = document.querySelector('#s-carnet .igrid'); if (!t || !g) return;
    const html = (countdownHTML(t) || '') + (meteoHTML(t) || ''); if (html) g.insertAdjacentHTML('afterend', `<div class="tnow">${html}</div>`);
  };
  if (typeof SCREENS !== 'undefined' && SCREENS.home) {
    const home0 = SCREENS.home;
    SCREENS.home = (...a) => { const r = home0(...a);
      const next = S.trips.filter(x => info(x).futur).sort((a2, b) => a2.du.localeCompare(b.du))[0], cur = S.trips.some(x => info(x).enCours);
      const sh = document.querySelector('#s-home .hsheet');
      if (next && !cur && sh && !sh.querySelector('.cdown')) sh.insertAdjacentHTML('afterbegin', countdownHTML(next, true));
      return r; };
  }
})();
