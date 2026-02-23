-- Ensure chat tables are included in Supabase realtime publication.
-- Without this, postgres_changes listeners may subscribe successfully
-- but never receive events.

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'messages'
    ) then
      execute 'alter publication supabase_realtime add table public.messages';
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'conversations'
    ) then
      execute 'alter publication supabase_realtime add table public.conversations';
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'conversation_members'
    ) then
      execute 'alter publication supabase_realtime add table public.conversation_members';
    end if;
  end if;
end
$$;
