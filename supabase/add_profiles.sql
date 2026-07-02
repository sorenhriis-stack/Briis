-- Briis: Add private user profiles and friend codes.
-- Run in Supabase: Project -> SQL Editor -> New query -> Run.
--
-- This creates one private profile per logged-in user.
-- The friend_code is the foundation for adding friends later.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  display_name text,
  friend_code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

alter table public.profiles
alter column user_id set default auth.uid();

alter table public.profiles enable row level security;

revoke all on public.profiles from anon;

grant select, insert, update on public.profiles to authenticated;

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

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
