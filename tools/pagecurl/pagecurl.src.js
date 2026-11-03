/* Escale : pages souples du carnet, rendues en WebGL (three.js).
 * Le carnet reste en HTML ; seul le moment où la page tourne passe en 3D :
 * la double page est photographiée (html-to-image), puis une feuille maillée
 * se courbe comme du papier, éclairée selon son angle, avant de rendre la main au HTML. */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Mesh, BufferGeometry, BufferAttribute, PlaneGeometry,
  MeshBasicMaterial, CanvasTexture, SRGBColorSpace, FrontSide, BackSide, DoubleSide, LinearMipmapLinearFilter, LinearFilter
} from 'three';
import { toCanvas } from 'html-to-image';

const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);

export function supported() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (_) { return false; }
}

/** Photographie un élément du carnet (déjà dans la page, hors écran) en canvas haute définition. */
export async function snap(node, { width, height, pixelRatio, fontEmbedCSS }) {
  const opt = { width, height, pixelRatio, fontEmbedCSS, cacheBust: false, skipAutoScale: true, style: { transform: 'none', left: '0', top: '0' } };
  if (isSafari) await toCanvas(node, opt); // Safari décode les images au premier passage seulement
  return toCanvas(node, opt);
}

let R = null;
function renderer() {
  if (R) return R;
  const r = new WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  r.outputColorSpace = SRGBColorSpace; r.setClearColor(0x000000, 0);
  r.domElement.className = 'bk-gl'; r.domElement.setAttribute('aria-hidden', 'true');
  R = { r, scene: new Scene(), cam: new PerspectiveCamera(28, 1, 1, 1e5), W: 0, H: 0 };
  return R;
}

export function texture(canvas) {
  canvas.getContext('2d').getImageData(0, 0, 1, 1); // lève une erreur si la photo est « contaminée » (sécurité du navigateur)
  const t = new CanvasTexture(canvas); t.colorSpace = SRGBColorSpace;
  t.minFilter = LinearMipmapLinearFilter; t.magFilter = LinearFilter; t.generateMipmaps = true;
  t.anisotropy = renderer().r.capabilities.getMaxAnisotropy(); t.needsUpdate = true;
  return t;
}
export function paper(color) { const c = document.createElement('canvas'); c.width = c.height = 4; const g = c.getContext('2d'); g.fillStyle = color || '#f4efe6'; g.fillRect(0, 0, 4, 4); return texture(c); }
export function dispose(t) { try { t && t.dispose(); } catch (_) { } }

let shadowTex = null;
function shadow() {
  if (shadowTex) return shadowTex;
  const c = document.createElement('canvas'); c.width = 256; c.height = 4; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, 'rgba(30,22,14,0.55)'); gr.addColorStop(0.35, 'rgba(30,22,14,0.18)'); gr.addColorStop(1, 'rgba(30,22,14,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 4); shadowTex = texture(c); return shadowTex;
}

/** Place le canvas WebGL : `box` = zone de l'écran (px CSS) que le canvas recouvre. */
function setup(host, box, style) {
  const o = renderer(), dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  if (o.r.domElement.parentNode !== host) host.appendChild(o.r.domElement);
  Object.assign(o.r.domElement.style, style, { display: 'block' });
  o.r.setPixelRatio(dpr); o.r.setSize(box.width, box.height, false);
  o.W = box.width; o.H = box.height;
  const cam = o.cam, D = (o.H / 2) / Math.tan(cam.fov * Math.PI / 360);
  cam.aspect = o.W / o.H; cam.position.set(o.W / 2, o.H / 2, D); cam.near = D / 20; cam.far = D * 20; cam.lookAt(o.W / 2, o.H / 2, 0); cam.updateProjectionMatrix();
  return o;
}

function quad(o, rect, tex, u0, u1, z) {
  const g = new PlaneGeometry(rect.w, rect.h), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) ? u1 : u0);
  const m = new Mesh(g, new MeshBasicMaterial({ map: tex, depthWrite: false }));
  m.position.set(rect.x + rect.w / 2, o.H - (rect.y + rect.h / 2), z); m.renderOrder = 0; return m;
}

const NX = 56, NY = 14;
/**
 * Tourne une feuille.
 *  statics : [{ rect, tex, u:[u0,u1] }] pages immobiles dessous
 *  sheet   : { rect, hinge:'l'|'r', front:{tex,u}, back:{tex,u}, reverse }
 *  rect en px relatifs à `box` : { x, y, w, h }
 */
export function turn({ host, box, style, statics, sheet, duration = 820, onFirstFrame }) {
  return new Promise((resolve, reject) => {
    const o = setup(host, box, style), scene = o.scene; scene.clear();
    statics.forEach(s => scene.add(quad(o, s.rect, s.tex, s.u[0], s.u[1], 0)));
    const { rect, hinge, front, back, reverse } = sheet, sgn = hinge === 'l' ? 1 : -1, hx = hinge === 'l' ? rect.x : rect.x + rect.w, W = rect.w;
    // maillage de la feuille
    const n = (NX + 1) * (NY + 1), pos = new BufferAttribute(new Float32Array(n * 3), 3);
    const uvF = new Float32Array(n * 2), uvB = new Float32Array(n * 2), colF = new Float32Array(n * 3), colB = new Float32Array(n * 3);
    for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) {
      const k = j * (NX + 1) + i, f = i / NX, v = 1 - j / NY;
      const pf = hinge === 'l' ? f : 1 - f, pb = hinge === 'l' ? 1 - f : f; // position dans la page, de gauche à droite
      uvF[k * 2] = front.u[0] + (front.u[1] - front.u[0]) * pf; uvF[k * 2 + 1] = v;
      uvB[k * 2] = back.u[0] + (back.u[1] - back.u[0]) * pb; uvB[k * 2 + 1] = v;
    }
    const idx = [];
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1;
      if (sgn > 0) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
    }
    const mk = (uv, col, tex, side) => { const g = new BufferGeometry(); g.setAttribute('position', pos); g.setAttribute('uv', new BufferAttribute(uv, 2)); g.setAttribute('color', new BufferAttribute(col, 3)); g.setIndex(idx);
      const m = new Mesh(g, new MeshBasicMaterial({ map: tex, vertexColors: true, side })); m.renderOrder = 2; scene.add(m); return g; };
    const gF = mk(uvF, colF, front.tex, FrontSide), gB = mk(uvB, colB, back.tex, BackSide);
    // ombre portée sur la page de dessous, du côté de la charnière
    const sh = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: shadow(), transparent: true, depthWrite: false, opacity: 0, side: DoubleSide }));
    sh.renderOrder = 1; scene.add(sh);
    // lumière : légèrement en haut à gauche, vers l'écran
    const L = [0.28 * -sgn, 0.3, 1], ln = Math.hypot(...L); L[0] /= ln; L[1] /= ln; L[2] /= ln;
    const B = 1.35, P = 1.7;
    const shape = e => {
      const th = Math.PI * e, be = B * Math.sin(Math.PI * e) * (reverse ? -1 : 1), du = W / NX, H = rect.h;
      const p = pos.array;
      for (let j = 0; j <= NY; j++) {
        const yn = j / NY, lead = 0.78 + 0.44 * yn, yW = o.H - (rect.y + yn * H); // le coin du bas part en premier
        let X = 0, Z = 0, prev = th;
        for (let i = 0; i <= NX; i++) {
          const f = i / NX, phi = Math.min(Math.PI, Math.max(0, th + be * Math.pow(f, P) * lead));
          if (i) { const m = (phi + prev) / 2; X += Math.cos(m) * du; Z += Math.sin(m) * du; }
          prev = phi; const k = (j * (NX + 1) + i);
          p[k * 3] = hx + sgn * X; p[k * 3 + 1] = yW; p[k * 3 + 2] = Z + 0.6;
          // éclairage : 1 quand la feuille est à plat face à l'écran
          const nx = -sgn * Math.sin(phi), nz = Math.cos(phi);
          const df = (nx * L[0] + nz * L[2]) / L[2], db = (-nx * L[0] - nz * L[2]) / L[2];
          const bf = Math.min(1.06, 0.48 + 0.52 * Math.max(0, df)), bb = Math.min(1.06, 0.48 + 0.52 * Math.max(0, db));
          colF[k * 3] = colF[k * 3 + 1] = colF[k * 3 + 2] = bf; colB[k * 3] = colB[k * 3 + 1] = colB[k * 3 + 2] = bb;
        }
      }
      pos.needsUpdate = true; gF.attributes.color.needsUpdate = true; gB.attributes.color.needsUpdate = true;
      gF.computeBoundingSphere(); gB.computeBoundingSphere();
      // ombre : sous la feuille, côté où elle se soulève
      const lift = Math.sin(Math.PI * e), sw = W * (0.25 + 0.5 * lift);
      sh.material.opacity = 0.75 * lift; sh.scale.set(sw, rect.h, 1);
      const side = th < Math.PI / 2 ? 1 : -1; // ombre du côté encore couvert
      sh.position.set(hx + sgn * side * sw / 2, o.H - (rect.y + rect.h / 2), 0.2); sh.rotation.y = 0; sh.scale.x = sw * (sgn * side);
    };
    const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const t0 = performance.now(); let first = true;
    const frame = now => {
      let t = Math.min(1, (now - t0) / duration); const e = reverse ? 1 - ease(t) : ease(t);
      shape(e); try { o.r.render(scene, o.cam); } catch (_) { t = 1; }
      if (first) { first = false; onFirstFrame && onFirstFrame(); }
      if (t < 1) requestAnimationFrame(frame);
      else resolve(() => { o.r.domElement.style.display = 'none'; gF.dispose(); gB.dispose(); scene.traverse(m => { if (m.isMesh && m.geometry && m.geometry !== gF && m.geometry !== gB) m.geometry.dispose(); if (m.isMesh) m.material.dispose(); }); scene.clear(); });
    };
    try { shape(reverse ? 1 : 0); o.r.render(scene, o.cam); } catch (err) { o.r.domElement.style.display = 'none'; scene.clear(); reject(err); return; }
    if (onFirstFrame) { first = false; onFirstFrame(); }
    requestAnimationFrame(frame);
  });
}
