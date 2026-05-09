-- Ephemeral 24-hour stories (TikTok/Instagram style)
CREATE TABLE IF NOT EXISTS public.stories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  media_type text DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  caption text,
  view_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz DEFAULT (now() + interval '24 hours') NOT NULL
);

CREATE TABLE IF NOT EXISTS public.story_views (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(story_id, viewer_id)
);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can create stories"
  ON public.stories FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can view active (non-expired) stories"
  ON public.stories FOR SELECT
  USING (expires_at > now());

CREATE POLICY "Authors can delete own stories"
  ON public.stories FOR DELETE
  USING (auth.uid() = author_id);

CREATE POLICY "Users can record own views"
  ON public.story_views FOR INSERT
  WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY "Users can see views on their stories"
  ON public.story_views FOR SELECT
  USING (
    auth.uid() = viewer_id OR
    EXISTS (SELECT 1 FROM public.stories WHERE id = story_views.story_id AND author_id = auth.uid())
  );

-- Storage bucket for story media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'story-media',
  'story-media',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif','video/mp4','video/webm']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload story media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'story-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view story media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'story-media');

CREATE POLICY "Authors can delete story media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'story-media' AND auth.uid()::text = (storage.foldername(name))[1]);

ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;
