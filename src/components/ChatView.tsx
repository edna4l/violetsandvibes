import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, MessageCircle } from "lucide-react";

type ConversationMemberRow = {
  conversation_id: string;
  user_id: string;
  last_read_at: string | null;
  conversations?: {
    id: string;
    created_at: string;
    updated_at: string;
    last_message_at: string | null;
  } | null;
};

type OtherMemberRow = {
  conversation_id: string;
  user_id: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  photos: string[] | null;
};

type ConversationListItem = {
  conversationId: string;
  otherUserId: string;
  otherName: string;
  otherPhoto?: string | null;
  lastMessageAt: string | null;
  lastReadAt: string | null;
  hasUnread: boolean;
  lastMessagePreview?: string | null;
  lastMessageSenderId?: string | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

function timeAgo(iso?: string | null) {
  if (!iso) return "";
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

function getInitials(name: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "V";
  return parts.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function previewText(s?: string | null, max = 60) {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}

const ChatView: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [firstUnreadMessageId, setFirstUnreadMessageId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const threadContainerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const queryConversationId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("c");
  }, [location.search]);

  // Keep URL -> state in sync
  useEffect(() => {
    if (!queryConversationId) return;

    setActiveConversationId(queryConversationId);

    // Clear unread immediately when opening from URL entry points.
    const convo = conversations.find((c) => c.conversationId === queryConversationId);
    if (convo?.hasUnread) {
      void markConversationRead(queryConversationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryConversationId, conversations]);

  useEffect(() => {
    if (queryConversationId) return;
    if (!activeConversationId && conversations.length > 0) {
      const first = conversations[0];
      const firstId = first.conversationId;
      setActiveConversationId(firstId);
      navigate(`/chat?c=${firstId}`, { replace: true });

      // Clear unread immediately for auto-selected thread.
      if (first.hasUnread) {
        void markConversationRead(firstId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryConversationId, conversations, activeConversationId]);

  const isNearBottom = () => {
    const el = threadContainerRef.current;
    if (!el) return true;

    const threshold = 120; // px from bottom considered "near"
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;

    return distanceFromBottom < threshold;
  };

  // Scroll to bottom when messages change, but only if user is already near bottom.
  useEffect(() => {
    if (!threadContainerRef.current) return;

    if (isNearBottom()) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  const loadConversationList = async () => {
    if (!user) {
      setConversations([]);
      setListLoading(false);
      setListError(null);
      return;
    }

    setListLoading(true);
    setListError(null);

    try {
      // 1) My memberships
      const { data: myMemberships, error: memErr } = await supabase
        .from("conversation_members")
        .select("conversation_id, user_id, last_read_at")
        .eq("user_id", user.id);

      if (memErr) throw memErr;

      const memberships = (myMemberships ?? []) as ConversationMemberRow[];
      const convoIds = memberships.map((m) => m.conversation_id);

      if (convoIds.length === 0) {
        setConversations([]);
        return;
      }

      // 2) Convo metadata
      const { data: convoRows, error: convoErr } = await supabase
        .from("conversations")
        .select("id, last_message_at, updated_at, created_at")
        .in("id", convoIds);

      if (convoErr) throw convoErr;

      const convoById = new Map<string, any>();
      (convoRows ?? []).forEach((c: any) => convoById.set(c.id, c));

      // 3) Find the "other" member per conversation
      const { data: otherRows, error: otherErr } = await supabase
        .from("conversation_members")
        .select("conversation_id, user_id")
        .in("conversation_id", convoIds)
        .neq("user_id", user.id);

      if (otherErr) throw otherErr;

      const others = (otherRows ?? []) as OtherMemberRow[];
      const otherUserIds = Array.from(new Set(others.map((r) => r.user_id)));

      // 4) Latest message preview per conversation
      const { data: msgRows, error: msgErr } = await supabase
        .from("messages")
        .select("conversation_id, sender_id, body, created_at")
        .in("conversation_id", convoIds)
        .order("created_at", { ascending: false })
        .limit(200);

      if (msgErr) throw msgErr;

      // Pick first (newest) message per conversation_id
      const latestByConvo = new Map<string, { body: string; sender_id: string; created_at: string }>();
      (msgRows ?? []).forEach((m: any) => {
        if (!latestByConvo.has(m.conversation_id)) {
          latestByConvo.set(m.conversation_id, {
            body: m.body,
            sender_id: m.sender_id,
            created_at: m.created_at,
          });
        }
      });

      // 3) Pull names/photos for other users
      let profiles: ProfileRow[] = [];
      if (otherUserIds.length > 0) {
        const { data: profileRows, error: profErr } = await supabase
          .from("profiles")
          .select("id, full_name, username, photos")
          .in("id", otherUserIds);

        if (profErr) throw profErr;
        profiles = (profileRows ?? []) as ProfileRow[];
      }

      const profileById = new Map<string, ProfileRow>();
      profiles.forEach((p) => profileById.set(p.id, p));

      const lastReadByConvo = new Map<string, string | null>();

      memberships.forEach((m) => {
        lastReadByConvo.set(m.conversation_id, m.last_read_at ?? null);
      });

      const items: ConversationListItem[] = convoIds.map((cid) => {
        const otherUserId = others.find((o) => o.conversation_id === cid)?.user_id || "";
        const prof = otherUserId ? profileById.get(otherUserId) : undefined;

        const otherName = (prof?.full_name || prof?.username || "Member") as string;
        const otherPhoto = prof?.photos?.[0] ?? null;

        const lastReadAt = lastReadByConvo.get(cid) ?? null;
        const meta = convoById.get(cid);
        const lastMessageAt = meta?.last_message_at ?? null;
        const latest = latestByConvo.get(cid);
        const lastMessagePreview = previewText(latest?.body ?? null);
        const lastMessageSenderId = latest?.sender_id ?? null;

        // Simple unread heuristic:
        // unread if last_message_at exists and is newer than last_read_at
        const hasUnread =
          !!lastMessageAt &&
          (!lastReadAt || new Date(lastMessageAt).getTime() > new Date(lastReadAt).getTime());

        return {
          conversationId: cid,
          otherUserId,
          otherName,
          otherPhoto,
          lastMessageAt,
          lastReadAt,
          hasUnread,
          lastMessagePreview,
          lastMessageSenderId,
        };
      });

      // Sort by lastMessageAt desc (fallback to updated order)
      items.sort((a, b) => {
        const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return tb - ta;
      });

      setConversations(items);
    } catch (e: any) {
      console.error(e);
      setListError(e?.message || "Failed to load conversations");
    } finally {
      setListLoading(false);
    }
  };

  const markConversationRead = async (conversationId: string) => {
    if (!user) return;
    const now = new Date().toISOString();

    // optimistic list update
    setConversations((prev) =>
      prev.map((c) =>
        c.conversationId === conversationId
          ? { ...c, lastReadAt: now, hasUnread: false }
          : c
      )
    );

    const { error } = await supabase
      .from("conversation_members")
      .update({ last_read_at: now })
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);

    if (error) {
      console.warn("markConversationRead error:", error.message);
      // Not fatal—leave UI as-is; next reload will reconcile.
    }
  };

  const loadThread = async (conversationId: string) => {
    if (!user) return;

    setThreadLoading(true);
    setThreadError(null);

    try {
      // 0) Get my last_read_at BEFORE marking read
      const { data: memRow, error: memErr } = await supabase
        .from("conversation_members")
        .select("last_read_at")
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id)
        .single();

      if (memErr) throw memErr;
      const lastReadAt = memRow?.last_read_at as string | null;

      // 1) Load messages
      const { data, error } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, body, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(200);

      if (error) throw error;

      const rows = (data ?? []) as MessageRow[];
      setMessages(rows);

      // 2) Compute first unread message id (only messages after last_read_at, not mine)
      if (!lastReadAt) {
        setFirstUnreadMessageId(null);
      } else {
        const firstUnread = rows.find(
          (m) =>
            m.sender_id !== user.id &&
            new Date(m.created_at).getTime() > new Date(lastReadAt).getTime()
        );
        setFirstUnreadMessageId(firstUnread?.id ?? null);
      }

      // 3) Mark conversation read (existing behavior)
      await markConversationRead(conversationId);
    } catch (e: any) {
      console.error(e);
      setThreadError(e?.message || "Failed to load messages");
    } finally {
      setThreadLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!user || !activeConversationId) return;
    const body = draft.trim();
    if (!body) return;

    setSending(true);

    // optimistic message
    const tempId = `temp_${Date.now()}`;
    const optimistic: MessageRow = {
      id: tempId,
      conversation_id: activeConversationId,
      sender_id: user.id,
      body,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimistic]);
    setDraft("");

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: activeConversationId,
          sender_id: user.id,
          body,
        })
        .select("id, conversation_id, sender_id, body, created_at")
        .single();

      if (error) throw error;

      // replace optimistic with real row
      setMessages((prev) => prev.map((m) => (m.id === tempId ? (data as MessageRow) : m)));

      // conversation list: bump lastMessageAt + clear unread (for me)
      setConversations((prev) =>
        prev.map((c) =>
          c.conversationId === activeConversationId
            ? { ...c, lastMessageAt: (data as any).created_at, hasUnread: false }
            : c
        )
      );

      await markConversationRead(activeConversationId);
    } catch (e: any) {
      console.error(e);
      // remove optimistic
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setDraft(body);
      setThreadError(e?.message || "Could not send message");
    } finally {
      setSending(false);
    }
  };

  // Load list on auth
  useEffect(() => {
    void loadConversationList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Load thread when activeConversationId changes
  useEffect(() => {
    setFirstUnreadMessageId(null);
    if (!user || !activeConversationId) {
      setMessages([]);
      return;
    }
    void loadThread(activeConversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeConversationId]);

  useEffect(() => {
    if (!user) return;

    // Subscribe to any message INSERTs for conversations where I'm a member
    const channel = supabase
      .channel(`vv-chat-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const row = (payload as any).new as MessageRow | undefined;
          if (!row?.conversation_id) return;

          // Gate: only react if I'm a member of that conversation.
          // (This prevents seeing messages from conversations I'm not part of.)
          const { data: memberRow, error: memErr } = await supabase
            .from("conversation_members")
            .select("conversation_id")
            .eq("conversation_id", row.conversation_id)
            .eq("user_id", user.id)
            .maybeSingle();

          if (memErr || !memberRow) return;

          // 1) If this is the active thread, append (dedupe-safe)
          setMessages((prev) => {
            if (row.conversation_id !== activeConversationId) return prev;
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });

          // 2) Update conversation list: preview, time, unread, move to top
          setConversations((prev) => {
            const next = prev.map((c) => {
              if (c.conversationId !== row.conversation_id) return c;

              const isMine = row.sender_id === user.id;
              const nowIso = row.created_at;

              // If I sent it, don't mark unread for me.
              const hasUnread = isMine ? false : true;

              return {
                ...c,
                lastMessageAt: nowIso,
                lastMessagePreview: previewText(row.body),
                lastMessageSenderId: row.sender_id,
                hasUnread,
              };
            });

            // Move this conversation to top
            next.sort((a, b) => {
              const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
              const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
              return tb - ta;
            });

            return next;
          });

          // 3) Keep server truth up to date (best effort)
          // Update conversations.last_message_at (optional but recommended)
          await supabase
            .from("conversations")
            .update({ last_message_at: row.created_at })
            .eq("id", row.conversation_id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // IMPORTANT: include activeConversationId so thread appends correctly
  }, [user?.id, activeConversationId]);

  // Realtime subscription:
  // - conversation_members updates for me (unread/read reconciliation)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("vv-chat")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversation_members" },
        (payload) => {
          const row = (payload as any).new as any;
          if (!row) return;
          if (row.user_id !== user.id) return;

          setConversations((prev) =>
            prev.map((c) => {
              if (c.conversationId !== row.conversation_id) return c;
              const lastReadAt = row.last_read_at ?? null;
              const lastMessageAt = c.lastMessageAt ?? null;

              const hasUnread =
                !!lastMessageAt &&
                (!lastReadAt ||
                  new Date(lastMessageAt).getTime() > new Date(lastReadAt).getTime());

              return { ...c, lastReadAt, hasUnread };
            })
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, activeConversationId]); // intentional dependency

  const active = useMemo(
    () => conversations.find((c) => c.conversationId === activeConversationId) || null,
    [conversations, activeConversationId]
  );

  if (!user) {
    return (
      <div className="p-6 text-center text-white/80">
        Please sign in to use chat.
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] h-full">
        {/* LEFT: Conversation list */}
        <div className="border-b md:border-b-0 md:border-r border-white/10 bg-black/30">
          <div className="p-4 flex items-center justify-between">
            <div className="text-white font-semibold flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-pink-300" />
              Chat
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
              onClick={loadConversationList}
            >
              Refresh
            </Button>
          </div>

          {listLoading ? (
            <div className="p-4 text-white/70 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading conversations…
            </div>
          ) : listError ? (
            <div className="p-4 text-pink-200">{listError}</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-white/70">
              No conversations yet. Go to a profile and tap “Message”.
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {conversations.map((c) => {
                const isActive = c.conversationId === activeConversationId;
                return (
                  <button
                    key={c.conversationId}
                    type="button"
                    onClick={() => {
                      setActiveConversationId(c.conversationId);
                      navigate(`/chat?c=${c.conversationId}`, { replace: false });

                      // clear unread immediately for better UX
                      if (c.hasUnread) {
                        void markConversationRead(c.conversationId);
                      }
                    }}
                    className={`w-full text-left rounded-xl p-3 transition-all border ${
                      isActive
                        ? "bg-violet-950/70 border-violet-400/40"
                        : "bg-black/40 border-white/10 hover:bg-black/55"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="relative">
                        {c.otherPhoto ? (
                          <img
                            src={c.otherPhoto}
                            alt={c.otherName}
                            className="w-10 h-10 rounded-full object-cover border border-white/15"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white font-semibold">
                            {getInitials(c.otherName)}
                          </div>
                        )}
                        {c.hasUnread && (
                          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-white font-semibold truncate">
                            {c.otherName}
                          </div>
                          <div className="text-xs text-white/60 shrink-0">
                            {timeAgo(c.lastMessageAt)}
                          </div>
                        </div>
                        <div className="text-xs text-white/55 mt-0.5 truncate">
                          {c.lastMessagePreview
                            ? `${c.lastMessageSenderId === user?.id ? "You: " : ""}${c.lastMessagePreview}`
                            : c.hasUnread
                              ? "New messages"
                              : "—"}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Thread */}
        <div className="flex flex-col h-full bg-black/20">
          {/* Thread header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="text-white font-semibold">
              {active ? active.otherName : "Select a conversation"}
            </div>
            {active ? (
              <Button
                size="sm"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
                onClick={() => markConversationRead(active.conversationId)}
              >
                Mark read
              </Button>
            ) : null}
          </div>

          {/* Messages */}
          <div ref={threadContainerRef} className="flex-1 overflow-y-auto p-4 space-y-2">
            {!activeConversationId ? (
              <div className="text-white/70">
                Choose someone to start chatting 💜
              </div>
            ) : threadLoading ? (
              <div className="text-white/70 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading messages…
              </div>
            ) : threadError ? (
              <Card className="bg-pink-900/20 border-pink-400/30 text-pink-100 p-3">
                {threadError}
              </Card>
            ) : messages.length === 0 ? (
              <div className="text-white/70">
                No messages yet. Say hi ✨
              </div>
            ) : (
              messages.map((m) => {
                const mine = m.sender_id === user.id;
                const showDivider = m.id === firstUnreadMessageId;

                return (
                  <React.Fragment key={m.id}>
                    {showDivider && (
                      <div className="flex items-center gap-3 my-3">
                        <div className="h-px flex-1 bg-white/15" />
                        <div className="text-[11px] px-2 py-1 rounded-full bg-white/10 text-white/70 border border-white/10">
                          New messages
                        </div>
                        <div className="h-px flex-1 bg-white/15" />
                      </div>
                    )}

                    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                          mine
                            ? "bg-gradient-to-r from-pink-500/90 to-purple-600/90 text-white"
                            : "bg-white/10 text-white/90 border border-white/10"
                        }`}
                      >
                        {m.body}
                        <div className="text-[11px] mt-1 opacity-70">{timeAgo(m.created_at)}</div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Composer */}
          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={activeConversationId ? "Write a message…" : "Select a conversation…"}
                disabled={!activeConversationId || sending}
                className="bg-violet-900/30 border-violet-400/30 text-white placeholder:text-white/50"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
              />
              <Button
                onClick={sendMessage}
                disabled={!activeConversationId || sending || !draft.trim()}
                className="bg-pink-500 hover:bg-pink-600"
              >
                {sending ? "Sending…" : "Send"}
              </Button>
            </div>
            <div className="text-[11px] text-white/50 mt-2">
              Press Enter to send • Shift+Enter for a new line
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
