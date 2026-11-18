-- Escale v2.8 : avis des utilisateurs et cache des prix de la recherche IA.
-- À exécuter une fois dans Supabase (SQL Editor), avant de mettre la version 2.8 en ligne.

-- ---------- avis et idées d'amélioration ----------
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('note', 'idee', 'bug', 'autre')),
  rating smallint check (rating between 1 and 5),
  message text check (char_length(message) <= 2000),
  screen text check (char_length(screen) <= 40),
  app_version text check (char_length(app_version) <= 20),
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
-- chacun peut envoyer un avis en son nom, personne ne peut lire ceux des autres depuis l'appli
drop policy if exists feedback_insert_own on public.feedback;
create policy feedback_insert_own on public.feedback for insert to authenticated with check (user_id = auth.uid());
drop policy if exists feedback_read_own on public.feedback;
create policy feedback_read_own on public.feedback for select to authenticated using (user_id = auth.uid());
-- limite : 20 avis par jour et par compte
create or replace function public.feedback_rate_limit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.feedback where user_id = new.user_id and created_at > now() - interval '1 day') >= 20 then
    raise exception 'Trop d''avis envoyés aujourd''hui';
  end if;
  return new;
end $$;
drop trigger if exists feedback_rate_limit on public.feedback;
create trigger feedback_rate_limit before insert on public.feedback for each row execute function public.feedback_rate_limit();

-- ---------- prix trouvés par la recherche IA, gardés 30 jours par ville ----------
-- Lue et écrite uniquement par la fonction « prix » (clé service), jamais par l'appli directement.
create table if not exists public.price_cache (
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  city_key text not null check (char_length(city_key) <= 60),
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (country_code, city_key)
);
alter table public.price_cache enable row level security;
-- aucune policy : seule la clé service (fonction serveur) y accède
