-- Create a private storage bucket for verification uploads.
-- Files are scoped to owner folder: <uid>/photo/... or <uid>/id/...

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'verification-media',
  'verification-media',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Authenticated users can read only their own verification files.
do $$
begin
  if not exists (
    select 1
    from pg_policy p
    join pg_class c on p.polrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'storage'
      and c.relname = 'objects'
      and p.polname = 'verification_media_select_own'
  ) then
    execute $sql$
      create policy verification_media_select_own
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'verification-media'
        and (select auth.uid()) is not null
        and (storage.foldername(name))[1] = (select auth.uid())::text
      );
    $sql$;
  end if;
end
$$;

-- Authenticated users can upload only into their own folder.
do $$
begin
  if not exists (
    select 1
    from pg_policy p
    join pg_class c on p.polrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'storage'
      and c.relname = 'objects'
      and p.polname = 'verification_media_insert_own'
  ) then
    execute $sql$
      create policy verification_media_insert_own
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'verification-media'
        and (select auth.uid()) is not null
        and (storage.foldername(name))[1] = (select auth.uid())::text
      );
    $sql$;
  end if;
end
$$;

-- Authenticated users can update only their own verification files.
do $$
begin
  if not exists (
    select 1
    from pg_policy p
    join pg_class c on p.polrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'storage'
      and c.relname = 'objects'
      and p.polname = 'verification_media_update_own'
  ) then
    execute $sql$
      create policy verification_media_update_own
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'verification-media'
        and (select auth.uid()) is not null
        and (storage.foldername(name))[1] = (select auth.uid())::text
      )
      with check (
        bucket_id = 'verification-media'
        and (select auth.uid()) is not null
        and (storage.foldername(name))[1] = (select auth.uid())::text
      );
    $sql$;
  end if;
end
$$;

-- Authenticated users can delete only their own verification files.
do $$
begin
  if not exists (
    select 1
    from pg_policy p
    join pg_class c on p.polrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'storage'
      and c.relname = 'objects'
      and p.polname = 'verification_media_delete_own'
  ) then
    execute $sql$
      create policy verification_media_delete_own
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'verification-media'
        and (select auth.uid()) is not null
        and (storage.foldername(name))[1] = (select auth.uid())::text
      );
    $sql$;
  end if;
end
$$;
