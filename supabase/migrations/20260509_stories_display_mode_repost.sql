-- Add display_mode (full-screen vs card-on-gradient) and repost support to stories
ALTER TABLE stories ADD COLUMN IF NOT EXISTS display_mode text DEFAULT 'full';
ALTER TABLE stories ADD COLUMN IF NOT EXISTS repost_of_id uuid REFERENCES stories(id) ON DELETE SET NULL;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS repost_of_author text;
