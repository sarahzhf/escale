-- Eskalys v2.10 : carnet à plusieurs.
-- À exécuter une fois dans Supabase (SQL Editor) AVANT de mettre la version en ligne.
-- Tout est ajouté à côté de l'existant : aucune règle actuelle n'est modifiée.
--
-- La propriétaire d'un voyage invite des amis (collab_set). Un ami invité peut lire et modifier
-- les pages du journal de ce voyage, uniquement par les fonctions collab_* ci-dessous.
-- Il ne voit jamais le budget, les dépenses, les documents ni les autres champs du voyage.

-- 0. vérification : voyages et pages ont bien une colonne owner_id (propriétaire)
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'trips' and column_name = 'owner_id')
     or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'journal_entries' and column_name = 'owner_id') then
    raise exception 'Colonne owner_id introuvable : envoie ce message à Claude avant d''aller plus loin';
  end if;
end $$;

-- 1. les invitations
create table if not exists public.trip_collaborators (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);
create index if not exists trip_collaborators_user on public.trip_collaborators(user_id);
alter table public.trip_collaborators enable row level security;
-- lecture : la propriétaire du voyage, ou l'ami concerné ; écriture : seulement par les fonctions ci-dessous
drop policy if exists trip_collab_read on public.trip_collaborators;
create policy trip_collab_read on public.trip_collaborators for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = auth.uid()));

-- 2. qui peut modifier les pages d'un voyage : sa propriétaire ou un ami invité
create or replace function public.is_trip_editor(p_trip uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    exists (select 1 from public.trips t where t.id = p_trip and t.owner_id = auth.uid())
    or exists (select 1 from public.trip_collaborators c where c.trip_id = p_trip and c.user_id = auth.uid()));
$$;
revoke all on function public.is_trip_editor(uuid) from public, anon;
grant execute on function public.is_trip_editor(uuid) to authenticated;

-- 3. inviter ou retirer un ami (propriétaire seulement, amis du voyage seulement, 10 au maximum)
create or replace function public.collab_set(p_trip uuid, p_user uuid, p_on boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.trips t where t.id = p_trip and t.owner_id = auth.uid()) then raise exception 'Ce carnet n''est pas le tien'; end if;
  if p_on then
    if p_user = auth.uid() then raise exception 'C''est déjà ton carnet'; end if;
    if not exists (select 1 from public.my_friends() f where f.id = p_user and f.relation = 'friend') then raise exception 'Tu peux inviter seulement tes amis'; end if;
    -- seulement les amis du voyage : ceux que la propriétaire a ajoutés à l'équipage (Entre amis, amis Eskalys du voyage)
    if not exists (select 1 from public.crew_of(p_trip) x where to_jsonb(x)::text like '%' || p_user::text || '%') then raise exception 'Ajoute d''abord cet ami aux amis du voyage, dans Entre amis'; end if;
    if (select count(*) from public.trip_collaborators where trip_id = p_trip) >= 10 then raise exception '10 amis au maximum par carnet'; end if;
    insert into public.trip_collaborators (trip_id, user_id) values (p_trip, p_user) on conflict do nothing;
  else
    delete from public.trip_collaborators where trip_id = p_trip and user_id = p_user;
  end if;
end $$;
revoke all on function public.collab_set(uuid, uuid, boolean) from public, anon;
grant execute on function public.collab_set(uuid, uuid, boolean) to authenticated;

-- 4. quitter un carnet où l'on est invité
create or replace function public.collab_leave(p_trip uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.trip_collaborators where trip_id = p_trip and user_id = auth.uid();
$$;
revoke all on function public.collab_leave(uuid) from public, anon;
grant execute on function public.collab_leave(uuid) to authenticated;

-- 5. les amis invités sur un carnet (pour la propriétaire et les invités)
create or replace function public.collab_list(p_trip uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_trip_editor(p_trip) then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'display_name', p.display_name, 'avatar_path', p.avatar_path) order by c.added_at)
    from public.trip_collaborators c join public.profiles p on p.id = c.user_id where c.trip_id = p_trip), '[]'::jsonb);
end $$;
revoke all on function public.collab_list(uuid) from public, anon;
grant execute on function public.collab_list(uuid) to authenticated;

-- 6. les carnets partagés avec moi (sans budget ni dépenses)
create or replace function public.collab_trips()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'country_code', t.country_code, 'city', t.city, 'start_date', t.start_date, 'end_date', t.end_date,
    'book_color', t.book_color, 'cover_path', t.cover_path, 'owner_name', p.display_name) order by t.start_date desc), '[]'::jsonb)
  from public.trip_collaborators c join public.trips t on t.id = c.trip_id left join public.profiles p on p.id = t.owner_id
  where c.user_id = auth.uid();
$$;
revoke all on function public.collab_trips() from public, anon;
grant execute on function public.collab_trips() to authenticated;

-- 7. un carnet partagé : l'en-tête du voyage et ses pages
create or replace function public.collab_book(p_trip uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if not exists (select 1 from public.trip_collaborators c where c.trip_id = p_trip and c.user_id = auth.uid()) then return null; end if;
  select jsonb_build_object('id', t.id, 'country_code', t.country_code, 'city', t.city, 'start_date', t.start_date, 'end_date', t.end_date,
    'book_color', t.book_color, 'cover_path', t.cover_path, 'owner_name', p.display_name) into r
  from public.trips t left join public.profiles p on p.id = t.owner_id where t.id = p_trip;
  return jsonb_build_object('trip', r, 'entries', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'day', e.day, 'title', e.title, 'note', e.note,
    'description', e.description, 'photo_paths', e.photo_paths, 'stickers', e.stickers, 'layout', e.layout) order by e.day) from public.journal_entries e where e.trip_id = p_trip), '[]'::jsonb));
end $$;
revoke all on function public.collab_book(uuid) from public, anon;
grant execute on function public.collab_book(uuid) to authenticated;

-- 8. enregistrer une page (création ou modification). La page appartient toujours à la propriétaire du voyage (owner_id).
create or replace function public.collab_save_entry(p_trip uuid, p_entry jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare r public.journal_entries; v_owner uuid; v_id uuid := (p_entry->>'id')::uuid;
begin
  if not exists (select 1 from public.trip_collaborators c where c.trip_id = p_trip and c.user_id = auth.uid()) then raise exception 'Tu ne fais plus partie de ce carnet'; end if;
  if pg_column_size(p_entry) > 300000 then raise exception 'Page trop lourde'; end if;
  if exists (select 1 from public.journal_entries e where e.id = v_id and e.trip_id <> p_trip) then raise exception 'Page introuvable'; end if;
  if not exists (select 1 from public.journal_entries e where e.id = v_id) and (select count(*) from public.journal_entries e where e.trip_id = p_trip) >= 200 then raise exception '200 pages au maximum'; end if;
  select t.owner_id into v_owner from public.trips t where t.id = p_trip;
  r := jsonb_populate_record(null::public.journal_entries, jsonb_build_object('id', v_id, 'trip_id', p_trip, 'day', p_entry->'day', 'title', p_entry->'title', 'note', p_entry->'note',
    'description', p_entry->'description', 'photo_paths', p_entry->'photo_paths', 'stickers', p_entry->'stickers', 'layout', p_entry->'layout'));
  insert into public.journal_entries (id, trip_id, owner_id, day, title, note, description, photo_paths, stickers, layout)
    values (r.id, r.trip_id, v_owner, r.day, r.title, coalesce(r.note, ''), coalesce(r.description, ''), coalesce(r.photo_paths, '{}'), coalesce(r.stickers, '[]'::jsonb), coalesce(r.layout, '{}'::jsonb))
  on conflict (id) do update set day = excluded.day, title = excluded.title, note = excluded.note, description = excluded.description,
    photo_paths = excluded.photo_paths, stickers = excluded.stickers, layout = excluded.layout, updated_at = now()
  where public.journal_entries.trip_id = p_trip;
end $$;
revoke all on function public.collab_save_entry(uuid, jsonb) from public, anon;
grant execute on function public.collab_save_entry(uuid, jsonb) to authenticated;

-- 9. supprimer une page
create or replace function public.collab_delete_entry(p_trip uuid, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.trip_collaborators c where c.trip_id = p_trip and c.user_id = auth.uid()) then raise exception 'Tu ne fais plus partie de ce carnet'; end if;
  delete from public.journal_entries where id = p_id and trip_id = p_trip;
end $$;
revoke all on function public.collab_delete_entry(uuid, uuid) from public, anon;
grant execute on function public.collab_delete_entry(uuid, uuid) to authenticated;

-- 10. photos : dans un carnet à plusieurs, la propriétaire et les amis invités voient les photos des pages
--     (et la couverture), qu'elles aient été ajoutées par l'un ou par l'autre. Règle ajoutée aux règles existantes.
-- la vérification passe par une fonction, pour lire les pages même quand les règles des voyages la cachent à l'ami
create or replace function public.collab_media_ok(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (
    select 1 from public.trip_collaborators c
      join public.trips t on t.id = c.trip_id
      left join public.journal_entries je on je.trip_id = c.trip_id
    where (c.user_id = auth.uid() or t.owner_id = auth.uid())
      and (t.cover_path = p_name or p_name = any(je.photo_paths) or je.stickers::text like '%' || p_name || '%'));
$$;
revoke all on function public.collab_media_ok(text) from public, anon;
grant execute on function public.collab_media_ok(text) to authenticated;
drop policy if exists media_collab_read on storage.objects;
create policy media_collab_read on storage.objects for select to authenticated using (bucket_id = 'media' and public.collab_media_ok(objects.name));
