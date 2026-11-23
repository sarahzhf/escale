-- Eskalys v2.13 : inviter un ami, un mois de PRO offert à chacun
alter table public.account_settings add column if not exists pro_until timestamptz;   -- jamais modifiable par l'utilisateur (pas de grant update)
create table if not exists public.referrals (
  invitee_id uuid primary key references auth.users(id) on delete cascade,
  referrer_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.referrals enable row level security;
revoke all on public.referrals from anon, authenticated;
grant select on public.referrals to authenticated;
drop policy if exists ref_read on public.referrals;
create policy ref_read on public.referrals for select to authenticated using (referrer_id = (select auth.uid()) or invitee_id = (select auth.uid()));

do $$ declare c record; kinds text[];
begin
  for c in select conname, pg_get_constraintdef(oid) d from pg_constraint
    where conrelid = 'public.notifications'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%kind%' loop
    if c.d ilike '%referral%' then continue; end if;
    select array_agg(distinct k) into kinds from (
      select m[1] k from regexp_matches(c.d, '([a-z][a-z_]+)', 'g') m union select kind from public.notifications union select 'referral') x
    where k not in ('kind', 'any', 'array', 'text', 'check', 'in');
    execute format('alter table public.notifications drop constraint %I', c.conname);
    execute format('alter table public.notifications add constraint %I check (kind = any (%L::text[]))', c.conname, kinds);
  end loop;
end $$;

-- le nouveau compte (créé il y a moins de 7 jours) donne l'identifiant de la personne qui l'a invité
create or replace function public.referral_claim(p_handle text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); ref uuid; born timestamptz;
begin
  if me is null then return false; end if;
  select u.created_at into born from auth.users u where u.id = me;
  if born is null or born < now() - interval '7 days' then return false; end if;
  if exists (select 1 from public.referrals where invitee_id = me) then return false; end if;
  select p.id into ref from public.profiles p where lower(p.handle) = lower(trim(leading '@' from p_handle));
  if ref is null or ref = me then return false; end if;
  insert into public.referrals (invitee_id, referrer_id) values (me, ref);
  update public.account_settings set pro_until = greatest(coalesce(pro_until, now()), now()) + interval '30 days' where user_id in (me, ref);
  begin insert into public.notifications (user_id, actor_id, kind) values (ref, me, 'referral'); exception when others then null; end;
  return true;
end $$;
revoke all on function public.referral_claim(text) from public, anon;
grant execute on function public.referral_claim(text) to authenticated;
notify pgrst, 'reload schema';
select exists (select 1 from pg_proc where proname = 'referral_claim') as ok;
