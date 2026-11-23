/* Eskalys : page d'arrivée du lien de confirmation du compte.
 * Supabase confirme l'adresse avant de rediriger ici. Si le lien a expiré ou a déjà servi,
 * l'adresse contient une erreur : on affiche alors le message adapté. Rien n'est lu ni envoyé. */
'use strict';
(() => {
  const q = new URLSearchParams(location.search), h = new URLSearchParams(location.hash.replace(/^#/, ''));
  const bad = q.get('error') || h.get('error') || q.get('error_code') || h.get('error_code');
  // Lien avec token_hash (marche dans n'importe quel navigateur) ou code (même navigateur) :
  // on file dans l'appli, qui connecte la personne sans lui redemander son mot de passe.
  const th = q.get('token_hash'), code = q.get('code');
  if (!bad && (th || code)) {
    const to = new URLSearchParams(); if (th) { to.set('token_hash', th); to.set('type', q.get('type') || 'email'); } else to.set('code', code);
    to.set('confirmed', '1'); location.replace('./?' + to.toString()); return;
  }
  if (bad) { document.getElementById('ok').hidden = true; document.getElementById('ko').hidden = false; document.title = 'Lien expiré - Eskalys'; }
  // on retire le code de l'adresse, pour qu'il ne reste pas dans l'historique
  if (location.search || location.hash) history.replaceState(null, '', location.pathname);
})();
