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

  const onClick = async () => {
    if (!user) {
      navigate(`/signin?redirect=/profile/${userId}`, { replace: true });
      return;
    }

    setLoading(true);
    try {
      const conversationId = await getOrCreateDirectConversation(user.id, userId);
      navigate(`/chat?c=${conversationId}`, { replace: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button className={className} onClick={() => void onClick()} disabled={loading}>
      <MessageCircle className="w-5 h-5 mr-2" />
      {loading ? "Opening…" : `Message ${userName || ""}`.trim()}
    </Button>
  );
};

export default MessageButton;
