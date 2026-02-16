-- =========================================
-- Violets & Vibes: Harden notifications
-- Creates DB triggers for:
-- 1) post_like
-- 2) post_comment
-- 3) comment_reply
-- =========================================

-- 1) POST LIKE -> notify post author (recipient_id = posts.author_id)
create or replace function public.notify_post_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient uuid;
begin
  -- Find the post author
  select author_id into v_recipient
  from public.posts
  where id = new.post_id;

  if v_recipient is null then
    return new;
  end if;

  -- Don't notify yourself
  if v_recipient = new.user_id then
    return new;
  end if;

  -- Insert notification (unique index prevents duplicates for same liker+post)
  insert into public.notifications (recipient_id, actor_id, type, post_id)
  values (v_recipient, new.user_id, 'post_like', new.post_id)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists trg_notify_post_like on public.post_likes;

create trigger trg_notify_post_like
after insert on public.post_likes
for each row
execute function public.notify_post_like();


-- 2) POST COMMENT -> notify post author (recipient_id = posts.author_id)
create or replace function public.notify_post_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient uuid;
begin
  -- Only top-level comments create post_comment notifications
  -- Replies are handled by notify_comment_reply()
  if new.parent_comment_id is not null then
    return new;
  end if;

  select author_id into v_recipient
  from public.posts
  where id = new.post_id;

  if v_recipient is null then
    return new;
  end if;

  if v_recipient = new.user_id then
    return new;
  end if;

  insert into public.notifications (recipient_id, actor_id, type, post_id, comment_id)
  values (v_recipient, new.user_id, 'post_comment', new.post_id, new.id);

  return new;
end;
$$;

drop trigger if exists trg_notify_post_comment on public.post_comments;

create trigger trg_notify_post_comment
after insert on public.post_comments
for each row
execute function public.notify_post_comment();


-- 3) COMMENT REPLY -> notify parent comment author (recipient_id = parent.user_id)
create or replace function public.notify_comment_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_author uuid;
begin
  if new.parent_comment_id is null then
    return new;
  end if;

  select user_id into v_parent_author
  from public.post_comments
  where id = new.parent_comment_id;

  if v_parent_author is null then
    return new;
  end if;

  if v_parent_author = new.user_id then
    return new;
  end if;

  insert into public.notifications (recipient_id, actor_id, type, post_id, comment_id)
  values (v_parent_author, new.user_id, 'comment_reply', new.post_id, new.id);

  return new;
end;
$$;

drop trigger if exists trg_notify_comment_reply on public.post_comments;

create trigger trg_notify_comment_reply
after insert on public.post_comments
for each row
execute function public.notify_comment_reply();
