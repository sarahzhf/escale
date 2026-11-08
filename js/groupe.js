/* Escale : missions de groupe.
   L'organisatrice ajoute ses amis Escale au voyage (l'équipage). Chaque jour du voyage, en plus de la mission perso,
   tout l'équipage reçoit la même mission : 3 heures pour la relever, puis vote pour la plus belle photo (24 h).
   Points : 10 à l'heure, 5 en retard, 15 de plus pour la photo élue. */
'use strict';
let GMS = [];
async function loadGroupMissions() { try { GMS = (await rpc('my_group_missions')) || []; } catch (_) { GMS = []; } }
{ const lm0 = loadMissions; loadMissions = async (...a) => { await Promise.all([lm0(...a), loadGroupMissions()]); }; }

const gmWinner = g => { if (!g.closed || !g.entries.length) return null; const top = Math.max(...g.entries.map(e => e.votes)); return top > 0 ? g.entries.filter(e => e.votes === top).map(e => e.user.id) : null; };
const gmMine = g => g.entries.find(e => e.user.id === ME.id);
const gmPoints = () => GMS.reduce((a, g) => { const e = gmMine(g); if (!e) return a; const w = gmWinner(g); return a + (e.late ? 5 : 10) + (w && w.includes(ME.id) ? 15 : 0); }, 0);
{ const wm0 = withMissions; withMissions = s => { const r = wm0(s); return { ...r, points: r.points + gmPoints(), missions: r.missions + GMS.filter(gmMine).length }; }; }

const gmToday = t => GMS.find(g => g.day === TODAY && !g.closed && (!t || g.trip_id === t.id)) || null;
const gmPlace = g => `${flag(g.country)} ${esc(((g.city || '').split(',')[0]) || (COUNTRIES[g.country] || {}).n || '')}`;
const gmLeft = g => { const ms = new Date(g.due_at) - Date.now(); if (ms > 0) return leftTxt(g); const v = new Date(g.due_at).getTime() + 864e5 - Date.now(); return v > 0 ? `Vote ouvert encore ${Math.ceil(v / 36e5)} h` : 'Terminée'; };

function gmCard(g, compact) {
  const me = gmMine(g), w = gmWinner(g), open = !g.closed;
  const photos = g.entries.map(e => { const mine = e.user.id === ME.id, voted = g.my_vote === e.user.id, won = w && w.includes(e.user.id);
    return `<div class="gp ${won ? 'won' : ''}"><span class="gp-img">${IMG(e.photo, 'Photo de ' + e.user.display_name)}</span>${won ? '<span class="crown" aria-label="Photo élue">👑</span>' : ''}
      <div class="gp-f"><b>${mine ? 'Toi' : first(e.user.display_name)}</b>${open && !mine ? `<button class="vote ${voted ? 'on' : ''}" data-act="gmVote" data-id="${g.id}" data-u="${e.user.id}" aria-pressed="${voted}">♥ <span class="num">${e.votes}</span></button>` : `<span class="vcount">♥ <span class="num">${e.votes}</span></span>`}</div></div>`; }).join('');
  return `<section class="mission gm" id="gm-${g.id}"><div class="ms-h"><span class="ms-ic">👥</span><div><b>Mission de groupe · ${gmPlace(g)}</b><em class="num" data-gdue="${g.due_at}">${gmLeft(g)}</em></div></div>
    <p class="ms-t">${esc(g.txt)}</p>
    <p class="gm-n">${g.entries.length}/${g.crew} ${g.entries.length > 1 ? 'ont relevé' : 'a relevé'}${g.entries.length > 1 && open ? ' · votez pour la plus belle photo' : ''}</p>
    ${photos ? `<div class="grp-ph">${photos}</div>` : ''}
    ${open && !me ? `<button class="btn full" data-act="gmDo" data-id="${g.id}">Relever avec une photo<i>${SV.cam || SV.arrow}</i></button>` : ''}
    ${compact ? '' : ''}</section>`;
}

/* sur l'accueil et dans le voyage, sous la mission perso */
{ const mh0 = missionHTML; missionHTML = t => { const g = gmToday(t); return mh0(t) + (g ? gmCard(g, true) : ''); }; }
{ const rh = SCREENS.home; SCREENS.home = (...a) => { const r = rh(...a); try { const g = gmToday(null), sh = document.querySelector('#s-home .hsheet');
    if (g && sh && !sh.querySelector('.gm')) { const m = sh.querySelector('.mission'); m ? m.insertAdjacentHTML('afterend', gmCard(g, true)) : sh.insertAdjacentHTML('afterbegin', gmCard(g, true)); } } catch (_) { } return r; }; }

ACT.gmDo = d => { const g = GMS.find(x => x.id === d.id); if (!g) return;
  const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.setAttribute('capture', 'environment');
  i.onchange = async () => { const f = i.files && i.files[0]; if (!f) return; toast('Envoi de la photo…');
    try { const path = await uploadPhoto(f, 'journal'); await rpc('group_mission_done', { p_id: g.id, p_photo: path });
      const t = trip(g.trip_id); if (t) { const j = Math.max(1, Math.min(info(t).jours, Math.round((D(g.day) - D(t.du)) / 864e5) + 1)); let e = t.entrees.find(x => x.j === j);
        if (!e) { e = { id: uid(), j, t: `Jour ${j}`, n: '', photos: [] }; t.entrees.push(e); } const k = e.photos.findIndex(x => !x); if (k >= 0) e.photos[k] = path; else if (e.photos.length < 6) e.photos.push(path); save(); }
      await loadGroupMissions(); refresh(); if (document.querySelector('.panel.open #ms-tabs')) ACT.missionsSet({ tab: 'groupe' });
      toast(new Date() > new Date(g.due_at) ? 'Mission de groupe relevée : 5 points' : 'Mission de groupe relevée à temps : 10 points');
    } catch (err) { toast(errMsg(err)); } };
  i.click(); };
ACT.gmVote = async d => { try { await rpc('group_mission_vote', { p_id: d.id, p_target: d.u }); await loadGroupMissions(); toast('Vote enregistré'); } catch (e) { toast(errMsg(e)); }
  const el = document.getElementById('gm-' + d.id), g = GMS.find(x => x.id === d.id); if (el && g) el.outerHTML = gmCard(g); };
ACT.gmOpen = async d => { if (!GMS.some(g => g.id === d.id)) await loadGroupMissions(); ACT.missionsSet({ tab: 'groupe' }); };

/* l'onglet Missions : Perso et Groupe bien séparés */
ACT.missionsSet = (d = {}) => {
  const on = !SETTINGS || SETTINGS.missions_on !== false, tab = d.tab || (gmToday(null) && !todayMission() ? 'groupe' : 'perso');
  const perso = () => { const m = todayMission(), done = MISSIONS.filter(x => x.done_at);
    return `${m ? missionCardOnly(m) : '<p class="small gm-empty">Pas de mission perso en attente. Pendant un voyage, elle arrive à une heure surprise entre 10 h et 20 h.</p>'}
      <div class="seg wide" id="ms-on"><button type="button" data-v="1" class="${on ? 'on' : ''}">Activées</button><button type="button" data-v="0" class="${on ? '' : 'on'}">Désactivées</button></div>
      ${done.length ? `<div class="sec"><h2>Relevées</h2><span class="small">${done.length}</span></div><div class="ms-list">${done.slice(0, 12).map(x => `<p><b>${fd(x.day)}</b> ${esc(x.txt)} <em>${x.late ? '+5' : '+10'}</em></p>`).join('')}</div>` : ''}`; };
  const groupe = () => GMS.length ? GMS.map(g => gmCard(g)).join('') : `<p class="small gm-empty">Ajoute tes amis Escale à un voyage (dans « Qui part avec toi ? ») : chaque jour, vous recevrez la même mission, puis vous voterez pour la plus belle photo.</p>`;
  openPanel(`<h2>Missions</h2><div class="seg wide" id="ms-tabs" role="tablist"><button type="button" role="tab" data-t="perso" class="${tab === 'perso' ? 'on' : ''}">Perso</button><button type="button" role="tab" data-t="groupe" class="${tab === 'groupe' ? 'on' : ''}">Groupe${GMS.filter(g => !g.closed).length ? ` <span class="ms-dot">${GMS.filter(g => !g.closed).length}</span>` : ''}</button></div>
    <div id="ms-body">${tab === 'perso' ? perso() : groupe()}</div>${CLOSE()}`, p => {
    p.querySelectorAll('#ms-tabs button').forEach(b => b.onclick = () => ACT.missionsSet({ tab: b.dataset.t }));
    p.querySelectorAll('#ms-on button').forEach(b => b.onclick = async () => { const v = b.dataset.v === '1'; p.querySelectorAll('#ms-on button').forEach(x => x.classList.toggle('on', x === b));
      const { error } = await sb.from('account_settings').update({ missions_on: v }).eq('user_id', ME.id); if (error) { toast('Réglage non enregistré'); return; } if (SETTINGS) SETTINGS.missions_on = v; toast(v ? 'Missions activées' : 'Missions désactivées'); });
  }, { nofocus: true }); };
const missionCardOnly = m => `<section class="mission"><div class="ms-h"><span class="ms-ic">📸</span><div><b>Ta mission du jour</b><em class="num" data-due="${m.due_at}">${leftTxt(m)}</em></div></div><p class="ms-t">${esc(m.txt)}</p><button class="btn full" data-act="missionDo" data-id="${m.id}">Relever avec une photo<i>${SV.cam || SV.arrow}</i></button></section>`;

setInterval(() => document.querySelectorAll('[data-gdue]').forEach(el => { el.textContent = gmLeft({ due_at: el.dataset.gdue }); }), 30000);

/* l'équipage : choisir ses amis Escale qui partent aussi */
ACT.crewSet = async d => { const t = trip(d.trip); let fr = [], cur = [];
  try { [fr, cur] = await Promise.all([rpc('my_friends'), rpc('crew_of', { p_trip: t.id })]); } catch (_) { toast('Réessaie dans un instant'); return; }
  fr = fr.filter(f => f.relation === 'friend'); const sel = new Set((cur || []).map(x => typeof x === 'string' ? x : x.crew_of || x.user_id));
  openPanel(`<h2>Missions de groupe</h2><p class="small">Choisis tes amis Escale qui partent avec toi à ${esc(place(t))}. Chaque jour du voyage, vous recevrez la même mission, puis vous voterez pour la plus belle photo. Ils ne voient pas ton journal ni tes dépenses.</p>
    <div class="crew">${fr.map(f => `<button type="button" class="crew-r ${sel.has(f.id) ? 'on' : ''}" data-u="${f.id}" aria-pressed="${sel.has(f.id)}">${avatar(f)}<b>${esc(f.display_name)}</b><i>${SV.check}</i></button>`).join('') || '<p class="small">Tu n\'as pas encore d\'amis sur Escale. Ajoute-les depuis ton profil.</p>'}</div>
    <button class="btn full" id="crew-ok">Enregistrer<i>${SV.arrow}</i></button>${CLOSE()}`, p => {
    p.querySelectorAll('.crew-r').forEach(b => b.onclick = () => { const u = b.dataset.u, on = !sel.has(u); on ? sel.add(u) : sel.delete(u); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    p.querySelector('#crew-ok').onclick = async () => { try { await rpc('crew_set', { p_trip: t.id, p_users: [...sel] }); closePanel(); toast(sel.size ? `${sel.size} ami${sel.size > 1 ? 's' : ''} dans les missions de groupe` : 'Missions de groupe désactivées pour ce voyage'); } catch (e) { toast(errMsg(e)); } };
  }); };
