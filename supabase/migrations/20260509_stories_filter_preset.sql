-- Add filter_preset column so each vibe can store a photo/video filter name
ALTER TABLE stories ADD COLUMN IF NOT EXISTS filter_preset text DEFAULT 'normal';
