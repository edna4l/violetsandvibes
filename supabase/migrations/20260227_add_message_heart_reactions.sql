-- Message heart reactions for chat.
-- Supports one heart reaction per user per message.

create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null default 'heart',
  created_at timestamptz not null default now(),
  constraint message_reactions_reaction_check check (reaction in ('heart'))
);

create unique index if not exists message_reactions_unique_heart
  on public.message_reactions (message_id, user_id, reaction);

create index if not exists message_reactions_conversation_idx
  on public.message_reactions (conversation_id);

create index if not exists message_reactions_message_idx
  on public.message_reactions (message_id);

create index if not exists message_reactions_user_idx
  on public.message_reactions (user_id);

create or replace function public.set_message_reaction_conversation_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation_id uuid;
begin
  select m.conversation_id into v_conversation_id
  from public.messages m
  where m.id = new.message_id;

  if v_conversation_id is null then
    raise exception 'Message % does not exist', new.message_id;
  end if;

  new.conversation_id := v_conversation_id;
  return new;
end;
$$;

drop trigger if exists trg_set_message_reaction_conversation_id on public.message_reactions;
create trigger trg_set_message_reaction_conversation_id
before insert or update on public.message_reactions
for each row
execute function public.set_message_reaction_conversation_id();

alter table public.message_reactions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policy p
    join pg_class c on p.polrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and c.relname = 'message_reactions'
      and p.polname = 'message_reactions_select_member'
  ) then
    execute $sql$
      create policy message_reactions_select_member
        on public.message_reactions
        for select
        to authenticated
        using (
          exists (
            select 1
            from public.conversation_members cm
            where cm.conversation_id = message_reactions.conversation_id
              and cm.user_id = (select auth.uid())
          )
        );
    $sql$;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policy p
    join pg_class c on p.polrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and c.relname = 'message_reactions'
      and p.polname = 'message_reactions_insert_own_member'
  ) then
    execute $sql$
      create policy message_reactions_insert_own_member
        on public.message_reactions
        for insert
        to authenticated
        with check (
          user_id = (select auth.uid())
          and exists (
            select 1
            from public.conversation_members cm
            where cm.conversation_id = message_reactions.conversation_id
              and cm.user_id = (select auth.uid())
          )
        );
    $sql$;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policy p
    join pg_class c on p.polrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'public'
      and c.relname = 'message_reactions'
      and p.polname = 'message_reactions_delete_own'
  ) then
    execute $sql$
      create policy message_reactions_delete_own
        on public.message_reactions
        for delete
        to authenticated
        using (user_id = (select auth.uid()));
    $sql$;
  end if;
end
$$;

do $$
begin
  begin
    alter publication supabase_realtime add table public.message_reactions;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end
$$;
