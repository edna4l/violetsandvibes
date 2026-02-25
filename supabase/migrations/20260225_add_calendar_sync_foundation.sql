-- Calendar sync foundation:
-- 1) user-created + provider-synced events table
-- 2) provider connection/token storage table (server-side use)
-- 3) RLS and indexes
-- 4) realtime publication for calendar events

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  source text not null default 'local' check (source in ('local', 'google', 'outlook')),
  source_event_id text,
  sync_state text not null default 'pending' check (sync_state in ('pending', 'synced', 'error')),
  sync_error text,
  provider_event_ids jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_ends_after_start check (ends_at > starts_at)
);

create table if not exists public.calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google', 'outlook')),
  provider_account_email text,
  provider_calendar_id text not null default 'primary',
  access_token text not null,
  refresh_token text,
  token_type text,
  scope text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create unique index if not exists calendar_events_source_unique_idx
  on public.calendar_events (user_id, source, source_event_id)
  where source_event_id is not null;

create index if not exists calendar_events_user_start_idx
  on public.calendar_events (user_id, starts_at);

create index if not exists calendar_events_user_source_idx
  on public.calendar_events (user_id, source);

create index if not exists calendar_connections_user_idx
  on public.calendar_connections (user_id);

create index if not exists calendar_connections_user_provider_idx
  on public.calendar_connections (user_id, provider);

create or replace function public.set_calendar_updated_at()
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

drop trigger if exists trg_set_calendar_events_updated_at on public.calendar_events;
create trigger trg_set_calendar_events_updated_at
before update on public.calendar_events
for each row
execute function public.set_calendar_updated_at();

drop trigger if exists trg_set_calendar_connections_updated_at on public.calendar_connections;
create trigger trg_set_calendar_connections_updated_at
before update on public.calendar_connections
for each row
execute function public.set_calendar_updated_at();

alter table public.calendar_events enable row level security;
alter table public.calendar_connections enable row level security;

-- calendar_events: users can manage their own events
do $$
begin
  if not exists (
    select 1
    from pg_policy p
    join pg_class c on p.polrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and c.relname = 'calendar_events'
      and p.polname = 'calendar_events_select_own'
  ) then
    execute $sql$
      create policy calendar_events_select_own
      on public.calendar_events
      for select
      to authenticated
      using ((select auth.uid()) = user_id);
    $sql$;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policy p
    join pg_class c on p.polrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and c.relname = 'calendar_events'
      and p.polname = 'calendar_events_insert_own'
  ) then
    execute $sql$
      create policy calendar_events_insert_own
      on public.calendar_events
      for insert
      to authenticated
      with check ((select auth.uid()) = user_id);
    $sql$;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policy p
    join pg_class c on p.polrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and c.relname = 'calendar_events'
      and p.polname = 'calendar_events_update_own'
  ) then
    execute $sql$
      create policy calendar_events_update_own
      on public.calendar_events
      for update
      to authenticated
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
    $sql$;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policy p
    join pg_class c on p.polrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and c.relname = 'calendar_events'
      and p.polname = 'calendar_events_delete_own'
  ) then
    execute $sql$
      create policy calendar_events_delete_own
      on public.calendar_events
      for delete
      to authenticated
      using ((select auth.uid()) = user_id);
    $sql$;
  end if;
end
$$;

-- calendar_connections: keep token storage server-only.
-- Service role can manage these rows; end users cannot query token table directly.
do $$
begin
  if not exists (
    select 1
    from pg_policy p
    join pg_class c on p.polrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and c.relname = 'calendar_connections'
      and p.polname = 'calendar_connections_service_all'
  ) then
    execute $sql$
      create policy calendar_connections_service_all
      on public.calendar_connections
      for all
      to service_role
      using (true)
      with check (true);
    $sql$;
  end if;
end
$$;

-- Realtime for calendar events (UI updates)
do $$
begin
  begin
    alter publication supabase_realtime add table public.calendar_events;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end
$$;
