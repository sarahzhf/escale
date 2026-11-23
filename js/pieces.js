/* Eskalys : les points du bocal deviennent des pièces des pays où tu voyages (fausse monnaie, motifs simples). */
const EURO = new Set('FR DE IT ES PT NL BE AT IE FI GR LU SK SI EE LV LT MT CY HR MC SM VA AD ME XK'.split(' '));
const COIN_OF = cc => {
  if (EURO.has(cc)) return { s: '€', o: '#C9CED3', i: '#D9B45A' };           // bimétal argent et or
  const M = { US: ['$', '#C9CED3'], GB: ['£', '#D9B45A'], JP: ['¥', '#D6A574'], CN: ['¥', '#D9B45A'], CH: ['Fr', '#C9CED3'], MA: ['DH', '#D9B45A'], DZ: ['DA', '#C9CED3'],
    TN: ['DT', '#D9B45A'], TR: ['₺', '#D9B45A'], TH: ['฿', '#D9B45A'], VN: ['₫', '#C9CED3'], KR: ['₩', '#D6A574'], IN: ['₹', '#C9CED3'], BR: ['R$', '#D9B45A'],
    MX: ['$', '#D9B45A'], CA: ['$', '#D9B45A'], AU: ['$', '#D9B45A'], NZ: ['$', '#C9CED3'], ID: ['Rp', '#C9CED3'], EG: ['£', '#D9B45A'], ZA: ['R', '#D9B45A'],
    NO: ['kr', '#C9CED3'], SE: ['kr', '#D9B45A'], DK: ['kr', '#D9B45A'], IS: ['kr', '#C9CED3'], PL: ['zł', '#D9B45A'], CZ: ['Kč', '#C9CED3'], HU: ['Ft', '#D9B45A'],
    SN: ['F', '#C9CED3'], MG: ['Ar', '#D9B45A'], PE: ['S/', '#D9B45A'], CR: ['₡', '#C9CED3'], SG: ['$', '#D9B45A'], AE: ['د', '#C9CED3'], MV: ['Rf', '#D9B45A'] };
  const m = M[cc] || ['¤', '#D6A574']; return { s: m[0], o: m[1], i: m[1] };
};
/** pays des voyages déjà commencés (là où tu relèves des défis), du plus récent au plus ancien ; la France par défaut */
function coinCountries() {
  const now = new Date().toISOString().slice(0, 10);
  const L = [...new Set(((typeof S !== 'undefined' && S.trips) || []).filter(t => (t.du || t.start_date || '') <= now).sort((a, b) => String(b.du || '').localeCompare(String(a.du || ''))).map(t => t.pays || t.country_code).filter(Boolean))];
  return L.length ? L.slice(0, 6) : ['FR'];
}
const coinAt = (k, list) => COIN_OF(list[(k * 7 + (k >> 2)) % list.length]);
const coinShade = (hex, f) => { const v = parseInt(hex.slice(1), 16); return `rgb(${Math.min(255, Math.round((v >> 16) * f))},${Math.min(255, Math.round((v >> 8 & 255) * f))},${Math.min(255, Math.round((v & 255) * f))})`; };
