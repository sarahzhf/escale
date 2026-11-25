// Eskalys : fonction « infos-pays » (Supabase Edge Function).
// Lit la fiche officielle « Conseils aux voyageurs » du ministère des Affaires étrangères (diplomatie.gouv.fr)
// pour un pays, et en tire : le visa ou l'autorisation à demander, les papiers, la situation de sécurité
// et les risques santé (moustiques, vaccins). Le résultat est gardé 3 jours par pays et par passeport
// dans pays_infos : tout le monde voit la même info, et la recherche (payante) n'est relancée que tous les 3 jours.
// Seuls le pays et la nationalité arrivent ici, jamais l'identité ni les données de la personne.
//
// Déploiement :  supabase functions deploy infos-pays
// Secret :       ANTHROPIC_API_KEY (le même que pour l'assistant)
import { createClient } from 'npm:@supabase/supabase-js@2';

const TTL_DAYS = 3;
const MODEL = Deno.env.get('INFOS_MODEL') || 'claude-haiku-5-5';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
const VISA = ['aucun', 'autorisation', 'evisa', 'visa_arrivee', 'visa', 'inconnu'];
const NIV = ['normal', 'vigilance', 'deconseille_sauf', 'formellement_deconseille', 'inconnu'];
const str = (v: unknown, n: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const url = (v: unknown) => { const s = String(v || ''); return /^https:\/\/[^\s"<>]+$/.test(s) ? s.slice(0, 300) : ''; };

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Méthode non permise' }, 405);
  const U = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!, service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const user = createClient(U, anon, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } });
  const { data: u } = await user.auth.getUser(); if (!u?.user) return json({ error: 'Connexion requise' }, 401);

  let body: { country?: string; passport?: string } = {}; try { body = await req.json(); } catch { /* vide */ }
  const cc = String(body.country || '').toUpperCase(), pp = String(body.passport || 'FR').toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc) || !/^[A-Z]{2}$/.test(pp)) return json({ error: 'Pays invalide' }, 400);

  const db = createClient(U, service);
  const { data: hit } = await db.from('pays_infos').select('data, updated_at').eq('country_code', cc).eq('passport', pp).maybeSingle();
  if (hit && Date.now() - new Date(hit.updated_at).getTime() < TTL_DAYS * 864e5) return json(hit.data);

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY'); if (!apiKey) return json(hit?.data || { error: 'Recherche indisponible' }, hit ? 200 : 503);
  const today = new Date().toISOString().slice(0, 10);
  const fr = pp === 'FR';
  const prompt = `Nous sommes le ${today}. Une personne ${fr ? 'de nationalité française' : `qui voyage avec un passeport du pays de code ${pp}`} prépare un voyage touristique de moins de 30 jours dans le pays de code ISO ${cc}.
${fr ? 'Consulte la fiche « Conseils aux voyageurs » de ce pays sur diplomatie.gouv.fr, rubriques « Entrée / Séjour », « Sécurité » et « Santé ».' : 'Consulte les sources officielles les plus récentes (gouvernement du pays de destination, ministère des Affaires étrangères du pays du passeport).'}
Réponds UNIQUEMENT avec un objet JSON, sans texte autour :
{"visa":{"statut":"aucun|autorisation|evisa|visa_arrivee|visa|inconnu","titre":string,"duree":string,"demarche":string,"cout":string,"lien":string},
 "papiers":string,
 "situation":{"niveau":"normal|vigilance|deconseille_sauf|formellement_deconseille|inconnu","resume":string,"zones":string},
 "sante":{"moustiques":boolean,"resume":string},
 "source":string,"mise_a_jour":string}
Règles :
- visa.statut : « aucun » si aucun visa ni autorisation n'est demandé pour du tourisme ; « autorisation » pour une autorisation électronique (ESTA, AVE/eTA, ETA, NZeTA…) ; « evisa » pour un visa à demander en ligne ; « visa_arrivee » pour un visa délivré à l'arrivée ; « visa » pour un visa à demander à l'ambassade ; « inconnu » si la fiche ne le dit pas clairement. Ne devine jamais.
- visa.titre : une phrase courte et claire, par exemple « Pas de visa pour un séjour de moins de 90 jours » ou « Autorisation ESTA obligatoire avant le départ ».
- visa.duree : durée de séjour autorisée sans visa ou avec le visa, si indiquée. visa.demarche : comment et quand faire la demande, en une phrase. visa.cout : le prix officiel s'il est indiqué, sinon "". visa.lien : l'adresse du site officiel de demande s'il est indiqué (jamais un site intermédiaire), sinon "".
- papiers : passeport ou carte d'identité, et la validité demandée (par exemple « Passeport valide 6 mois après la date de retour »).
- situation.niveau : selon la carte de vigilance de la fiche. « normal » = vigilance normale, « vigilance » = vigilance renforcée, « deconseille_sauf » = déconseillé sauf raison impérative (au moins une zone), « formellement_deconseille » = tout le pays formellement déconseillé. situation.resume : une ou deux phrases sur la situation actuelle. situation.zones : les zones à éviter s'il y en a, sinon "".
- sante.moustiques : true si la fiche signale le paludisme, la dengue, le chikungunya, le zika ou une autre maladie transmise par les moustiques. sante.resume : une phrase (vaccins obligatoires ou recommandés, risques principaux).
- source : l'adresse exacte de la fiche consultée. mise_a_jour : la date de dernière mise à jour de la fiche si elle est affichée (AAAA-MM-JJ), sinon "".
- Écris en français, sans tiret long. Ne mets que ce que disent les sources consultées.`;

  const tool: Record<string, unknown> = { type: 'web_search_20250305', name: 'web_search', max_uses: 4 };
  if (fr) tool.allowed_domains = ['diplomatie.gouv.fr'];
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 1500, thinking: { type: 'disabled' }, tools: [tool], messages: [{ role: 'user', content: prompt }] }),
  });
  if (!r.ok) return json(hit?.data || { error: 'Recherche indisponible' }, hit ? 200 : 502);
  const out = await r.json();
  const text = (out.content || []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('\n');
  const m = text.match(/\{[\s\S]*\}/); if (!m) return json(hit?.data || { error: 'Réponse illisible' }, hit ? 200 : 502);
  // deno-lint-ignore no-explicit-any
  let d: any; try { d = JSON.parse(m[0]); } catch { return json(hit?.data || { error: 'Réponse illisible' }, hit ? 200 : 502); }
  const v = d.visa || {}, s = d.situation || {}, h = d.sante || {};
  const clean = {
    visa: { statut: VISA.includes(v.statut) ? v.statut : 'inconnu', titre: str(v.titre, 160), duree: str(v.duree, 80), demarche: str(v.demarche, 240), cout: str(v.cout, 80), lien: url(v.lien) },
    papiers: str(d.papiers, 200),
    situation: { niveau: NIV.includes(s.niveau) ? s.niveau : 'inconnu', resume: str(s.resume, 320), zones: str(s.zones, 240) },
    sante: { moustiques: h.moustiques === true, resume: str(h.resume, 240) },
    source: url(d.source) || (fr ? 'https://www.diplomatie.gouv.fr/fr/conseils-aux-voyageurs/' : ''),
    mise_a_jour: /^\d{4}-\d{2}-\d{2}$/.test(String(d.mise_a_jour)) ? d.mise_a_jour : '',
    verifie_le: today,
  };
  await db.from('pays_infos').upsert({ country_code: cc, passport: pp, data: clean, updated_at: new Date().toISOString() });
  return json(clean);
});
