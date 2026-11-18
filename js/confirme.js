/* Escale : page d'arrivée du lien de confirmation du compte.
 * Supabase confirme l'adresse avant de rediriger ici. Si le lien a expiré ou a déjà servi,
 * l'adresse contient une erreur : on affiche alors le message adapté. Rien n'est lu ni envoyé. */
'use strict';
(() => {
  const q = new URLSearchParams(location.search), h = new URLSearchParams(location.hash.replace(/^#/, ''));
  const bad = q.get('error') || h.get('error') || q.get('error_code') || h.get('error_code');
  if (bad) { document.getElementById('ok').hidden = true; document.getElementById('ko').hidden = false; document.title = 'Lien expiré - Escale'; }
  // on retire le code de l'adresse, pour qu'il ne reste pas dans l'historique
  if (location.search || location.hash) history.replaceState(null, '', location.pathname);
})();
