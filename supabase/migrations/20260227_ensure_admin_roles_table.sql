-- Ensure admin_roles exists for admin bypass checks and admin-only features.

create table if not exists public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin',
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_admin_roles_updated_at()
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

drop trigger if exists trg_set_admin_roles_updated_at on public.admin_roles;
create trigger trg_set_admin_roles_updated_at
before update on public.admin_roles
for each row
execute function public.set_admin_roles_updated_at();

alter table public.admin_roles enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policy p
    join pg_class c on p.polrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and c.relname = 'admin_roles'
      and p.polname = 'admin_roles_select_own'
  ) then
    execute $sql$
      create policy admin_roles_select_own
        on public.admin_roles
        for select
        to authenticated
        using (user_id = (select auth.uid()));
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
      and c.relname = 'admin_roles'
      and p.polname = 'admin_roles_service_all'
  ) then
    execute $sql$
      create policy admin_roles_service_all
        on public.admin_roles
        for all
        to service_role
        using (true)
        with check (true);
    $sql$;
  end if;
end
$$;
