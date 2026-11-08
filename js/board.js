/* Escale : la checklist « À préparer » en tableau.
   À gauche (ou en haut sur téléphone) un tableau blanc écrit au feutre : une main tient le feutre et écrit
   la ligne. À droite un panneau en liège avec des post-it punaisés, pour ceux qui préfèrent taper vite.
   Toucher un point le coche (trait de feutre ou tampon « Fait » sur le post-it).
   Chaque point garde : l (texte), ok (fait), w ('pen' tableau blanc ou 'note' post-it), col (couleur du post-it). */
'use strict';
if (!SV.pencil) SV.pencil = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 20l1-5L16 4l4 4L9 19z"/><path d="M14 6l4 4"/></svg>';
const NOTE_COL = { jaune: '#FCEFA1', rose: '#F9CFD7', bleu: '#CDE3F5', vert: '#D4EDC9', blanc: '#FFFFFF' };
const noteOf = (x, i) => x.w ? x.w : x.k === 'inc' || x.k === 'own' ? 'note' : 'pen';
let boardNew = null; // id du point à animer (écriture ou punaise)
const PEN_SVG = '<svg class="pen" viewBox="0 0 60 60" aria-hidden="true"><g transform="rotate(35 30 30)"><rect x="24" y="2" width="12" height="40" rx="3" fill="#2E5E3E"/><rect x="24" y="2" width="12" height="9" rx="3" fill="#1F3F2A"/><rect x="25" y="40" width="10" height="6" fill="#D9D9D9"/><path d="M26 46h8l-4 9z" fill="#1F3F2A"/></g><path d="M14 54c6-6 12-4 16-10" stroke="#E8C9A8" stroke-width="10" stroke-linecap="round" fill="none" opacity=".95"/></svg>';
function prepHTML(t) {
  const L = todoOf(t), f = info(t); if (!L.length) return f.futur || f.enCours ? `<div class="sec"><h2>À préparer</h2></div><button class="prep-cta" data-act="prep" data-trip="${t.id}"><i>${SV.star}</i><span><b>Incontournables et checklist</b><em>Les lieux à ne pas rater et ce qu'il faut réserver</em></span>${SV.right}</button>` : '';
  const done = L.filter(x => x.ok).length, pens = [], notes = [];
  L.forEach((x, i) => (noteOf(x) === 'pen' ? pens : notes).push([x, i]));
  const pen = ([x, i]) => { const fresh = boardNew === x.id && !REDUCED, n = Math.max(8, x.l.length);
    return `<button class="wb-line ${x.ok ? 'ok' : ''} ${fresh ? 'writing' : ''}" style="--n:${n}" data-act="todoTick" data-trip="${t.id}" data-i="${i}" aria-pressed="${!!x.ok}"><span class="wb-box">${x.ok ? '<svg viewBox="0 0 24 24"><path d="M4 13l5 5L20 6"/></svg>' : ''}</span><span class="wb-t"><span class="wb-ink">${esc(x.l)}${x.r ? ' <em>(à réserver)</em>' : ''}</span>${fresh ? PEN_SVG : ''}</span></button>`; };
  const note = ([x, i], k) => { const fresh = boardNew === x.id && !REDUCED, rot = ((x.id || '').charCodeAt(0) + i * 7) % 9 - 4;
    return `<button class="note ${x.ok ? 'ok' : ''} ${fresh ? 'drop' : ''}" style="--rot:${rot}deg;--bg:${NOTE_COL[x.col] || (x.k === 'inc' ? NOTE_COL.jaune : NOTE_COL.rose)}" data-act="todoTick" data-trip="${t.id}" data-i="${i}" aria-pressed="${!!x.ok}"><i class="pin" style="--pc:${['#D64545', '#3D7BD9', '#2E9E5B', '#E3A51A'][i % 4]}"></i><span>${esc(x.l)}</span>${x.r ? '<em>à réserver</em>' : ''}${x.ok ? '<b class="fait">Fait</b>' : ''}</button>`; };
  setTimeout(() => { boardNew = null; }, 50);
  return `<div class="sec"><h2>À préparer <span class="cnt num">${done}/${L.length}</span></h2><button class="more" data-act="prep" data-trip="${t.id}">Modifier</button></div>
   <div class="board"><div class="wb"><p class="wb-h">Checklist</p>${pens.map(pen).join('') || '<p class="wb-empty">Écris ici au feutre…</p>'}<i class="wb-tray"></i></div>
    <div class="cork">${notes.map(note).join('') || '<p class="cork-empty">Punaise tes idées ici</p>'}</div></div>
   <div class="board-add"><button class="btn2" data-act="boardAdd" data-trip="${t.id}" data-w="pen">${SV.pencil || '✎'}Écrire au feutre</button><button class="btn2" data-act="boardAdd" data-trip="${t.id}" data-w="note">${SV.plus}Ajouter un post-it</button></div>`;
}
ACT.boardAdd = d => { const t = trip(d.trip); if (!t) return; let w = d.w === 'note' ? 'note' : 'pen', col = 'jaune';
  openPanel(`<h2>${w === 'pen' ? 'Écrire au tableau' : 'Nouveau post-it'}</h2>
   <div class="seg wide" id="ba-w"><button type="button" data-w="pen" class="${w === 'pen' ? 'on' : ''}">Au feutre</button><button type="button" data-w="note" class="${w === 'note' ? 'on' : ''}">Post-it</button></div>
   <label class="fld"><span>Ce qu'il faut faire</span><input id="ba-l" maxlength="80" placeholder="Ex. Réserver la table chez Da Michele" autocomplete="off"></label>
   <div class="fld" id="ba-colw" ${w === 'pen' ? 'hidden' : ''}><span>Couleur</span><div class="objcols">${Object.entries(NOTE_COL).map(([k, v]) => `<button type="button" data-c="${k}" class="${k === col ? 'on' : ''}" style="background:${v};border-color:rgba(0,0,0,.15)" aria-label="${k}"></button>`).join('')}</div></div>
   <label class="chk"><input type="checkbox" id="ba-r"> <span>À réserver à l'avance</span></label>
   <button class="btn full" id="ba-ok">${w === 'pen' ? 'Écrire' : 'Punaiser'}<i>${SV.arrow}</i></button>${CLOSE()}`, p => {
    const ok = p.querySelector('#ba-ok');
    p.querySelectorAll('#ba-w button').forEach(b => b.onclick = () => { w = b.dataset.w; p.querySelectorAll('#ba-w button').forEach(x => x.classList.toggle('on', x === b)); p.querySelector('#ba-colw').hidden = w === 'pen'; p.querySelector('h2').textContent = w === 'pen' ? 'Écrire au tableau' : 'Nouveau post-it'; ok.firstChild.textContent = w === 'pen' ? 'Écrire' : 'Punaiser'; });
    p.querySelectorAll('.objcols button').forEach(b => b.onclick = () => { col = b.dataset.c; p.querySelectorAll('.objcols button').forEach(x => x.classList.toggle('on', x === b)); });
    p.querySelector('#ba-l').onkeydown = e => { if (e.key === 'Enter') ok.click(); };
    ok.onclick = () => { const l = p.querySelector('#ba-l').value.trim().slice(0, 80); if (!l) { toast('Écris quelque chose'); return; }
      const L = todoOf(t); if (L.length >= 40) { toast('40 points au maximum'); return; }
      const x = { id: uid(), k: 'own', l, r: p.querySelector('#ba-r').checked, ok: false, w }; if (w === 'note') x.col = col; L.push(x); boardNew = x.id; save(); closePanel(); setTimeout(refresh, 320); };
  }); };
