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

type UiNotification = {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: string;
  post_id: string | null;
  comment_id: string | null;
  created_at: string;
  read_at: string | null;
  actorName?: string;
  postSnippet?: string;
};

function displayNameFromProfile(p: any) {
  return p?.full_name || p?.name || p?.username || null;
}

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

function isUnread(n: UiNotification) {
  return !n.read_at;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfThisWeek() {
  const d = new Date();
  const day = d.getDay(); // 0 Sun ... 6 Sat
  const diff = (day + 6) % 7; // make Monday start
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function groupKey(n: UiNotification) {
  const unread = !n.read_at;
  if (unread) return "New";

  const t = new Date(n.created_at).getTime();
  if (t >= startOfToday()) return "Today";
  if (t >= startOfThisWeek()) return "This week";
  return "Earlier";
}

const GROUP_ORDER = ["New", "Today", "This week", "Earlier"] as const;

function getIcon(type: NotificationType) {
  if (type === "post_like" || type === "match") {
    return <Heart className="w-5 h-5 text-pink-300" />;
  }
  if (type === "new_post") {
    return <MessageCircle className="w-5 h-5 text-pink-200" />;
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

  const [notifications, setNotifications] = useState<UiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actorNameById, setActorNameById] = useState<Record<string, string>>({});
  const [postSnippetById, setPostSnippetById] = useState<Record<string, string>>({});
  const [commentSnippetById, setCommentSnippetById] = useState<Record<string, string>>({});

  // UI-only toggle (real push later)
  const [pushEnabled, setPushEnabled] = useState(true);

  const formatNotification = (n: any) => {
    const who = n.actorName || "Someone";
    const snippet = n.postSnippet ? `: "${n.postSnippet}"` : "";

    switch (n.type) {
      case "new_post":
        return {
          title: "New post 💜",
          message: "Someone just shared a post in the community.",
        };

      case "post_like":
        return {
          title: `${who} liked your post${snippet} 💜`,
          message: "",
        };

      case "post_comment":
        return {
          title: `${who} commented on your post${snippet}`,
          message: "",
        };

      case "comment_reply":
        return {
          title: `${who} replied to your comment${snippet}`,
          message: "",
        };

      default:
        return { title: "Notification", message: "" };
    }
  };

  const hydrateActors = async (rows: UiNotification[]) => {
    const ids = Array.from(
      new Set(rows.map((n) => n.actor_id).filter(Boolean) as string[])
    ).filter((id) => !actorNameById[id]);

    if (ids.length === 0) return rows;

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, full_name, name, username")
      .in("id", ids);

    if (error) {
      console.warn("actor profiles lookup failed:", error.message);
      return rows;
    }

    const nextMap: Record<string, string> = {};
    (profiles ?? []).forEach((p: any) => {
      const name = displayNameFromProfile(p);
      if (name) nextMap[p.id] = name;
    });

    setActorNameById((prev) => ({ ...prev, ...nextMap }));

    return rows.map((n) => ({
      ...n,
      actorName: n.actor_id ? nextMap[n.actor_id] || actorNameById[n.actor_id] : undefined,
    }));
  };

  const hydratePosts = async (rows: UiNotification[]) => {
    const postIds = Array.from(
      new Set(rows.map((n) => n.post_id).filter(Boolean) as string[])
    ).filter((id) => !postSnippetById[id]); // only fetch unknown posts

    if (postIds.length === 0) return rows;

    const { data: posts, error } = await supabase
      .from("posts")
      .select("id, title, body")
      .in("id", postIds);

    if (error) {
      console.warn("post snippet lookup failed:", error.message);
      return rows;
    }

    const nextMap: Record<string, string> = {};
    (posts ?? []).forEach((p: any) => {
      const text = p.title || p.body || "";
      const snippetText =
        text.length > 60 ? text.slice(0, 60).trim() + "…" : text;
      nextMap[p.id] = snippetText;
    });

    setPostSnippetById((prev) => ({ ...prev, ...nextMap }));

    return rows.map((n) => ({
      ...n,
      postSnippet:
        n.post_id ? nextMap[n.post_id] || postSnippetById[n.post_id] : undefined,
    }));
  };

  const hydrateActorsAndTargets = async (rows: UiNotification[]) => {
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
          map[p.id] = displayNameFromProfile(p) || "Member";
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
  const grouped = useMemo(() => {
    const map = new Map<string, UiNotification[]>();
    (notifications ?? []).forEach((n) => {
      const k = groupKey(n);
      map.set(k, [...(map.get(k) ?? []), n]);
    });

    return GROUP_ORDER
      .map((k) => ({ key: k, items: map.get(k) ?? [] }))
      .filter((g) => g.items.length > 0);
  }, [notifications]);

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
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as UiNotification[];
    let hydrated = await hydrateActors(
      rows.map((n) => ({
        ...n,
        actorName: n.actor_id ? actorNameById[n.actor_id] : undefined,
      }))
    );
    hydrated = await hydratePosts(hydrated);

    setNotifications(hydrated);
    setError(null);
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

    const t = encodeURIComponent(n.type || "");
    if (n.post_id) {
      navigate(`/social?post=${n.post_id}&t=${t}`);
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
        async (payload) => {
          const row = (payload as any).new as UiNotification;
          if (!row || row.recipient_id !== user.id) return;

          let actorName: string | undefined =
            row.actor_id ? actorNameById[row.actor_id] : undefined;

          // fetch actor name if missing
          if (row.actor_id && !actorName) {
            const { data: prof } = await supabase
              .from("profiles")
              .select("id, full_name, name, username")
              .eq("id", row.actor_id)
              .single();

            const name = displayNameFromProfile(prof);
            if (name) {
              actorName = name;
              setActorNameById((prev) => ({ ...prev, [row.actor_id!]: name }));
            }
          }

          let postSnippet: string | undefined =
            row.post_id ? postSnippetById[row.post_id] : undefined;

          if (row.post_id && !postSnippet) {
            const { data: post } = await supabase
              .from("posts")
              .select("id, title, body")
              .eq("id", row.post_id)
              .single();

            if (post) {
              const text = post.title || post.body || "";
              postSnippet =
                text.length > 60 ? text.slice(0, 60).trim() + "…" : text;

              setPostSnippetById((prev) => ({
                ...prev,
                [row.post_id!]: postSnippet!,
              }));
            }
          }

          setNotifications((prev) => [
            { ...row, actorName, postSnippet },
            ...prev,
          ]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications" },
        (payload) => {
          const row = (payload as any).new as UiNotification;
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
      <div className="space-y-4">
        {loading ? (
          <div className="text-white/70">Loading…</div>
        ) : notifications.length === 0 ? (
          <Card className="bg-black/30 border-white/15 text-white">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <Bell className="w-5 h-5 text-white/70" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold">You’re all caught up</div>
                  <div className="text-sm text-white/70 mt-1">
                    Likes and comments will show up here as they happen.
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      className="bg-white/10 hover:bg-white/15 text-white"
                      onClick={() => navigate("/social")}
                    >
                      Go to Social
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                      onClick={loadNotifications}
                    >
                      Refresh
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          grouped.map((group) => (
            <div key={group.key} className="space-y-3">
              <div className="text-xs uppercase tracking-wide text-white/60 px-1">
                {group.key}
              </div>

              {group.items.map((n) => {
                const { title, message } = formatNotification(n);
                const unread = !n.read_at;

                return (
                  <Card
                    key={n.id}
                    className={`cursor-pointer transition-all bg-black/35 border-white/15 text-white hover:bg-black/45 ${
                      unread ? "ring-1 ring-pink-400/30" : ""
                    }`}
                    onClick={() => openNotification(n)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">{getIcon(n.type)}</div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{title}</p>
                              {message ? (
                                <p className="text-sm text-white/70 mt-1 line-clamp-2">
                                  {message}
                                </p>
                              ) : null}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs text-white/60">
                                {timeAgo(n.created_at)}
                              </span>
                              {unread && (
                                <span className="h-2 w-2 rounded-full bg-red-500" />
                              )}
                            </div>
                          </div>

                          {n.type === "post_like" && (
                            <div className="mt-2 text-xs text-white/60">
                              Tap to view the post
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ))
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
