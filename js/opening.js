/* Eskalys : animation d'ouverture. Le carnet tamponné apparaît, s'ouvre, et l'appli se dévoile.
 * Three.js (vendor/three) est chargé à la volée. En cas d'échec, de mouvement réduit ou après un délai
 * maximum, on retombe sur l'écran de lancement classique. window.SPLASH se résout quand c'est fini. */
(function () {
  const splash = document.getElementById('splash');
  let done; window.SPLASH = new Promise(r => { done = r; });
  const finish = () => { if (done) { done(); done = null; } };
  if (!splash) return finish();
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let webgl = false; try { const c = document.createElement('canvas'); webgl = !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (_) { }
  if (reduce || !webgl) return finish();
  setTimeout(finish, 6000); // garde-fou : l'appli ne reste jamais bloquée derrière l'animation

  const load = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  const C = { green: '#2F4A3A', band: '#B8452C', gold: '#D9A441', paper: '#F7F2E7', edge: '#E9E0CC' };
  const PLANE = new Path2D('M0 -6 l1.2 4 4 2 v1 l-4 -1 -.4 3 1.4 1 v1 l-2.2 -.6 -2.2 .6 v-1 l1.4 -1 -.4 -3 -4 1 v-1 l4 -2z');

  function tex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  const coverTex = () => tex(512, 732, (g, w, h) => {
    g.fillStyle = C.green; g.fillRect(0, 0, w, h);
    const grd = g.createLinearGradient(0, 0, w, h); grd.addColorStop(0, 'rgba(255,255,255,.06)'); grd.addColorStop(1, 'rgba(0,0,0,.10)'); g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.fillStyle = C.band; g.fillRect(w * 0.79, 0, w * 0.06, h);
    g.save(); g.translate(w * 0.4, h * 0.42); g.rotate(-0.21);
    g.strokeStyle = C.gold; g.lineWidth = 9; g.beginPath(); g.arc(0, 0, 92, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 4; g.setLineDash([12, 11]); g.beginPath(); g.arc(0, 0, 66, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    g.translate(0, 8); g.scale(7.4, 7.4); g.fillStyle = C.gold; g.fill(PLANE); g.restore();
  });
  const insideTex = () => tex(512, 732, (g, w, h) => {
    g.fillStyle = C.paper; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(47,74,58,.10)'; g.lineWidth = 2; g.strokeRect(28, 28, w - 56, h - 56);
  });
  const pageTex = () => tex(512, 732, (g, w, h) => {
    g.fillStyle = C.paper; g.fillRect(0, 0, w, h);
    g.fillStyle = C.green; g.textAlign = 'center';
    g.font = '400 66px "Playfair Display", Georgia, serif'; g.fillText('Eskalys', w / 2, h * 0.46);
    g.fillStyle = C.gold; g.fillRect(w / 2 - 34, h * 0.5, 68, 3);
    g.fillStyle = 'rgba(47,74,58,.7)'; g.font = '500 21px Inter, system-ui, sans-serif'; g.fillText('Tes voyages, ton histoire', w / 2, h * 0.56);
    g.strokeStyle = 'rgba(184,69,44,.55)'; g.lineWidth = 3; g.setLineDash([7, 9]); g.beginPath(); g.moveTo(w * 0.3, h * 0.74); g.bezierCurveTo(w * 0.42, h * 0.66, w * 0.55, h * 0.8, w * 0.7, h * 0.7); g.stroke();
  });
  const shadowTex = () => tex(256, 256, (g, w, h) => {
    const r = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(60,50,30,.22)'); r.addColorStop(1, 'rgba(60,50,30,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h);
  });

  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));

  async function run() {
    if (!window.THREE) await load('vendor/three/three.min.js');
    try { await Promise.all([document.fonts.load('400 66px "Playfair Display"'), document.fonts.load('500 21px Inter')]); } catch (_) { }
    const W = 1.4, H = 2.0, T = 0.035, P = 0.2;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
    const cv = renderer.domElement; cv.className = 'splash-3d'; splash.appendChild(cv); splash.classList.add('three');
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    const resize = () => { const w = splash.clientWidth || innerWidth, h = splash.clientHeight || innerHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
    resize(); addEventListener('resize', resize);
    scene.add(new THREE.HemisphereLight(0xfff7e8, 0x6b7464, 1.9));
    const sun = new THREE.DirectionalLight(0xfff1dc, 2.2); sun.position.set(2.5, 3, 4); scene.add(sun);

    const book = new THREE.Group(); scene.add(book);
    const mat = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: .85, metalness: 0 }, o));
    const green = mat({ color: C.green }), edge = mat({ color: C.edge, roughness: .95 });
    const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, T), green); back.position.z = -P / 2 - T / 2; book.add(back);
    const pages = new THREE.Mesh(new THREE.BoxGeometry(W - 0.05, H - 0.06, P), [edge, edge, edge, edge, mat({ map: pageTex(), roughness: .95 }), edge]); pages.position.x = 0.02; book.add(pages);
    const spine = new THREE.Mesh(new THREE.BoxGeometry(T, H, P + 2 * T), green); spine.position.x = -W / 2 - T / 2 + 0.001; book.add(spine);
    const hinge = new THREE.Group(); hinge.position.set(-W / 2, 0, P / 2 + T / 2); book.add(hinge);
    const cover = new THREE.Mesh(new THREE.BoxGeometry(W, H, T), [green, green, green, green, mat({ map: coverTex(), roughness: .7 }), mat({ map: insideTex(), roughness: .95 })]);
    cover.position.x = W / 2; hinge.add(cover);
    const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.32), mat({ color: C.gold, side: THREE.DoubleSide, roughness: .6 }));
    ribbon.position.set(-0.32, -H / 2 - 0.13, 0.02); book.add(ribbon);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false }));
    shadow.position.z = -0.6; scene.add(shadow);

    let skip = false; const onSkip = () => { skip = true; }; splash.addEventListener('pointerdown', onSkip, { once: true });
    const D = 2900, t0 = performance.now();
    const frame = (now) => {
      const t = skip ? D : now - t0;
      const a = ease(seg(t, 0, 900)), o = ease(seg(t, 650, 1850)), z = ease(seg(t, 1500, 2700));
      book.position.y = (1 - a) * -0.35 + Math.sin(now / 900) * 0.015 * (1 - o);
      book.rotation.set(-0.32 * (1 - o * 0.85) * 1, 0.42 * (1 - a) - 0.12 * (1 - o), 0.06 * (1 - a));
      hinge.rotation.y = -o * 2.75;
      book.position.x = o * 0.22;
      const asp = Math.min(1, cam.aspect / 0.62), base = 9.6 / asp; cam.position.set(0, 0, base - a * 0.9 / asp - z * (3.4 / asp)); cam.lookAt(book.position.x * 0.6, book.position.y * 0.4, 0);
      cv.style.opacity = String(Math.min(1, t / 250));
      renderer.render(scene, cam);
      if (t < D) requestAnimationFrame(frame);
      else { finish(); setTimeout(() => { removeEventListener('resize', resize); renderer.dispose(); cv.remove(); }, 1200); }
    };
    requestAnimationFrame(frame);
  }
  run().catch(() => { splash.classList.remove('three'); finish(); });
})();
