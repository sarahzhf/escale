-- Eskalys v2.16.1 : les modèles de carnet s'enregistrent
-- Mise en page : on accepte aussi le modèle posé (mdl), le thème du carnet (th) et le mode pleine page (full).
-- Stickers : un emplacement photo vide d'un modèle (k = 'f', p = '') est accepté, et la largeur d'un texte peut descendre à 2 (numéros des listes).
create or replace function private.valid_layout(j jsonb)
 returns boolean language sql immutable set search_path to ''
as $function$
select jsonb_typeof(j) = 'object'
  and not exists (select 1 from jsonb_object_keys(j) k where k not in ('font', 'paper', 'fr', 'free', 'mdl', 'th', 'full'))
  and (not j ? 'font' or coalesce(j ->> 'font', '') in ('carnet', 'romantique', 'calligraphie', 'oldmoney', 'magazine', 'moderne', 'machine'))
  and (not j ? 'paper' or coalesce(j ->> 'paper', '') in ('ligne', 'blanc', 'quadrille', 'points', 'kraft', 'rose', 'ivoire', 'ciel', 'sauge', 'lavande', 'citron', 'peche', 'menthe',
    'terracotta', 'nuit', 'noir', 'millimetre', 'aquarelle', 'vintage', 'calque'))
  and (not j ? 'fr' or (jsonb_typeof(j -> 'fr') = 'array' and jsonb_array_length(j -> 'fr') <= 12
    and not exists (select 1 from jsonb_array_elements(j -> 'fr') f where jsonb_typeof(f) <> 'string'
      or (f #>> '{}') not in ('polaroid', 'simple', 'ovale', 'arche', 'festonne', 'vague', 'dentelle', 'cercle', 'timbre'))))
  and (not j ? 'free' or jsonb_typeof(j -> 'free') in ('number', 'boolean'))
  and (not j ? 'mdl' or coalesce(j ->> 'mdl', '') ~ '^[a-z0-9-]{1,20}$')
  and (not j ? 'th' or coalesce(j ->> 'th', '') ~ '^[a-z0-9-]{1,20}$')
  and (not j ? 'full' or jsonb_typeof(j -> 'full') in ('number', 'boolean'))
$function$;

create or replace function private.valid_stickers_multi(j jsonb, owners uuid[], keep text)
 returns boolean language sql immutable set search_path to ''
as $function$
select jsonb_typeof(j) = 'array' and jsonb_array_length(j) <= 60 and not exists (
  select 1 from jsonb_array_elements(j) e
  where jsonb_typeof(e) <> 'object'
    or coalesce(e ->> 'k', '') not in ('e', 'p', 'w', 't', 'd', 'x', 'f')
    or jsonb_typeof(e -> 'x') <> 'number' or (e ->> 'x')::numeric not between -10 and 110
    or jsonb_typeof(e -> 'y') <> 'number' or (e ->> 'y')::numeric not between -10 and 110
    or (e ? 's' and (jsonb_typeof(e -> 's') <> 'number' or (e ->> 's')::numeric not between 0.2 and 5))
    or (e ? 'r' and (jsonb_typeof(e -> 'r') <> 'number' or (e ->> 'r')::numeric not between -7200 and 7200))
    or (e ? 'v' and (jsonb_typeof(e -> 'v') <> 'string' or char_length(e ->> 'v') > case when e ->> 'k' = 'x' then 600 else 60 end))
    or (e ? 'c' and coalesce(e ->> 'c', '') !~ '^#[0-9a-fA-F]{6}$')
    or (e ? 'sh' and coalesce(e ->> 'sh', '') not in ('circle', 'heart', 'star', 'stamp', 'square'))
    or (e ? 'f' and e ->> 'k' <> 'x' and coalesce(e ->> 'f', '') not in ('label', 'bead', 'tile', 'script', 'serif'))
    or (e ? 'f' and e ->> 'k' = 'x' and coalesce(e ->> 'f', '') not in ('carnet', 'romantique', 'calligraphie', 'oldmoney', 'magazine', 'moderne', 'machine'))
    or (e ? 'w' and (e ->> 'k' <> 'x' or jsonb_typeof(e -> 'w') <> 'number' or (e ->> 'w')::numeric not between 2 and 60))
    -- photo : chemin valide, ou emplacement vide d'un modèle (photo libre seulement)
    or (e ->> 'k' in ('p', 'f') and (jsonb_typeof(e -> 'p') <> 'string'
        or (not (e ->> 'k' = 'f' and e ->> 'p' = '') and not private.media_ok(e ->> 'p', owners, keep))))
    -- texte d'aide d'un modèle (« Ton titre », « ta raison… ») et marque de modèle
    or (e ? 'ph' and (e ->> 'k' <> 'x' or jsonb_typeof(e -> 'ph') <> 'string' or char_length(e ->> 'ph') > 60))
    or (e ? 'tpl' and jsonb_typeof(e -> 'tpl') not in ('number', 'boolean'))
    -- photo libre : cadre, format, cadrage, zoom, légende
    or (e ? 'fr' and (e ->> 'k' <> 'f' or coalesce(e ->> 'fr', '') !~ '^[a-z0-9-]{1,20}$'))
    or (e ? 'ar' and (e ->> 'k' <> 'f' or coalesce(e ->> 'ar', '') not in ('o', 'carre', 'portrait', 'paysage', 'large', 'story')))
    or (e ? 'cx' and (jsonb_typeof(e -> 'cx') <> 'number' or (e ->> 'cx')::numeric not between 0 and 100))
    or (e ? 'cy' and (jsonb_typeof(e -> 'cy') <> 'number' or (e ->> 'cy')::numeric not between 0 and 100))
    or (e ? 'cz' and (jsonb_typeof(e -> 'cz') <> 'number' or (e ->> 'cz')::numeric not between 1 and 3))
    or (e ? 'cap' and (jsonb_typeof(e -> 'cap') <> 'string' or char_length(e ->> 'cap') > 40))
    or (select count(*) from jsonb_object_keys(e)) > 14
)
$function$;
