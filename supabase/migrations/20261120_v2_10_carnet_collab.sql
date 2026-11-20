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

-- 2 bis. nouveau type de notification « carnet_invite » : ajouté à la liste autorisée, sans toucher aux autres
do $$ declare c record; v text[];
begin
  for c in select conname, pg_get_constraintdef(oid) d from pg_constraint
           where conrelid = 'public.notifications'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%kind%' loop
    if c.d like '%carnet_invite%' then continue; end if;
    select array_agg(m[1]) into v from regexp_matches(c.d, '''([a-z_]+)''', 'g') m;
    if v is null then continue; end if;
    v := array_append(v, 'carnet_invite');
    execute format('alter table public.notifications drop constraint %I', c.conname);
    execute format('alter table public.notifications add constraint %I check (kind = any (%L::text[]))', c.conname, v);
  end loop;
end $$;

-- 3. inviter ou retirer un ami (propriétaire seulement, amis du voyage seulement, 10 au maximum)
create or replace function public.collab_set(p_trip uuid, p_user uuid, p_on boolean)
returns void language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not exists (select 1 from public.trips t where t.id = p_trip and t.owner_id = auth.uid()) then raise exception 'Ce carnet n''est pas le tien'; end if;
  if p_on then
    if p_user = auth.uid() then raise exception 'C''est déjà ton carnet'; end if;
    if not exists (select 1 from public.my_friends() f where f.id = p_user and f.relation = 'friend') then raise exception 'Tu peux inviter seulement tes amis'; end if;
    -- seulement les amis du voyage : ceux que la propriétaire a ajoutés à l'équipage (Entre amis, amis Eskalys du voyage)
    if not exists (select 1 from public.crew_of(p_trip) x where to_jsonb(x)::text like '%' || p_user::text || '%') then raise exception 'Ajoute d''abord cet ami aux amis du voyage, dans Entre amis'; end if;
    if (select count(*) from public.trip_collaborators where trip_id = p_trip) >= 10 then raise exception '10 amis au maximum par carnet'; end if;
    insert into public.trip_collaborators (trip_id, user_id) values (p_trip, p_user) on conflict do nothing;
    get diagnostics n = row_count;
    -- l'ami est prévenu une seule fois ; un souci de notification n'empêche jamais l'invitation
    if n > 0 then
      begin insert into public.notifications (user_id, actor_id, kind) values (p_user, auth.uid(), 'carnet_invite');
      exception when others then null; end;
    end if;
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

-- 11. historique des modifications d'un carnet à plusieurs : qui a modifié quoi, et quand.
--     Une ligne par personne et par page, regroupée sur 15 minutes. Gardé 180 jours.
create table if not exists public.journal_history (
  id bigserial primary key,
  trip_id uuid not null references public.trips(id) on delete cascade,
  entry_id uuid,
  user_id uuid references auth.users(id) on delete set null,
  day integer,
  title text,
  acts text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists journal_history_trip on public.journal_history(trip_id, updated_at desc);
alter table public.journal_history enable row level security;
-- aucune règle : lu seulement par collab_history, écrit seulement par le déclencheur

create or replace function public.journal_history_log()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_trip uuid := coalesce(new.trip_id, old.trip_id); v_acts text[] := '{}'; v_last bigint;
  nf int; of int; ns int; os int;
begin
  if auth.uid() is null or not exists (select 1 from public.trip_collaborators c where c.trip_id = v_trip) then return null; end if;
  if tg_op = 'INSERT' then v_acts := array['page_new'];
  elsif tg_op = 'DELETE' then v_acts := array['page_del'];
  else
    if new.title is distinct from old.title or new.description is distinct from old.description or new.day is distinct from old.day then v_acts := array_append(v_acts, 'titre'); end if;
    if new.note is distinct from old.note then v_acts := array_append(v_acts, 'texte'); end if;
    nf := (select count(*) from jsonb_array_elements(coalesce(new.stickers, '[]'::jsonb)) x where x->>'k' = 'f');
    of := (select count(*) from jsonb_array_elements(coalesce(old.stickers, '[]'::jsonb)) x where x->>'k' = 'f');
    if coalesce(cardinality(array_remove(new.photo_paths, null)), 0) > coalesce(cardinality(array_remove(old.photo_paths, null)), 0) or nf > of then v_acts := array_append(v_acts, 'photo_add');
    elsif coalesce(cardinality(array_remove(new.photo_paths, null)), 0) < coalesce(cardinality(array_remove(old.photo_paths, null)), 0) or nf < of then v_acts := array_append(v_acts, 'photo_del'); end if;
    ns := (select count(*) from jsonb_array_elements(coalesce(new.stickers, '[]'::jsonb)) x where x->>'k' not in ('f', 'x'));
    os := (select count(*) from jsonb_array_elements(coalesce(old.stickers, '[]'::jsonb)) x where x->>'k' not in ('f', 'x'));
    if ns > os then v_acts := array_append(v_acts, 'stk_add'); elsif ns < os then v_acts := array_append(v_acts, 'stk_del'); end if;
    if (select coalesce(string_agg(x->>'v', '|' order by n), '') from jsonb_array_elements(coalesce(new.stickers, '[]'::jsonb)) with ordinality a(x, n) where x->>'k' = 'x')
       is distinct from (select coalesce(string_agg(x->>'v', '|' order by n), '') from jsonb_array_elements(coalesce(old.stickers, '[]'::jsonb)) with ordinality a(x, n) where x->>'k' = 'x') then v_acts := array_append(v_acts, 'texte'); end if;
    if cardinality(v_acts) = 0 and new.stickers is distinct from old.stickers then v_acts := array_append(v_acts, 'deplace'); end if;
    if new.layout is distinct from old.layout and (new.layout - 'free') is distinct from (old.layout - 'free') then v_acts := array_append(v_acts, 'style'); end if;
  end if;
  if cardinality(v_acts) = 0 then return null; end if;
  select h.id into v_last from public.journal_history h
    where h.trip_id = v_trip and h.entry_id = coalesce(new.id, old.id) and h.user_id = auth.uid() and h.updated_at > now() - interval '15 minutes'
    order by h.updated_at desc limit 1;
  if v_last is not null then
    update public.journal_history set acts = (select array_agg(distinct a) from unnest(acts || v_acts) a), updated_at = now(),
      day = coalesce(new.day, old.day), title = coalesce(new.title, old.title) where id = v_last;
  else
    insert into public.journal_history (trip_id, entry_id, user_id, day, title, acts)
      values (v_trip, coalesce(new.id, old.id), auth.uid(), coalesce(new.day, old.day), coalesce(new.title, old.title), (select array_agg(distinct a) from unnest(v_acts) a));
  end if;
  if random() < 0.05 then delete from public.journal_history where trip_id = v_trip and updated_at < now() - interval '180 days'; end if;
  return null;
exception when others then
  return null; -- l'historique ne doit jamais empêcher d'enregistrer une page
end $$;
drop trigger if exists journal_history_log on public.journal_entries;
create trigger journal_history_log after insert or update or delete on public.journal_entries
  for each row execute function public.journal_history_log();

create or replace function public.collab_history(p_trip uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_trip_editor(p_trip) then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('at', h.updated_at, 'entry_id', h.entry_id, 'day', h.day, 'title', h.title, 'acts', h.acts,
      'me', h.user_id = auth.uid(), 'name', p.display_name, 'avatar', p.avatar_path) order by h.updated_at desc)
    from (select * from public.journal_history where trip_id = p_trip order by updated_at desc limit 150) h left join public.profiles p on p.id = h.user_id), '[]'::jsonb);
end $$;
revoke all on function public.collab_history(uuid) from public, anon;
grant execute on function public.collab_history(uuid) to authenticated;
