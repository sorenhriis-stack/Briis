-- Briis: Add friends' ratings feed.
-- Run in Supabase: Project -> SQL Editor -> New query -> Run.
--
-- This returns a shared view of friends' tastings:
-- friend name, wine name, rating, date, selected tasting details,
-- blind guesses and revealed wine fields.

drop function if exists public.list_friend_ratings();

create or replace function public.list_friend_ratings()
returns table (
  tasting_id uuid,
  friend_user_id uuid,
  friend_name text,
  wine_name text,
  rating integer,
  tasted_at date,
  color text,
  nose_notes text[],
  palate_notes text[],
  structure_notes text[],
  acidity text,
  tannin text,
  guess_vintage integer,
  guess_grape text,
  guess_region text,
  guess_commune text,
  guess_producer text,
  revealed_wine_name text,
  revealed_producer text,
  revealed_vintage integer,
  revealed_grape text,
  revealed_region text,
  revealed_commune text,
  guess_score integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return query
  select
    t.id,
    t.user_id,
    coalesce(p.display_name, ''),
    t.wine_name_snapshot,
    t.rating,
    t.tasted_at,
    t.color,
    t.nose_notes,
    t.palate_notes,
    t.structure_notes,
    t.acidity,
    t.tannin,
    t.guess_vintage,
    t.guess_grape,
    t.guess_region,
    t.guess_commune,
    t.guess_producer,
    t.revealed_wine_name,
    t.revealed_producer,
    t.revealed_vintage,
    t.revealed_grape,
    t.revealed_region,
    t.revealed_commune,
    t.guess_score,
    t.created_at
  from public.friendships f
  join public.tastings t on t.user_id = f.friend_user_id
  join public.profiles p on p.user_id = f.friend_user_id
  where f.user_id = auth.uid()
    and t.rating is not null
  order by t.tasted_at desc, t.created_at desc
  limit 50;
end;
$$;

revoke all on function public.list_friend_ratings() from public;
grant execute on function public.list_friend_ratings() to authenticated;
