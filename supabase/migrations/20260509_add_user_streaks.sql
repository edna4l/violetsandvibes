-- Daily login streaks for engagement retention
CREATE TABLE IF NOT EXISTS public.user_streaks (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak integer DEFAULT 0 NOT NULL,
  longest_streak integer DEFAULT 0 NOT NULL,
  last_active_date date,
  streak_updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streak"
  ON public.user_streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own streak"
  ON public.user_streaks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Also track last_active_at on profiles for online presence
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT now();
