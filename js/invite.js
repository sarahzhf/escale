/* Escale : rejoindre un voyage par un lien, sans compte.
 * Le propriétaire crée un lien depuis « Qui part avec toi ? ». L'invité qui l'ouvre (…?j=JETON)
 * choisit son prénom, voit le budget et les dépenses du voyage et ajoute les siennes, en euros.
 * Pour ajouter des photos, il doit créer un compte. Tout passe par les fonctions guest_* de la base.
 */
'use strict';
const INV_TOKEN = (new URLSearchParams(location.search).get('j') || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
const inviteUrl = tk => `${location.origin}${location.pathname}?j=${tk}`;

/* ---------- côté propriétaire ---------- */
async function inviteSheet(tid) {
  const t = trip(tid); let tk = null;
  try { tk = await rpc('invite_link', { p_trip: tid }); } catch (e) { toast('Impossible de créer le lien, réessaie'); return; }
  const url = inviteUrl(tk);
  openPanel(`<h2>Inviter par un lien</h2><p class="small">Tes amis ouvrent ce lien, choisissent leur prénom et ajoutent leurs dépenses de ${esc(place(t))}, sans créer de compte. Ils voient le budget et les dépenses du voyage, mais pas ton journal ni tes photos.</p>
    <div class="inv-url" id="inv-url">${esc(url)}</div>
    <button class="btn full" id="inv-share">Partager le lien<i>${SV.arrow}</i></button>
    <button class="link small" id="inv-off" style="margin-top:12px">Désactiver ce lien</button>${CLOSE()}`, p => {
    p.querySelector('#inv-share').onclick = async () => {
      const txt = `Rejoins notre voyage ${place(t)} sur Escale pour noter tes dépenses : ${url}`;
      try { if (navigator.share) { await navigator.share({ title: 'Escale', text: txt, url }); return; } } catch (_) { return; }
      try { await navigator.clipboard.writeText(url); toast('Lien copié'); } catch (_) { const r = document.createRange(); r.selectNodeContents(p.querySelector('#inv-url')); getSelection().removeAllRanges(); getSelection().addRange(r); toast('Lien sélectionné, copie-le'); }
    };
    p.querySelector('#inv-off').onclick = async () => { try { await rpc('invite_revoke', { p_trip: tid }); closePanel(); toast('Lien désactivé : il ne fonctionne plus'); } catch (_) { toast('Réessaie dans un instant'); } };
  });
}
ACT.inviteLink = d => inviteSheet(d.trip);

/* ---------- côté invité ---------- */
const GKEY = 'escale:guest:' + INV_TOKEN;
const gGet = () => { try { return JSON.parse(localStorage.getItem(GKEY)) || {}; } catch (_) { return {}; } };
const gSet = v => { try { localStorage.setItem(GKEY, JSON.stringify(v)); } catch (_) { } };
let GT = null;

async function guestLoad() { const { data, error } = await sb.rpc('guest_trip', { p_token: INV_TOKEN }); if (error) throw error; GT = data; return data; }

function guestShell(inner) {
  showGate(`<div class="gst">${inner}<p class="gst-foot">Escale, le carnet de voyage qui garde tes souvenirs et ton budget.<br><button class="link small" id="gst-acc">Créer mon compte Escale</button></p></div>`, g => {
    g.querySelector('#gst-acc').onclick = guestToAccount; });
}
function guestToAccount() { history.replaceState(null, '', location.pathname); welcome(); }

async function guestBoot() {
  try { await guestLoad(); } catch (_) { GT = null; }
  if (!GT) { guestShell(`<div class="gicon">${SV.x}</div><h2>Lien expiré</h2><p class="gtext">Ce lien d'invitation n'existe plus. Demande un nouveau lien à la personne qui t'a invité.</p>`); return; }
  const me = gGet().id && (GT.members || []).some(m => m.id === gGet().id) ? gGet().id : null;
  me ? guestHome() : guestWho();
}

function guestTitle() { const c = COUNTRIES[GT.country] || {}; return `${flag(GT.country)} ${esc(GT.city || c.n || '')}`; }

function guestWho() {
  const M = GT.members || [];
  guestShell(`<p class="gst-k">On t'invite sur Escale</p><h2>${guestTitle()}</h2><p class="gtext">Qui es-tu ? Choisis ton prénom ou ajoute-le pour noter tes dépenses du voyage.</p>
    <div class="gst-who">${M.map(m => `<button class="pill" data-m="${esc(m.id)}">${esc(m.n)}</button>`).join('')}</div>
    <form id="gst-new" class="madd"><input id="gst-n" maxlength="30" placeholder="Ton prénom" autocomplete="given-name"><button class="pill dark" type="submit">${SV.plus}C'est moi</button></form>`);
  document.querySelectorAll('.gst-who [data-m]').forEach(b => b.onclick = () => { gSet({ id: b.dataset.m }); guestHome(); });
  $('gst-new').onsubmit = async e => { e.preventDefault(); const n = $('gst-n').value.trim(); if (!n) return;
    try { const id = (await sb.rpc('guest_join', { p_token: INV_TOKEN, p_name: n })).data; if (!id) throw 0; gSet({ id }); await guestLoad(); guestHome(); } catch (_) { toast('Impossible de t\'ajouter, réessaie'); } };
}

const gName = id => id === 'me' ? 'L\'organisateur' : ((GT.members || []).find(m => m.id === id) || {}).n || '?';
function guestHome() {
  const me = gGet().id, E = GT.expenses || [], tot = E.reduce((s, d) => s + Number(d.eur), 0), mine = E.filter(d => d.by === me).reduce((s, d) => s + Number(d.eur), 0);
  const b = Number(GT.budget) || 0, pct = b ? Math.min(100, Math.round(tot / b * 100)) : 0;
  const days = GT.start && GT.end ? Math.round((new Date(GT.end) - new Date(GT.start)) / 864e5) + 1 : 1;
  guestShell(`<p class="gst-k">Bonjour ${esc(gName(me))} · <button class="link small" id="gst-sw">pas toi ?</button></p><h2>${guestTitle()}</h2>
    <div class="gst-card"><span class="small">Dépensé par le groupe</span><b class="num">${fmt(tot)}</b>${b ? `<div class="gst-bar"><i style="width:${pct}%"></i></div><span class="small">sur un budget de ${fmt(b)}</span>` : ''}<span class="small">Dont toi : ${fmt(mine)}</span></div>
    <div class="gst-act"><button class="btn" id="gst-add">Ajouter une dépense</button><button class="btn ghost" id="gst-ph">Ajouter une photo</button></div>
    <div class="group">${E.slice().reverse().map(d => `<div class="exp"><span class="ic">${CATS[d.category] ? ico(d.category) : ''}</span><span class="m"><b>${esc(d.label)}</b><span>Jour ${d.day} · ${esc(gName(d.by || 'me'))} a payé</span></span><span class="p num">${fmt(Number(d.eur))}${d.by === me ? `<button class="link small" data-del="${d.id}">Supprimer</button>` : ''}</span></div>`).join('') || '<p class="small" style="padding:14px">Aucune dépense pour l\'instant.</p>'}</div>`);
  $('gst-sw').onclick = () => { gSet({}); guestWho(); };
  $('gst-ph').onclick = () => openPanel(`<h2>Crée ton compte pour ajouter des photos</h2><p class="small">Les photos restent dans le carnet du voyage et dans ton propre Escale. C'est gratuit et ça prend une minute.</p><button class="btn full" id="gst-go">Créer mon compte<i>${SV.arrow}</i></button>${CLOSE()}`, p => p.querySelector('#gst-go').onclick = () => { closePanel(); guestToAccount(); });
  $('gst-add').onclick = () => guestExp(days);
  document.querySelectorAll('[data-del]').forEach(x => x.onclick = async () => { try { await sb.rpc('guest_del_expense', { p_token: INV_TOKEN, p_member: me, p_id: x.dataset.del }); await guestLoad(); guestHome(); toast('Dépense supprimée'); } catch (_) { toast('Réessaie'); } });
}

function guestExp(days) {
  const me = gGet().id, all = ['me', ...(GT.members || []).map(m => m.id)];
  const today = GT.start ? Math.max(1, Math.min(days, Math.round((Date.now() - new Date(GT.start)) / 864e5) + 1)) : 1;
  openPanel(`<h2>Nouvelle dépense</h2>
    <label class="fld"><span>Quoi ?</span><input id="ge-l" maxlength="60" placeholder="Dîner, taxi, musée…"></label>
    <label class="fld"><span>Montant en euros</span><input id="ge-v" inputmode="decimal" placeholder="0,00"></label>
    <label class="fld"><span>Catégorie</span><select id="ge-c">${Object.entries(CATS).map(([k, c]) => `<option value="${k}">${c.n}</option>`).join('')}</select></label>
    <label class="fld"><span>Jour du voyage</span><select id="ge-j">${Array.from({ length: days }, (_, i) => `<option ${i + 1 === today ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></label>
    <p class="small">Pour qui ?</p><div class="gst-who" id="ge-s">${all.map(id => `<button type="button" class="pill on" aria-pressed="true" data-s="${esc(id)}">${esc(id === me ? 'Moi' : gName(id))}</button>`).join('')}</div>
    <button class="btn full" id="ge-ok">Ajouter<i>${SV.arrow}</i></button>${CLOSE()}`, p => {
    p.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on); b.classList.toggle('on', on); });
    p.querySelector('#ge-ok').onclick = async () => {
      const l = p.querySelector('#ge-l').value.trim(), v = Number(p.querySelector('#ge-v').value.replace(',', '.').replace(/\s/g, '')), split = [...p.querySelectorAll('[data-s][aria-pressed=true]')].map(b => b.dataset.s);
      if (!l) return toast('Indique ce que tu as payé'); if (!(v > 0)) return toast('Indique un montant'); if (!split.length) return toast('Choisis pour qui');
      const btn = p.querySelector('#ge-ok'); busy(btn, true);
      const { error } = await sb.rpc('guest_add_expense', { p_token: INV_TOKEN, p_member: me, p_day: +p.querySelector('#ge-j').value, p_label: l, p_category: p.querySelector('#ge-c').value, p_eur: v, p_split: split });
      busy(btn, false); if (error) return toast('La dépense n\'a pas pu être ajoutée');
      closePanel(); await guestLoad(); guestHome(); toast('Dépense ajoutée');
    };
  });
}
