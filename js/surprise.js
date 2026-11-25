/* Eskalys : le mode surprise. Dans Conseils > Mon budget, « Surprends-moi » tire au hasard
   une destination qui rentre dans le budget, à la période choisie, avec une petite animation. */
(() => {
  let last = [];
  const pickOne = month => {
    const L = (typeof budgetIdeas === 'function' ? budgetIdeas(month) : []).filter(r => !last.includes(r.cc));
    const pool = L.length ? L : (typeof budgetIdeas === 'function' ? budgetIdeas(month) : []); if (!pool.length) return null;
    const seen = typeof travelProfile === 'function' ? travelProfile().seen : new Set();
    // on préfère la bonne saison et les pays pas encore visités, sans jamais exclure les autres
    const w = pool.map(r => (r.good ? 3 : 1) * (seen.has(r.cc) ? .4 : 1));
    let x = Math.random() * w.reduce((a, b) => a + b, 0), i = 0; while (x > w[i]) { x -= w[i]; i++; }
    const r = pool[Math.min(i, pool.length - 1)]; last = [r.cc, ...last].slice(0, 4); return { r, pool };
  };
  const why = (r, month) => {
    const D0 = DEST[r.cc] || {}, st = { culture: 'la culture', gastronomie: 'la cuisine', plage: 'les plages', ville: 'les villes', nature: 'la nature', aventure: 'l’aventure', fete: 'la fête', detente: 'la détente' };
    const s = (D0.st || []).slice(0, 2).map(k => st[k] || k);
    return [r.good ? `${MOIS[month - 1][0].toUpperCase() + MOIS[month - 1].slice(1)}, c’est une très bonne période pour y aller.` : `Ce n’est pas la saison idéale, mais c’est souvent moins cher et moins bondé.`,
      s.length ? `Parfait pour ${s.join(' et ')}.` : ''].filter(Boolean).join(' ');
  };
  function show(month) {
    const res = pickOne(month); if (!res) { toast('Aucune destination dans ce budget, essaie un peu plus'); return; }
    const { r, pool } = res, c = COUNTRIES[r.cc], city = r.cities[0];
    const reel = [...pool.map(x => x.cc).filter(x => x !== r.cc).sort(() => Math.random() - .5).slice(0, 9), r.cc];
    openPanel(`<div class="surp"><p class="surp-k">Ta destination surprise</p>
      <div class="surp-reel" aria-hidden="true"><div class="surp-strip">${reel.map(cc => `<span>${flag(cc)}</span>`).join('')}</div></div>
      <div class="surp-res" aria-live="polite"><h2>${esc(c.n)}${city ? `<span>${esc(city.n)}</span>` : ''}</h2>
        <p class="surp-price">Environ <b class="num">${fmt(city ? city.est : r.est)}</b> par personne, vol compris, pour ${BUD.j} jour${BUD.j > 1 ? 's' : ''}</p>
        <p class="small">${esc(why(r, month))}</p>
        <div class="surp-act"><button class="btn full" data-act="simu" data-c="${r.cc}" ${city ? `data-v="${esc(city.n)}"` : ''}>Simuler ce voyage<i>${SV.arrow}</i></button>
        <div class="surp-row"><button class="btn2" data-act="surprise" data-m="${month}">${SV.spark || ''}Relancer</button><button class="btn2" data-act="cfOpen" data-c="${r.cc}">Voir le pays</button></div></div></div></div>${CLOSE('Fermer')}`, p => {
      const strip = p.querySelector('.surp-strip'), res2 = p.querySelector('.surp-res'), n = reel.length;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { strip.style.transform = `translateX(calc(-${n - 1} * var(--surp-w)))`; res2.classList.add('on'); return; }
      requestAnimationFrame(() => { strip.style.transition = 'transform 1.6s cubic-bezier(.15,.85,.25,1)'; strip.style.transform = `translateX(calc(-${n - 1} * var(--surp-w)))`; });
      setTimeout(() => { res2.classList.add('on'); p.querySelector('.surp-reel').classList.add('done'); try { navigator.vibrate && navigator.vibrate(30); } catch (_) { } }, 1650);
    }, { nofocus: true });
  }
  ACT.surprise = d => { const m = +d.m || ((new Date().getMonth() + 1) % 12) + 1;
    if ($('panel').classList.contains('open')) { closePanel(); setTimeout(() => show(m), 360); } else show(m); };
})();
