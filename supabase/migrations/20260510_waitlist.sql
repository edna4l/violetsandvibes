CREATE TABLE IF NOT EXISTS waitlist (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name            text        NOT NULL,
  email           text        NOT NULL,
  city            text,
  looking_for     text[],
  founding_member boolean     DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone can add themselves to the waitlist
CREATE POLICY "Public waitlist insert" ON waitlist
  FOR INSERT WITH CHECK (true);

-- Only authenticated users (admins) can read it
CREATE POLICY "Authenticated read waitlist" ON waitlist
  FOR SELECT USING (auth.role() = 'authenticated');
