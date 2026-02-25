import { supabase } from "@/lib/supabase";

export async function ensureConversationForMatch(params: {
  matchId: string;
  user1_id: string;
  user2_id: string;
}): Promise<string | null> {
  const { matchId, user1_id, user2_id } = params;

  // 1) create conversation
  const { data: convo, error: convoErr } = await supabase
    .from("conversations")
    .insert({ created_by: user1_id }) // either is fine; just needs a value
    .select("id")
    .single();

  if (convoErr) throw convoErr;

  const conversationId = convo?.id as string;

  // 2) add both members
  const { error: memErr } = await supabase.from("conversation_members").insert([
    { conversation_id: conversationId, user_id: user1_id },
    { conversation_id: conversationId, user_id: user2_id },
  ]);

  if (memErr) throw memErr;

  // 3) attach to match row
  const { error: matchUpdateErr } = await supabase
    .from("matches")
    .update({ conversation_id: conversationId })
    .eq("id", matchId);

  if (matchUpdateErr) throw matchUpdateErr;

  return conversationId;
}
