-- User reports for safety moderation
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  reported_message_id uuid,
  reason text NOT NULL CHECK (reason IN (
    'harassment',
    'spam',
    'fake_profile',
    'inappropriate_content',
    'underage',
    'hate_speech',
    'other'
  )),
  details text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at timestamptz DEFAULT now() NOT NULL,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit reports"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports"
  ON public.reports FOR SELECT
  USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can manage all reports"
  ON public.reports FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid())
  );
