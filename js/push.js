/* Escale : notifications sur le téléphone (Web Push) et ouverture de l'écran visé par une notification. */
(() => {
  const KEY = (window.ESCALE_CONFIG || {}).vapidPublicKey || '';
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && !!KEY;
  const b64 = s => { const b = atob((s + '='.repeat((4 - s.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, c => c.charCodeAt(0)); };
  const swReady = () => Promise.race([navigator.serviceWorker.ready, new Promise((_, rej) => setTimeout(() => rej(new Error('service hors ligne')), 6000))]);
  const subscription = async () => { if (!supported()) return null; try { const r = await swReady(); return await r.pushManager.getSubscription(); } catch (_) { return null; } };
  async function enable() {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { toast(perm === 'denied' ? 'Notifications bloquées : autorise-les pour Escale dans les réglages du téléphone' : 'Notifications non activées'); return false; }
    const r = await swReady(); let s = await r.pushManager.getSubscription();
    if (!s) s = await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(KEY) });
    const j = s.toJSON(); await rpc('push_subscribe', { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth });
    return true;
  }
  async function disable() { const s = await subscription(); if (!s) return; try { await rpc('push_unsubscribe', { p_endpoint: s.endpoint }); } catch (_) { } try { await s.unsubscribe(); } catch (_) { } }
  window.pushReady = async () => supported() && Notification.permission === 'granted' && !!(await subscription());
  window.pushCanAsk = () => supported() && Notification.permission === 'default';

  const CATS = [['defis', 'Défis', 'Un ami te lance un défi ou relève le tien'], ['social', 'Réactions et commentaires', 'Sur tes publications'], ['amis', 'Amis', 'Demandes d’ami et acceptations']];
  const prefs = () => Object.assign({ defis: true, social: true, amis: true }, (typeof SETTINGS !== 'undefined' && SETTINGS && SETTINGS.push_prefs) || {});
  ACT.setNotifs = async () => {
    const on = await window.pushReady(), p = prefs();
    let head;
    if (!supported()) head = isIOS && !standalone()
      ? `<div class="ntip">${SV.bell}<p>Sur iPhone, les notifications marchent quand Escale est sur ton écran d'accueil : dans Safari, touche <b>Partager</b> puis <b>« Sur l'écran d'accueil »</b>, ouvre Escale depuis la nouvelle icône et reviens ici.</p></div>`
      : `<div class="ntip">${SV.bell}<p>Ce navigateur ne permet pas les notifications. Essaie avec Safari sur iPhone (appli ajoutée à l'écran d'accueil) ou Chrome.</p></div>`;
    else if (Notification.permission === 'denied') head = `<div class="ntip">${SV.bell}<p>Les notifications sont bloquées pour Escale. Autorise-les dans les réglages du téléphone (Réglages, Notifications, Escale), puis reviens ici.</p></div>`;
    else head = `<button type="button" class="togrow ${on ? 'on' : ''}" id="nt-dev" aria-pressed="${on}"><div><b>Notifications sur ce téléphone</b><span>${on ? 'Activées' : 'Touche pour les activer'}</span></div><i class="sw"></i></button>`;
    openPanel(`<h2>Notifications</h2><p class="small">Choisis ce qui te prévient. Les messages sont chiffrés : seul ton téléphone peut les lire.</p>${head}
      <p class="setsec" style="margin-top:18px">Me prévenir pour</p>${CATS.map(([k, n, d]) => `<button type="button" class="togrow ${p[k] ? 'on' : ''}" data-cat="${k}" aria-pressed="${!!p[k]}"><div><b>${n}</b><span>${d}</span></div><i class="sw"></i></button>`).join('')}${CLOSE('Fermer')}`, el => {
      const dev = el.querySelector('#nt-dev');
      if (dev) dev.onclick = async () => { dev.disabled = true; try { if (dev.classList.contains('on')) { await disable(); dev.classList.remove('on'); toast('Notifications désactivées sur ce téléphone'); } else if (await enable()) { dev.classList.add('on'); toast('Notifications activées'); } } catch (e) { toast('Activation impossible : ' + errMsg(e)); }
        dev.disabled = false; const o = dev.classList.contains('on'); dev.setAttribute('aria-pressed', o); dev.querySelector('span').textContent = o ? 'Activées' : 'Touche pour les activer'; };
      el.querySelectorAll('[data-cat]').forEach(b => b.onclick = async () => { const np = prefs(); np[b.dataset.cat] = !b.classList.contains('on');
        const { error } = await sb.from('account_settings').update({ push_prefs: np }).eq('user_id', ME.id);
        if (error) { toast('Réglage non enregistré'); return; } if (SETTINGS) SETTINGS.push_prefs = np; b.classList.toggle('on', np[b.dataset.cat]); b.setAttribute('aria-pressed', np[b.dataset.cat]); });
    }, { nofocus: true });
  };
  ACT.notifAsk = async () => { try { if (await enable()) { toast('Notifications activées'); const c = document.querySelector('.ncard'); if (c) c.remove(); } } catch (e) { toast('Activation impossible : ' + errMsg(e)); } };
  ACT.notifLater = () => { try { localStorage.setItem('escale:notif-later', String(Date.now())); } catch (_) { } const c = document.querySelector('.ncard'); if (c) c.remove(); };
  /** Petite carte qui propose d'activer les notifications (écran Défis), pas plus d'une fois par semaine. */
  window.notifCardHTML = () => {
    if (!window.pushCanAsk()) return '';
    try { if (Date.now() - Number(localStorage.getItem('escale:notif-later') || 0) < 7 * 864e5) return ''; } catch (_) { }
    return `<div class="ncard">${SV.bell}<div><b>Ne rate aucun défi</b><span>Reçois une notification quand un ami te défie ou réagit à tes souvenirs.</span></div><button class="btn2 g" data-act="notifAsk">Activer</button><button class="x" data-act="notifLater" aria-label="Plus tard">${SV.x}</button></div>`;
  };

  /* ouvrir l'écran visé par une notification */
  function openTarget(href) {
    const q = new URL(href, location.href).searchParams, to = q.get('go'), post = q.get('post'), mi = q.get('mission');
    if (!to && !post && !mi) return false;
    if (mi && ACT.missionOpen) ACT.missionOpen({ id: mi });
    else if (post) ACT.openPost({ p: post });
    else if (to === 'defis') ACT.openChals();
    else if (to === 'amis') ACT.findFriends();
    else if (to === 'fil') go('fil');
    return true;
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.type === 'open' && typeof ME !== 'undefined' && ME) openTarget(e.data.url); });
  if (/[?&](go|post)=/.test(location.search)) {
    const href = location.href; let n = 0;
    const t = setInterval(() => { n++;
      const ready = typeof ME !== 'undefined' && ME && !document.body.classList.contains('gated') && typeof current !== 'undefined' && current;
      if (ready || n > 100) { clearInterval(t); if (ready) { openTarget(href); try { history.replaceState(null, '', location.pathname); } catch (_) { } } }
    }, 150);
  }
})();
