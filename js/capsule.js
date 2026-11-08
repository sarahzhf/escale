/* Escale : capsule temporelle.
   À la fin d'un voyage, on écrit un mot à soi-même. Il reste scellé jusqu'à la date choisie (3, 6, 9 mois ou 1 an) :
   même soi ne peut pas le relire avant. Le jour venu, une notification arrive et l'enveloppe s'ouvre dans l'appli. */
'use strict';
let CAPS = [];
async function loadCapsules() { try { CAPS = (await rpc('my_capsules')) || []; } catch (_) { CAPS = []; } }
{ const lm0 = loadMissions; loadMissions = async (...a) => { await Promise.all([lm0(...a), loadCapsules()]); }; }
const capOf = t => CAPS.find(c => c.trip_id === t.id) || null;
const capWait = () => CAPS.filter(c => c.body && !c.opened_at);
const moisFr = d => { const m = Math.max(1, Math.round((Date.now() - new Date(d)) / 2629800000)); return `${m} mois`; };

function capsuleHTML(t) {
  const f = info(t); if (f.futur || f.enCours) return '';
  const c = capOf(t);
  if (!c) { if (diffDays(t.au, TODAY) > 90) return '';
    return `<section class="caps"><div class="caps-env" aria-hidden="true"><i></i></div><div><b>Un mot pour toi, dans le futur</b><p>Le voyage est fini. Écris ce que tu veux te rappeler : il te reviendra dans quelques mois, sans que tu puisses le relire avant.</p>
      <button class="btn" data-act="capWrite" data-trip="${t.id}">Écrire ma capsule<i>${SV.arrow}</i></button></div></section>`; }
  if (!c.body) return `<section class="caps sealed"><div class="caps-env" aria-hidden="true"><i></i></div><div><b>Capsule scellée</b><p>Elle s'ouvrira le ${fd(c.open_at)}. D'ici là, même toi tu ne peux pas la relire.</p></div></section>`;
  return `<section class="caps ready"><div class="caps-env" aria-hidden="true"><i></i></div><div><b>Ta capsule est arrivée</b><p>Un mot écrit il y a ${moisFr(c.created_at)}, à la fin de ce voyage.</p><button class="btn" data-act="capOpen" data-id="${c.id}">Ouvrir l'enveloppe<i>${SV.arrow}</i></button></div></section>`;
}
{ const mh0 = missionHTML; missionHTML = t => mh0(t) + (t ? capsuleHTML(t) : ''); }
{ const rh = SCREENS.home; SCREENS.home = (...a) => { const r = rh(...a); try { const c = capWait()[0], sh = document.querySelector('#s-home .hsheet');
    if (c && sh && !sh.querySelector('.caps')) { const t = trip(c.trip_id); sh.insertAdjacentHTML('afterbegin', `<section class="caps ready"><div class="caps-env" aria-hidden="true"><i></i></div><div><b>💌 Un mot de toi t'attend</b><p>Écrit il y a ${moisFr(c.created_at)}${t ? `, à la fin de ton voyage à ${esc(place(t))}` : ''}.</p><button class="btn" data-act="capOpen" data-id="${c.id}">Ouvrir l'enveloppe<i>${SV.arrow}</i></button></div></section>`); } } catch (_) { } return r; }; }

ACT.capWrite = d => { const t = trip(d.trip); let months = 6;
  openPanel(`<h2>Ta capsule</h2><p class="small">Pour toi, dans quelques mois. Ce que tu as ressenti, ce que tu veux garder, ce que tu te promets. Une fois scellée, tu ne pourras plus la relire avant la date.</p>
    <textarea id="cap-t" class="cap-paper" maxlength="2000" rows="8" placeholder="Cher moi du futur…"></textarea>
    <p class="small" style="margin-top:12px">Elle te revient dans</p>
    <div class="seg wide" id="cap-m">${[3, 6, 9, 12].map(m => `<button type="button" data-m="${m}" class="${m === months ? 'on' : ''}">${m === 12 ? '1 an' : m + ' mois'}</button>`).join('')}</div>
    <button class="btn full" id="cap-ok" style="margin-top:16px">Sceller la capsule<i>${SV.lock || SV.arrow}</i></button>${CLOSE()}`, p => {
    p.querySelectorAll('#cap-m button').forEach(b => b.onclick = () => { months = +b.dataset.m; p.querySelectorAll('#cap-m button').forEach(x => x.classList.toggle('on', x === b)); });
    p.querySelector('#cap-ok').onclick = async () => { const v = p.querySelector('#cap-t').value.trim(); if (!v) { toast('Écris quelques mots'); return; }
      const btn = p.querySelector('#cap-ok'); busy(btn, true);
      try { const c = await rpc('capsule_write', { p_trip: t.id, p_body: v, p_months: months }); CAPS = CAPS.filter(x => x.trip_id !== t.id).concat({ ...c, body: null });
        closePanel(); refresh(); toast(`Capsule scellée : rendez-vous le ${fd(c.open_at)}`); } catch (e) { busy(btn, false); toast(errMsg(e)); } };
  }); };

ACT.capOpen = async d => { if (!CAPS.some(c => c.id === d.id)) await loadCapsules(); const c = CAPS.find(x => x.id === d.id); if (!c || !c.body) { toast('Cette capsule n\'est pas encore arrivée'); return; }
  const t = trip(c.trip_id);
  openPanel(`<div class="letter"><div class="lt-env"><i class="lt-flap"></i></div><div class="lt-paper"><p class="lt-h">Écrit le ${fd(String(c.created_at).slice(0, 10))}${t ? `, à la fin de ${esc(place(t))}` : ''}</p><div class="lt-b">${esc(c.body).replace(/\n/g, '<br>')}</div><p class="lt-s">toi, il y a ${moisFr(c.created_at)}</p></div></div>${CLOSE()}`, p => {
    requestAnimationFrame(() => p.querySelector('.letter').classList.add('open')); }, { nofocus: true });
  if (!c.opened_at) { c.opened_at = new Date().toISOString(); try { await rpc('capsule_opened', { p_id: c.id }); } catch (_) { } }
};
