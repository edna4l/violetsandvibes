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
  | "match"
  | "message"
  | "event"
  | string;

type NotificationRow = {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: NotificationType;
  post_id: string | null;
  comment_id: string | null;
  created_at: string;
  read_at: string | null;
};

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
  if (type === "post_like" || type === "match") {
    return <Heart className="w-5 h-5 text-pink-300" />;
  }
  if (type === "post_comment" || type === "comment_reply" || type === "message") {
    return <MessageCircle className="w-5 h-5 text-cyan-200" />;
  }
  if (type === "event") return <Calendar className="w-5 h-5 text-purple-200" />;
  return <Bell className="w-5 h-5 text-white/70" />;
}

function snippet(text?: string | null, max = 80) {
  const t = (text ?? "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

const NotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actorNameById, setActorNameById] = useState<Record<string, string>>({});
  const [postSnippetById, setPostSnippetById] = useState<Record<string, string>>({});
  const [commentSnippetById, setCommentSnippetById] = useState<Record<string, string>>({});

  // UI-only toggle (real push later)
  const [pushEnabled, setPushEnabled] = useState(true);

  const formatNotification = (n: NotificationRow) => {
    const who = n.actor_id ? (actorNameById[n.actor_id] || "Someone") : "Someone";
    const postText = n.post_id ? (postSnippetById[n.post_id] || "your post") : "your post";
    const commentText = n.comment_id ? (commentSnippetById[n.comment_id] || "") : "";

    switch (n.type) {
      case "post_like":
        return {
          title: `${who} liked your post 💜`,
          message: postText ? `“${postText}”` : "",
        };

      case "post_comment":
        return {
          title: `${who} commented`,
          message: commentText ? `“${commentText}”` : (postText ? `On “${postText}”` : ""),
        };

      case "comment_reply":
        return {
          title: `${who} replied to your comment`,
          message: commentText ? `“${commentText}”` : "",
        };

      default:
        return { title: "Notification", message: "" };
    }
  };

  const hydrateActorsAndTargets = async (rows: NotificationRow[]) => {
    if (!rows.length) return;

    const actorIds = Array.from(
      new Set(rows.map((r) => r.actor_id).filter(Boolean) as string[])
    );
    const postIds = Array.from(
      new Set(rows.map((r) => r.post_id).filter(Boolean) as string[])
    );
    const commentIds = Array.from(
      new Set(rows.map((r) => r.comment_id).filter(Boolean) as string[])
    );

    // 1) Actor names
    if (actorIds.length) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, name, username")
        .in("id", actorIds);

      if (!error) {
        const map: Record<string, string> = {};
        (data ?? []).forEach((p: any) => {
          map[p.id] = p.full_name || p.name || p.username || "Member";
        });
        setActorNameById((prev) => ({ ...prev, ...map }));
      }
    }

    // 2) Post snippets
    if (postIds.length) {
      const { data, error } = await supabase
        .from("posts")
        .select("id, title, body")
        .in("id", postIds);

      if (!error) {
        const map: Record<string, string> = {};
        (data ?? []).forEach((p: any) => {
          map[p.id] = snippet(p.title || p.body);
        });
        setPostSnippetById((prev) => ({ ...prev, ...map }));
      }
    }

    // 3) Comment snippets
    if (commentIds.length) {
      const { data, error } = await supabase
        .from("post_comments")
        .select("id, body")
        .in("id", commentIds);

      if (!error) {
        const map: Record<string, string> = {};
        (data ?? []).forEach((c: any) => {
          map[c.id] = snippet(c.body);
        });
        setCommentSnippetById((prev) => ({ ...prev, ...map }));
      }
    }
  };

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read_at).length,
    [notifications]
  );

  const loadNotifications = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    const { data, error: loadError } = await supabase
      .from("notifications")
      .select("id, recipient_id, actor_id, type, post_id, comment_id, created_at, read_at")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (loadError) {
      console.error("loadNotifications error:", loadError);
      setError(loadError.message);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as NotificationRow[];
    setNotifications(rows);
    void hydrateActorsAndTargets(rows);
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    if (!user) return;

    // optimistic
    const now = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: n.read_at ?? now } : n))
    );

    const { error: updateError } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("recipient_id", user.id)
      .eq("id", id)
      .is("read_at", null);

    if (updateError) {
      console.error("markAsRead error:", updateError);
      // revert to truth
      await loadNotifications();
    }
  };

  const markAllRead = async () => {
    if (!user) return;

    const now = new Date().toISOString();

    // optimistic
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })));

    const { error: updateError } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("recipient_id", user.id)
      .is("read_at", null);

    if (updateError) {
      console.error("markAllRead error:", updateError);
      await loadNotifications();
    }
  };

  const openNotification = async (n: any) => {
    if (isUnread(n)) await markAsRead(n.id);

    if (n.post_id) {
      const openComments =
        n.type === "post_comment" || n.type === "comment_reply" ? "1" : "0";

      const commentPart = n.comment_id ? `&comment=${n.comment_id}` : "";

      navigate(`/social?post=${n.post_id}&openComments=${openComments}${commentPart}`);
      return;
    }

    navigate("/social");
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
          const row = (payload as any).new as NotificationRow;
          if (!row || row.recipient_id !== user.id) return;
          setNotifications((prev) => [row, ...prev]);
          void hydrateActorsAndTargets([row]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications" },
        (payload) => {
          const row = (payload as any).new as NotificationRow;
          if (!row || row.recipient_id !== user.id) return;
          setNotifications((prev) => prev.map((n) => (n.id === row.id ? row : n)));
        }
      )
      .subscribe((status) => console.log("vv-notifications status:", status));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Bell className="w-6 h-6 text-white/90" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </div>

          <h2 className="wedding-heading rainbow-header">Notifications</h2>

          {unreadCount > 0 && (
            <Badge className="bg-pink-500">{unreadCount}</Badge>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/settings")}
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {/* Push toggle (UI only) */}
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
          <div className="text-xs text-white/70">(UI only for now — real push later.)</div>
        </CardHeader>
      </Card>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-white/80">
          {loading ? "Loading..." : `${notifications.length} total`}
        </div>

        <div className="flex gap-2">
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
      </div>

      {error && (
        <div className="text-sm text-pink-200 bg-pink-900/20 border border-pink-400/30 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-white/70">Loading…</div>
        ) : notifications.length === 0 ? (
          <div className="text-white/70">No notifications yet.</div>
        ) : (
          notifications.map((n) => {
            const unread = !n.read_at;
            const { title, message } = formatNotification(n);

            return (
              <Card
                key={n.id}
                className={`cursor-pointer transition-all bg-black/35 border-white/15 text-white hover:bg-black/45 ${
                  unread ? "ring-1 ring-pink-400/40" : ""
                }`}
                onClick={() => openNotification(n)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getIcon(n.type)}</div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm text-white truncate">
                          {title}
                        </p>
                        <span className="text-xs text-white/60 shrink-0">
                          {timeAgo(n.created_at)}
                        </span>
                      </div>

                      {message && (
                        <p className="text-sm text-white/75 mt-1">
                          {message}
                        </p>
                      )}

                      {unread && (
                        <div className="w-2 h-2 bg-pink-500 rounded-full mt-2" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Refresh */}
      <div className="pt-2">
        <Button
          variant="ghost"
          className="w-full text-white/80 hover:text-white hover:bg-white/5"
          onClick={() => void loadNotifications()}
          disabled={!user}
        >
          Refresh
        </Button>
      </div>
    </div>
  );
};

export default NotificationCenter;
