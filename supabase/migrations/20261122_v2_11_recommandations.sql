-- Eskalys v2.11 : recommandations (bonnes adresses partagées entre vraies personnes)
-- Visibilité comme les publications : private (toi), friends (tes amis), public (tout le monde).
create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  city text check (city is null or char_length(city) <= 80),
  name text not null check (char_length(name) between 1 and 80),
  category text not null default 'resto' check (category in ('resto', 'activite', 'endroit', 'hotel', 'autre')),
  note text check (note is null or char_length(note) <= 500),
  link text check (link is null or (char_length(link) <= 300 and link ~ '^https://')),
  visibility text not null default 'friends' check (visibility in ('private', 'friends', 'public')),
  created_at timestamptz not null default now()
);
create index if not exists recommendations_country on public.recommendations (country_code, created_at desc);
alter table public.recommendations enable row level security;
revoke all on public.recommendations from anon, authenticated;
grant select, insert, delete on public.recommendations to authenticated;
grant update (country_code, city, name, category, note, link, visibility) on public.recommendations to authenticated;

drop policy if exists reco_read on public.recommendations;
create policy reco_read on public.recommendations for select to authenticated using (
  owner_id = (select auth.uid())
  or (not public.is_blocked(owner_id, (select auth.uid())) and (
    visibility = 'public'
    or (visibility = 'friends' and owner_id in (select f.id from public.my_friends() f where f.relation = 'friend')))));
drop policy if exists reco_write on public.recommendations;
create policy reco_write on public.recommendations for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists reco_update on public.recommendations;
create policy reco_update on public.recommendations for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists reco_delete on public.recommendations;
create policy reco_delete on public.recommendations for delete to authenticated using (owner_id = (select auth.uid()));
notify pgrst, 'reload schema';

-- contrôle : doit afficher « true »
select exists (select 1 from information_schema.tables where table_name = 'recommendations') as ok;
