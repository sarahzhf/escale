/* Escale : prix indicatifs pour simuler un voyage avant de le prévoir.
 *
 * Deux sources, dans cet ordre :
 *  1. La recherche IA (fonction « prix » du serveur), si l'assistant IA est activé dans les réglages :
 *     elle cherche sur internet les vrais lieux à visiter d'une ville avec leur tarif, et le prix moyen
 *     d'un repas dans le pays. Le serveur garde chaque ville 30 jours : tout le monde voit les mêmes prix.
 *     Seuls le pays et la ville sont envoyés, jamais l'identité ni les données de la personne.
 *  2. Sinon, des ordres de grandeur intégrés à l'appli (coût par jour et par personne, milieu de gamme,
 *     logement compris, sans le vol), qui marchent sans réseau.
 * Tout est affiché comme « prix indicatif, à vérifier ». */
'use strict';
const PRIX_NOTE = 'Prix indicatifs, à vérifier';

/* coût par jour et par personne, milieu de gamme, logement compris, sans le vol (en euros) */
const PJ_MORE = (() => { const m = {}, T = {
  220: 'MC MV', 200: 'SC', 190: 'CH PF BS', 170: 'NO', 160: 'NC BB', 150: 'DK QA IL BW', 140: 'LU SG AE AU',
  130: 'SE FI IE HK NZ', 120: 'GP MQ TZ', 115: 'AT', 110: 'BE OM MU RE KE', 100: 'KR', 95: 'CY MT JO CR NA',
  90: 'UY', 85: 'SI TW PA CL', 80: 'EE ZA', 75: 'CZ CN', 70: 'HU LV LT SK ME AR', 65: 'PL PE', 60: 'RO MY GT HN CO EC',
  55: 'AL BA RS BG GE AM PH', 50: 'MK MD EG', 45: 'IN NP LK LA KH MM BD BO NI KG UZ TJ' };
  Object.entries(T).forEach(([v, s]) => s.split(' ').forEach(k => m[k] = +v)); return m; })();
const PJ_CONT = { 'Europe': 90, 'Asie': 60, 'Afrique': 70, 'Amériques': 85, 'Océanie': 130 };
/** Coût par jour et par personne dans un pays (milieu de gamme). */
function pjOf(cc) { return (DEST[cc] && DEST[cc].pj) || PJ_MORE[cc] || PJ_CONT[CONT[cc]] || 80; }

const STYLES_SIMU = { eco: { n: 'Petit budget', k: .6 }, confort: { n: 'Confort', k: 1 }, luxe: { n: 'Luxe', k: 2.2 } };
const REPAS = { street: { n: 'Street food et marchés', k: .09 }, mix: { n: 'Un peu de tout', k: .145 }, resto: { n: 'Restaurant moyen', k: .2 }, bon: { n: 'Bon restaurant', k: .45 } };
/** Prix moyen d'un repas, par niveau, dans un pays (en euros). */
function mealsOf(cc, ai) { const pj = pjOf(cc), m = ai && ai.meals || {};
  const r = k => Math.max(2, Math.round(pj * REPAS[k].k));
  const street = +m.street || r('street'), resto = +m.moyen || r('resto'), bon = +m.bon || r('bon');
  return { street, mix: Math.round((street + resto) / 2), resto, bon, ai: !!(m.street || m.moyen) }; }

/** Haute ou basse saison pour un mois donné : facteur appliqué au logement et au vol. */
function seasonOf(cc, month) { const best = (DEST[cc] && DEST[cc].mois) || [], summer = month === 7 || month === 8;
  if (summer && CONT[cc] === 'Europe') return { k: 1.25, n: 'Haute saison (été)' };
  if (best.includes(month)) return { k: 1.15, n: 'Haute saison' };
  return best.length ? { k: .88, n: 'Basse saison' } : { k: 1, n: '' }; }

/** Vol aller-retour par personne depuis chez soi (train ou voiture si c'est tout près). */
function flightOf(ll, month, cc) { const km = kmBetween(homeOf().ll, ll), s = seasonOf(cc, month).k;
  if (km < 350) return { v: Math.round(25 + km * .18), n: 'Train ou voiture, aller-retour' };
  if (km < 900 && cc === homeOf().cc) return { v: Math.round(40 + km * .16), n: 'Train, aller-retour' };
  return { v: Math.round((70 + km * .085) * s / 5) * 5, n: 'Vol aller-retour estimé' }; }

/** Trajet entre deux étapes du voyage (train, bus ou vol intérieur), par personne. */
function legOf(a, b, cc) { const km = kmBetween(a, b), lv = pjOf(cc) / 100;
  return Math.max(10, Math.round((km < 700 ? km * .11 : 60 + km * .06) * Math.max(.5, lv))); }

/* ---------- recherche IA, gardée 30 jours ---------- */
const AI_TTL = 30 * 864e5;
const aiKey = (cc, city) => `escale:prix:${cc}:${norm(city || '')}`;
function aiCached(cc, city) { try { const o = JSON.parse(localStorage.getItem(aiKey(cc, city)) || 'null'); return o && Date.now() - o.at < AI_TTL ? o : null; } catch (_) { return null; } }
/** Prix trouvés par la recherche IA pour une ville : { meals, activities, date }. null si indisponible. */
async function aiPrices(cc, city) {
  const hit = aiCached(cc, city); if (hit) return hit;
  if (!(typeof SETTINGS !== 'undefined' && SETTINGS && SETTINGS.ai_enabled) || !navigator.onLine) return null;
  try {
    const { data, error } = await sb.functions.invoke('prix', { body: { country: cc, city: String(city || '').slice(0, 60) } });
    if (error || !data) return null;
    const acts = (Array.isArray(data.activities) ? data.activities : []).slice(0, 20).map(a => ({ n: String(a.name || '').slice(0, 80), p: Math.max(0, Math.round(+a.price || 0)), c: String(a.city || city || '').slice(0, 40), d: String(a.note || '').slice(0, 120) })).filter(a => a.n);
    const o = { meals: data.meals || null, activities: acts, date: data.date || new Date().toISOString().slice(0, 10), at: Date.now() };
    try { localStorage.setItem(aiKey(cc, city), JSON.stringify(o)); } catch (_) { }
    return o;
  } catch (_) { return null; }
}
