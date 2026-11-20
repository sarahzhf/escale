-- Eskalys v2.10.2 : corrige « permission denied for table trip_collaborators ».
-- À exécuter une fois dans Supabase (SQL Editor). Aucune republication n'est nécessaire pour ce correctif.
--
-- La vérification des pages (private.check_journal_paths) lisait la table des invités au carnet
-- avec les droits de la personne connectée, qui n'en a pas le droit : chaque enregistrement de page échouait.
-- Elle passe maintenant par une petite fonction qui lit seulement la liste des invités d'un voyage.

-- 1. lecture de la table par l'appli (les règles RLS de la table restent appliquées)
grant select on public.trip_collaborators to authenticated;

-- 2. liste des amis invités à un voyage, pour la vérification des pages
create or replace function private.trip_editors(p_trip uuid)
returns uuid[] language sql stable security definer set search_path to '' as $$
  select coalesce(array_agg(c.user_id), '{}'::uuid[]) from public.trip_collaborators c where c.trip_id = p_trip;
$$;
revoke all on function private.trip_editors(uuid) from public, anon;
grant execute on function private.trip_editors(uuid) to authenticated;

-- 3. la vérification avant enregistrement d'une page, identique à la v2.10.1 sauf la lecture des invités
create or replace function private.check_journal_paths()
returns trigger language plpgsql set search_path to '' as $$
declare v_ok uuid[]; v_keep text := '';
begin
  v_ok := array[new.owner_id] || private.trip_editors(new.trip_id);
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
