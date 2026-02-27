-- Manual verification review queue support.
-- Adds review audit records and admin-safe RLS policies.

create table if not exists public.verification_reviews (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references auth.users(id) on delete cascade,
  reviewer_id uuid references auth.users(id) on delete set null,
  target text not null check (target in ('photo', 'id', 'both')),
  decision text not null check (decision in ('approve', 'reject')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists verification_reviews_target_user_created_idx
  on public.verification_reviews (target_user_id, created_at desc);

create index if not exists verification_reviews_reviewer_created_idx
  on public.verification_reviews (reviewer_id, created_at desc);

alter table public.verification_reviews enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policy p
    join pg_class c on p.polrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and c.relname = 'verification_reviews'
      and p.polname = 'verification_reviews_service_all'
  ) then
    execute $sql$
      create policy verification_reviews_service_all
        on public.verification_reviews
        for all
        to service_role
        using (true)
        with check (true);
    $sql$;
  end if;
end
$$;

-- Optional admin direct access (only if admin_roles table exists).
do $$
begin
  if to_regclass('public.admin_roles') is null then
    return;
  end if;

  if not exists (
    select 1
    from pg_policy p
    join pg_class c on p.polrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and c.relname = 'verification_reviews'
      and p.polname = 'verification_reviews_select_admin'
  ) then
    execute $sql$
      create policy verification_reviews_select_admin
        on public.verification_reviews
        for select
        to authenticated
        using (
          exists (
            select 1
            from public.admin_roles ar
            where ar.user_id = (select auth.uid())
          )
        );
    $sql$;
  end if;

  if not exists (
    select 1
    from pg_policy p
    join pg_class c on p.polrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and c.relname = 'verification_reviews'
      and p.polname = 'verification_reviews_insert_admin'
  ) then
    execute $sql$
      create policy verification_reviews_insert_admin
        on public.verification_reviews
        for insert
        to authenticated
        with check (
          exists (
            select 1
            from public.admin_roles ar
            where ar.user_id = (select auth.uid())
          )
        );
    $sql$;
  end if;
end
$$;
