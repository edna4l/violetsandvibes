import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { loadBlockedUserIdSet } from "@/lib/safety";

type Props = {
  userId: string;      // the other person
  userName?: string;
  className?: string;
};

export default function MessageButton({ userId, userName, className }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [opening, setOpening] = useState(false);

  const ensureMember = async (conversationId: string, memberId: string) => {
    const { error } = await supabase
      .from("conversation_members")
      .insert({ conversation_id: conversationId, user_id: memberId });

    // Ignore duplicate membership rows.
    if (error && error.code !== "23505") throw error;
  };

  const openChat = async () => {
    if (!user) {
      navigate("/signin?redirect=/chat", { replace: true });
      return;
    }
    if (!userId || userId === user.id) return;

    setOpening(true);
    try {
      const blockedSet = await loadBlockedUserIdSet(user.id);
      if (blockedSet.has(userId)) {
        alert("You have blocked this user. Unblock them in their profile to message again.");
        return;
      }

      // 1) Try to find existing 1:1 conversation
      // Strategy: find conversation_ids where BOTH users are members.
      const { data: myMemberships, error: memErr1 } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (memErr1) throw memErr1;

      const convoIds = (myMemberships ?? []).map((r: any) => r.conversation_id);

      let conversationId: string | null = null;

      if (convoIds.length > 0) {
        const { data: otherMemberships, error: memErr2 } = await supabase
          .from("conversation_members")
          .select("conversation_id")
          .eq("user_id", userId)
          .in("conversation_id", convoIds);

        if (memErr2) throw memErr2;

        conversationId = (otherMemberships ?? [])[0]?.conversation_id ?? null;
      }

      // 2) If none exists, create it
      if (!conversationId) {
        const { data: convo, error: convoErr } = await supabase
          .from("conversations")
          .insert({ created_by: user.id })
          .select("id")
          .single();

        if (convoErr) throw convoErr;
        if (!convo?.id) throw new Error("Conversation create returned no id.");
        conversationId = convo.id;

      }

      // Ensure both members exist even for older/broken conversations.
      await ensureMember(conversationId, user.id);
      await ensureMember(conversationId, userId);

      // 3) Navigate to chat thread
      navigate(`/chat?c=${conversationId}`, { replace: false });
    } catch (e: any) {
      console.error("openChat failed:", e);
      alert(e?.message || "Could not open chat. Check console for details.");
    } finally {
      setOpening(false);
    }
  };

  return (
    <Button className={className} onClick={openChat} disabled={opening}>
      {opening ? "Opening..." : `Message${userName ? ` ${userName}` : ""}`}
    </Button>
  );
}
