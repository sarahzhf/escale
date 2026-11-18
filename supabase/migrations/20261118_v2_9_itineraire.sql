-- Escale v2.9 : itinéraires en carte.
-- À exécuter une fois dans Supabase (SQL Editor) AVANT de mettre la version 2.9 en ligne,
-- sinon l'enregistrement des voyages qui ont un itinéraire échoue.

-- Chaque voyage garde son itinéraire : une liste de lieux visités, dans l'ordre.
-- Un lieu : { id, n (nom), sub (ville ou adresse), ll: [longitude, latitude], j (jour), ph (photo du carnet ou null), at }
alter table public.trips add column if not exists itinerary jsonb not null default '[]'::jsonb;
alter table public.trips drop constraint if exists trips_itinerary_check;
alter table public.trips add constraint trips_itinerary_check
  check (jsonb_typeof(itinerary) = 'array' and jsonb_array_length(itinerary) <= 200 and pg_column_size(itinerary) < 200000);

-- Itinéraire d'un voyage d'un ami. Mêmes règles que l'album : si get_album ne renvoie rien
-- (album privé, pas ami, membre bloqué...), get_itinerary ne renvoie rien non plus.
create or replace function public.get_itinerary(p_trip uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if auth.uid() is null then return null; end if;
  if (select public.get_album(p_trip)) is null then return null; end if;
  select coalesce(t.itinerary, '[]'::jsonb) into r from public.trips t where t.id = p_trip;
  return r;
end $$;
revoke all on function public.get_itinerary(uuid) from public, anon;
grant execute on function public.get_itinerary(uuid) to authenticated;
