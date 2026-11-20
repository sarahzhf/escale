-- Eskalys v2.10.3 : corrige « permission denied for function media_ok »
-- La vérification des pages du carnet appelait des fonctions internes que ton compte
-- n'avait pas le droit d'exécuter. On donne ce droit, et la vérification s'exécute
-- désormais avec ses propres droits, pour que ça ne puisse plus se reproduire.

grant usage on schema private to authenticated;

revoke all on function private.media_ok(text, uuid[], text) from public, anon;
grant execute on function private.media_ok(text, uuid[], text) to authenticated;

revoke all on function private.valid_stickers_multi(jsonb, uuid[], text) from public, anon;
grant execute on function private.valid_stickers_multi(jsonb, uuid[], text) to authenticated;

revoke all on function private.valid_stickers(jsonb, uuid) from public, anon;
grant execute on function private.valid_stickers(jsonb, uuid) to authenticated;

revoke all on function private.valid_layout(jsonb) from public, anon;
grant execute on function private.valid_layout(jsonb) to authenticated;

-- la vérification elle-même tourne avec ses propres droits (elle ne fait que contrôler la page envoyée)
alter function private.check_journal_paths() security definer;
alter function private.check_journal_paths() set search_path to '';

-- contrôle : doit afficher 5 lignes « true »
select p.proname, has_function_privilege('authenticated', p.oid, 'execute') as ok
from pg_proc p where p.pronamespace = 'private'::regnamespace
  and p.proname in ('media_ok', 'valid_stickers_multi', 'valid_stickers', 'valid_layout', 'trip_editors')
order by 1;
