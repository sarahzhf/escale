/* Escale : apparence (automatique, clair ou sombre). Chargé dans <head> pour éviter un flash au démarrage. */
(() => {
  const mq = matchMedia('(prefers-color-scheme: dark)');
  const pref = () => { try { return localStorage.getItem('escale-theme') || 'auto'; } catch (_) { return 'auto'; } };
  const apply = () => {
    const p = pref(), dark = p === 'dark' || (p === 'auto' && mq.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = dark ? '#121413' : '#F4F3EF';
  };
  window.setTheme = p => { try { localStorage.setItem('escale-theme', p); } catch (_) { } apply(); };
  window.themePref = pref;
  (mq.addEventListener ? mq.addEventListener('change', apply) : mq.addListener(apply));
  apply();
})();
