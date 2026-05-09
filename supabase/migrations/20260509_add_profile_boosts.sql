-- Profile boosts: 30-min priority placement in discover queue (Elite feature)
CREATE TABLE IF NOT EXISTS public.profile_boosts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activated_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz DEFAULT (now() + interval '30 minutes') NOT NULL,
  views_during_boost integer DEFAULT 0 NOT NULL
);

ALTER TABLE public.profile_boosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own boosts"
  ON public.profile_boosts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Discover service can read active boosts"
  ON public.profile_boosts FOR SELECT
  USING (expires_at > now());
