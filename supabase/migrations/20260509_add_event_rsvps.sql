-- Event RSVPs with Going / Maybe / Not Going
CREATE TABLE IF NOT EXISTS public.event_rsvps (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'not_going')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own RSVPs"
  ON public.event_rsvps FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view RSVPs for public events"
  ON public.event_rsvps FOR SELECT
  USING (true);

-- Track attendee count on calendar_events for quick display
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS rsvp_count integer DEFAULT 0;

ALTER PUBLICATION supabase_realtime ADD TABLE public.event_rsvps;
