-- Briis: Add friend connections by friend code.
-- Run in Supabase: Project -> SQL Editor -> New query -> Run.
--
-- This creates a private friendships table and two safe helper functions:
-- list_friends() and add_friend_by_code(input_friend_code).

create extension if not exists "pgcrypto";

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  friend_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint friendships_no_self check (user_id <> friend_user_id),
  constraint friendships_unique_pair unique (user_id, friend_user_id)
);

alter table public.friendships
add column if not exists id uuid default gen_random_uuid();

alter table public.friendships
add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();

alter table public.friendships
add column if not exists friend_user_id uuid references auth.users(id) on delete cascade;

alter table public.friendships
add column if not exists created_at timestamptz not null default now();

create unique index if not exists friendships_unique_pair
on public.friendships (user_id, friend_user_id);

alter table public.friendships
alter column user_id set default auth.uid();

alter table public.friendships enable row level security;

revoke all on public.friendships from anon;

grant select, delete on public.friendships to authenticated;

drop policy if exists "Users can read own friendships" on public.friendships;
drop policy if exists "Users can delete own friendships" on public.friendships;

create policy "Users can read own friendships"
on public.friendships
for select
to authenticated
using (
  auth.uid() is not null
  and auth.uid() = user_id
);

create policy "Users can delete own friendships"
on public.friendships
for delete
to authenticated
using (
  auth.uid() is not null
  and auth.uid() = user_id
);

create or replace function public.list_friends()
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
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return query
  select
    p.user_id,
    coalesce(p.display_name, ''),
    p.friend_code,
    f.created_at
  from public.friendships f
  join public.profiles p on p.user_id = f.friend_user_id
  where f.user_id = auth.uid()
  order by f.created_at desc;
end;
$$;

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
  on conflict (user_id, friend_user_id) do nothing;

  insert into public.friendships (user_id, friend_user_id)
  values (target_profile.user_id, current_user_id)
  on conflict (user_id, friend_user_id) do nothing;

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

revoke all on function public.list_friends() from public;
revoke all on function public.add_friend_by_code(text) from public;

grant execute on function public.list_friends() to authenticated;
grant execute on function public.add_friend_by_code(text) to authenticated;
