import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

type NotificationsReadField = "is_read" | "read" | "read_at";

const READ_FIELDS: NotificationsReadField[] = ["is_read", "read", "read_at"];

function isMissingColumnError(error: { message?: string } | null) {
  const msg = error?.message ?? "";
  return /column .* does not exist/i.test(msg);
}

function isUnread(row: Record<string, any>, field: NotificationsReadField) {
  if (field === "read_at") return !row.read_at;
  return !row[field];
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [readField, setReadField] = useState<NotificationsReadField>("is_read");

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const load = async () => {
      const order = [readField, ...READ_FIELDS.filter((f) => f !== readField)];
      let lastMissing: { message?: string } | null = null;

      for (const field of order) {
        const { data, error } = await supabase
          .from("notifications")
          .select(`id, ${field}`)
          .eq("recipient_id", user.id);

        if (!error) {
          if (field !== readField) setReadField(field);
          const count = (data ?? []).filter((n) => isUnread(n as Record<string, any>, field)).length;
          setUnreadCount(count);
          return;
        }

        if (isMissingColumnError(error)) {
          lastMissing = error;
          continue;
        }

        console.error(error);
        return;
      }

      if (lastMissing) {
        console.warn(lastMissing.message);
      }
    };

    void load();

    const channel = supabase
      .channel("vv-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          void load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [readField, user?.id]);

  return { unreadCount };
};
