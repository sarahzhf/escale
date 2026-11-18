// Escale : fonction « prix » (Supabase Edge Function).
// Cherche sur internet, avec l'IA, les vrais lieux à visiter d'une ville avec leur tarif d'entrée,
// et le prix moyen d'un repas dans le pays (street food, restaurant moyen, bon restaurant).
// Le résultat est gardé 30 jours par ville dans price_cache : tout le monde voit les mêmes prix,
// et la recherche (payante à l'usage) n'est relancée qu'une fois par mois et par ville.
// Seuls le pays et la ville arrivent ici, jamais l'identité ni les données de la personne.
//
// Déploiement :  supabase functions deploy prix
// Secret :       supabase secrets set ANTHROPIC_API_KEY=...
import { createClient } from 'npm:@supabase/supabase-js@2';

const TTL_DAYS = 30;
const MODEL = Deno.env.get('PRIX_MODEL') || 'claude-haiku-4-5';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Méthode non permise' }, 405);
  const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!, service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  // réservé aux comptes connectés
  const user = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } });
  const { data: u } = await user.auth.getUser(); if (!u?.user) return json({ error: 'Connexion requise' }, 401);

  let body: { country?: string; city?: string } = {}; try { body = await req.json(); } catch { /* vide */ }
  const cc = String(body.country || '').toUpperCase(), city = String(body.city || '').slice(0, 60).trim(), key = norm(city);
  if (!/^[A-Z]{2}$/.test(cc)) return json({ error: 'Pays invalide' }, 400);

  const db = createClient(url, service);
  const { data: hit } = await db.from('price_cache').select('data, updated_at').eq('country_code', cc).eq('city_key', key).maybeSingle();
  if (hit && Date.now() - new Date(hit.updated_at).getTime() < TTL_DAYS * 864e5) return json(hit.data);

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY'); if (!apiKey) return json({ error: 'Recherche indisponible' }, 503);
  const where = city ? `${city} (code pays ${cc})` : `le pays de code ${cc}`;
  const prompt = `Cherche sur internet les informations les plus récentes pour un voyageur qui prépare un séjour à ${where}.
Réponds UNIQUEMENT avec un objet JSON, sans texte autour, de cette forme :
{"meals":{"street":number,"moyen":number,"bon":number},"activities":[{"name":string,"city":string,"price":number,"note":string}],"date":"AAAA-MM-JJ"}
- meals : prix moyen d'UN repas par personne, en euros : street food ou marché, restaurant milieu de gamme, bon restaurant.
- activities : 8 à 15 vrais lieux ou activités (musées, monuments, visites, excursions) avec leur tarif adulte officiel en euros (0 si gratuit), le nom en français, et une note très courte (par exemple « réservation conseillée »).
- date : la date du jour.
Convertis les prix locaux en euros au taux actuel. Arrondis à l'euro.`;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 2000, tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }], messages: [{ role: 'user', content: prompt }] }),
  });
  if (!r.ok) return json({ error: 'Recherche indisponible' }, 502);
  const out = await r.json();
  const text = (out.content || []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('\n');
  const m = text.match(/\{[\s\S]*\}/); if (!m) return json({ error: 'Réponse illisible' }, 502);
  let data: { meals?: Record<string, number>; activities?: { name: string; city?: string; price: number; note?: string }[]; date?: string };
  try { data = JSON.parse(m[0]); } catch { return json({ error: 'Réponse illisible' }, 502); }
  const n = (v: unknown) => Math.max(0, Math.min(5000, Math.round(Number(v) || 0)));
  const clean = {
    meals: data.meals ? { street: n(data.meals.street), moyen: n(data.meals.moyen), bon: n(data.meals.bon) } : null,
    activities: (data.activities || []).slice(0, 20).map(a => ({ name: String(a.name || '').slice(0, 80), city: String(a.city || city).slice(0, 40), price: n(a.price), note: String(a.note || '').slice(0, 120) })).filter(a => a.name),
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(data.date)) ? data.date : new Date().toISOString().slice(0, 10),
  };
  await db.from('price_cache').upsert({ country_code: cc, city_key: key, data: clean, updated_at: new Date().toISOString() });
  return json(clean);
});
