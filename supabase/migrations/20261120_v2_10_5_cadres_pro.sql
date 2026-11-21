-- Eskalys v2.10.5 : nouveaux cadres photo du carnet (or, argent, bordeaux, cœurs)
-- La base n'acceptait qu'une liste fixe de noms de cadres. Désormais, tout nom simple
-- (lettres minuscules, chiffres et tirets, 20 caractères au plus) est accepté : les prochains
-- cadres n'auront plus besoin de script. Le reste des règles ne change pas.
-- On peut le relancer sans risque.

create or replace function private.valid_stickers_multi(j jsonb, owners uuid[], keep text)
returns boolean language sql immutable set search_path to '' as $$
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
    or (e ? 'w' and (e ->> 'k' <> 'x' or jsonb_typeof(e -> 'w') <> 'number' or (e ->> 'w')::numeric not between 10 and 60))
    or (e ->> 'k' in ('p', 'f') and (jsonb_typeof(e -> 'p') <> 'string' or not private.media_ok(e ->> 'p', owners, keep)))
    -- photo libre : cadre, format, cadrage, zoom, légende
    or (e ? 'fr' and (e ->> 'k' <> 'f' or coalesce(e ->> 'fr', '') !~ '^[a-z0-9-]{1,20}$'))
    or (e ? 'ar' and (e ->> 'k' <> 'f' or coalesce(e ->> 'ar', '') not in ('o', 'carre', 'portrait', 'paysage', 'large', 'story')))
    or (e ? 'cx' and (jsonb_typeof(e -> 'cx') <> 'number' or (e ->> 'cx')::numeric not between 0 and 100))
    or (e ? 'cy' and (jsonb_typeof(e -> 'cy') <> 'number' or (e ->> 'cy')::numeric not between 0 and 100))
    or (e ? 'cz' and (jsonb_typeof(e -> 'cz') <> 'number' or (e ->> 'cz')::numeric not between 1 and 3))
    or (e ? 'cap' and (jsonb_typeof(e -> 'cap') <> 'string' or char_length(e ->> 'cap') > 40))
    or (select count(*) from jsonb_object_keys(e)) > 14
)
$$;
-- l'ancienne fonction garde son nom et ses règles, pour tout ce qui l'utiliserait ailleurs

-- contrôle : doit afficher « true » deux fois
select private.valid_stickers_multi('[{"k":"f","p":"x","x":10,"y":10,"fr":"coeur-or"}]'::jsonb, array[]::uuid[], 'x') is not null as fonction_ok,
       pg_get_functiondef('private.valid_stickers_multi(jsonb, uuid[], text)'::regprocedure) like '%a-z0-9-%' as nouveaux_cadres_ok;
