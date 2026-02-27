-- Keep social post hearts functional even when notifications schema differs
-- across environments. Like inserts should never fail because a notification
-- insert failed.

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

  -- Support author_id/user_id drift on posts table.
  select coalesce(
    nullif(to_jsonb(p)->>'author_id', '')::uuid,
    nullif(to_jsonb(p)->>'user_id', '')::uuid
  )
  into v_recipient
  from public.posts p
  where p.id = v_post_id;

  if v_recipient is null or v_recipient = v_actor then
    return new;
  end if;

  if to_regclass('public.notifications') is null then
    return new;
  end if;

  begin
    -- Preferred notification type used by current app schema.
    insert into public.notifications (recipient_id, actor_id, type, post_id)
    values (v_recipient, v_actor, 'post_like', v_post_id)
    on conflict do nothing;
  exception
    when check_violation then
      begin
        -- Backward-compat fallback for older notifications_type_check values.
        insert into public.notifications (recipient_id, actor_id, type, post_id)
        values (v_recipient, v_actor, 'like', v_post_id)
        on conflict do nothing;
      exception
        when others then
          null;
      end;
    when others then
      null;
  end;

  return new;
end;
$$;

drop trigger if exists trg_notify_post_like on public.post_likes;
create trigger trg_notify_post_like
after insert on public.post_likes
for each row
execute function public.notify_post_like();
