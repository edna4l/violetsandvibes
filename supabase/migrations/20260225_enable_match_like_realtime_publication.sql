-- Ensure matches/likes are included in Supabase realtime publication.
-- Forward migration so existing environments pick this up even if older
-- publication migrations were already applied.

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
        and tablename = 'matches'
    ) then
      execute 'alter publication supabase_realtime add table public.matches';
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'likes'
    ) then
      execute 'alter publication supabase_realtime add table public.likes';
    end if;
  end if;
end
$$;
