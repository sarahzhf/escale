/* Eskalys : limites de la version gratuite, actives seulement quand le verrou PRO est allumé (PRO.lock dans export.js).
   1. Assistant IA : 5 questions par semaine en gratuit, 20 par jour avec PRO (usage raisonnable). Le compteur est affiché sous la question.
      Ce compteur est tenu sur le téléphone ; le jour du paiement, la fonction « assistant » de Supabase devra aussi le vérifier côté serveur.
   2. Carnet : une sélection gratuite de typographies, papiers, cadres, lettres, couleurs de cuir et stickers ; le reste porte un petit cadenas PRO. */
'use strict';
const AIQ = { free: 5, freeDays: 7, pro: 20 };
const aiqKey = () => 'escale:aiq:' + (ME ? ME.id : 'x');
const aiqList = () => { try { return JSON.parse(localStorage.getItem(aiqKey()) || '[]').filter(x => typeof x === 'number'); } catch (_) { return []; } };
function aiQuota() { if (!PRO.lock) return null; const now = Date.now(), L = aiqList(), pro = PRO.has();
  const win = pro ? 864e5 : AIQ.freeDays * 864e5, used = L.filter(x => now - x < win), max = pro ? AIQ.pro : AIQ.free;
  const next = used.length ? Math.min(...used) + win : now; return { pro, max, used: used.length, left: Math.max(0, max - used.length), next }; }
function aiCount() { if (!PRO.lock) return; const now = Date.now(), L = aiqList().filter(x => now - x < AIQ.freeDays * 864e5); L.push(now); try { localStorage.setItem(aiqKey(), JSON.stringify(L.slice(-60))); } catch (_) { } aiQuotaShow(); }
function aiQuotaShow() { const el = $('aiQuota'); if (!el) return; const q = aiQuota(); if (!q || !(SETTINGS && SETTINGS.ai_enabled)) { el.hidden = true; return; } el.hidden = false;
  const when = new Date(q.next).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  el.innerHTML = q.pro ? `${q.left} question${q.left > 1 ? 's' : ''} sur ${q.max} aujourd’hui avec PRO`
    : q.left ? `Il te reste <b>${q.left} question${q.left > 1 ? 's' : ''}</b> sur ${q.max} cette semaine. <button class="link" data-act="aiPaywall">20 par jour avec PRO</button>`
      : `Tu as utilisé tes ${q.max} questions de la semaine, elles reviennent ${when}. <button class="link" data-act="aiPaywall">Passer à PRO</button>`; }
/** Renvoie false si la question ne doit pas partir vers l'IA (quota atteint). */
function aiAllowed() { const q = aiQuota(); return !q || q.left > 0; }
ACT.aiPaywall = () => openPanel(`<div class="exp-pay"><span class="pro-tag big">PRO</span><h2>Ton conseiller voyage, sans compter</h2>
  <p class="small">En gratuit, l’assistant répond à ${AIQ.free} questions par semaine. Avec Eskalys PRO, pose jusqu’à ${AIQ.pro} questions par jour : comparer des destinations, estimer un budget, analyser tes dépenses, préparer ton prochain voyage.</p>
  <button class="btn full" disabled>Passer à PRO (bientôt disponible)</button>${CLOSE()}</div>`, () => { }, { nofocus: true });

/* ---------- carnet : ce qui reste gratuit ---------- */
const FREE = {
  font: ['carnet', 'moderne', 'machine'],
  paper: ['ligne', 'blanc', 'quadrille', 'kraft'],
  fr: ['polaroid', 'simple', 'cercle', 'aucun', 'blanc', 'arrondi', 'arche'],
  lt: ['label', 'tile'],
  bk: ['creme', 'sauge', 'bleu', 'noir'],
  emoji: 24, doodle: 8, deco: 4
};
function proItem(b) { // le bouton correspond-il à un élément réservé à PRO ?
  if (!b || !b.dataset) return false; const d = b.dataset;
  if (d.font) return !FREE.font.includes(d.font);
  if (d.paper) return !FREE.paper.includes(d.paper);
  if (d.fr) return !FREE.fr.includes(d.fr);
  if (d.lt) return !FREE.lt.includes(d.lt);
  if (d.act === 'bkSetColor' && d.k) return !FREE.bk.includes(d.k);
  if (d.add === 'e' && d.v) return typeof STK !== 'undefined' && STK.e.indexOf(d.v) >= FREE.emoji;
  if (d.add === 'd' && d.v && window.STKI && STKI[d.v]) return true; // fleurs et nœuds en 3D : collection PRO
  if (d.add === 'd' && d.v) { if (typeof DOODLES !== 'undefined' && DOODLES[d.v]) return Object.keys(DOODLES).indexOf(d.v) >= FREE.doodle; if (typeof DECOS !== 'undefined' && DECOS[d.v]) return Object.keys(DECOS).indexOf(d.v) >= FREE.deco; }
  return false; }
const PRO_SEL = '[data-font],[data-paper],[data-fr],[data-lt],[data-act="bkSetColor"],[data-add]';
// un toucher sur un élément PRO ouvre l'écran PRO au lieu de l'appliquer
document.addEventListener('click', e => { if (!PRO.lock || PRO.has()) return; const b = e.target.closest && e.target.closest(PRO_SEL); if (!b || !proItem(b)) return;
  e.preventDefault(); e.stopImmediatePropagation(); ACT.carnetPaywall(); }, true);
// petit cadenas sur les éléments PRO, posé dès qu'un sélecteur apparaît
let proMarkT = null; const proMark = () => { proMarkT = null; if (!PRO.lock || PRO.has()) return; document.querySelectorAll(PRO_SEL).forEach(b => { if (!b.classList.contains('pro-lk') && proItem(b)) b.classList.add('pro-lk'); }); };
new MutationObserver(() => { if (!proMarkT && PRO.lock) proMarkT = setTimeout(proMark, 60); }).observe(document.body, { childList: true, subtree: true });
ACT.carnetPaywall = () => { try { closePanel(); } catch (_) { } setTimeout(() => openPanel(`<div class="exp-pay"><span class="pro-tag big">PRO</span><h2>Toute la collection du carnet</h2>
  <p class="small">En gratuit, tu as déjà de quoi faire un beau carnet. Avec Eskalys PRO, débloque toute la collection :</p>
  <ul class="exp-list"><li><b>Typographies</b> : Romantique, Calligraphie, Old money, Magazine.</li><li><b>Papiers</b> : pointillé, aquarelle, couleurs pastel, bleu nuit et tous les autres.</li><li><b>Cadres photo</b> : médaillon, arche, festonné, dentelle, timbre, pellicule…</li><li><b>Couleurs de cuir</b> : rose poudré, bordeaux, lilas.</li><li><b>Stickers</b> : tous les stickers, dessins et décorations.</li></ul>
  <button class="btn full" disabled>Passer à PRO (bientôt disponible)</button>${CLOSE()}</div>`, () => { }, { nofocus: true }), 320); };
{ const r = SCREENS.ia; if (r) SCREENS.ia = (...a) => { const o = r(...a); setTimeout(aiQuotaShow, 0); return o; }; }
