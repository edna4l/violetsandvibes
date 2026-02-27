-- Fix post_likes RLS so social hearts work reliably.
-- This migration is idempotent and safe across policy-name drift.

alter table public.post_likes enable row level security;

-- Normalize policy set for post_likes.
drop policy if exists "likes_read_authenticated" on public.post_likes;
drop policy if exists "post_likes_select_authenticated" on public.post_likes;
create policy "post_likes_select_authenticated"
on public.post_likes
for select
to authenticated
using (true);

drop policy if exists "likes_insert_own" on public.post_likes;
drop policy if exists "post_likes_insert_own" on public.post_likes;
create policy "post_likes_insert_own"
on public.post_likes
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
);

drop policy if exists "likes_delete_own" on public.post_likes;
drop policy if exists "post_likes_delete_own" on public.post_likes;
create policy "post_likes_delete_own"
on public.post_likes
for delete
to authenticated
using (user_id = (select auth.uid()));

-- Force user_id to authenticated user so client payload drift does not break.
create or replace function public.set_post_likes_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required to like a post.'
      using errcode = '42501';
  end if;

  new.user_id := (select auth.uid());
  return new;
end;
$$;

drop trigger if exists trg_set_post_likes_user_id on public.post_likes;
create trigger trg_set_post_likes_user_id
before insert on public.post_likes
for each row
execute function public.set_post_likes_user_id();
