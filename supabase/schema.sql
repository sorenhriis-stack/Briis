-- Briis Supabase schema
-- Run in Supabase: Project -> SQL Editor -> New query -> Run.
--
-- Goal:
-- Each logged-in user gets private wines and tastings.
-- This uses one shared database, but every row has user_id.
-- Row Level Security makes sure users only see and change their own rows.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  display_name text,
  friend_code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  friend_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint friendships_no_self check (user_id <> friend_user_id),
  constraint friendships_unique_pair unique (user_id, friend_user_id)
);

create table if not exists public.wines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  producer text,
  vintage integer,
  grape text,
  region text,
  commune text,
  country text,
  bottle_count numeric not null default 0,
  external_rating_source text,
  external_rating_score integer check (
    external_rating_score is null
    or external_rating_score between 1 and 100
  ),
  created_at timestamptz not null default now()
);

create table if not exists public.tastings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  wine_id uuid references public.wines(id) on delete set null,
  wine_name_snapshot text not null,
  tasted_at date not null default current_date,
  source text not null check (source in ('own_bottle', 'coravin', 'other')),
  rating integer check (
    rating is null
    or rating between 1 and 100
  ),
  color text,
  nose_notes text[] not null default '{}',
  palate_notes text[] not null default '{}',
  structure_notes text[] not null default '{}',
  acidity text,
  tannin text,
  custom_note text,
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
  guess_score integer check (
    guess_score is null
    or guess_score between 0 and 100
  ),
  created_at timestamptz not null default now()
);

-- If an older beginner version of the tables already exists, add user_id safely.
alter table public.profiles
add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();

alter table public.profiles
add column if not exists display_name text;

alter table public.profiles
add column if not exists friend_code text;

alter table public.profiles
add column if not exists created_at timestamptz not null default now();

alter table public.profiles
add column if not exists updated_at timestamptz not null default now();

create unique index if not exists profiles_friend_code_unique
on public.profiles (friend_code);

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

alter table public.wines
add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();

alter table public.tastings
add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();

-- Add detailed revealed wine fields for tastings made outside the cellar.
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

alter table public.wines
alter column user_id set default auth.uid();

alter table public.profiles
alter column user_id set default auth.uid();

alter table public.friendships
alter column user_id set default auth.uid();

alter table public.tastings
alter column user_id set default auth.uid();

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.wines enable row level security;
alter table public.tastings enable row level security;

revoke all on public.profiles from anon;
revoke all on public.friendships from anon;
revoke all on public.wines from anon;
revoke all on public.tastings from anon;

grant select, insert, update on public.profiles to authenticated;
grant select, delete on public.friendships to authenticated;
grant select, insert, update, delete on public.wines to authenticated;
grant select, insert, update, delete on public.tastings to authenticated;

-- Remove old open policies if this script is run after the beginner version.
drop policy if exists "Allow all reads for wines" on public.wines;
drop policy if exists "Allow all writes for wines" on public.wines;
drop policy if exists "Allow all updates for wines" on public.wines;
drop policy if exists "Allow all deletes for wines" on public.wines;

drop policy if exists "Allow all reads for tastings" on public.tastings;
drop policy if exists "Allow all writes for tastings" on public.tastings;
drop policy if exists "Allow all updates for tastings" on public.tastings;
drop policy if exists "Allow all deletes for tastings" on public.tastings;

-- Remove current private policies before recreating them.
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

drop policy if exists "Users can read own friendships" on public.friendships;
drop policy if exists "Users can delete own friendships" on public.friendships;

drop policy if exists "Users can read own wines" on public.wines;
drop policy if exists "Users can insert own wines" on public.wines;
drop policy if exists "Users can update own wines" on public.wines;
drop policy if exists "Users can delete own wines" on public.wines;

drop policy if exists "Users can read own tastings" on public.tastings;
drop policy if exists "Users can insert own tastings" on public.tastings;
drop policy if exists "Users can update own tastings" on public.tastings;
drop policy if exists "Users can delete own tastings" on public.tastings;

create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (
  auth.uid() is not null
  and auth.uid() = user_id
);

create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (
  auth.uid() is not null
  and auth.uid() = user_id
);

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (
  auth.uid() is not null
  and auth.uid() = user_id
)
with check (
  auth.uid() is not null
  and auth.uid() = user_id
);

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

create policy "Users can read own wines"
on public.wines
for select
to authenticated
using (
  auth.uid() is not null
  and auth.uid() = user_id
);

create policy "Users can insert own wines"
on public.wines
for insert
to authenticated
with check (
  auth.uid() is not null
  and auth.uid() = user_id
);

create policy "Users can update own wines"
on public.wines
for update
to authenticated
using (
  auth.uid() is not null
  and auth.uid() = user_id
)
with check (
  auth.uid() is not null
  and auth.uid() = user_id
);

create policy "Users can delete own wines"
on public.wines
for delete
to authenticated
using (
  auth.uid() is not null
  and auth.uid() = user_id
);

create policy "Users can read own tastings"
on public.tastings
for select
to authenticated
using (
  auth.uid() is not null
  and auth.uid() = user_id
);

create policy "Users can insert own tastings"
on public.tastings
for insert
to authenticated
with check (
  auth.uid() is not null
  and auth.uid() = user_id
);

create policy "Users can update own tastings"
on public.tastings
for update
to authenticated
using (
  auth.uid() is not null
  and auth.uid() = user_id
)
with check (
  auth.uid() is not null
  and auth.uid() = user_id
);

create policy "Users can delete own tastings"
on public.tastings
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

revoke all on function public.list_friends() from public;
revoke all on function public.add_friend_by_code(text) from public;
revoke all on function public.list_friend_ratings() from public;

grant execute on function public.list_friends() to authenticated;
grant execute on function public.add_friend_by_code(text) to authenticated;
grant execute on function public.list_friend_ratings() to authenticated;
