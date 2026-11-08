/* Escale : liste déroulante de suggestions (pays, villes), la même sur iPhone et Android.
   Remplace le <datalist> natif, mal affiché sur iOS. L'utilisateur peut toujours taper librement. */
'use strict';
/**
 * @param input  champ texte
 * @param items  () => [{ v: valeur, l: libellé, ic: icône (drapeau) }]
 * @param opts   { multi: true pour une liste séparée par des virgules (villes), onPick(v) }
 */
function combo(input, items, opts = {}) {
  if (!input || input.dataset.combo) return; input.dataset.combo = '1'; input.removeAttribute('list');
  input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list'); input.setAttribute('aria-expanded', 'false'); input.autocomplete = 'off';
  const box = document.createElement('div'); box.className = 'combo'; box.setAttribute('role', 'listbox'); box.hidden = true;
  input.insertAdjacentElement('afterend', box); input.closest('.fld') && input.closest('.fld').classList.add('has-combo');
  let act = -1, shown = [];
  const part = () => opts.multi ? input.value.split(',').pop().trim() : input.value.trim();
  const hi = (l, q) => { if (!q) return esc(l); const i = norm(l).indexOf(norm(q)); if (i < 0) return esc(l); return esc(l.slice(0, i)) + '<mark>' + esc(l.slice(i, i + q.length)) + '</mark>' + esc(l.slice(i + q.length)); };
  const render = () => {
    const q = norm(part()), all = items();
    const taken = opts.multi ? new Set(input.value.split(',').slice(0, -1).map(s => norm(s))) : new Set();
    shown = (q ? all.filter(x => norm(x.l).split(' ').some(w => w.startsWith(q)) || norm(x.l).startsWith(q)).concat(all.filter(x => !norm(x.l).startsWith(q) && norm(x.l).includes(q) && !norm(x.l).split(' ').some(w => w.startsWith(q)))) : all)
      .filter(x => !taken.has(norm(x.l))).slice(0, 60);
    if (!shown.length || (shown.length === 1 && norm(shown[0].l) === q && !opts.multi)) { close(); return; }
    act = -1; box.innerHTML = shown.map((x, i) => `<button type="button" role="option" data-i="${i}">${x.ic ? `<span class="ic">${x.ic}</span>` : ''}<span>${hi(x.l, part())}</span>${x.sub ? `<em>${esc(x.sub)}</em>` : ''}</button>`).join('');
    box.hidden = false; input.setAttribute('aria-expanded', 'true');
  };
  const close = () => { box.hidden = true; input.setAttribute('aria-expanded', 'false'); };
  const pick = i => { const x = shown[i]; if (!x) return;
    if (opts.multi) { const p = input.value.split(','); p[p.length - 1] = (p.length > 1 ? ' ' : '') + x.v; input.value = p.join(',') + ', '; }
    else input.value = x.v;
    close(); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
    if (opts.onPick) opts.onPick(x.v); if (opts.multi) setTimeout(() => { input.focus(); render(); }, 0); else input.blur(); };
  box.addEventListener('pointerdown', e => e.preventDefault()); // garde le focus dans le champ
  box.addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) pick(+b.dataset.i); });
  input.addEventListener('focus', () => { render(); setTimeout(() => input.scrollIntoView({ block: 'center', behavior: REDUCED ? 'auto' : 'smooth' }), 250); });
  input.addEventListener('input', e => { if (e.isTrusted !== false) render(); });
  input.addEventListener('blur', () => setTimeout(close, 120));
  input.addEventListener('keydown', e => { if (box.hidden) return; const B = box.querySelectorAll('button');
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); act = (act + (e.key === 'ArrowDown' ? 1 : -1) + B.length) % B.length; B.forEach((b, i) => b.classList.toggle('on', i === act)); B[act].scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'Enter' && act >= 0) { e.preventDefault(); pick(act); } else if (e.key === 'Escape') close(); });
}
const countryItems = () => Object.entries(COUNTRIES).map(([k, c]) => ({ v: c.n, l: c.n, ic: flag(k) })).sort((a, b) => a.l.localeCompare(b.l, 'fr'));
/** Villes proposées : celles connues du pays, puis celles déjà notées dans tes voyages. */
const cityItems = cc => () => { const mine = [...new Set(S.trips.filter(t => t.pays === cc).flatMap(t => String(t.ville || '').split(',').map(s => s.trim()).filter(Boolean)))];
  const known = cc ? placesOf(cc) : []; const seen = new Set(known.map(norm));
  return [...known.map(l => ({ v: l, l })), ...mine.filter(l => !seen.has(norm(l))).map(l => ({ v: l, l, sub: 'déjà noté' }))]; };
