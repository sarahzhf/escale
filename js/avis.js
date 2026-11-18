/* Escale : noter l'appli et donner son avis.
 *
 * Dans les réglages : « Noter l'appli » (5 étoiles) et « Donner mon avis ou une idée d'amélioration »
 * (idée, bug ou autre). Tout part dans la table feedback, que seule l'équipe peut lire.
 *
 * La note est aussi demandée une fois au bon moment, jamais au premier lancement :
 * après un premier voyage terminé, ou à la 4e ouverture de l'appli. Si on passe, on ne redemande
 * pas avant 60 jours, et au plus 3 fois. Après une note, on ne redemande plus. */
'use strict';
(() => {
  const key = k => `escale:avis:${k}:${(typeof ME !== 'undefined' && ME && ME.id) || 'x'}`;
  const get = k => { try { return JSON.parse(localStorage.getItem(key(k)) || 'null'); } catch (_) { return null; } };
  const put = (k, v) => { try { localStorage.setItem(key(k), JSON.stringify(v)); } catch (_) { } };
  const MAIL = 'hello.escale.app@gmail.com';

  async function send(row) {
    try { const { error } = await sb.from('feedback').insert({ user_id: ME.id, app_version: 'v2.9', ...row }); if (error) throw error; return true; }
    catch (_) { return false; }
  }
  const mailto = (subj, body) => `mailto:${MAIL}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
  const stars = n => [1, 2, 3, 4, 5].map(i => `<button type="button" class="avis-star ${i <= n ? 'on' : ''}" data-s="${i}" aria-label="${i} étoile${i > 1 ? 's' : ''}">★</button>`).join('');

  /** Fenêtre de notation, ouverte depuis les réglages ou au bon moment. */
  function rateSheet(auto) {
    let n = 0;
    openPanel(`<div class="avis"><h2>${auto ? 'Tu aimes Escale ?' : 'Noter l\'appli'}</h2><p class="small">Ta note nous aide à savoir ce qui marche, et ce qu'il faut améliorer.</p>
      <div class="avis-stars" id="av-s" role="group" aria-label="Ta note">${stars(0)}</div>
      <div id="av-more" hidden><label class="fld"><span id="av-q">Un mot pour nous ?</span><textarea id="av-t" maxlength="1000" rows="3" placeholder="Facultatif"></textarea></label></div>
      <button class="btn full" id="av-ok" disabled>Envoyer<i>${SV.arrow}</i></button></div>${CLOSE(auto ? 'Plus tard' : 'Annuler')}`, p => {
      const bind = () => p.querySelectorAll('.avis-star').forEach(b => b.onclick = () => { n = +b.dataset.s; p.querySelector('#av-s').innerHTML = stars(n); bind(); p.querySelector('#av-more').hidden = false; p.querySelector('#av-ok').disabled = false;
        p.querySelector('#av-q').textContent = n <= 3 ? 'Qu\'est-ce qu\'on pourrait améliorer ?' : 'Qu\'est-ce que tu préfères dans Escale ?'; });
      bind();
      p.querySelector('#av-ok').onclick = async () => { if (!n) return; const msg = p.querySelector('#av-t').value.trim().slice(0, 1000);
        const ok = await send({ kind: 'note', rating: n, message: msg || null }); put('rated', Date.now());
        if (ok) { closePanel(); toast(n >= 4 ? 'Merci beaucoup pour ta note !' : 'Merci, on lit chaque avis pour améliorer Escale'); }
        else p.querySelector('.avis').innerHTML = `<h2>Envoi impossible pour l'instant</h2><p class="small">Tu peux nous écrire directement, on lit tout.</p><a class="btn full" href="${mailto('Ma note pour Escale : ' + n + '/5', msg)}">Écrire à l'équipe<i>${SV.arrow}</i></a>`; };
    }, { nofocus: true });
    if (auto) { const a = get('ask') || { n: 0 }; put('ask', { n: a.n + 1, at: Date.now() }); }
  }
  ACT.rateApp = () => { closePanel(); setTimeout(() => rateSheet(false), 380); };

  ACT.feedback = () => { closePanel(); setTimeout(() => { let kind = 'idee';
    openPanel(`<div class="avis"><h2>Ton avis compte</h2><p class="small">Une idée, un bug, une remarque : tout arrive directement à l'équipe d'Escale.</p>
      <div class="seg wide" id="fb-k">${[['idee', 'Une idée'], ['bug', 'Un bug'], ['autre', 'Autre']].map(([k, l]) => `<button type="button" data-k="${k}" class="${k === kind ? 'on' : ''}">${l}</button>`).join('')}</div>
      <label class="fld"><span>Ton message</span><textarea id="fb-t" maxlength="2000" rows="5" placeholder="Dis-nous tout"></textarea></label>
      <p class="small">Pour un bug, dis ce que tu faisais et sur quel écran. Ton message est envoyé avec ton compte pour qu'on puisse te répondre, jamais rendu public.</p>
      <button class="btn full" id="fb-ok">Envoyer<i>${SV.arrow}</i></button></div>${CLOSE()}`, p => {
      p.querySelectorAll('#fb-k button').forEach(b => b.onclick = () => { kind = b.dataset.k; p.querySelectorAll('#fb-k button').forEach(x => x.classList.toggle('on', x === b)); });
      p.querySelector('#fb-ok').onclick = async () => { const msg = p.querySelector('#fb-t').value.trim().slice(0, 2000); if (msg.length < 3) { toast('Écris ton message'); p.querySelector('#fb-t').focus(); return; }
        const ok = await send({ kind, message: msg, screen: (typeof prev !== 'undefined' && prev) || null });
        if (ok) { closePanel(); toast('Merci ! Ton message est bien arrivé'); }
        else p.querySelector('.avis').innerHTML = `<h2>Envoi impossible pour l'instant</h2><p class="small">Ton message n'est pas perdu : envoie-le par e-mail.</p><a class="btn full" href="${mailto('Mon avis sur Escale (' + kind + ')', msg)}">Écrire à l'équipe<i>${SV.arrow}</i></a>`; };
    }); }, 380); };

  /* demande au bon moment : premier voyage terminé, ou 4e ouverture */
  function maybeAsk() {
    if (typeof ME === 'undefined' || !ME || get('rated') || document.body.classList.contains('gated')) return;
    if (document.querySelector('.guide') || $('panel').classList.contains('open')) return;
    const a = get('ask') || { n: 0, at: 0 }; if (a.n >= 3 || Date.now() - a.at < 60 * 864e5) return;
    const opens = get('opens') || 0, done = (S.trips || []).some(t => !info(t).futur && !info(t).enCours);
    if (opens >= 4 || done) rateSheet(true);
  }
  let counted = false;
  const go0 = go;
  go = (s, mode) => { go0(s, mode); if (s !== 'home' || typeof ME === 'undefined' || !ME) return;
    if (!counted) { counted = true; put('opens', (get('opens') || 0) + 1); }
    if (get('opens') > 1 || (S.trips || []).length) setTimeout(() => { if (current === 'home') maybeAsk(); }, 2500); };
})();
