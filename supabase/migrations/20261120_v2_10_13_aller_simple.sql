-- Eskalys v2.10.13 : voyage en aller simple, avec ou sans date de fin.
-- one_way  : le voyage est un aller simple.
-- open_end : pas encore de date de fin ; l'appli fait durer le voyage jusqu'à aujourd'hui (un an au plus)
--            et met end_date à jour à chaque ouverture.
-- Sans risque : deux colonnes ajoutées avec une valeur par défaut, rien d'autre ne change.
alter table public.trips add column if not exists one_way boolean not null default false;
alter table public.trips add column if not exists open_end boolean not null default false;
