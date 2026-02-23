import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { getOrCreateDirectConversation } from "@/lib/messaging";

interface MessageButtonProps {
  userId: string;
  userName?: string;
  className?: string;
}

const MessageButton: React.FC<MessageButtonProps> = ({ userId, userName, className }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onClick = async () => {
    if (!user) {
      navigate(`/signin?redirect=/profile/${userId}`, { replace: true });
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const conversationId = await getOrCreateDirectConversation(user.id, userId);
      navigate(`/chat?c=${conversationId}`, { replace: false });
    } catch (error: any) {
      const message = error?.message || "Could not open chat right now.";
      console.error("open chat failed:", error);
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-1">
      <Button className={className} onClick={() => void onClick()} disabled={loading}>
        <MessageCircle className="w-5 h-5 mr-2" />
        {loading ? "Opening…" : `Message ${userName || ""}`.trim()}
      </Button>
      {errorMessage ? (
        <div className="text-xs text-pink-200">{errorMessage}</div>
      ) : null}
    </div>
  );
};

export default MessageButton;
