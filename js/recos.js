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
    if (RC_CATF) q = q.eq('category', RC_CATF);
    const { data, error } = await q; if (error) throw error;
    const ids = [...new Set(data.map(r => r.owner_id))];
    const ppl = ids.length ? (await sb.from('profiles').select('id,display_name,handle,avatar_path').in('id', ids)).data || [] : [];
    const P = Object.fromEntries(ppl.map(p => [p.id, p]));
    if (current !== 'fil' || fView !== 'recos') return;
    box.innerHTML = `<div class="rc-top"><button class="btn2 g" data-act="recoNew">${SV.plus}Partager une adresse</button></div>
      <div class="rc-cats">${[['', 'Tout'], ...Object.entries(RC_CAT).map(([k, [e, n]]) => [k, e + ' ' + n])].map(([k, n]) => `<button class="${RC_CATF === k ? 'on' : ''}" data-act="recoCat" data-k="${k}">${n}</button>`).join('')}</div>
      <div class="rc-list">${data.map(r => { const u = P[r.owner_id] || {}, c = RC_CAT[r.category] || RC_CAT.autre, mine = r.owner_id === ME.id;
        return `<article class="rc"><div class="rc-h"><span class="rc-ic">${c[0]}</span><div><b>${esc(r.name)}</b><span>${c[1]} · ${esc(r.city ? r.city + ', ' : '')}${esc((COUNTRIES[r.country_code] || {}).n || r.country_code)}</span></div></div>
          ${r.note ? `<p>${esc(r.note)}</p>` : ''}${r.link ? `<a href="${esc(r.link)}" target="_blank" rel="noopener nofollow">Voir le lieu</a>` : ''}
          <div class="rc-f">${avatar(u, 'sm')}<span>${mine ? 'Ta recommandation' : 'Recommandé par ' + esc((u.display_name || 'un voyageur').split(' ')[0])}</span>
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
