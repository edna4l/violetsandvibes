import React, { useEffect, useMemo, useState } from "react";
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

function timeAgo(iso?: string) {
  if (!iso) return "just now";
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
  if (type === "message") return <MessageCircle className="w-5 h-5 text-blue-300" />;
  if (type === "match") return <Heart className="w-5 h-5 text-pink-300" />;
  return <Bell className="w-5 h-5 text-white/70" />;
}

function isUnread(n: any) {
  if (typeof n?.is_read === "boolean") return !n.is_read;
  if (typeof n?.read === "boolean") return !n.read;
  if ("read_at" in (n ?? {})) return !n.read_at;
  return true;
}

function isMissingColumnError(error: any) {
  return /column .* does not exist/i.test(error?.message ?? "");
}

const NotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep this UI-only (not real push yet)
  const [pushEnabled, setPushEnabled] = useState(true);

  const formatNotification = (n: any) => {
    switch (n.type) {
      case "post_like":
      case "like":
        return {
          title: "Someone liked your post 💜",
          message: "Your post got a new like.",
        };
      case "post_comment":
      case "comment":
        return {
          title: "New comment",
          message: "Someone commented on your post.",
        };
      case "comment_reply":
      case "reply":
        return {
          title: "New reply",
          message: "Someone replied to your comment.",
        };
      default:
        return {
          title: "Notification",
          message: "",
        };
    }
  };

  const loadNotifications = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error: loadError } = await supabase
      .from("notifications")
      .select("id, recipient_id, actor_id, type, post_id, comment_id, created_at, read_at")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (loadError) {
      console.error("loadNotifications error:", loadError);
      setError(loadError.message);
    } else {
      setNotifications(data ?? []);
      setError(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    void loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("vv-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const row: any = (payload as any).new;
          if (!row || row.recipient_id !== user.id) return;
          setNotifications((prev) => [row, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications" },
        (payload) => {
          const row: any = (payload as any).new;
          if (!row || row.recipient_id !== user.id) return;
          setNotifications((prev) => prev.map((n) => (n.id === row.id ? row : n)));
        }
      )
      .subscribe((status) => console.log("vv-notifications status:", status));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => isUnread(n)).length,
    [notifications]
  );

  const markAsReadInDb = async (id: string) => {
    if (!user) return;

    const attempts = [
      { payload: { is_read: true }, apply: (q: any) => q.eq("is_read", false) },
      { payload: { read: true }, apply: (q: any) => q.eq("read", false) },
      {
        payload: { read_at: new Date().toISOString() },
        apply: (q: any) => q.is("read_at", null),
      },
    ];

    for (const attempt of attempts) {
      let query = supabase
        .from("notifications")
        .update(attempt.payload)
        .eq("recipient_id", user.id)
        .eq("id", id);
      query = attempt.apply(query);
      const { error: updateError } = await query;
      if (!updateError) return;
      if (isMissingColumnError(updateError)) continue;
      throw updateError;
    }
  };

  const markAllReadInDb = async () => {
    if (!user) return;

    const attempts = [
      { payload: { is_read: true }, apply: (q: any) => q.eq("is_read", false) },
      { payload: { read: true }, apply: (q: any) => q.eq("read", false) },
      {
        payload: { read_at: new Date().toISOString() },
        apply: (q: any) => q.is("read_at", null),
      },
    ];
    for (const attempt of attempts) {
      let query = supabase
        .from("notifications")
        .update(attempt.payload)
        .eq("recipient_id", user.id);
      query = attempt.apply(query);
      const { error: updateError } = await query;
      if (!updateError) return;
      if (isMissingColumnError(updateError)) continue;
      throw updateError;
    }
  };

  const markAsRead = async (id: string) => {
    const now = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, is_read: true, read: true, read_at: n.read_at ?? now }
          : n
      )
    );

    try {
      await markAsReadInDb(id);
    } catch (e) {
      console.error(e);
      await loadNotifications();
    }
  };

  const markAllRead = async () => {
    const now = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true, read: true, read_at: n.read_at ?? now }))
    );

    try {
      await markAllReadInDb();
    } catch (e) {
      console.error(e);
      await loadNotifications();
    }
  };

  const openNotification = async (n: any) => {
    if (isUnread(n)) await markAsRead(n.id);

    if (n.post_id) {
      navigate(`/social?post=${n.post_id}`);
      return;
    }

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
            (UI only for now - we will wire real push later.)
          </div>
        </CardHeader>
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-sm text-white/80">
          {loading ? "Loading..." : `${notifications.length} total`}
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
          <div className="text-white/70">Loading…</div>
        ) : notifications.length === 0 ? (
          <div className="text-white/70">No notifications yet.</div>
        ) : (
          notifications.map((n) => {
            const { title, message } = formatNotification(n);
            const unread = !n.read_at;

            return (
              <Card
                key={n.id}
                className={`cursor-pointer transition-all ${
                  unread ? "border-pink-200 bg-pink-50" : "hover:bg-gray-50"
                }`}
                onClick={async () => {
                  if (!n.read_at) {
                    await supabase
                      .from("notifications")
                      .update({ read_at: new Date().toISOString() })
                      .eq("id", n.id);

                    setNotifications((prev) =>
                      prev.map((x) =>
                        x.id === n.id
                          ? { ...x, read_at: new Date().toISOString() }
                          : x
                      )
                    );
                  }
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div>
                      {n.type === "post_like" && <Heart className="w-5 h-5 text-pink-500" />}
                      {n.type === "post_comment" && <MessageCircle className="w-5 h-5 text-blue-500" />}
                      {n.type === "comment_reply" && <MessageCircle className="w-5 h-5 text-purple-500" />}
                    </div>

                    <div className="flex-1">
                      <p className="font-medium text-sm">{title}</p>
                      <p className="text-sm text-gray-600 mt-1">{message}</p>
                      {unread && (
                        <div className="w-2 h-2 bg-pink-500 rounded-full mt-2"></div>
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
