/* Recommandations : les bonnes adresses de vraies personnes (amis ou public), par pays et ville. */
const RC_CAT = { resto: ['🍽️', 'Restaurant'], activite: ['🎟️', 'Activité'], endroit: ['📍', 'Endroit sympa'], hotel: ['🛏️', 'Hébergement'], autre: ['✨', 'Autre'] };
let RC_CATF = '';
async function renderRecos() {
  const box = $('feedbox'); if (!box) return;
  box.innerHTML = '<div class="skel" role="status" aria-label="Chargement"></div>';
  try {
    let q = sb.from('recommendations').select('*').order('created_at', { ascending: false }).limit(60);
    const t = fQ.trim(), codes = t.length >= 2 ? countryCodes(t) : null;
    if (t.length >= 2) q = codes && codes.length ? q.or(`country_code.in.(${codes.join(',')}),city.ilike.%${t.replace(/[%,()]/g, '')}%`) : q.ilike('city', `%${t.replace(/[%,()]/g, '')}%`);
    let SAVED = new Set((((await sb.from('reco_saves').select('reco_id')).data) || []).map(x => x.reco_id));
    if (RC_CATF === 'saved') q = q.in('id', SAVED.size ? [...SAVED] : ['00000000-0000-0000-0000-000000000000']);
    else if (RC_CATF) q = q.eq('category', RC_CATF);
    const { data, error } = await q; if (error) throw error;
    const ids = [...new Set(data.map(r => r.owner_id))];
    const ppl = ids.length ? (await sb.from('profiles').select('id,display_name,handle,avatar_path').in('id', ids)).data || [] : [];
    const P = Object.fromEntries(ppl.map(p => [p.id, p]));
    const TH = data.length ? (await sb.from('reco_thanks').select('reco_id,user_id').in('reco_id', data.map(r => r.id))).data || [] : [];
    const thN = id => TH.filter(x => x.reco_id === id).length, thMe = id => TH.some(x => x.reco_id === id && x.user_id === ME.id);
    if (current !== 'fil' || fView !== 'recos') return;
    box.innerHTML = `<div class="rc-top"><button class="btn2 g" data-act="recoNew">${SV.plus}Partager une adresse</button><button class="btn2" data-act="recoAsk">💬 Demander des conseils</button></div>
      <div class="rc-cats">${[['', 'Tout'], ['saved', '🔖 Enregistrées'], ...Object.entries(RC_CAT).map(([k, [e, n]]) => [k, e + ' ' + n])].map(([k, n]) => `<button class="${RC_CATF === k ? 'on' : ''}" data-act="recoCat" data-k="${k}">${n}</button>`).join('')}</div>
      <div class="rc-list">${data.map(r => { const u = P[r.owner_id] || {}, c = RC_CAT[r.category] || RC_CAT.autre, mine = r.owner_id === ME.id;
        return `<article class="rc"><div class="rc-h"><span class="rc-ic">${c[0]}</span><div><b>${esc(r.name)}</b><span>${c[1]} · ${esc(r.city ? r.city + ', ' : '')}${esc((COUNTRIES[r.country_code] || {}).n || r.country_code)}</span></div></div>
          ${r.note ? `<p>${esc(r.note)}</p>` : ''}${r.link ? `<a href="${esc(r.link)}" target="_blank" rel="noopener nofollow">Voir le lieu</a>` : ''}
          <div class="rc-f">${avatar(u, 'sm')}<span>${mine ? 'Ta recommandation' : 'Recommandé par ' + esc((u.display_name || 'un voyageur').split(' ')[0])}</span>
          ${!mine ? `<span class="rc-act"><button class="${SAVED.has(r.id) ? 'on' : ''}" data-act="recoSave" data-id="${r.id}">🔖 ${SAVED.has(r.id) ? 'Enregistrée' : 'Enregistrer'}</button><button class="${thMe(r.id) ? 'on' : ''}" data-act="recoThanks" data-id="${r.id}">${thMe(r.id) ? '❤️' : '🤍'} Merci${thN(r.id) ? ' · ' + thN(r.id) : ''}</button></span>` : thN(r.id) ? `<span class="rc-th">❤️ ${thN(r.id)} merci</span>` : ''}
          ${mine ? `<i>${VIS[r.visibility].n}</i><button data-act="recoDel" data-id="${r.id}" aria-label="Supprimer">${SV.trash || '✕'}</button>` : ''}</div></article>`; }).join('')
        || `<div class="emptyfeed">${t.length >= 2 ? `Pas encore d’adresse pour « ${esc(t)} ». Demande à tes amis qui y sont allés !` : 'Aucune adresse pour l’instant. Partage tes coups de cœur : un resto, une balade, un café…'}</div>`}</div>`;
  } catch (e) { box.innerHTML = `<div class="emptyfeed">${isNetwork(e) ? 'Pas de connexion.' : 'Les recommandations ne peuvent pas être chargées pour le moment.'}</div>`; }
}
ACT.recoCat = d => { RC_CATF = d.k; renderRecos(); };
ACT.recoNew = () => {
  const opts = Object.entries(COUNTRIES).sort((a, b) => a[1].n.localeCompare(b[1].n, 'fr')).map(([k, c]) => `<option value="${k}">${esc(c.n)}</option>`).join('');
  openPanel(`<h2>Partager une adresse</h2><form id="rcF" class="form">
    <label>Nom du lieu<input name="name" required maxlength="80" placeholder="Ex. Café de la Paix"></label>
    <label>Catégorie<select name="category">${Object.entries(RC_CAT).map(([k, [e, n]]) => `<option value="${k}">${e} ${n}</option>`).join('')}</select></label>
    <label>Pays<select name="country_code" required><option value="">Choisir</option>${opts}</select></label>
    <label>Ville ou quartier<input name="city" maxlength="80" placeholder="Ex. Lisbonne, Alfama"></label>
    <label>Ton avis<textarea name="note" maxlength="500" rows="3" placeholder="Ce que tu as aimé, quoi commander, quand y aller…"></textarea></label>
    <label>Lien (facultatif)<input name="link" type="url" maxlength="300" placeholder="https://"></label>
    <label>Qui peut la voir ?<select name="visibility">${Object.entries(VIS).map(([k, v]) => `<option value="${k}"${k === 'friends' ? ' selected' : ''}>${v.n} : ${v.d}</option>`).join('')}</select></label>
    <button class="btn" type="submit">Partager</button></form>`);
  $('rcF').onsubmit = async e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    Object.keys(f).forEach(k => { f[k] = String(f[k]).trim(); if (!f[k]) delete f[k]; });
    if (f.link && !/^https:\/\//.test(f.link)) { toast('Le lien doit commencer par https://'); return; }
    const { error } = await sb.from('recommendations').insert(f);
    if (error) { toast('L’adresse n’a pas pu être partagée' + (error.message ? ` (${error.message.slice(0, 80)})` : '')); return; }
    closePanel(); toast(`Adresse partagée, visibilité : ${VIS[f.visibility].n}`); renderRecos(); };
};
ACT.recoDel = async d => { if (!confirm('Supprimer cette recommandation ?')) return; const { error } = await sb.from('recommendations').delete().eq('id', d.id); if (error) toast('Suppression impossible'); else renderRecos(); };

const rcCountries = sel => Object.entries(COUNTRIES).sort((a, b) => a[1].n.localeCompare(b[1].n, 'fr')).map(([k, c]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${esc(c.n)}</option>`).join('');
ACT.recoAsk = () => {
  const t = fQ.trim(), cc = t.length >= 2 ? countryCodes(t) : null, pre = cc && cc.length === 1 ? cc[0] : '';
  openPanel(`<h2>Demander des conseils</h2><p class="small">Tes amis qui sont déjà allés dans ce pays recevront ta demande et pourront te partager leurs bonnes adresses.</p>
    <form id="raF" class="form"><label>Pays<select name="c" required><option value="">Choisir</option>${rcCountries(pre)}</select></label>
    <label>Ville ou quartier (facultatif)<input name="v" maxlength="80" value="${pre ? '' : esc(t)}" placeholder="Ex. Lisbonne"></label>
    <button class="btn" type="submit">Envoyer la demande</button></form>`);
  $('raF').onsubmit = async e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    try { const n = await rpc('reco_ask', { p_country: f.c, p_city: f.v || null }); closePanel();
      toast(n ? `Demande envoyée à ${n} ami${n > 1 ? 's' : ''} déjà allé${n > 1 ? 's' : ''} là-bas` : 'Aucun de tes amis n’a encore de voyage dans ce pays');
    } catch (err) { toast(String(err.message || 'La demande n’a pas pu être envoyée').slice(0, 120)); } };
};
/* notification reçue : on ouvre les adresses de ce pays et on propose d'en partager une */
async function openRecoAsk(u) {
  const { data } = await sb.from('reco_asks').select('country_code,city').eq('from_id', u).eq('to_id', ME.id).order('created_at', { ascending: false }).limit(1);
  const a = data && data[0]; fView = 'recos'; fQ = a ? (COUNTRIES[a.country_code] || {}).n || '' : '';
  if (current === 'fil') await renderFil(); else go('fil');
  if (a) setTimeout(() => { ACT.recoNew(); const f = $('rcF'); if (f) { f.country_code.value = a.country_code; if (a.city) f.city.value = a.city; } }, 600);
}

ACT.recoSave = async d => { const b = document.querySelector(`[data-act="recoSave"][data-id="${d.id}"]`), on = b && b.classList.contains('on');
  const { error } = on ? await sb.from('reco_saves').delete().eq('reco_id', d.id).eq('user_id', ME.id) : await sb.from('reco_saves').insert({ reco_id: d.id });
  if (error) return toast('Impossible pour le moment'); toast(on ? 'Retirée de tes adresses enregistrées' : 'Enregistrée, retrouve-la dans « 🔖 Enregistrées »'); renderRecos(); };
ACT.recoThanks = async d => { const b = document.querySelector(`[data-act="recoThanks"][data-id="${d.id}"]`), on = b && b.classList.contains('on');
  const { error } = on ? await sb.from('reco_thanks').delete().eq('reco_id', d.id).eq('user_id', ME.id) : await sb.from('reco_thanks').insert({ reco_id: d.id });
  if (error) return toast('Impossible pour le moment'); if (!on) toast('Merci envoyé ❤️'); renderRecos(); };
/* notifications : nouvelle adresse d'un ami pour un voyage à venir, ou merci reçu */
async function openRecoFrom(u, kind) {
  let name = '';
  if (kind === 'reco_new') { const { data } = await sb.from('recommendations').select('country_code').eq('owner_id', u).order('created_at', { ascending: false }).limit(1); name = data && data[0] ? (COUNTRIES[data[0].country_code] || {}).n || '' : ''; }
  fView = 'recos'; fQ = name; RC_CATF = ''; if (current === 'fil') renderFil(); else go('fil');
}
