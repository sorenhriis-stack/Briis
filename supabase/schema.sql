-- Briis Supabase schema
-- Run in Supabase: Project -> SQL Editor -> New query -> Run.
--
-- Goal:
-- Each logged-in user gets private wines and tastings.
-- This uses one shared database, but every row has user_id.
-- Row Level Security makes sure users only see and change their own rows.

create extension if not exists "pgcrypto";

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

alter table public.tastings
alter column user_id set default auth.uid();

alter table public.wines enable row level security;
alter table public.tastings enable row level security;

revoke all on public.wines from anon;
revoke all on public.tastings from anon;

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
drop policy if exists "Users can read own wines" on public.wines;
drop policy if exists "Users can insert own wines" on public.wines;
drop policy if exists "Users can update own wines" on public.wines;
drop policy if exists "Users can delete own wines" on public.wines;

drop policy if exists "Users can read own tastings" on public.tastings;
drop policy if exists "Users can insert own tastings" on public.tastings;
drop policy if exists "Users can update own tastings" on public.tastings;
drop policy if exists "Users can delete own tastings" on public.tastings;

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
