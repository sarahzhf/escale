/* Escale : « Combien ça coûte vraiment ».
   Sur un voyage à venir ou en cours : ce que le même pays a coûté à tes amis (total, nombre de personnes, durée).
   Jamais le détail des dépenses, et seulement pour les amis qui ont choisi de partager leurs totaux. */
'use strict';
const COSTS = new Map();
async function costsFor(cc) { if (COSTS.has(cc)) return COSTS.get(cc); let r = []; try { r = (await rpc('friends_trip_costs', { p_country: cc })) || []; } catch (_) { } COSTS.set(cc, r); return r; }

function coutHTML(t) {
  const f = info(t); if (!f.futur && !f.enCours) return '';
  const id = 'cout-' + t.id;
  setTimeout(async () => { const L = await costsFor(t.pays), el = document.getElementById(id); if (!el) return;
    if (!L.length) { el.remove(); return; }
    const perDay = L.map(x => x.total / Math.max(1, x.people) / Math.max(1, x.days)), avg = Math.round(perDay.reduce((a, b) => a + b, 0) / perDay.length);
    el.innerHTML = `<div class="sec"><h2>Combien ça coûte vraiment</h2><button class="more" data-act="coutSet">Mes totaux</button></div>
      <p class="small cout-k">Tes amis déjà allés ${typeof enPays === 'function' ? enPays(t.pays) : 'dans ce pays'} : environ <b class="num">${fmt(avg)}</b> par personne et par jour.</p>
      <div class="cout">${L.slice(0, 6).map(x => `<div class="cout-r"><b>${esc(x.name)}</b><span>${esc(x.city || C(t).n)} · ${new Date(x.start).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</span><span class="num">${x.people} pers. · ${x.days} j</span><b class="num">${fmt(x.total)}</b></div>`).join('')}</div>`;
    el.hidden = false; }, 0);
  return `<section class="cout-box" id="${id}" hidden></section>`;
}
{ const mh0 = missionHTML; missionHTML = t => mh0(t) + (t ? coutHTML(t) : ''); }

ACT.coutSet = () => { const on = !!(SETTINGS && SETTINGS.share_costs);
  openPanel(`<h2>Partager mes totaux</h2><p class="small">Tes amis qui préparent un voyage dans un pays où tu es allée verront le total de ton voyage, le nombre de personnes et la durée. Jamais le détail de tes dépenses.</p>
    <div class="seg wide" id="ct-on"><button type="button" data-v="1" class="${on ? 'on' : ''}">Partager</button><button type="button" data-v="0" class="${on ? '' : 'on'}">Ne pas partager</button></div>${CLOSE()}`, p => {
    p.querySelectorAll('#ct-on button').forEach(b => b.onclick = async () => { const v = b.dataset.v === '1'; p.querySelectorAll('#ct-on button').forEach(x => x.classList.toggle('on', x === b));
      const { error } = await sb.from('account_settings').update({ share_costs: v }).eq('user_id', ME.id); if (error) { toast('Réglage non enregistré'); return; } if (SETTINGS) SETTINGS.share_costs = v; toast(v ? 'Tes totaux sont partagés avec tes amis' : 'Tes totaux ne sont plus partagés'); });
  }, { nofocus: true }); };
