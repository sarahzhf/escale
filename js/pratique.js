/* Eskalys : infos pratiques par pays (prises, urgences, pourboire, conduite, eau) et liste de valise.
   [prises, tension, urgences, pourboire (0 non attendu, 1 arrondir ou 5 à 10 %, 2 attendu 15 à 20 %, 3 ne se fait pas), conduite (g = à gauche), eau du robinet (1 potable)] */
const PRAT = {
  FR: ['C, E', 230, '112', 0, 'd', 1], DE: ['C, F', 230, '112', 1, 'd', 1], IT: ['C, F, L', 230, '112', 1, 'd', 1], ES: ['C, F', 230, '112', 1, 'd', 1], PT: ['C, F', 230, '112', 1, 'd', 1],
  GR: ['C, F', 230, '112', 1, 'd', 1], NL: ['C, F', 230, '112', 1, 'd', 1], BE: ['C, E', 230, '112', 0, 'd', 1], AT: ['C, F', 230, '112', 1, 'd', 1], CH: ['C, J', 230, '112', 0, 'd', 1],
  GB: ['G', 230, '999 ou 112', 1, 'g', 1], IE: ['G', 230, '112', 1, 'g', 1], MT: ['G', 230, '112', 1, 'g', 1], CY: ['G', 230, '112', 1, 'g', 1], LU: ['C, F', 230, '112', 0, 'd', 1],
  DK: ['C, E, F, K', 230, '112', 0, 'd', 1], NO: ['C, F', 230, '112', 0, 'd', 1], SE: ['C, F', 230, '112', 0, 'd', 1], FI: ['C, F', 230, '112', 0, 'd', 1], IS: ['C, F', 230, '112', 0, 'd', 1],
  PL: ['C, E', 230, '112', 1, 'd', 1], CZ: ['C, E', 230, '112', 1, 'd', 1], HU: ['C, F', 230, '112', 1, 'd', 1], HR: ['C, F', 230, '112', 1, 'd', 1], SI: ['C, F', 230, '112', 1, 'd', 1],
  SK: ['C, E', 230, '112', 1, 'd', 1], RO: ['C, F', 230, '112', 1, 'd', 1], BG: ['C, F', 230, '112', 1, 'd', 1], EE: ['C, F', 230, '112', 1, 'd', 1], LV: ['C, F', 230, '112', 1, 'd', 1],
  LT: ['C, F', 230, '112', 1, 'd', 1], ME: ['C, F', 230, '112', 1, 'd', 0], AL: ['C, F', 230, '112', 1, 'd', 0], MC: ['C, E, F', 230, '112', 0, 'd', 1],
  TR: ['C, F', 230, '112', 1, 'd', 0], MA: ['C, E', 220, '19 (police), 15 (secours)', 1, 'd', 0], TN: ['C, E', 230, '197 (police), 190 (secours)', 1, 'd', 0],
  DZ: ['C, F', 230, '17 (police), 14 (secours)', 1, 'd', 0], EG: ['C, F', 220, '122 (police), 123 (secours)', 1, 'd', 0], SN: ['C, D, E, K', 230, '17 (police), 15 (secours)', 1, 'd', 0],
  ZA: ['C, M, N', 230, '10111 (police), 10177 (secours)', 1, 'g', 1], KE: ['G', 240, '999', 1, 'g', 0], TZ: ['D, G', 230, '112', 1, 'g', 0], MG: ['C, E', 220, '117 (police)', 1, 'd', 0],
  MU: ['C, G', 230, '999 (police), 114 (secours)', 1, 'g', 0], AE: ['G', 230, '999 (police), 998 (secours)', 1, 'd', 0], IL: ['C, H', 230, '100 (police), 101 (secours)', 1, 'd', 1],
  JO: ['C, D, F, G, J', 230, '911', 1, 'd', 0], US: ['A, B', 120, '911', 2, 'd', 1], CA: ['A, B', 120, '911', 2, 'd', 1], MX: ['A, B', 127, '911', 1, 'd', 0],
  CU: ['A, B, C, L', 110, '106 (police), 104 (secours)', 1, 'd', 0], DO: ['A, B', 120, '911', 1, 'd', 0], CR: ['A, B', 120, '911', 1, 'd', 0], CO: ['A, B', 110, '123', 1, 'd', 0],
  PE: ['A, C', 220, '105 (police), 116 (pompiers)', 1, 'd', 0], BR: ['C, N', '127 ou 220', '190 (police), 192 (secours)', 0, 'd', 0], AR: ['C, I', 220, '911', 1, 'd', 1],
  CL: ['C, L', 220, '133 (police), 131 (secours)', 1, 'd', 1], JP: ['A, B', 100, '110 (police), 119 (secours)', 3, 'g', 1], KR: ['C, F', 220, '112 (police), 119 (secours)', 3, 'd', 1],
  CN: ['A, C, I', 220, '110 (police), 120 (secours)', 3, 'd', 0], TH: ['A, B, C, O', 230, '191 (police), 1669 (secours)', 1, 'g', 0], VN: ['A, C', 220, '113 (police), 115 (secours)', 1, 'd', 0],
  ID: ['C, F', 230, '112', 1, 'g', 0], MY: ['G', 240, '999', 1, 'g', 0], SG: ['G', 230, '999 (police), 995 (secours)', 0, 'g', 1], PH: ['A, B, C', 220, '911', 1, 'd', 0],
  KH: ['A, C, G', 230, '117 (police), 119 (secours)', 1, 'd', 0], LA: ['A, B, C, E, F', 230, '191 (police), 195 (secours)', 1, 'd', 0], IN: ['C, D, M', 230, '112', 1, 'g', 0],
  LK: ['D, G', 230, '119 (police), 1990 (secours)', 1, 'g', 0], NP: ['C, D, M', 230, '100 (police), 102 (secours)', 1, 'g', 0], MV: ['D, G', 230, '119 (police), 102 (secours)', 1, 'g', 0],
  AU: ['I', 230, '000', 0, 'g', 1], NZ: ['I', 230, '111', 0, 'g', 1],
};
const TIP_TXT = ['Pas attendu, le service est compris', 'Arrondir ou laisser 5 à 10 %', 'Attendu : 15 à 20 % au restaurant', 'Ne se fait pas, peut gêner'];
const pratOf = cc => PRAT[cc] || null;
/** besoin d'un adaptateur depuis la France (prises C et E) ? */
const needAdapter = cc => { const p = pratOf(cc); return !!p && !/\b(C|E|F)\b/.test(p[0]); };
function pratiqueHTML(cc) { const p = pratOf(cc); if (!p) return '';
  const ad = needAdapter(cc) ? 'Adaptateur nécessaire' : 'Pas d’adaptateur depuis la France';
  return `<div><span>Prises</span><b>Type ${esc(p[0])}, ${esc(String(p[1]))} V</b><em>${ad}${p[1] !== 230 && p[1] !== 220 && p[1] !== 240 ? ', vérifie la tension de tes chargeurs' : ''}</em></div>
    <div><span>Urgences</span><b>${esc(p[2])}</b></div>
    <div><span>Pourboire</span><b>${TIP_TXT[p[3]]}</b></div>
    <div><span>Conduite</span><b>${p[4] === 'g' ? 'À gauche' : 'À droite'}</b></div>
    <div><span>Eau du robinet</span><b>${p[5] ? 'Potable' : 'Préfère l’eau en bouteille'}</b></div>`; }
/* ---------- liste de valise ---------- */
const TROP = new Set('TH VN ID MY SG PH KH LA MV LK MU MG SN BR CO CR CU DO MX EG AE IN KE TZ'.split(' ')), SUD = new Set('AU NZ ZA AR CL MG MU'.split(' '));
function valiseFor(t) { const cc = t.pays, d0 = new Date(t.du || Date.now()), m = d0.getMonth() + 1, days = t.du && t.au ? Math.max(1, Math.round((new Date(t.au) - d0) / 864e5) + 1) : 7;
  const summer = TROP.has(cc) || (SUD.has(cc) ? (m <= 3 || m >= 11) : (m >= 5 && m <= 9)), winter = !TROP.has(cc) && (SUD.has(cc) ? (m >= 6 && m <= 8) : (m <= 2 || m >= 11)), p = pratOf(cc);
  const L = [['Vêtements pour ' + Math.min(days, 7) + ' jours', days > 7 ? 'Prévois une lessive sur place' : ''], ['Trousse de toilette', ''], ['Chargeur et batterie externe', ''], ['Médicaments habituels', 'Et une petite trousse de secours']];
  if (needAdapter(cc)) L.push([`Adaptateur de prise type ${p[0].split(',')[0].trim()}`, `Les prises sont de type ${p[0]}`]);
  if (summer) L.push(['Crème solaire', ''], ['Maillot de bain', ''], ['Lunettes de soleil et chapeau', '']);
  if (winter) L.push(['Manteau chaud, bonnet et gants', ''], ['Chaussures imperméables', '']);
  if (!winter && !summer) L.push(['Une veste légère et un pull', 'Les soirées peuvent être fraîches']);
  if (TROP.has(cc)) L.push(['Anti-moustiques', ''], ['Vêtements légers couvrant épaules et genoux', 'Pour les temples et lieux religieux']);
  if (p && !p[5]) L.push(['Gourde filtrante ou pastilles', 'L’eau du robinet n’est pas potable']);
  if (days > 3) L.push(['Chaussures confortables pour marcher', '']);
  L.push(['Copie de tes papiers', 'Une photo sur ton téléphone suffit']);
  return L.map(([l, d]) => ({ k: 'val', l, d })); }
