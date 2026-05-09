import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { loadBlockedUserIdSet } from "@/lib/safety";
import { getOrCreateDirectConversation } from "@/lib/messaging";

type Props = {
  userId: string;      // the other person
  userName?: string;
  className?: string;
};

export default function MessageButton({ userId, userName, className }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [opening, setOpening] = useState(false);

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

      const conversationId = await getOrCreateDirectConversation(user.id, userId);

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
