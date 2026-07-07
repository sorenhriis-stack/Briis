-- Briis: Add shared wine suggestions from connected friends.
-- Run in Supabase: Project -> SQL Editor -> New query -> Run.
--
-- This shares only wine identity data from connected friends:
-- name, producer, vintage, grape, region and commune.
-- It does not share bottle counts, cellar quantities, ratings or notes.

drop function if exists public.list_friend_wine_suggestions();

create or replace function public.list_friend_wine_suggestions()
returns table (
  suggestion_id text,
  source text,
  friend_user_id uuid,
  friend_name text,
  name text,
  producer text,
  vintage integer,
  grape text,
  region text,
  commune text,
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
    suggestion_rows.suggestion_id,
    suggestion_rows.source,
    suggestion_rows.friend_user_id,
    suggestion_rows.friend_name,
    suggestion_rows.name,
    suggestion_rows.producer,
    suggestion_rows.vintage,
    suggestion_rows.grape,
    suggestion_rows.region,
    suggestion_rows.commune,
    suggestion_rows.created_at
  from (
    select
      ('friend-cellar-' || w.id::text)::text as suggestion_id,
      'friend_cellar'::text as source,
      w.user_id as friend_user_id,
      coalesce(p.display_name, '') as friend_name,
      w.name,
      w.producer,
      w.vintage,
      w.grape,
      w.region,
      w.commune,
      w.created_at
    from public.friendships f
    join public.wines w on w.user_id = f.friend_user_id
    join public.profiles p on p.user_id = f.friend_user_id
    where f.user_id = auth.uid()

    union all

    select
      ('friend-revealed-' || t.id::text)::text as suggestion_id,
      'friend_revealed'::text as source,
      t.user_id as friend_user_id,
      coalesce(p.display_name, '') as friend_name,
      coalesce(nullif(t.revealed_wine_name, ''), t.wine_name_snapshot) as name,
      t.revealed_producer as producer,
      t.revealed_vintage as vintage,
      t.revealed_grape as grape,
      t.revealed_region as region,
      t.revealed_commune as commune,
      t.created_at
    from public.friendships f
    join public.tastings t on t.user_id = f.friend_user_id
    join public.profiles p on p.user_id = f.friend_user_id
    where f.user_id = auth.uid()
  ) suggestion_rows
  where suggestion_rows.name is not null
    and trim(suggestion_rows.name) <> ''
  order by suggestion_rows.created_at desc
  limit 200;
end;
$$;

revoke all on function public.list_friend_wine_suggestions() from public;
grant execute on function public.list_friend_wine_suggestions() to authenticated;
