-- Upgrade post likes to multi-emoji reactions (Facebook Reactions style)
-- Existing post_likes rows become 'heart' reactions

ALTER TABLE public.post_likes
  ADD COLUMN IF NOT EXISTS reaction_type text
    DEFAULT 'heart'
    CHECK (reaction_type IN ('heart', 'fire', 'laugh', 'sad', 'wow'));

-- Drop old unique constraint (post_id, user_id) if it exists and re-add with reaction_type
-- This allows one reaction per type per user per post
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'post_likes_post_id_user_id_key'
  ) THEN
    ALTER TABLE public.post_likes DROP CONSTRAINT post_likes_post_id_user_id_key;
  END IF;
END$$;

-- One reaction per type per user per post
ALTER TABLE public.post_likes
  DROP CONSTRAINT IF EXISTS post_likes_unique_reaction,
  ADD CONSTRAINT post_likes_unique_reaction UNIQUE (post_id, user_id, reaction_type);

-- Update any null reaction_types from before this migration
UPDATE public.post_likes SET reaction_type = 'heart' WHERE reaction_type IS NULL;
