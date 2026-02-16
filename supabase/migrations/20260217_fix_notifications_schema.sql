-- Align notifications schema with current app + trigger behavior.
-- Fixes: type check mismatch and read_at support.

-- Ensure read_at exists for current frontend logic.
alter table public.notifications
  add column if not exists read_at timestamptz;

-- Backfill read_at from legacy boolean read flag when present.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notifications'
      and column_name = 'read'
  ) then
    execute $sql$
      update public.notifications
      set read_at = coalesce(read_at, now())
      where read = true
    $sql$;
  end if;
end
$$;

-- Normalize old values to new trigger/app values.
update public.notifications
set type = case lower(type)
  when 'like' then 'post_like'
  when 'comment' then 'post_comment'
  when 'reply' then 'comment_reply'
  else lower(type)
end
where type is not null;

-- Keep type required.
alter table public.notifications
  alter column type set not null;

-- Replace old constraint with one that matches trigger/app values.
alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (
    type in (
      'post_like',
      'post_comment',
      'comment_reply',
      'match',
      'message',
      'event'
    )
  );

-- Prevent duplicate like notifications for the same actor/post/recipient.
create unique index if not exists notifications_post_like_unique
  on public.notifications(recipient_id, actor_id, post_id, type)
  where type = 'post_like';

-- Keep read paths fast.
create index if not exists notifications_recipient_read_at_idx
  on public.notifications(recipient_id, read_at);
