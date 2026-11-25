-- Eskalys v2.15 : infos d'entrée (visa) et situation du pays, gardées quelques jours par pays et par passeport.
-- Remplies seulement par la fonction « infos-pays » (clé service), lisibles par les comptes connectés.
create table if not exists public.pays_infos (
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  passport text not null check (passport ~ '^[A-Z]{2}$'),
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (country_code, passport)
);
alter table public.pays_infos enable row level security;
drop policy if exists "pays_infos lisibles" on public.pays_infos;
create policy "pays_infos lisibles" on public.pays_infos for select to authenticated using (true);
grant select on public.pays_infos to authenticated;
