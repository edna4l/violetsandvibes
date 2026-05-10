-- Community, connection intent, and identity fields for broader appeal
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vibe_categories   text[]  DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS connection_intent  text[]  DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pronouns           text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS relationship_style text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_prompts   jsonb   DEFAULT '{}';

-- admin_note lets the review queue hold items with a reason
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_note text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_status text DEFAULT 'pending';
