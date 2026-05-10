-- Supabase Pro allows up to 5 GB per file.
-- Setting a practical 500 MB limit for video posts in story-media bucket.
-- 524288000 = 500 MB
UPDATE storage.buckets
SET file_size_limit = 524288000,
    allowed_mime_types = NULL
WHERE id = 'story-media';
