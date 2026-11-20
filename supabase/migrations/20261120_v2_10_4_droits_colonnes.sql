-- Eskalys v2.10.4 : corrige « permission denied for table trips »
-- La base autorise les modifications colonne par colonne. La colonne de l'itinéraire
-- (ajoutée en v2.9) n'avait jamais été autorisée : dès qu'un voyage a un itinéraire,
-- toute modification de ce voyage était refusée (couleur du carnet, budget, etc.).
-- Ce script autorise toutes les colonnes que l'appli modifie, et seulement celles-là.
-- On peut le relancer sans risque.

do $$
declare
  want jsonb := '{
    "trips": ["country_code","city","start_date","end_date","budget","category_budgets","places","is_favorite","album_visibility","cover_path","members","settlements","book_color","checklist","tickets","itinerary"],
    "expenses": ["day","label","category","amount_local","currency","amount_eur","paid_by","split","sub","end_day","merchant"],
    "journal_entries": ["day","title","note","photo_paths","description","stickers","layout"],
    "wishes": ["note"]
  }';
  t text; c text;
begin
  for t in select jsonb_object_keys(want) loop
    for c in select jsonb_array_elements_text(want -> t) loop
      if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = t and column_name = c) then
        execute format('grant update (%I) on public.%I to authenticated', c, t);
      end if;
    end loop;
  end loop;
end $$;

notify pgrst, 'reload schema';

-- contrôle : doit afficher « aucune colonne bloquée »
select coalesce(string_agg(x.t || '.' || x.c, ', '), 'aucune colonne bloquée') as resultat
from (values
  ('trips','country_code'),('trips','city'),('trips','start_date'),('trips','end_date'),('trips','budget'),('trips','category_budgets'),
  ('trips','places'),('trips','is_favorite'),('trips','album_visibility'),('trips','cover_path'),('trips','members'),('trips','settlements'),
  ('trips','book_color'),('trips','checklist'),('trips','tickets'),('trips','itinerary'),
  ('expenses','day'),('expenses','label'),('expenses','category'),('expenses','amount_local'),('expenses','currency'),('expenses','amount_eur'),
  ('expenses','paid_by'),('expenses','split'),('expenses','sub'),('expenses','end_day'),('expenses','merchant'),
  ('journal_entries','day'),('journal_entries','title'),('journal_entries','note'),('journal_entries','photo_paths'),
  ('journal_entries','description'),('journal_entries','stickers'),('journal_entries','layout'),('wishes','note')
) as x(t, c)
where case when exists (select 1 from information_schema.columns i where i.table_schema = 'public' and i.table_name = x.t and i.column_name = x.c)
  then not has_column_privilege('authenticated', format('public.%I', x.t), x.c, 'UPDATE') else false end;
