-- Allow video/quicktime (iPhone .mov files) and other common video formats
-- in the story-media storage bucket.
-- Setting allowed_mime_types to NULL removes all restrictions and allows any type.
UPDATE storage.buckets
SET allowed_mime_types = NULL
WHERE name = 'story-media';
