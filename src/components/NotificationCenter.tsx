import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Heart, MessageCircle, Calendar, Settings } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

type NotificationType =
  | "post_like"
  | "post_comment"
  | "comment_reply"
  | "like"
  | "comment"
  | "reply"
  | "match"
  | "message"
  | "event"
  | string;

type NotificationsReadField = "is_read" | "read" | "read_at";

const READ_FIELDS: NotificationsReadField[] = ["is_read", "read", "read_at"];

type NotificationRow = {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: NotificationType;
  post_id: string | null;
  comment_id: string | null;
  created_at: string;
  is_read?: boolean | null;
  read?: boolean | null;
  read_at?: string | null;
};

type HydratedNotification = NotificationRow & {
  actorName: string;
  isRead: boolean;
};

function isMissingColumnError(error: { message?: string } | null) {
  const msg = error?.message ?? "";
  return /column .* does not exist/i.test(msg);
}

function isReadRow(row: NotificationRow, field: NotificationsReadField) {
  if (field === "is_read") return !!row.is_read;
  if (field === "read") return !!row.read;
  return !!row.read_at;
}

function timeAgo(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

function getIcon(type: NotificationType) {
  if (type === "post_like" || type === "like") {
    return <Heart className="w-5 h-5 text-pink-400" />;
  }
  if (
    type === "post_comment" ||
    type === "comment_reply" ||
    type === "comment" ||
    type === "reply"
  ) {
    return <MessageCircle className="w-5 h-5 text-cyan-300" />;
  }

  if (type === "event") return <Calendar className="w-5 h-5 text-purple-300" />;
  if (type === "message") {
    return <MessageCircle className="w-5 h-5 text-blue-300" />;
  }
  if (type === "match") return <Heart className="w-5 h-5 text-pink-300" />;

  return <Bell className="w-5 h-5 text-white/70" />;
}

function buildTitle(n: NotificationRow) {
  switch (n.type) {
    case "post_like":
    case "like":
      return "Someone liked your post";
    case "post_comment":
    case "comment":
      return "New comment on your post";
    case "comment_reply":
    case "reply":
      return "New reply to your comment";
    default:
      return "Notification";
  }
}

function buildMessage(n: NotificationRow, actorName: string) {
  switch (n.type) {
    case "post_like":
    case "like":
      return `${actorName} liked your post 💜`;
    case "post_comment":
    case "comment":
      return `${actorName} commented on your post 💬`;
    case "comment_reply":
    case "reply":
      return `${actorName} replied to your comment 💬`;
    default:
      return `${actorName} sent an update`;
  }
}

const NotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<HydratedNotification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [readField, setReadField] = useState<NotificationsReadField>("is_read");

  // Keep this UI-only (not real push yet)
  const [pushEnabled, setPushEnabled] = useState(true);

  const markReadInDb = useCallback(
    async (id?: string) => {
      if (!user) return;

      const order = [readField, ...READ_FIELDS.filter((f) => f !== readField)];
      let lastMissing: { message?: string } | null = null;

      for (const field of order) {
        const now = new Date().toISOString();
        const updatePayload =
          field === "read_at" ? { read_at: now } : ({ [field]: true } as Record<string, boolean>);

        let query = supabase.from("notifications").update(updatePayload).eq("recipient_id", user.id);

        if (id) query = query.eq("id", id);
        query = field === "read_at" ? query.is("read_at", null) : query.eq(field, false);

        const { error: updateError } = await query;
        if (!updateError) {
          if (field !== readField) setReadField(field);
          return;
        }

        if (isMissingColumnError(updateError)) {
          lastMissing = updateError;
          continue;
        }

        throw updateError;
      }

      throw new Error(lastMissing?.message || "No compatible notifications read field found.");
    },
    [readField, user?.id]
  );

  useEffect(() => {
    if (!user) return;

    const markAllAsRead = async () => {
      try {
        const now = new Date().toISOString();
        await markReadInDb();

        // Keep UI in sync immediately after marking all as read
        setItems((prev) =>
          prev.map((n) => ({
            ...n,
            isRead: true,
            is_read: true,
            read: true,
            read_at: n.read_at ?? now,
          }))
        );
      } catch (e: any) {
        console.warn("markAllAsRead failed:", e?.message || "Unknown error");
      }
    };

    void markAllAsRead();
  }, [markReadInDb, user?.id]);

  const loadNotifications = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const order = [readField, ...READ_FIELDS.filter((f) => f !== readField)];
      let rows: NotificationRow[] | null = null;
      let selectedReadField = readField;
      let lastMissing: { message?: string } | null = null;

      for (const field of order) {
        const { data, error: queryError } = await supabase
          .from("notifications")
          .select(`id, recipient_id, actor_id, type, post_id, comment_id, created_at, ${field}`)
          .eq("recipient_id", user.id)
          .order("created_at", { ascending: false })
          .limit(60);

        if (!queryError) {
          rows = (data ?? []) as NotificationRow[];
          selectedReadField = field;
          break;
        }

        if (isMissingColumnError(queryError)) {
          lastMissing = queryError;
          continue;
        }

        throw queryError;
      }

      if (!rows) {
        throw new Error(lastMissing?.message || "No compatible notifications read field found.");
      }

      if (selectedReadField !== readField) {
        setReadField(selectedReadField);
      }

      const actorIds = Array.from(
        new Set(rows.map((r) => r.actor_id).filter(Boolean) as string[])
      );

      let profiles: any[] = [];
      if (actorIds.length) {
        const { data: profRows, error: pErr } = await supabase
          .from("profiles")
          .select("id, full_name, name, username")
          .in("id", actorIds);

        if (!pErr) profiles = profRows ?? [];
      }

      const nameById = new Map<string, string>();
      profiles.forEach((p: any) => {
        nameById.set(p.id, p.full_name || p.name || p.username || "Member");
      });

      const hydrated: HydratedNotification[] = rows.map((n) => ({
        ...n,
        isRead: isReadRow(n, selectedReadField),
        actorName: n.actor_id
          ? n.actor_id === user.id
            ? "You"
            : nameById.get(n.actor_id) || "Member"
          : "Someone",
      }));

      setItems(hydrated);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [readField, user?.id]);

  useEffect(() => {
    if (!user) return;
    void loadNotifications();
  }, [loadNotifications, user?.id]);

  // Realtime: reload on any notifications table change
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("vv-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => void loadNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadNotifications, user?.id]);

  const unreadCount = useMemo(() => items.filter((n) => !n.isRead).length, [items]);

  const markAsRead = async (id: string) => {
    if (!user) return;

    const now = new Date().toISOString();
    // optimistic
    setItems((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              isRead: true,
              is_read: true,
              read: true,
              read_at: n.read_at ?? now,
            }
          : n
      )
    );

    try {
      await markReadInDb(id);
    } catch (e) {
      console.error(e);
      await loadNotifications();
    }
  };

  const markAllRead = async () => {
    if (!user) return;

    const now = new Date().toISOString();
    // optimistic
    setItems((prev) =>
      prev.map((n) => ({
        ...n,
        isRead: true,
        is_read: true,
        read: true,
        read_at: n.read_at ?? now,
      }))
    );

    try {
      await markReadInDb();
    } catch (e) {
      console.error(e);
      await loadNotifications();
    }
  };

  const openNotification = async (n: HydratedNotification) => {
    // mark read, then route somewhere useful
    if (!n.isRead) await markAsRead(n.id);

    // If we know the post, jump user to social and highlight post later if you want
    if (n.post_id) {
      navigate(`/social?post=${n.post_id}`);
      return;
    }

    // fallback
    navigate("/social");
  };

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Bell className="w-6 h-6 text-white/90" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </div>
          <h2 className="wedding-heading rainbow-header">Notifications</h2>
          {unreadCount > 0 && <Badge className="bg-pink-500">{unreadCount}</Badge>}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/settings")}
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Card className="bg-black/40 border-white/15 text-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Push Notifications</CardTitle>
            <Button
              variant={pushEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setPushEnabled(!pushEnabled)}
              className={pushEnabled ? "bg-green-500 hover:bg-green-600" : ""}
            >
              {pushEnabled ? "On" : "Off"}
            </Button>
          </div>
          <div className="text-xs text-white/70">
            (UI only for now — we’ll wire real push later.)
          </div>
        </CardHeader>
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-sm text-white/80">
          {loading ? "Loading..." : `${items.length} total`}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={markAllRead}
          disabled={!user || unreadCount === 0}
          className="border-white/20 text-white hover:bg-white/10"
        >
          Mark all read
        </Button>
      </div>

      {error && (
        <div className="text-sm text-pink-200 bg-pink-900/20 border border-pink-400/30 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="text-white/80">Loading notifications...</div>
        ) : items.length === 0 ? (
          <div className="text-white/70">You're all caught up 💜</div>
        ) : (
          items.map((n) => {
            const unread = !n.isRead;

            return (
              <Card
                key={n.id}
                className={`cursor-pointer transition-all border-white/15 ${
                  unread ? "bg-pink-900/20" : "bg-black/30 hover:bg-white/5"
                }`}
                onClick={() => openNotification(n)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">{getIcon(n.type)}</div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-sm text-white">
                          {buildTitle(n)}
                        </p>
                        <span className="text-xs text-white/60">
                          {timeAgo(n.created_at)}
                        </span>
                      </div>

                      <p className="text-sm text-white/80 mt-1">
                        {buildMessage(n, n.actorName)}
                      </p>

                      {unread && (
                        <div className="w-2 h-2 bg-pink-400 rounded-full mt-2" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <div className="pt-2">
        <Button
          variant="ghost"
          className="w-full text-white/80 hover:text-white hover:bg-white/5"
          onClick={loadNotifications}
          disabled={!user}
        >
          Refresh
        </Button>
      </div>
    </div>
  );
};

export default NotificationCenter;
