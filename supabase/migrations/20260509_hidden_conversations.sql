-- Tracks which conversations a user has "cleared" from their view.
-- Using a soft-delete approach so each user's clear doesn't affect the other party.
CREATE TABLE IF NOT EXISTS hidden_conversations (
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL,
  hidden_at       timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (user_id, conversation_id)
);

ALTER TABLE hidden_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_hidden_conversations" ON hidden_conversations
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
