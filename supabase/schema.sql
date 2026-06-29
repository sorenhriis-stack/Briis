-- Briis database schema for Supabase
-- Run this later in Supabase: Project -> SQL Editor -> New query -> Run.

create table if not exists public.wines (
  id uuid primary key default gen_random_uuid(),
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
  guess_score integer check (
    guess_score is null
    or guess_score between 0 and 100
  ),
  created_at timestamptz not null default now()
);

alter table public.wines enable row level security;
alter table public.tastings enable row level security;

-- Temporary beginner-friendly policies.
-- Later, when login is added, add a user_id/owner_id column to each table,
-- connect it to auth.users, and change these policies so each user only sees
-- and changes their own wines and tastings.
create policy "Allow all reads for wines"
on public.wines
for select
to anon
using (true);

create policy "Allow all writes for wines"
on public.wines
for insert
to anon
with check (true);

create policy "Allow all updates for wines"
on public.wines
for update
to anon
using (true)
with check (true);

create policy "Allow all deletes for wines"
on public.wines
for delete
to anon
using (true);

create policy "Allow all reads for tastings"
on public.tastings
for select
to anon
using (true);

create policy "Allow all writes for tastings"
on public.tastings
for insert
to anon
with check (true);

create policy "Allow all updates for tastings"
on public.tastings
for update
to anon
using (true)
with check (true);

create policy "Allow all deletes for tastings"
on public.tastings
for delete
to anon
using (true);
