-- Public reviews + complaints board for the Heroes/Landing page.
-- Anonymous and authenticated visitors can post; everyone can read visible entries.

create table if not exists public.public_reviews (
  id uuid primary key default gen_random_uuid(),
  author_name text,
  message text not null,
  kind text not null default 'review',
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  constraint public_reviews_kind_check check (kind in ('review', 'complaint'))
);

create index if not exists public_reviews_visible_created_idx
  on public.public_reviews (is_visible, created_at desc);

alter table public.public_reviews enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policy p
    join pg_class c on p.polrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and c.relname = 'public_reviews'
      and p.polname = 'public_reviews_select_visible'
  ) then
    execute $sql$
      create policy public_reviews_select_visible
        on public.public_reviews
        for select
        to anon, authenticated
        using (is_visible = true);
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
      and c.relname = 'public_reviews'
      and p.polname = 'public_reviews_insert_public'
  ) then
    execute $sql$
      create policy public_reviews_insert_public
        on public.public_reviews
        for insert
        to anon, authenticated
        with check (
          is_visible = true
          and char_length(trim(message)) between 4 and 1500
          and (
            author_name is null
            or char_length(trim(author_name)) between 1 and 80
          )
        );
    $sql$;
  end if;
end
$$;
