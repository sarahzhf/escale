/* Escale : mission surprise du jour pendant un voyage (façon BeReal).
   La base choisit chaque jour une heure au hasard entre 10 h et 20 h (heure du téléphone) et envoie une mission.
   On a 2 heures pour la relever : la photo va dans le journal du jour et des billes tombent dans le bocal
   (10 points à l'heure, 5 en retard). Rien n'est publié aux amis. */
'use strict';
let MISSIONS = [];
const MISSION_PTS = m => m.done_at ? (m.late ? 5 : 10) : 0;
const missionPoints = () => MISSIONS.reduce((a, m) => a + MISSION_PTS(m), 0);
/** Points du bocal = défis + missions. */
const withMissions = s => ({ ...s, points: (s.points || 0) + missionPoints(), missions: MISSIONS.filter(m => m.done_at).length });
async function loadMissions() { try { const { data, error } = await sb.from('missions').select('*').order('day', { ascending: false }).limit(60); if (!error) MISSIONS = data || []; } catch (_) { } }
async function syncTz() { try { const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; if (tz && SETTINGS && SETTINGS.tz !== tz) { SETTINGS.tz = tz; await sb.from('account_settings').update({ tz }).eq('user_id', ME.id); } } catch (_) { } }
{ const ld0 = loadData; loadData = async (...a) => { const r = await ld0(...a); await loadMissions(); syncTz(); return r; }; }
const todayMission = () => MISSIONS.find(m => m.day === TODAY && !m.done_at) || null;
const leftTxt = m => { const ms = new Date(m.due_at) - Date.now(); if (ms <= 0) return 'En retard, mais tu peux encore la relever'; const h = Math.floor(ms / 36e5), mn = Math.round(ms % 36e5 / 6e4); return `Encore ${h ? `${h} h ` : ''}${mn} min`; };
function missionHTML(t) {
  const m = todayMission(); if (!m || (t && m.trip_id && m.trip_id !== t.id)) return '';
  return `<section class="mission" id="mission-${m.id}"><div class="ms-h"><span class="ms-ic">📸</span><div><b>Ta mission du jour</b><em class="num" data-due="${m.due_at}">${leftTxt(m)}</em></div></div>
    <p class="ms-t">${esc(m.txt)}</p><button class="btn full" data-act="missionDo" data-id="${m.id}">Relever avec une photo<i>${SV.cam || SV.arrow}</i></button>
    <p class="ms-n">La photo ira dans ton journal du jour, et des billes dans ton bocal. <button class="link" data-act="missionsSet">Réglages</button></p></section>`;
}
ACT.missionDo = d => { const m = MISSIONS.find(x => x.id === d.id); if (!m) return;
  const t = trip(m.trip_id) || currentTrip(); if (!t) { toast('Voyage introuvable'); return; }
  const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.setAttribute('capture', 'environment');
  i.onchange = async () => { const f = i.files && i.files[0]; if (!f) return; toast('Envoi de la photo…');
    try { const path = await uploadPhoto(f, 'journal'); const j = Math.max(1, Math.min(info(t).jours, Math.round((D(m.day) - D(t.du)) / 864e5) + 1));
      let e = t.entrees.find(x => x.j === j); if (!e) { e = { id: uid(), j, t: `Jour ${j}`, n: '', photos: [] }; t.entrees.push(e); }
      const k = e.photos.findIndex(x => !x); if (k >= 0) e.photos[k] = path; else if (e.photos.length < 6) e.photos.push(path); else e.photos[e.photos.length - 1] = path;
      save(); const { data, error } = await sb.rpc('mission_done', { p_id: m.id, p_photo: path }); if (error) throw error;
      Object.assign(m, data || { done_at: new Date().toISOString() }); refresh();
      toast(m.late ? 'Mission relevée : 5 points dans ton bocal' : 'Mission relevée à temps : 10 points dans ton bocal');
    } catch (err) { toast(errMsg(err)); } };
  i.click(); };
ACT.missionOpen = async d => { if (!MISSIONS.some(m => m.id === d.id)) await loadMissions(); const m = MISSIONS.find(x => x.id === d.id); if (!m) return;
  const t = trip(m.trip_id); if (t) { openTrip(t.id); setTimeout(() => { const el = document.getElementById('mission-' + m.id); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 500); } };
ACT.missionsSet = () => { const on = !SETTINGS || SETTINGS.missions_on !== false;
  openPanel(`<h2>Missions surprises</h2><p class="small">Pendant un voyage, une mission par jour à une heure surprise entre 10 h et 20 h. Tu as 2 heures pour la relever avec une photo.</p>
   <div class="seg wide" id="ms-on"><button type="button" data-v="1" class="${on ? 'on' : ''}">Activées</button><button type="button" data-v="0" class="${on ? '' : 'on'}">Désactivées</button></div>
   ${MISSIONS.some(m => m.done_at) ? `<div class="sec"><h2>Missions relevées</h2><span class="small">${MISSIONS.filter(m => m.done_at).length}</span></div><div class="ms-list">${MISSIONS.filter(m => m.done_at).slice(0, 12).map(m => `<p><b>${fd(m.day)}</b> ${esc(m.txt)} <em>${m.late ? '+5' : '+10'}</em></p>`).join('')}</div>` : ''}${CLOSE('Fermer')}`, p => {
    p.querySelectorAll('#ms-on button').forEach(b => b.onclick = async () => { const v = b.dataset.v === '1'; p.querySelectorAll('#ms-on button').forEach(x => x.classList.toggle('on', x === b));
      const { error } = await sb.from('account_settings').update({ missions_on: v }).eq('user_id', ME.id); if (error) { toast('Réglage non enregistré'); return; } if (SETTINGS) SETTINGS.missions_on = v; toast(v ? 'Missions activées' : 'Missions désactivées'); });
  }, { nofocus: true }); };
setInterval(() => document.querySelectorAll('.mission [data-due]').forEach(el => { el.textContent = leftTxt({ due_at: el.dataset.due }); }), 30000);
/* la mission du jour apparaît aussi en haut de l'accueil */
{ const rh = SCREENS.home; SCREENS.home = (...a) => { const r = rh(...a); try { const m = todayMission(), sh = document.querySelector('#s-home .hsheet');
    if (m && sh && !sh.querySelector('.mission')) sh.insertAdjacentHTML('afterbegin', missionHTML(null)); } catch (_) { } return r; }; }
