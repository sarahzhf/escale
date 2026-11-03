/* Escale : décorations du carnet, dessinées pour Escale (traits SVG, couleur au choix).
 * Doodles, nœuds, dentelles, fleurons, cadres de photos, typographies et papiers. */
'use strict';
const D_STROKE = 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
/* petits dessins au trait (48 x 48) */
const DOODLES = {
  heart: `<path ${D_STROKE} d="M24 40C12 31 6 25 6 17c0-6 4-10 9-10 4 0 7 2 9 6 2-4 5-6 9-6 5 0 9 4 9 10 0 8-6 14-18 23z"/>`,
  heartf: `<path fill="currentColor" d="M24 41C11 32 5 25 5 17 5 10 10 6 15 6c4 0 7 2 9 6 2-4 5-6 9-6 5 0 10 4 10 11 0 8-6 15-19 24z"/><path d="M15 13c-2 1-3 3-3 5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".6"/>`,
  hearts: `<path ${D_STROKE} d="M17 38C9 32 5 28 5 22c0-4 3-7 6-7 3 0 5 2 6 4 1-2 3-4 6-4 3 0 6 3 6 7 0 6-4 10-12 16z"/><path ${D_STROKE} d="M34 22c-5-4-8-6-8-10 0-3 2-5 4-5 2 0 3 1 4 3 1-2 2-3 4-3 2 0 4 2 4 5 0 4-3 6-8 10z"/>`,
  sparkles: `<path ${D_STROKE} d="M20 8c1 8 4 11 12 12-8 1-11 4-12 12-1-8-4-11-12-12 8-1 11-4 12-12zM37 30c.5 4 2 5.5 6 6-4 .5-5.5 2-6 6-.5-4-2-5.5-6-6 4-.5 5.5-2 6-6zM38 6c.4 3 1.5 4 4 4.5-2.5.5-3.6 1.5-4 4.5-.4-3-1.5-4-4-4.5 2.5-.5 3.6-1.5 4-4.5z"/>`,
  star: `<path ${D_STROKE} d="M24 6l5 11 12 1.5-9 8 2.5 12L24 32l-10.5 6.5L16 26.5l-9-8L19 17z"/>`,
  stars: `<path ${D_STROKE} d="M16 12l3 7 7 1-5 5 1.5 7.5L16 29l-6.5 3.5L11 25l-5-5 7-1zM35 24l2 4.5 4.5.5-3.3 3 1 4.8L35 34.5 30.8 37l1-4.8-3.3-3 4.5-.5z"/>`,
  envelope: `<rect ${D_STROKE} x="6" y="12" width="36" height="25" rx="3"/><path ${D_STROKE} d="M7 14l17 13 17-13M7 36l12-11M41 36L29 25"/>`,
  leaf: `<path ${D_STROKE} d="M10 40C14 22 24 12 40 8c-2 16-12 27-30 32zM10 40l20-22M18 31l-4-6M24 25l-2-8M24 25l8 1"/>`,
  flower: `<path ${D_STROKE} d="M24 20c-3-6-1-12 0-13 1 1 3 7 0 13zM28 23c5-4 11-3 12-2-1 1-6 4-12 2zM27 28c4 5 3 11 2 12-1-1-4-6-2-12zM21 28c-2 6-6 10-7 10 0-1 1-7 7-10zM20 23c-6-1-10-6-10-7 1 0 7-1 10 7z"/><circle ${D_STROKE} cx="24" cy="24" r="3.5"/>`,
  sun: `<circle ${D_STROKE} cx="24" cy="24" r="8"/><path ${D_STROKE} d="M24 5v6M24 37v6M5 24h6M37 24h6M10.5 10.5l4.2 4.2M33.3 33.3l4.2 4.2M10.5 37.5l4.2-4.2M33.3 14.7l4.2-4.2"/>`,
  moon: `<path ${D_STROKE} d="M30 8a16 16 0 1 0 10 26A13 13 0 0 1 30 8z"/><path ${D_STROKE} d="M38 10l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z"/>`,
  cloud: `<path ${D_STROKE} d="M13 36h22a8 8 0 0 0 0-16 11 11 0 0 0-21-2 9 9 0 0 0-1 18z"/>`,
  rainbow: `<path ${D_STROKE} d="M6 36a18 18 0 0 1 36 0M12 36a12 12 0 0 1 24 0M18 36a6 6 0 0 1 12 0"/>`,
  coffee: `<path ${D_STROKE} d="M9 20h24v8a10 10 0 0 1-10 10h-4A10 10 0 0 1 9 28zM33 23h3a4 4 0 0 1 0 8h-4M6 41h30M17 8c-2 3 2 4 0 8M24 8c-2 3 2 4 0 8"/>`,
  crown: `<path ${D_STROKE} d="M8 36l-2-20 10 8 8-14 8 14 10-8-2 20zM8 40h32"/>`,
  smile: `<circle ${D_STROKE} cx="24" cy="24" r="17"/><path ${D_STROKE} d="M17 20v2M31 20v2M15 28c4 6 14 6 18 0"/>`,
  swirl: `<path ${D_STROKE} d="M6 30c4-8 8-8 8-2s-6 8-4 2 8-10 10-2-6 8-4 2 8-10 10-2-6 8-4 2 8-10 10-2"/>`,
  arrow: `<path ${D_STROKE} d="M8 34c6-14 18-20 32-18M33 10l7 6-6 7"/>`,
  clover: `<path fill="currentColor" d="M24 23c-8-1-12-6-10-10s8-4 10 2c2-6 8-6 10-2s-2 9-10 10zm0 2c8 1 12 6 10 10s-8 4-10-2c-2 6-8 6-10 2s2-9 10-10z" transform="rotate(45 24 24)"/>`,
  burst: `<path ${D_STROKE} d="M24 4v10M24 34v10M4 24h10M34 24h10M10 10l7 7M31 31l7 7M10 38l7-7M31 17l7-7"/><path fill="currentColor" d="M24 18l1.8 4.2L30 24l-4.2 1.8L24 30l-1.8-4.2L18 24l4.2-1.8z"/>`,
  orbit: `<ellipse ${D_STROKE} cx="24" cy="24" rx="19" ry="7" transform="rotate(-25 24 24)"/><path fill="currentColor" d="M24 14l2 8 8 2-8 2-2 8-2-8-8-2 8-2z"/>`,
  plane: `<path ${D_STROKE} d="M42 8L6 22l13 4 3 13 6-9 9 7zM19 26l23-18"/><path ${D_STROKE} stroke-dasharray="1 5" d="M14 40c-4-2-8-2-10 2"/>`,
  camera: `<rect ${D_STROKE} x="6" y="14" width="36" height="24" rx="4"/><circle ${D_STROKE} cx="24" cy="26" r="7"/><path ${D_STROKE} d="M17 14l3-5h8l3 5M36 19h1"/>`,
  pin: `<path ${D_STROKE} d="M24 44S10 30 10 19a14 14 0 0 1 28 0c0 11-14 25-14 25z"/><circle ${D_STROKE} cx="24" cy="19" r="5"/>`,
  suitcase: `<rect ${D_STROKE} x="7" y="15" width="34" height="24" rx="4"/><path ${D_STROKE} d="M18 15v-4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4M15 15v24M33 15v24"/>`,
  palm: `<path ${D_STROKE} d="M24 44c0-12 1-20 3-26M27 18c-4-6-12-7-17-4 6 0 10 2 13 5M27 18c2-7 9-11 15-9-6 1-10 4-12 8M27 18c6-3 13-1 16 4-6-2-11-1-14 1M27 18c-1-6-6-10-11-10 4 3 7 6 8 10"/>`,
  wave: `<path ${D_STROKE} d="M4 28c4-6 8-6 12 0s8 6 12 0 8-6 12 0M4 36c4-6 8-6 12 0s8 6 12 0 8-6 12 0"/>`,
  butterfly: `<path ${D_STROKE} d="M24 16v22M24 20c-4-10-16-12-17-6s7 10 17 8c-9 2-13 10-9 13s9-3 9-9c0 6 5 12 9 9s0-11-9-13c10 2 18-2 17-8s-13-4-17 6M22 12l2 4 2-4"/>`,
};
/* décorations (nœuds, dentelles, fleurons, coins) : [viewBox, dessin] */
const DECOS = {
  bow1: ['0 0 120 90', `<path ${D_STROKE} stroke-width="3" d="M60 40c-14-18-40-30-46-18s20 26 46 18zM60 40c14-18 40-30 46-18s-20 26-46 18z"/><path ${D_STROKE} stroke-width="2" d="M60 40c-10-10-28-18-32-12M60 40c10-10 28-18 32-12"/><ellipse ${D_STROKE} stroke-width="3" cx="60" cy="40" rx="6" ry="7"/><path ${D_STROKE} stroke-width="3" d="M56 46c-6 12-16 24-24 36M64 46c6 12 16 24 26 34M28 80l6 2M88 80l4-4"/>`],
  bow2: ['0 0 120 90', `<path ${D_STROKE} stroke-width="3" d="M58 38C46 22 20 16 18 28s22 18 40 10zM62 38c12-16 38-22 40-10s-22 18-40 10z"/><circle ${D_STROKE} stroke-width="3" cx="60" cy="39" r="5"/><path ${D_STROKE} stroke-width="3" d="M57 43c-4 10-14 20-28 26-6 3-8 10-2 12M63 43c4 10 14 18 26 22 6 2 10 8 4 12"/>`],
  bow3: ['0 0 120 70', `<path ${D_STROKE} stroke-width="2.6" d="M60 30C50 14 30 10 26 20s16 16 34 10zM60 30c10-16 30-20 34-10S78 36 60 30zM60 30c-14 6-30 18-44 18-8 0-10-8-4-10M60 30c14 6 30 18 44 18 8 0 10-8 4-10"/><circle fill="currentColor" cx="60" cy="30" r="4"/>`],
  flourish1: ['0 0 160 30', `<path ${D_STROKE} stroke-width="2" d="M80 15c-10 0-14-8-22-8s-10 8-4 10 8-4 4-6M80 15c10 0 14-8 22-8s10 8 4 10-8-4-4-6M58 15H12c-6 0-8-6-3-7M102 15h46c6 0 8-6 3-7"/><circle fill="currentColor" cx="80" cy="15" r="2.5"/>`],
  flourish2: ['0 0 160 40', `<path ${D_STROKE} stroke-width="2" d="M10 28c20-14 40-14 60 0 4 3 8 3 10 0 2 3 6 3 10 0 20-14 40-14 60 0M80 28c0-8-6-14-12-12s-4 8 2 6M80 28c0-8 6-14 12-12s4 8-2 6M30 22c-2-6 4-10 7-6M130 22c2-6-4-10-7-6"/>`],
  heartline: ['0 0 160 40', `<path ${D_STROKE} stroke-width="2" d="M6 24c14 0 18-12 30-12s10 14 22 14 10-16 22-16 10 16 22 16 10-14 22-14 16 12 30 12"/><path fill="currentColor" d="M80 30c-6-4-9-6-9-10 0-2 2-4 4-4 2 0 4 1 5 3 1-2 3-3 5-3 2 0 4 2 4 4 0 4-3 6-9 10z"/>`],
  lace: ['0 0 240 40', `<defs><pattern id="lc" width="20" height="40" patternUnits="userSpaceOnUse"><path fill="currentColor" d="M0 0h20v14H0z" opacity=".95"/><path fill="currentColor" d="M0 14a10 10 0 0 0 20 0z" opacity=".9"/><circle cx="10" cy="7" r="3" fill="#fff" opacity=".85"/><circle cx="3" cy="11" r="1.4" fill="#fff" opacity=".8"/><circle cx="17" cy="11" r="1.4" fill="#fff" opacity=".8"/><circle cx="10" cy="17" r="2" fill="#fff" opacity=".8"/><path d="M4 27a6 6 0 0 0 12 0" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="10" cy="31" r="1.3" fill="currentColor"/></pattern></defs><rect width="240" height="40" fill="url(#lc)"/>`],
  lace2: ['0 0 240 34', `<defs><pattern id="lc2" width="24" height="34" patternUnits="userSpaceOnUse"><path fill="currentColor" d="M0 0h24v10H0zM0 10q6 14 12 0q6 14 12 0z"/><circle cx="6" cy="5" r="2" fill="#fff" opacity=".85"/><circle cx="18" cy="5" r="2" fill="#fff" opacity=".85"/><circle cx="12" cy="13" r="1.6" fill="#fff" opacity=".8"/><path d="M3 22q9 14 18 0" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="12" cy="27" r="1.4" fill="currentColor"/></pattern></defs><rect width="240" height="34" fill="url(#lc2)"/>`],
  corner: ['0 0 100 100', `<path ${D_STROKE} stroke-width="2" d="M6 94V40c0-18 16-34 34-34h54M14 94V46c0-18 14-32 32-32h48"/><path ${D_STROKE} stroke-width="1.8" d="M26 40c8-10 18-12 26-8-8 2-14 6-18 14M40 26c10-8 22-8 28-2-8 0-16 2-22 8M24 56c-4-6-2-12 4-14M56 24c6-4 12-2 14 4"/><circle fill="currentColor" cx="30" cy="30" r="4"/><circle fill="currentColor" cx="20" cy="70" r="2"/><circle fill="currentColor" cx="70" cy="20" r="2"/>`],
  stringlights: ['0 0 200 50', `<path ${D_STROKE} stroke-width="1.6" d="M4 8c30 24 66 24 96 0s66-24 96 0"/>${[20, 50, 80, 120, 150, 180].map((x, i) => `<circle fill="currentColor" cx="${x}" cy="${[16, 24, 18, 18, 24, 16][i]}" r="4" opacity=".85"/>`).join('')}`],
  frameoval: ['0 0 100 130', `<ellipse ${D_STROKE} stroke-width="2" cx="50" cy="65" rx="40" ry="54"/><ellipse ${D_STROKE} stroke-width="1.2" cx="50" cy="65" rx="34" ry="48"/><path ${D_STROKE} stroke-width="1.8" d="M40 10c4-6 16-6 20 0M44 8c2-4 10-4 12 0M40 120c4 6 16 6 20 0M8 58c-5 4-5 10 0 14M92 58c5 4 5 10 0 14"/><circle fill="currentColor" cx="50" cy="6" r="2.5"/>`],
};
const DECO_N = { bow1: 'Nœud', bow2: 'Nœud long', bow3: 'Petit nœud', flourish1: 'Fleuron', flourish2: 'Arabesque', heartline: 'Fil de cœur', lace: 'Dentelle', lace2: 'Dentelle fine', corner: 'Coin orné', stringlights: 'Guirlande', frameoval: 'Médaillon' };
const INK = ['#C0392B', '#20243A', '#2E5E3E', '#8B6B4A', '#D98CA3', '#B8902F', '#FFFFFF'];
const doodleSVG = (k, c) => `<svg viewBox="0 0 48 48" style="color:${c}" aria-hidden="true">${DOODLES[k] || ''}</svg>`;
const decoSVG = (k, c) => { const d = DECOS[k]; if (!d) return ''; const u = Math.random().toString(36).slice(2, 7); return `<svg viewBox="${d[0]}" style="color:${c}" aria-hidden="true">${d[1].replace(/id="(\w+)"/g, `id="$1${u}"`).replace(/url\(#(\w+)\)/g, `url(#$1${u})`)}</svg>`; };

/* typographies du carnet (titre + texte), polices libres hébergées sur le site */
const FONTS = {
  carnet: { n: 'Carnet', d: 'Playfair et écriture manuscrite' },
  romantique: { n: 'Romantique', d: 'Great Vibes et Cormorant' },
  calligraphie: { n: 'Calligraphie', d: 'Pinyon Script et Cormorant' },
  oldmoney: { n: 'Old money', d: 'Bodoni et Cormorant' },
  magazine: { n: 'Magazine', d: 'Bodoni et Josefin Sans' },
  moderne: { n: 'Moderne', d: 'Josefin Sans' },
  machine: { n: 'Machine à écrire', d: 'Special Elite' },
};
const PAPERS = { ligne: 'Lignes', blanc: 'Uni', quadrille: 'Quadrillé', points: 'Pointillé', kraft: 'Kraft', rose: 'Rose pâle' };
const FRAMES = { polaroid: 'Polaroïd', simple: 'Bord blanc', ovale: 'Médaillon', arche: 'Arche', festonne: 'Festonné', vague: 'Vague', dentelle: 'Dentelle', cercle: 'Rond', timbre: 'Timbre' };
const LETTERS = { label: 'Étiquette', bead: 'Perles', tile: 'Machine à écrire', script: 'Calligraphie', serif: 'Élégant' };
