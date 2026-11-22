-- Eskalys v2.11.2 : enregistrer une adresse, dire merci, prévenir les amis qui préparent un voyage
create table if not exists public.reco_saves (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reco_id uuid not null references public.recommendations(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (user_id, reco_id));
create table if not exists public.reco_thanks (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reco_id uuid not null references public.recommendations(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (user_id, reco_id));
alter table public.reco_saves enable row level security; alter table public.reco_thanks enable row level security;
revoke all on public.reco_saves, public.reco_thanks from anon, authenticated;
grant select, insert, delete on public.reco_saves, public.reco_thanks to authenticated;
drop policy if exists saves_own on public.reco_saves;
create policy saves_own on public.reco_saves for all to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.recommendations r where r.id = reco_id));
drop policy if exists thanks_read on public.reco_thanks;
create policy thanks_read on public.reco_thanks for select to authenticated using (exists (select 1 from public.recommendations r where r.id = reco_id));
drop policy if exists thanks_write on public.reco_thanks;
create policy thanks_write on public.reco_thanks for insert to authenticated with check (user_id = (select auth.uid())
  and exists (select 1 from public.recommendations r where r.id = reco_id and r.owner_id <> (select auth.uid())));
drop policy if exists thanks_delete on public.reco_thanks;
create policy thanks_delete on public.reco_thanks for delete to authenticated using (user_id = (select auth.uid()));

-- nouveaux types de notification
do $$ declare c record; kinds text[];
begin
  for c in select conname, pg_get_constraintdef(oid) d from pg_constraint
    where conrelid = 'public.notifications'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%kind%' loop
    if c.d ilike '%reco_thanks%' then continue; end if;
    select array_agg(distinct k) into kinds from (
      select m[1] k from regexp_matches(c.d, '([a-z][a-z_]+)', 'g') m
      union select kind from public.notifications union select unnest(array['reco_ask', 'reco_new', 'reco_thanks'])) x
    where k not in ('kind', 'any', 'array', 'text', 'check', 'in');
    execute format('alter table public.notifications drop constraint %I', c.conname);
    execute format('alter table public.notifications add constraint %I check (kind = any (%L::text[]))', c.conname, kinds);
  end loop;
end $$;

-- merci : on prévient l'auteur de l'adresse
create or replace function private.reco_thanks_notify() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  begin insert into public.notifications (user_id, actor_id, kind)
    select r.owner_id, new.user_id, 'reco_thanks' from public.recommendations r where r.id = new.reco_id;
  exception when others then null; end;
  return new;
end $$;
drop trigger if exists t_reco_thanks on public.reco_thanks;
create trigger t_reco_thanks after insert on public.reco_thanks for each row execute function private.reco_thanks_notify();

-- nouvelle adresse (amis ou public) : on prévient les amis qui ont un voyage à venir dans ce pays (une fois par jour au plus)
create or replace function private.reco_new_notify() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.visibility = 'private' then return new; end if;
  begin
    insert into public.notifications (user_id, actor_id, kind)
    select distinct fr.id, new.owner_id, 'reco_new' from public.my_friends() fr join public.trips t on t.owner_id = fr.id
    where fr.relation = 'friend' and t.country_code = new.country_code and coalesce(t.end_date, t.start_date) >= current_date
      and not exists (select 1 from public.notifications n where n.user_id = fr.id and n.actor_id = new.owner_id and n.kind = 'reco_new' and n.created_at > now() - interval '1 day');
  exception when others then null; end;
  return new;
end $$;
drop trigger if exists t_reco_new on public.recommendations;
create trigger t_reco_new after insert on public.recommendations for each row execute function private.reco_new_notify();
notify pgrst, 'reload schema';

select exists (select 1 from pg_trigger where tgname = 't_reco_new') as ok;
