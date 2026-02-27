-- Enforce blocked-user boundaries at DB level.
-- Goals:
-- 1) Prevent blocked users from liking, matching, messaging, or joining the same conversation.
-- 2) Hide blocked relationships from likes/matches/chat reads via RLS.

create or replace function public.users_are_blocked(
  p_user_a uuid,
  p_user_b uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.profiles p
      where p.id = p_user_a
        and exists (
          select 1
          from jsonb_array_elements_text(
            coalesce(p.safety_settings -> 'blocked_user_ids', '[]'::jsonb)
          ) as b(blocked_id)
          where b.blocked_id = p_user_b::text
        )
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = p_user_b
        and exists (
          select 1
          from jsonb_array_elements_text(
            coalesce(p.safety_settings -> 'blocked_user_ids', '[]'::jsonb)
          ) as b(blocked_id)
          where b.blocked_id = p_user_a::text
        )
    );
$$;

grant execute on function public.users_are_blocked(uuid, uuid) to authenticated;

create or replace function public.conversation_has_blocked_relationship(
  p_conversation_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id <> p_user_id
      and public.users_are_blocked(cm.user_id, p_user_id)
  );
$$;

grant execute
on function public.conversation_has_blocked_relationship(uuid, uuid)
to authenticated;

-- Trigger guards (enforced regardless of app client path).
create or replace function public.enforce_like_block_boundary()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.users_are_blocked(new.liker_id, new.liked_id) then
    raise exception
      'Cannot like this user because one of you has blocked the other.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_like_block_boundary on public.likes;
create trigger trg_enforce_like_block_boundary
before insert or update on public.likes
for each row
execute function public.enforce_like_block_boundary();

create or replace function public.enforce_match_block_boundary()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.users_are_blocked(new.user1_id, new.user2_id) then
    raise exception
      'Cannot create or update match because one of the users has blocked the other.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_match_block_boundary on public.matches;
create trigger trg_enforce_match_block_boundary
before insert or update on public.matches
for each row
execute function public.enforce_match_block_boundary();

create or replace function public.enforce_conversation_member_block_boundary()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = new.conversation_id
      and cm.user_id <> new.user_id
      and public.users_are_blocked(cm.user_id, new.user_id)
  ) then
    raise exception
      'Cannot add conversation member because one of the users has blocked the other.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_conversation_member_block_boundary on public.conversation_members;
create trigger trg_enforce_conversation_member_block_boundary
before insert on public.conversation_members
for each row
execute function public.enforce_conversation_member_block_boundary();

create or replace function public.enforce_message_block_boundary()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = new.conversation_id
      and cm.user_id <> new.sender_id
      and public.users_are_blocked(cm.user_id, new.sender_id)
  ) then
    raise exception
      'Cannot send message because one of the users has blocked the other.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_message_block_boundary on public.messages;
create trigger trg_enforce_message_block_boundary
before insert on public.messages
for each row
execute function public.enforce_message_block_boundary();

-- RLS visibility updates for chat/likes/matches.
drop policy if exists likes_select_authenticated on public.likes;
create policy likes_select_authenticated
on public.likes
for select
to authenticated
using (
  not public.users_are_blocked(liker_id, liked_id)
);

drop policy if exists likes_insert_own on public.likes;
create policy likes_insert_own
on public.likes
for insert
to authenticated
with check (
  liker_id = (select auth.uid())
  and not public.users_are_blocked(liker_id, liked_id)
);

drop policy if exists matches_select_own on public.matches;
create policy matches_select_own
on public.matches
for select
to authenticated
using (
  (
    (select auth.uid()) = user1_id
    or (select auth.uid()) = user2_id
  )
  and not public.users_are_blocked(user1_id, user2_id)
);

drop policy if exists matches_insert_member on public.matches;
create policy matches_insert_member
on public.matches
for insert
to authenticated
with check (
  (
    (select auth.uid()) = user1_id
    or (select auth.uid()) = user2_id
  )
  and not public.users_are_blocked(user1_id, user2_id)
);

drop policy if exists "conversations_select_member" on public.conversations;
create policy "conversations_select_member"
on public.conversations
for select
to authenticated
using (
  public.is_conversation_member(id, auth.uid())
  and not public.conversation_has_blocked_relationship(id, auth.uid())
);

drop policy if exists "conversations_update_member" on public.conversations;
create policy "conversations_update_member"
on public.conversations
for update
to authenticated
using (
  public.is_conversation_member(id, auth.uid())
  and not public.conversation_has_blocked_relationship(id, auth.uid())
)
with check (
  public.is_conversation_member(id, auth.uid())
  and not public.conversation_has_blocked_relationship(id, auth.uid())
);

drop policy if exists "conversation_members_select_member" on public.conversation_members;
create policy "conversation_members_select_member"
on public.conversation_members
for select
to authenticated
using (
  public.is_conversation_member(conversation_id, auth.uid())
  and not public.conversation_has_blocked_relationship(conversation_id, auth.uid())
);

drop policy if exists "conversation_members_insert_member_or_bootstrap" on public.conversation_members;
create policy "conversation_members_insert_member_or_bootstrap"
on public.conversation_members
for insert
to authenticated
with check (
  (
    auth.uid() = user_id
    or public.is_conversation_member(conversation_id, auth.uid())
    or exists (
      select 1
      from public.conversations c
      where c.id = conversation_members.conversation_id
        and c.created_by = auth.uid()
    )
  )
  and not public.conversation_has_blocked_relationship(conversation_id, user_id)
);

drop policy if exists "messages_select_member" on public.messages;
create policy "messages_select_member"
on public.messages
for select
to authenticated
using (
  public.is_conversation_member(conversation_id, auth.uid())
  and not public.conversation_has_blocked_relationship(conversation_id, auth.uid())
);

drop policy if exists "messages_insert_sender_member" on public.messages;
create policy "messages_insert_sender_member"
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and public.is_conversation_member(conversation_id, auth.uid())
  and not public.conversation_has_blocked_relationship(conversation_id, sender_id)
);
