/* Eskalys : inviter un ami avec un lien ; un mois de PRO offert à chacun à l'inscription. */
(() => {
  const q = new URLSearchParams(location.search).get('ami');
  if (q) { try { localStorage.setItem('escale:ami', q.replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 30)); } catch (_) { } history.replaceState(null, '', location.pathname + location.hash); }
  const t = setInterval(async () => {
    if (typeof ME === 'undefined' || !ME || typeof SETTINGS === 'undefined' || !SETTINGS) return;
    clearInterval(t); let h = null; try { h = localStorage.getItem('escale:ami'); } catch (_) { } if (!h) return;
    try { const ok = await rpc('referral_claim', { p_handle: h }); localStorage.removeItem('escale:ami');
      if (ok) { toast('Bienvenue ! Toi et ton ami recevez un mois de PRO offert'); try { const r = await sb.from('account_settings').select('pro_until').eq('user_id', ME.id).single(); if (r.data) SETTINGS.pro_until = r.data.pro_until; } catch (_) { } }
    } catch (_) { }
  }, 1500);
})();
