import { supabase } from "@/lib/supabase";

export type MatchRow = {
  id: string;
  user1_id: string;
  user2_id: string;
  conversation_id: string | null;
  created_at: string;
};

export async function fetchMyMatches(myId: string) {
  const { data, error } = await supabase
    .from("matches")
    .select("id, user1_id, user2_id, conversation_id, created_at")
    .or(`user1_id.eq.${myId},user2_id.eq.${myId}`)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as MatchRow[];
}
