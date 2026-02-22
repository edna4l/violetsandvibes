import { supabase } from "@/lib/supabase";

/**
 * For now: 1:1 conversations.
 * Returns an existing conversation id if both users are members of the same convo,
 * otherwise creates a new conversation + both membership rows.
 */
export async function getOrCreateDirectConversation(myId: string, otherUserId: string) {
  // 1) Try to find an existing convo shared by both users
  const { data: shared, error: sharedError } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", myId);

  if (sharedError) throw sharedError;

  const convoIds = (shared ?? []).map((r: any) => r.conversation_id);
  if (convoIds.length > 0) {
    const { data: otherMember, error: otherError } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .in("conversation_id", convoIds)
      .eq("user_id", otherUserId)
      .limit(1)
      .maybeSingle();

    if (otherError) throw otherError;
    if (otherMember?.conversation_id) return otherMember.conversation_id as string;
  }

  // 2) Create a new conversation
  const { data: convo, error: convoError } = await supabase
    .from("conversations")
    .insert({})
    .select("id")
    .single();

  if (convoError) throw convoError;

  const conversationId = convo.id as string;

  // 3) Add both members
  const { error: memberError } = await supabase.from("conversation_members").insert([
    { conversation_id: conversationId, user_id: myId },
    { conversation_id: conversationId, user_id: otherUserId },
  ]);

  if (memberError) throw memberError;

  return conversationId;
}
