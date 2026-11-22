-- Eskalys v2.11.1 : « Demander des conseils » aux amis déjà allés dans un pays
create table if not exists public.reco_asks (
  id bigint generated always as identity primary key,
  from_id uuid not null references auth.users(id) on delete cascade,
  to_id uuid not null references auth.users(id) on delete cascade,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  city text check (city is null or char_length(city) <= 80),
  created_at timestamptz not null default now()
);
alter table public.reco_asks enable row level security;
revoke all on public.reco_asks from anon, authenticated;
grant select on public.reco_asks to authenticated;
drop policy if exists asks_read on public.reco_asks;
create policy asks_read on public.reco_asks for select to authenticated using (to_id = (select auth.uid()) or from_id = (select auth.uid()));

-- nouveau type de notification : on reconstruit la liste des types autorisés (anciens + reco_ask)
do $$ declare c record; kinds text[];
begin
  for c in select conname, pg_get_constraintdef(oid) d from pg_constraint
    where conrelid = 'public.notifications'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%kind%' loop
    if c.d ilike '%reco_ask%' then continue; end if;
    select array_agg(distinct k) into kinds from (
      select m[1] k from regexp_matches(c.d, '([a-z][a-z_]+)', 'g') m
      union select kind from public.notifications union select 'reco_ask') x
    where k not in ('kind', 'any', 'array', 'text', 'check', 'in');
    execute format('alter table public.notifications drop constraint %I', c.conname);
    execute format('alter table public.notifications add constraint %I check (kind = any (%L::text[]))', c.conname, kinds);
  end loop;
end $$;

-- envoie la demande aux amis qui ont un voyage commencé dans ce pays ; 5 demandes par jour au plus
create or replace function public.reco_ask(p_country text, p_city text default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); n int := 0; f uuid;
begin
  if me is null or p_country !~ '^[A-Z]{2}$' then raise exception 'demande invalide'; end if;
  if (select count(distinct created_at) from public.reco_asks where from_id = me and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Tu as déjà envoyé 5 demandes aujourd''hui, réessaie demain'; end if;
  for f in select distinct fr.id from public.my_friends() fr join public.trips t on t.owner_id = fr.id
    where fr.relation = 'friend' and t.country_code = p_country and t.start_date <= current_date loop
    insert into public.reco_asks (from_id, to_id, country_code, city) values (me, f, p_country, nullif(left(trim(p_city), 80), ''));
    begin insert into public.notifications (user_id, actor_id, kind) values (f, me, 'reco_ask'); exception when others then null; end;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.reco_ask(text, text) from public, anon;
grant execute on function public.reco_ask(text, text) to authenticated;
notify pgrst, 'reload schema';

select exists (select 1 from pg_proc where proname = 'reco_ask') as ok;
