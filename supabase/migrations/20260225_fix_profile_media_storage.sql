-- Ensure profile photo uploads work in all environments.
-- Creates the expected storage bucket + required RLS policies.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-media',
  'profile-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- storage.objects is managed by Supabase internals; in some environments
-- this role is not the table owner. Attempt to enable RLS, but don't fail
-- the migration if permission is denied.
do $$
begin
  begin
    alter table storage.objects enable row level security;
  exception
    when insufficient_privilege then
      null;
  end;
end
$$;

-- Public read for profile images
do $$
begin
  if not exists (
    select 1
    from pg_policy p
    join pg_class c on p.polrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'storage'
      and c.relname = 'objects'
      and p.polname = 'profile_media_public_read'
  ) then
    execute $sql$
      create policy profile_media_public_read
      on storage.objects
      for select
      to public
      using (bucket_id = 'profile-media');
    $sql$;
  end if;
end
$$;

-- Authenticated users can upload to their own folder: <uid>/...
do $$
begin
  if not exists (
    select 1
    from pg_policy p
    join pg_class c on p.polrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'storage'
      and c.relname = 'objects'
      and p.polname = 'profile_media_insert_own'
  ) then
    execute $sql$
      create policy profile_media_insert_own
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'profile-media'
        and (select auth.uid()) is not null
        and (storage.foldername(name))[1] = (select auth.uid())::text
      );
    $sql$;
  end if;
end
$$;

-- Users can update their own objects in their own folder.
do $$
begin
  if not exists (
    select 1
    from pg_policy p
    join pg_class c on p.polrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'storage'
      and c.relname = 'objects'
      and p.polname = 'profile_media_update_own'
  ) then
    execute $sql$
      create policy profile_media_update_own
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'profile-media'
        and (select auth.uid()) is not null
        and (storage.foldername(name))[1] = (select auth.uid())::text
      )
      with check (
        bucket_id = 'profile-media'
        and (select auth.uid()) is not null
        and (storage.foldername(name))[1] = (select auth.uid())::text
      );
    $sql$;
  end if;
end
$$;

-- Users can delete their own objects in their own folder.
do $$
begin
  if not exists (
    select 1
    from pg_policy p
    join pg_class c on p.polrelid = c.oid
    join pg_namespace n on c.relnamespace = n.oid
    where n.nspname = 'storage'
      and c.relname = 'objects'
      and p.polname = 'profile_media_delete_own'
  ) then
    execute $sql$
      create policy profile_media_delete_own
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'profile-media'
        and (select auth.uid()) is not null
        and (storage.foldername(name))[1] = (select auth.uid())::text
      );
    $sql$;
  end if;
end
$$;
