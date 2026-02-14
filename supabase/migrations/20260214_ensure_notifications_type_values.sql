-- Ensure notifications table exists and notification types are constrained
-- to the values used by the app: comment, reply, like.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'comment',
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.post_comments(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications
  add column if not exists recipient_id uuid references auth.users(id) on delete cascade,
  add column if not exists actor_id uuid references auth.users(id) on delete cascade,
  add column if not exists type text,
  add column if not exists post_id uuid references public.posts(id) on delete cascade,
  add column if not exists comment_id uuid references public.post_comments(id) on delete cascade,
  add column if not exists read boolean not null default false,
  add column if not exists created_at timestamptz not null default now();

-- Backfill recipient_id from legacy user_id if that older column exists.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notifications'
      and column_name = 'user_id'
  ) then
    execute $sql$
      update public.notifications
      set recipient_id = coalesce(recipient_id, user_id)
      where recipient_id is null
    $sql$;
  end if;
end
$$;

-- Normalize existing values before enforcing constraint.
update public.notifications
set type = lower(type)
where type is not null;

update public.notifications
set type = 'comment'
where type is null
   or type not in ('comment', 'reply', 'like');

alter table public.notifications
  alter column type set default 'comment',
  alter column type set not null;

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('comment', 'reply', 'like'));

create index if not exists notifications_recipient_idx
  on public.notifications(recipient_id);

create index if not exists notifications_created_at_idx
  on public.notifications(created_at desc);
