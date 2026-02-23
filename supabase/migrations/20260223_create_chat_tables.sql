-- Chat schema for 1:1 conversations
-- Adds:
--   public.conversations
--   public.conversation_members
--   public.messages
-- plus indexes, triggers, and RLS policies.

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists conversations_last_message_at_idx
  on public.conversations(last_message_at desc nulls last);

create index if not exists conversations_updated_at_idx
  on public.conversations(updated_at desc);

create index if not exists conversation_members_user_id_idx
  on public.conversation_members(user_id);

create index if not exists messages_conversation_created_at_idx
  on public.messages(conversation_id, created_at);

create index if not exists messages_sender_id_idx
  on public.messages(sender_id);

grant select, insert, update, delete
on table public.conversations
to authenticated;

grant select, insert, update, delete
on table public.conversation_members
to authenticated;

grant select, insert, update, delete
on table public.messages
to authenticated;

-- Helper to avoid recursive RLS checks inside policies.
create or replace function public.is_conversation_member(
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
      and cm.user_id = p_user_id
  );
$$;

grant execute
on function public.is_conversation_member(uuid, uuid)
to authenticated;

-- Keep conversation timestamps in sync with latest message.
create or replace function public.touch_conversation_on_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set
    last_message_at = new.created_at,
    updated_at = now()
  where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists trg_touch_conversation_on_message_insert on public.messages;
create trigger trg_touch_conversation_on_message_insert
after insert on public.messages
for each row
execute function public.touch_conversation_on_message_insert();

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

-- Conversations
drop policy if exists "conversations_select_member" on public.conversations;
create policy "conversations_select_member"
on public.conversations for select
to authenticated
using (public.is_conversation_member(id, auth.uid()));

drop policy if exists "conversations_insert_authenticated" on public.conversations;
create policy "conversations_insert_authenticated"
on public.conversations for insert
to authenticated
with check (auth.uid() is not null);

drop policy if exists "conversations_update_member" on public.conversations;
create policy "conversations_update_member"
on public.conversations for update
to authenticated
using (public.is_conversation_member(id, auth.uid()))
with check (public.is_conversation_member(id, auth.uid()));

-- Conversation members
drop policy if exists "conversation_members_select_member" on public.conversation_members;
create policy "conversation_members_select_member"
on public.conversation_members for select
to authenticated
using (public.is_conversation_member(conversation_id, auth.uid()));

drop policy if exists "conversation_members_insert_member_or_bootstrap" on public.conversation_members;
create policy "conversation_members_insert_member_or_bootstrap"
on public.conversation_members for insert
to authenticated
with check (
  auth.uid() = user_id
  or public.is_conversation_member(conversation_id, auth.uid())
  or exists (
    select 1
    from public.conversations c
    where c.id = conversation_members.conversation_id
      and c.created_by = auth.uid()
  )
);

drop policy if exists "conversation_members_update_own" on public.conversation_members;
create policy "conversation_members_update_own"
on public.conversation_members for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Messages
drop policy if exists "messages_select_member" on public.messages;
create policy "messages_select_member"
on public.messages for select
to authenticated
using (public.is_conversation_member(conversation_id, auth.uid()));

drop policy if exists "messages_insert_sender_member" on public.messages;
create policy "messages_insert_sender_member"
on public.messages for insert
to authenticated
with check (
  sender_id = auth.uid()
  and public.is_conversation_member(conversation_id, auth.uid())
);
