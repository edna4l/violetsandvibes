-- Icebreaker prompts on profiles (Hinge-style)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS icebreaker_prompts jsonb DEFAULT '[]'::jsonb;

-- Media support in messages (image, voice note, GIF)
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_type text
    CHECK (media_type IN ('image', 'video', 'audio', 'gif'));

-- Storage bucket for chat media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media',
  'chat-media',
  true,
  20971520, -- 20MB
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif','audio/webm','audio/mp4','audio/ogg']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload chat media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'chat-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view chat media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-media');
