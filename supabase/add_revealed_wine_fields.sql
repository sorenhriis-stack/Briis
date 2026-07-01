-- Briis: Add manual revealed wine fields to tastings.
-- Run in Supabase: Project -> SQL Editor -> New query -> Run.
--
-- This lets a tasting store the real wine even when it was not in the cellar,
-- for example a restaurant wine, a friend's wine, or a blind tasting.

alter table public.tastings
add column if not exists revealed_wine_name text;

alter table public.tastings
add column if not exists revealed_producer text;

alter table public.tastings
add column if not exists revealed_vintage integer;

alter table public.tastings
add column if not exists revealed_grape text;

alter table public.tastings
add column if not exists revealed_region text;

alter table public.tastings
add column if not exists revealed_commune text;

update public.tastings
set revealed_wine_name = wine_name_snapshot
where revealed_wine_name is null
  and wine_id is null
  and wine_name_snapshot is not null
  and wine_name_snapshot <> '';
