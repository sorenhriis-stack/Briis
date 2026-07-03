-- Briis: Add friends' ratings feed.
-- Run in Supabase: Project -> SQL Editor -> New query -> Run.
--
-- This returns only a small shared view of friends' tastings:
-- friend name, wine name, rating and date.

create or replace function public.list_friend_ratings()
returns table (
  tasting_id uuid,
  friend_user_id uuid,
  friend_name text,
  wine_name text,
  rating integer,
  tasted_at date,
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
