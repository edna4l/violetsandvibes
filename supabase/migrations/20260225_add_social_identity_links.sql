-- Store external social identity mappings for custom OAuth providers.
-- This supports linking provider user ids (e.g. TikTok open_id) to auth.users ids.

create table if not exists public.social_identity_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_user_id text not null,
  provider_username text,
  provider_email text,
  raw_profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_user_id),
  unique (provider, user_id)
);

create index if not exists social_identity_links_user_idx
  on public.social_identity_links (user_id);

create index if not exists social_identity_links_provider_idx
  on public.social_identity_links (provider, provider_user_id);

create or replace function public.set_social_identity_links_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_set_social_identity_links_updated_at on public.social_identity_links;
create trigger trg_set_social_identity_links_updated_at
before update on public.social_identity_links
for each row
execute function public.set_social_identity_links_updated_at();

alter table public.social_identity_links enable row level security;

-- Keep mapping rows server-only (Edge Functions with service_role key).
do $$
begin
  if not exists (
    select 1
    from pg_policy p
    join pg_class c on p.polrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and c.relname = 'social_identity_links'
      and p.polname = 'social_identity_links_service_all'
  ) then
    execute $sql$
      create policy social_identity_links_service_all
      on public.social_identity_links
      for all
      to service_role
      using (true)
      with check (true);
    $sql$;
  end if;
end
$$;
