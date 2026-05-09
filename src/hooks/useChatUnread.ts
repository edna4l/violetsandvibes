import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export function useChatUnread() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refreshUnread = async () => {
    if (!user) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data: memberships, error: memErr } = await supabase
      .from("conversation_members")
      .select("conversation_id, last_read_at")
      .eq("user_id", user.id);

    if (memErr) {
      console.error("chat unread membership error:", memErr);
      setLoading(false);
      return;
    }

    const convoIds = (memberships ?? []).map((m: any) => m.conversation_id);

    if (convoIds.length === 0) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const { data: conversations, error: convoErr } = await supabase
      .from("conversations")
      .select("id, last_message_at")
      .in("id", convoIds);

    if (convoErr) {
      console.error("chat unread conversations error:", convoErr);
      setLoading(false);
      return;
    }

    const lastReadByConvo = new Map<string, string | null>();
    (memberships ?? []).forEach((m: any) => {
      lastReadByConvo.set(m.conversation_id, m.last_read_at ?? null);
    });

    const count = (conversations ?? []).filter((c: any) => {
      if (!c.last_message_at) return false;

      const lastReadAt = lastReadByConvo.get(c.id) ?? null;

      return (
        !lastReadAt ||
        new Date(c.last_message_at).getTime() > new Date(lastReadAt).getTime()
      );
    }).length;

    setUnreadCount(count);
    setLoading(false);
  };

  useEffect(() => {
    void refreshUnread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`vv-chat-unread-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          void refreshUnread();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversation_members" },
        () => {
          void refreshUnread();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return { unreadCount, loading, refreshUnread };
}
