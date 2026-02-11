-- Align profiles schema with app expectations so PostgREST doesn't error on missing columns.
-- Safe to run multiple times.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists full_name text,
  add column if not exists username text,
  add column if not exists bio text,
  add column if not exists location text,
  add column if not exists occupation text,
  add column if not exists birthdate date,
  add column if not exists gender_identity text,
  add column if not exists sexual_orientation text,
  add column if not exists interests text[] not null default '{}'::text[],
  add column if not exists photos text[] not null default '{}'::text[],
  add column if not exists lifestyle_interests jsonb not null default '{}'::jsonb,
  add column if not exists privacy_settings jsonb not null default '{}'::jsonb,
  add column if not exists safety_settings jsonb not null default '{}'::jsonb,
  add column if not exists profile_completed boolean not null default false,
  add column if not exists avatar_url text,
  add column if not exists phone text,
  add column if not exists website text,
  add column if not exists preferred_contact_method text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists profiles_profile_completed_idx on public.profiles(profile_completed);
create index if not exists profiles_updated_at_idx on public.profiles(updated_at desc);
