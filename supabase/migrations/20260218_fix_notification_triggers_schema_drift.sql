-- Make notification triggers resilient to post_comments schema drift
-- (supports either user_id or author_id on comments).

-- 1) POST LIKE -> notify post author
create or replace function public.notify_post_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient uuid;
  v_actor uuid;
  v_post_id uuid;
begin
  v_actor := nullif(to_jsonb(new)->>'user_id', '')::uuid;
  v_post_id := nullif(to_jsonb(new)->>'post_id', '')::uuid;

  if v_actor is null or v_post_id is null then
    return new;
  end if;

  select author_id into v_recipient
  from public.posts
  where id = v_post_id;

  if v_recipient is null or v_recipient = v_actor then
    return new;
  end if;

  insert into public.notifications (recipient_id, actor_id, type, post_id)
  values (v_recipient, v_actor, 'post_like', v_post_id)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists trg_notify_post_like on public.post_likes;
create trigger trg_notify_post_like
after insert on public.post_likes
for each row
execute function public.notify_post_like();


-- 2) TOP-LEVEL COMMENT -> notify post author
create or replace function public.notify_post_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient uuid;
  v_actor uuid;
  v_post_id uuid;
  v_parent_comment_id uuid;
begin
  v_actor := coalesce(
    nullif(to_jsonb(new)->>'user_id', '')::uuid,
    nullif(to_jsonb(new)->>'author_id', '')::uuid
  );
  v_post_id := nullif(to_jsonb(new)->>'post_id', '')::uuid;
  v_parent_comment_id := nullif(to_jsonb(new)->>'parent_comment_id', '')::uuid;

  -- Replies are handled by notify_comment_reply.
  if v_parent_comment_id is not null then
    return new;
  end if;

  if v_actor is null or v_post_id is null then
    return new;
  end if;

  select author_id into v_recipient
  from public.posts
  where id = v_post_id;

  if v_recipient is null or v_recipient = v_actor then
    return new;
  end if;

  insert into public.notifications (recipient_id, actor_id, type, post_id, comment_id)
  values (v_recipient, v_actor, 'post_comment', v_post_id, new.id)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists trg_notify_post_comment on public.post_comments;
create trigger trg_notify_post_comment
after insert on public.post_comments
for each row
execute function public.notify_post_comment();


-- 3) REPLY -> notify parent comment author
create or replace function public.notify_comment_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_author uuid;
  v_actor uuid;
  v_post_id uuid;
  v_parent_comment_id uuid;
begin
  v_actor := coalesce(
    nullif(to_jsonb(new)->>'user_id', '')::uuid,
    nullif(to_jsonb(new)->>'author_id', '')::uuid
  );
  v_post_id := nullif(to_jsonb(new)->>'post_id', '')::uuid;
  v_parent_comment_id := nullif(to_jsonb(new)->>'parent_comment_id', '')::uuid;

  if v_parent_comment_id is null then
    return new;
  end if;

  if v_actor is null or v_post_id is null then
    return new;
  end if;

  select coalesce(
    nullif(to_jsonb(pc)->>'user_id', '')::uuid,
    nullif(to_jsonb(pc)->>'author_id', '')::uuid
  )
  into v_parent_author
  from public.post_comments pc
  where pc.id = v_parent_comment_id;

  if v_parent_author is null or v_parent_author = v_actor then
    return new;
  end if;

  insert into public.notifications (recipient_id, actor_id, type, post_id, comment_id)
  values (v_parent_author, v_actor, 'comment_reply', v_post_id, new.id)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists trg_notify_comment_reply on public.post_comments;
create trigger trg_notify_comment_reply
after insert on public.post_comments
for each row
execute function public.notify_comment_reply();
