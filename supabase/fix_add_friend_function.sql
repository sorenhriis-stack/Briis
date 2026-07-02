-- Briis: Fix add_friend_by_code ambiguity.
-- Run in Supabase: Project -> SQL Editor -> New query -> Run.
--
-- This replaces only the function that adds friends by code.

create or replace function public.add_friend_by_code(input_friend_code text)
returns table (
  friend_user_id uuid,
  display_name text,
  friend_code text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_profile public.profiles%rowtype;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into target_profile
  from public.profiles p
  where upper(p.friend_code) = upper(trim(input_friend_code))
  limit 1;

  if target_profile.user_id is null then
    raise exception 'Friend code not found';
  end if;

  if target_profile.user_id = current_user_id then
    raise exception 'You cannot add yourself as a friend';
  end if;

  insert into public.friendships (user_id, friend_user_id)
  values (current_user_id, target_profile.user_id)
  on conflict do nothing;

  insert into public.friendships (user_id, friend_user_id)
  values (target_profile.user_id, current_user_id)
  on conflict do nothing;

  return query
  select
    p.user_id,
    coalesce(p.display_name, ''),
    p.friend_code,
    f.created_at
  from public.friendships f
  join public.profiles p on p.user_id = f.friend_user_id
  where f.user_id = current_user_id
    and f.friend_user_id = target_profile.user_id;
end;
$$;

revoke all on function public.add_friend_by_code(text) from public;
grant execute on function public.add_friend_by_code(text) to authenticated;
