-- Create a function to atomically create direct conversations
-- This avoids RLS issues by handling everything in a single transaction
drop function if exists public.create_direct_conversation(uuid, uuid);
drop function if exists public.create_direct_conversation(jsonb);

create or replace function public.create_direct_conversation(user_id_1 uuid, user_id_2 uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  conversation_id uuid;
  user1_blocked boolean := false;
  user2_blocked boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if auth.uid() <> user_id_1 and auth.uid() <> user_id_2 then
    raise exception 'Cannot create a conversation for other users';
  end if;

  if user_id_1 = user_id_2 then
    raise exception 'Cannot create a conversation with yourself';
  end if;

  -- Check if either user has blocked the other
  select exists(
    select 1 from public.profiles
    where id = user_id_1
    and safety_settings -> 'blocked_user_ids' ? user_id_2::text
  ) into user1_blocked;

  select exists(
    select 1 from public.profiles
    where id = user_id_2
    and safety_settings -> 'blocked_user_ids' ? user_id_1::text
  ) into user2_blocked;

  if user1_blocked or user2_blocked then
    raise exception 'Cannot create conversation between blocked users';
  end if;

  -- Create the conversation
  insert into public.conversations (created_by)
  values (user_id_1)
  returning id into conversation_id;

  -- Add both members
  insert into public.conversation_members (conversation_id, user_id)
  values (conversation_id, user_id_1);

  insert into public.conversation_members (conversation_id, user_id)
  values (conversation_id, user_id_2);

  return conversation_id;
end;
$$;

grant execute on function public.create_direct_conversation(uuid, uuid) to anon, authenticated;

create or replace function public.create_direct_conversation(jsonb)
returns uuid
language sql
security definer
set search_path = public
as $$
  select public.create_direct_conversation(
    ($1 ->> 'user_id_1')::uuid,
    ($1 ->> 'user_id_2')::uuid
  );
$$;

grant execute on function public.create_direct_conversation(jsonb) to anon, authenticated;

select pg_notify('pgrst', 'reload schema');

select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as result
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'create_direct_conversation';
