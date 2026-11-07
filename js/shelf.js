/* Escale : objets de la bibliothèque. Chaque objet posé sur l'étagère se touche pour le changer,
   le déplacer, changer sa couleur ou le retirer ; le répertoire permet d'en ajouter (6 au maximum).
   Dessins originaux. Les choix sont enregistrés dans les réglages du compte (colonne shelf). */
'use strict';
const OBJ_COL = { creme: ['#FBF7F0', '#D9CEBC'], sauge: ['#A9C2A3', '#6F8F69'], terracotta: ['#E3A585', '#B8653F'], bleu: ['#A9BFD6', '#5E7FA3'], rose: ['#F1C6CF', '#C98494'], noir: ['#4A4A4A', '#1F1F1F'] };
const OBJ_COL_N = { creme: 'Crème', sauge: 'Sauge', terracotta: 'Terracotta', bleu: 'Bleu', rose: 'Rose', noir: 'Noir' };
const col = c => OBJ_COL[c] || OBJ_COL.creme;
Object.assign(DECOR, {
  vase: (u, c) => { const [a, b] = col(c || 'bleu'); return `<svg viewBox="0 0 90 160" aria-hidden="true"><defs><linearGradient id="va${u}" x1="0" x2="1"><stop offset="0" stop-color="${b}"/><stop offset=".45" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
    <g stroke="#5D7A52" stroke-width="2" fill="none"><path d="M45 70C42 50 30 36 22 30M45 70c2-24 10-40 20-48M45 70V22"/></g>
    <g><circle cx="22" cy="28" r="9" fill="#F3D9A6"/><circle cx="22" cy="28" r="3.5" fill="#D9A441"/><circle cx="66" cy="20" r="9" fill="#F1C6CF"/><circle cx="66" cy="20" r="3.5" fill="#C98494"/><circle cx="45" cy="16" r="10" fill="#FFFFFF" stroke="#E8E0D2"/><circle cx="45" cy="16" r="3.8" fill="#E0B44A"/></g>
    <path d="M32 72h26c0 10 12 22 12 44 0 20-12 40-25 40S20 136 20 116c0-22 12-34 12-44z" fill="url(#va${u})"/><path d="M30 70h30v6H30z" fill="${b}"/><path d="M30 104c4 20 4 32 2 44" stroke="#fff" stroke-width="3" opacity=".35" fill="none" stroke-linecap="round"/></svg>`; },
  candle: (u, c) => { const [a, b] = col(c || 'creme'); return `<svg viewBox="0 0 70 130" aria-hidden="true"><defs><radialGradient id="fl${u}" cx=".5" cy=".7"><stop offset="0" stop-color="#FFF3C4"/><stop offset=".6" stop-color="#F7C25A"/><stop offset="1" stop-color="#E58A2E" stop-opacity="0"/></radialGradient></defs>
    <ellipse cx="35" cy="22" rx="16" ry="20" fill="url(#fl${u})" opacity=".55"/><path d="M35 10c6 8 6 14 0 18-6-4-6-10 0-18z" fill="#F7B84A"/><path d="M35 17c2 3 2 6 0 8-2-2-2-5 0-8z" fill="#FFF1C2"/><path d="M35 28v6" stroke="#3A3226" stroke-width="2"/>
    <rect x="20" y="34" width="30" height="80" rx="4" fill="${a}"/><rect x="20" y="34" width="9" height="80" fill="#fff" opacity=".25"/><path d="M20 40c4 0 4 8 8 8s4-8 8-8 4 10 8 10 4-10 6-10" fill="none" stroke="${b}" stroke-width="1.6" opacity=".6"/>
    <ellipse cx="35" cy="118" rx="24" ry="6" fill="#C9A55A"/><rect x="11" y="112" width="48" height="6" rx="3" fill="#E3C27A"/></svg>`; },
  globe: u => `<svg viewBox="0 0 110 150" aria-hidden="true"><defs><radialGradient id="gb${u}" cx=".38" cy=".32"><stop offset="0" stop-color="#DCEBEA"/><stop offset="1" stop-color="#8FB2B5"/></radialGradient></defs>
    <path d="M20 66a38 38 0 0 0 66 26" fill="none" stroke="#B98F3C" stroke-width="4"/><circle cx="55" cy="62" r="34" fill="url(#gb${u})"/>
    <g fill="#7FA77A"><path d="M36 42c8-6 18-4 22 2s-4 10-10 10-6 8-12 6-8-12 0-18z"/><path d="M62 66c6-2 14 2 14 8s-6 12-12 10-8-16-2-18z"/><path d="M60 34c4-2 10 0 10 4s-6 4-8 2z"/></g>
    <path d="M55 96v22" stroke="#B98F3C" stroke-width="5"/><path d="M32 140c0-12 46-12 46 0z" fill="#7A5C43"/><rect x="30" y="138" width="50" height="6" rx="3" fill="#5E4532"/></svg>`,
  camera: (u, c) => { const [a, b] = col(c || 'noir'); return `<svg viewBox="0 0 130 100" aria-hidden="true"><defs><radialGradient id="ln${u}" cx=".4" cy=".35"><stop offset="0" stop-color="#7E93A8"/><stop offset=".55" stop-color="#2C3440"/><stop offset="1" stop-color="#11151B"/></radialGradient></defs>
    <rect x="10" y="30" width="110" height="64" rx="8" fill="${b}"/><rect x="10" y="44" width="110" height="34" fill="#C9B79A" opacity=".9"/><path d="M10 50h110M10 72h110" stroke="#B09C7E" stroke-width="1"/>
    <rect x="44" y="18" width="42" height="16" rx="3" fill="${a}"/><rect x="20" y="22" width="14" height="10" rx="2" fill="#D9D9D9"/><rect x="96" y="22" width="14" height="10" rx="2" fill="#2B2B2B"/>
    <circle cx="65" cy="62" r="25" fill="#D6D6D6"/><circle cx="65" cy="62" r="20" fill="url(#ln${u})"/><circle cx="58" cy="55" r="5" fill="#fff" opacity=".35"/></svg>`; },
  suitcase: (u, c) => { const [a, b] = col(c || 'terracotta'); return `<svg viewBox="0 0 120 120" aria-hidden="true">
    <path d="M44 22a6 6 0 0 1 6-6h20a6 6 0 0 1 6 6v8h-6v-6H50v6h-6z" fill="#5E4532"/><rect x="8" y="30" width="104" height="84" rx="10" fill="${b}"/><rect x="14" y="36" width="92" height="72" rx="7" fill="${a}"/>
    <path d="M36 30v84M84 30v84" stroke="#7A5C43" stroke-width="6"/><rect x="32" y="62" width="8" height="10" rx="2" fill="#E3C27A"/><rect x="80" y="62" width="8" height="10" rx="2" fill="#E3C27A"/>
    <circle cx="58" cy="54" r="9" fill="#FBF7F0" opacity=".85"/><path d="M52 54h12M58 48v12" stroke="${b}" stroke-width="2"/><rect x="64" y="80" width="20" height="13" rx="2" fill="#F6EEDC" transform="rotate(-8 74 86)"/></svg>`; },
  frame: u => `<svg viewBox="0 0 100 130" aria-hidden="true"><defs><linearGradient id="fr${u}" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#E7CB86"/><stop offset=".5" stop-color="#B98F3C"/><stop offset="1" stop-color="#E3C27A"/></linearGradient><linearGradient id="sk${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F3C9A0"/><stop offset="1" stop-color="#9FC3D1"/></linearGradient></defs>
    <rect x="8" y="8" width="84" height="110" rx="4" fill="url(#fr${u})"/><rect x="16" y="16" width="68" height="94" fill="#FBF7F0"/><rect x="22" y="22" width="56" height="70" fill="url(#sk${u})"/>
    <circle cx="62" cy="40" r="7" fill="#FFF3D6"/><path d="M22 92V74l14-12 12 10 12-16 18 20v16z" fill="#6F8F69"/><path d="M22 92V80l20-8 16 10 20-6v16z" fill="#4E6E4A"/><path d="M40 124l10-6 10 6" fill="none" stroke="#B98F3C" stroke-width="3"/></svg>`,
  compass: u => `<svg viewBox="0 0 110 110" aria-hidden="true"><defs><linearGradient id="co${u}" x1="0" x2="1"><stop offset="0" stop-color="#E3C27A"/><stop offset=".5" stop-color="#B98F3C"/><stop offset="1" stop-color="#E7CB86"/></linearGradient></defs>
    <circle cx="55" cy="58" r="44" fill="url(#co${u})"/><circle cx="55" cy="58" r="37" fill="#FBF7F0"/><circle cx="55" cy="10" r="6" fill="none" stroke="#B98F3C" stroke-width="4"/>
    <g fill="#5A4A33" font-family="Georgia,serif" font-size="11" text-anchor="middle"><text x="55" y="32">N</text><text x="55" y="92">S</text><text x="27" y="62">O</text><text x="83" y="62">E</text></g>
    <path d="M55 58l-7-4 7-22 7 22z" fill="#C0392B"/><path d="M55 58l7 4-7 22-7-22z" fill="#3A3226"/><circle cx="55" cy="58" r="3" fill="#B98F3C"/></svg>`,
  shell: u => `<svg viewBox="0 0 110 90" aria-hidden="true"><defs><linearGradient id="sh${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBE6DA"/><stop offset="1" stop-color="#E7B9A3"/></linearGradient></defs>
    <path d="M55 82C24 82 8 62 10 44 12 22 34 8 55 8s43 14 45 36c2 18-14 38-45 38z" fill="url(#sh${u})"/><g stroke="#D39A82" stroke-width="2" fill="none"><path d="M55 82V10M55 82L24 18M55 82L86 18M55 82L12 40M55 82l43-42"/></g>
    <path d="M40 80h30l-6 8H46z" fill="#E7B9A3"/></svg>`,
  lamp: (u, c) => { const [a, b] = col(c || 'sauge'); return `<svg viewBox="0 0 100 170" aria-hidden="true"><defs><radialGradient id="lg${u}" cx=".5" cy="0"><stop offset="0" stop-color="#FFF3C4" stop-opacity=".9"/><stop offset="1" stop-color="#FFF3C4" stop-opacity="0"/></radialGradient></defs>
    <path d="M20 60h60l-12 74H32z" fill="url(#lg${u})" opacity=".6"/><path d="M26 12h48l14 50H12z" fill="${a}"/><path d="M26 12h48l3 10H23z" fill="${b}" opacity=".5"/>
    <path d="M50 62v70" stroke="#B98F3C" stroke-width="4"/><path d="M30 166c0-20 40-20 40 0z" fill="${b}"/><rect x="26" y="162" width="48" height="6" rx="3" fill="#5E4532"/></svg>`; },
  bookend: u => `<svg viewBox="0 0 70 130" aria-hidden="true"><defs><linearGradient id="be${u}" x1="0" x2="1"><stop offset="0" stop-color="#D9CEBC"/><stop offset=".5" stop-color="#FBF7F0"/><stop offset="1" stop-color="#CFC2AE"/></linearGradient></defs>
    <path d="M10 124V60c0-24 14-46 34-50 8-2 14 4 14 12v102z" fill="url(#be${u})"/><path d="M20 50c4-14 14-24 26-26" stroke="#CFC2AE" stroke-width="3" fill="none"/><rect x="6" y="120" width="58" height="8" rx="3" fill="#7A5C43"/></svg>`,
});
const OBJS = { plant: 'Plante', vase: 'Bouquet', cup: 'Pot à crayons', candle: 'Bougie', clock: 'Horloge', globe: 'Globe terrestre', camera: 'Appareil photo', suitcase: 'Valise', frame: 'Cadre photo', compass: 'Boussole', shell: 'Coquillage', lamp: 'Lampe', stack: 'Livres et tasse', bookend: 'Serre-livres' };
const OBJ_COLORED = new Set(['vase', 'candle', 'camera', 'suitcase', 'lamp']);
const SHELF_MAX = 6;
/** Objets choisis : réglage du compte, ou disposition automatique tant que rien n'a été choisi. */
function shelfItems(n) {
  const S0 = typeof SETTINGS !== 'undefined' && SETTINGS && Array.isArray(SETTINGS.shelf) ? SETTINGS.shelf : null;
  if (S0) return S0.filter(o => DECOR[o.k]).slice(0, SHELF_MAX);
  const L = n <= 3 ? ['plant', 'stack'] : n <= 6 ? ['stack'] : [], R = n <= 3 ? ['clock', 'cup'] : ['plant'];
  return [...L.map(k => ({ k, s: 'l' })), ...R.map(k => ({ k, s: 'r' }))];
}
function shelfDecor(n, side) {
  return shelfItems(n).map((o, i) => [o, i]).filter(([o]) => o.s === side).map(([o, i]) => `<button type="button" class="decor d-${o.k}" data-act="shelfObj" data-i="${i}" aria-label="${esc(OBJS[o.k] || 'Objet')} : modifier">${DECOR[o.k](++decorN, o.c)}</button>`).join('')
    + (side === 'r' && shelfItems(n).length < SHELF_MAX ? `<button type="button" class="decor-add" data-act="shelfAdd" aria-label="Ajouter un objet">${SV.plus}<span>Objet</span></button>` : '');
}
async function saveShelf(list) {
  if (!SETTINGS) return; SETTINGS.shelf = list; writeCache(); renderJournalShelf();
  try { const { error } = await sb.from('account_settings').update({ shelf: list }).eq('user_id', ME.id); if (error) throw error; } catch (e) { toast('Bibliothèque enregistrée sur ce téléphone, synchronisation plus tard'); }
}
const shelfNow = () => shelfItems(sorted().length).map(o => ({ ...o }));
/* le répertoire : tous les objets, pour en ajouter un ou remplacer celui touché */
function objCatalog(title, onPick, cur) {
  openPanel(`<h2>${title}</h2><p class="small">Touche un objet pour le poser sur ton étagère.</p>
   <div class="objgrid">${Object.entries(OBJS).map(([k, n]) => `<button type="button" class="obj ${cur === k ? 'on' : ''}" data-k="${k}"><span>${DECOR[k](++decorN)}</span><b>${n}</b></button>`).join('')}</div>${CLOSE('Fermer')}`, p => {
    p.querySelectorAll('.obj').forEach(b => b.onclick = () => onPick(b.dataset.k)); }, { nofocus: true });
}
ACT.shelfAdd = () => { const L = shelfNow(); if (L.length >= SHELF_MAX) { toast(`${SHELF_MAX} objets au maximum`); return; }
  objCatalog('Ajouter un objet', k => { const l = L.filter(o => o.s === 'l').length, r = L.length - l; L.push({ k, s: l < r ? 'l' : 'r', c: OBJ_COLORED.has(k) ? null : undefined }); closePanel(); saveShelf(L.map(clean)); toast(`Ajouté sur l'étagère : ${OBJS[k]}`); }); };
const clean = o => { const x = { k: o.k, s: o.s === 'l' ? 'l' : 'r' }; if (o.c && OBJ_COL[o.c]) x.c = o.c; return x; };
ACT.shelfObj = d => { const L = shelfNow(), i = +d.i, o = L[i]; if (!o) return;
  openPanel(`<h2>${esc(OBJS[o.k])}</h2><p class="small">Modifie cet objet de ta bibliothèque.</p>
   <div class="objprev">${DECOR[o.k](++decorN, o.c)}</div>
   ${OBJ_COLORED.has(o.k) ? `<div class="fld"><span>Couleur</span><div class="objcols">${Object.keys(OBJ_COL).map(c => `<button type="button" data-c="${c}" class="${(o.c || '') === c ? 'on' : ''}" style="background:${OBJ_COL[c][0]};border-color:${OBJ_COL[c][1]}" aria-label="${OBJ_COL_N[c]}"></button>`).join('')}</div></div>` : ''}
   <div class="fld"><span>Place</span><div class="seg wide" id="ob-side"><button type="button" data-s="l" class="${o.s === 'l' ? 'on' : ''}">À gauche des carnets</button><button type="button" data-s="r" class="${o.s === 'r' ? 'on' : ''}">À droite</button></div></div>
   <button class="btn full" id="ob-swap">Changer d'objet<i>${SV.arrow}</i></button>
   <button class="danger" id="ob-del">Retirer de l'étagère</button>${CLOSE('Fermer')}`, p => {
    const put = () => saveShelf(L.map(clean));
    p.querySelectorAll('.objcols button').forEach(b => b.onclick = () => { o.c = b.dataset.c; p.querySelectorAll('.objcols button').forEach(x => x.classList.toggle('on', x === b)); p.querySelector('.objprev').innerHTML = DECOR[o.k](++decorN, o.c); put(); });
    p.querySelectorAll('#ob-side button').forEach(b => b.onclick = () => { o.s = b.dataset.s; p.querySelectorAll('#ob-side button').forEach(x => x.classList.toggle('on', x === b)); put(); });
    p.querySelector('#ob-swap').onclick = () => objCatalog('Changer d\'objet', k => { o.k = k; if (!OBJ_COLORED.has(k)) delete o.c; closePanel(); put(); toast(`Remplacé par : ${OBJS[k]}`); }, o.k);
    p.querySelector('#ob-del').onclick = () => { L.splice(i, 1); closePanel(); put(); toast('Objet retiré'); };
  }, { nofocus: true });
};
