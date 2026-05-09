-- Super likes: one-directional highlighted expressions of interest
CREATE TABLE IF NOT EXISTS public.super_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(sender_id, recipient_id)
);

ALTER TABLE public.super_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can send super likes"
  ON public.super_likes FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can view super likes they sent or received"
  ON public.super_likes FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can delete own super likes"
  ON public.super_likes FOR DELETE
  USING (auth.uid() = sender_id);

-- Realtime for instant super-like notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.super_likes;
