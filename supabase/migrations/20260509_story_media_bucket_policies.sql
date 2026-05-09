-- Ensure story-media bucket exists: public, 500MB limit, no MIME restrictions
-- 524288000 bytes = 500 MB
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('story-media', 'story-media', true, 524288000, null)
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = 524288000,
      allowed_mime_types = null;

-- Allow any authenticated user to upload to story-media
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'story_media_insert'
  ) THEN
    CREATE POLICY story_media_insert ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'story-media');
  END IF;
END $$;

-- Allow public reads from story-media
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'story_media_select'
  ) THEN
    CREATE POLICY story_media_select ON storage.objects
      FOR SELECT TO public
      USING (bucket_id = 'story-media');
  END IF;
END $$;

-- Allow users to delete their own uploads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'story_media_delete'
  ) THEN
    CREATE POLICY story_media_delete ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'story-media'
        AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;
