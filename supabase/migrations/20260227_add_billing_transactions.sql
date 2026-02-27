-- Persist live billing/subscription transactions used by handle-payment.

create table if not exists public.billing_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tier text check (tier in ('free', 'premium', 'elite')),
  billing_period text check (billing_period in ('monthly', 'yearly')),
  amount_cents integer not null default 0 check (amount_cents >= 0),
  currency text not null default 'usd',
  status text not null default 'paid'
    check (status in ('paid', 'pending', 'failed', 'refunded', 'cancelled')),
  description text not null,
  invoice_url text,
  payment_method text not null default 'card',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists billing_transactions_user_created_idx
  on public.billing_transactions (user_id, created_at desc);

create index if not exists billing_transactions_status_idx
  on public.billing_transactions (status);

alter table public.billing_transactions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policy p
    join pg_class c on p.polrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and c.relname = 'billing_transactions'
      and p.polname = 'billing_transactions_select_own'
  ) then
    execute $sql$
      create policy billing_transactions_select_own
        on public.billing_transactions
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
      and c.relname = 'billing_transactions'
      and p.polname = 'billing_transactions_service_all'
  ) then
    execute $sql$
      create policy billing_transactions_service_all
        on public.billing_transactions
        for all
        to service_role
        using (true)
        with check (true);
    $sql$;
  end if;
end
$$;
