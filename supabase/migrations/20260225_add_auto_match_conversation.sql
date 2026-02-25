-- Likes + matches schema alignment and automatic conversation creation.
-- Safe to run repeatedly.

-- 1) Likes between users (profile likes)
create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  liker_id uuid not null references auth.users(id) on delete cascade,
  liked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint likes_no_self_like check (liker_id <> liked_id)
);

create unique index if not exists likes_unique_pair
  on public.likes (liker_id, liked_id);

create index if not exists likes_liked_id_idx
  on public.likes (liked_id);

create index if not exists likes_liker_id_idx
  on public.likes (liker_id);

grant select, insert, delete
on table public.likes
to authenticated;

-- 2) Matches between users (canonical ordered pair)
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user1_id uuid not null references auth.users(id) on delete cascade,
  user2_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid null references public.conversations(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint matches_no_self_match check (user1_id <> user2_id),
  constraint matches_user_order check (user1_id < user2_id)
);

create unique index if not exists matches_unique_pair
  on public.matches (user1_id, user2_id);

create index if not exists matches_conversation_id_idx
  on public.matches (conversation_id);

grant select, insert, update
on table public.matches
to authenticated;

-- 3) RLS
alter table public.likes enable row level security;
alter table public.matches enable row level security;

-- likes: SELECT
do $$
begin
  if not exists (
    select 1
    from pg_policy p
    join pg_class c on p.polrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and c.relname = 'likes'
      and p.polname = 'likes_select_authenticated'
  ) then
    execute $sql$
      create policy likes_select_authenticated
        on public.likes
        for select
        to authenticated
        using (true)
    $sql$;
  end if;
end
$$;

-- likes: INSERT (own)
do $$
begin
  if not exists (
    select 1
    from pg_policy p
    join pg_class c on p.polrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and c.relname = 'likes'
      and p.polname = 'likes_insert_own'
  ) then
    execute $sql$
      create policy likes_insert_own
        on public.likes
        for insert
        to authenticated
        with check (liker_id = (select auth.uid()))
    $sql$;
  end if;
end
$$;

-- likes: DELETE (own)
do $$
begin
  if not exists (
    select 1
    from pg_policy p
    join pg_class c on p.polrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and c.relname = 'likes'
      and p.polname = 'likes_delete_own'
  ) then
    execute $sql$
      create policy likes_delete_own
        on public.likes
        for delete
        to authenticated
        using (liker_id = (select auth.uid()))
    $sql$;
  end if;
end
$$;

-- matches: SELECT (own)
do $$
begin
  if not exists (
    select 1
    from pg_policy p
    join pg_class c on p.polrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and c.relname = 'matches'
      and p.polname = 'matches_select_own'
  ) then
    execute $sql$
      create policy matches_select_own
        on public.matches
        for select
        to authenticated
        using (
          (select auth.uid()) = user1_id
          or (select auth.uid()) = user2_id
        )
    $sql$;
  end if;
end
$$;

-- matches: INSERT (member)
do $$
begin
  if not exists (
    select 1
    from pg_policy p
    join pg_class c on p.polrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and c.relname = 'matches'
      and p.polname = 'matches_insert_member'
  ) then
    execute $sql$
      create policy matches_insert_member
        on public.matches
        for insert
        to authenticated
        with check (
          (select auth.uid()) = user1_id
          or (select auth.uid()) = user2_id
        )
    $sql$;
  end if;
end
$$;

-- 4) Reciprocal likes -> auto-create match (idempotent)
create or replace function public.create_match_on_reciprocal_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user1 uuid;
  v_user2 uuid;
begin
  if new.liker_id = new.liked_id then
    return new;
  end if;

  if exists (
    select 1
    from public.likes l
    where l.liker_id = new.liked_id
      and l.liked_id = new.liker_id
  ) then
    v_user1 := least(new.liker_id, new.liked_id);
    v_user2 := greatest(new.liker_id, new.liked_id);

    insert into public.matches (user1_id, user2_id)
    values (v_user1, v_user2)
    on conflict (user1_id, user2_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_create_match_on_reciprocal_like on public.likes;
create trigger trg_create_match_on_reciprocal_like
after insert on public.likes
for each row
execute function public.create_match_on_reciprocal_like();

-- 5) Auto-create conversation + both members for each new match
create or replace function public.ensure_match_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation_id uuid;
begin
  if new.conversation_id is not null then
    return new;
  end if;

  insert into public.conversations (created_by)
  values (coalesce(new.user1_id, new.user2_id))
  returning id into v_conversation_id;

  insert into public.conversation_members (conversation_id, user_id)
  values (v_conversation_id, new.user1_id)
  on conflict do nothing;

  insert into public.conversation_members (conversation_id, user_id)
  values (v_conversation_id, new.user2_id)
  on conflict do nothing;

  update public.matches
  set conversation_id = v_conversation_id
  where id = new.id
    and conversation_id is null;

  return new;
end;
$$;

drop trigger if exists trg_ensure_match_conversation on public.matches;
create trigger trg_ensure_match_conversation
after insert on public.matches
for each row
execute function public.ensure_match_conversation();

-- 6) Backfill old matches missing conversation_id
do $$
declare
  r record;
  v_conversation_id uuid;
begin
  for r in
    select id, user1_id, user2_id
    from public.matches
    where conversation_id is null
  loop
    insert into public.conversations (created_by)
    values (coalesce(r.user1_id, r.user2_id))
    returning id into v_conversation_id;

    insert into public.conversation_members (conversation_id, user_id)
    values (v_conversation_id, r.user1_id)
    on conflict do nothing;

    insert into public.conversation_members (conversation_id, user_id)
    values (v_conversation_id, r.user2_id)
    on conflict do nothing;

    update public.matches
    set conversation_id = v_conversation_id
    where id = r.id
      and conversation_id is null;
  end loop;
end
$$;
