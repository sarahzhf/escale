-- Eskalys v2.10.1 : les règles de la base acceptent le carnet libre et le carnet à plusieurs.
-- À exécuter une fois dans Supabase (SQL Editor). Aucune republication de l'appli n'est nécessaire.
--
-- Ce qui change :
--  - photos libres sur la page (élément « f ») : cadre, format, cadrage, zoom, légende ;
--  - nouveaux papiers et réglage « page libre » ;
--  - 12 photos par page au lieu de 6 ;
--  - dans un carnet à plusieurs, les photos d'un ami invité (rangées dans son propre dossier) sont acceptées,
--    et une photo déjà présente sur une page reste acceptée même si l'ami a quitté le carnet depuis.
-- Toutes les autres vérifications existantes sont gardées à l'identique.

-- 1. 12 photos par page
alter table public.journal_entries drop constraint if exists journal_entries_photo_paths_check;
alter table public.journal_entries add constraint journal_entries_photo_paths_check check (coalesce(array_length(photo_paths, 1), 0) <= 12);

-- 2. un chemin de photo est accepté s'il appartient à l'une des personnes autorisées, ou s'il était déjà sur la page
create or replace function private.media_ok(p text, owners uuid[], keep text)
returns boolean language sql immutable set search_path to '' as $$
  select (keep <> '' and position(p in keep) > 0) or exists (select 1 from unnest(owners) u where private.valid_media_path(p, u));
$$;

-- 3. stickers et photos libres
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
    or (e ? 'fr' and (e ->> 'k' <> 'f' or coalesce(e ->> 'fr', '') not in ('aucun', 'polaroid', 'blanc', 'arrondi', 'rond', 'timbre', 'film', 'scotch', 'ombre', 'kraft')))
    or (e ? 'ar' and (e ->> 'k' <> 'f' or coalesce(e ->> 'ar', '') not in ('o', 'carre', 'portrait', 'paysage', 'large', 'story')))
    or (e ? 'cx' and (jsonb_typeof(e -> 'cx') <> 'number' or (e ->> 'cx')::numeric not between 0 and 100))
    or (e ? 'cy' and (jsonb_typeof(e -> 'cy') <> 'number' or (e ->> 'cy')::numeric not between 0 and 100))
    or (e ? 'cz' and (jsonb_typeof(e -> 'cz') <> 'number' or (e ->> 'cz')::numeric not between 1 and 3))
    or (e ? 'cap' and (jsonb_typeof(e -> 'cap') <> 'string' or char_length(e ->> 'cap') > 40))
    or (select count(*) from jsonb_object_keys(e)) > 14
)
$$;
-- l'ancienne fonction garde son nom et ses règles, pour tout ce qui l'utiliserait ailleurs
create or replace function private.valid_stickers(j jsonb, owner uuid)
returns boolean language sql immutable set search_path to '' as $$ select private.valid_stickers_multi(j, array[owner], '') $$;

-- 4. mise en page : police, papier (anciens et nouveaux), cadres de la grille, page libre
create or replace function private.valid_layout(j jsonb)
returns boolean language sql immutable set search_path to '' as $$
select jsonb_typeof(j) = 'object'
  and not exists (select 1 from jsonb_object_keys(j) k where k not in ('font', 'paper', 'fr', 'free'))
  and (not j ? 'font' or coalesce(j ->> 'font', '') in ('carnet', 'romantique', 'calligraphie', 'oldmoney', 'magazine', 'moderne', 'machine'))
  and (not j ? 'paper' or coalesce(j ->> 'paper', '') in ('ligne', 'blanc', 'quadrille', 'points', 'kraft', 'rose', 'ivoire', 'ciel', 'sauge', 'lavande', 'citron', 'peche', 'menthe',
    'terracotta', 'nuit', 'noir', 'millimetre', 'aquarelle', 'vintage', 'calque'))
  and (not j ? 'fr' or (jsonb_typeof(j -> 'fr') = 'array' and jsonb_array_length(j -> 'fr') <= 12
    and not exists (select 1 from jsonb_array_elements(j -> 'fr') f where jsonb_typeof(f) <> 'string'
      or (f #>> '{}') not in ('polaroid', 'simple', 'ovale', 'arche', 'festonne', 'vague', 'dentelle', 'cercle', 'timbre'))))
  and (not j ? 'free' or jsonb_typeof(j -> 'free') in ('number', 'boolean'))
$$;

-- 5. la vérification avant enregistrement d'une page
create or replace function private.check_journal_paths()
returns trigger language plpgsql set search_path to '' as $$
declare v_ok uuid[]; v_keep text := '';
begin
  -- personnes dont les photos sont acceptées : la propriétaire et les amis invités au carnet
  v_ok := array[new.owner_id] || coalesce((select array_agg(c.user_id) from public.trip_collaborators c where c.trip_id = new.trip_id), '{}'::uuid[]);
  -- une photo déjà sur la page reste acceptée
  if tg_op = 'UPDATE' then v_keep := coalesce(old.photo_paths::text, '') || coalesce(old.stickers::text, ''); end if;
  if exists (select 1 from unnest(new.photo_paths) p where p is not null and not private.media_ok(p, v_ok, v_keep)) then
    raise exception 'chemin de photo invalide' using errcode = '22023';
  end if;
  if not private.valid_stickers_multi(new.stickers, v_ok, v_keep) then
    raise exception 'stickers invalides' using errcode = '22023';
  end if;
  if not private.valid_layout(new.layout) then
    raise exception 'mise en page invalide' using errcode = '22023';
  end if;
  return new;
end $$;
