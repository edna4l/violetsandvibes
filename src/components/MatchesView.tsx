import React, { useEffect, useMemo, useState } from "react";
import { Heart, Loader2, MessageCircle, Sparkles, Star, Wand2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { fetchMyMatches, type MatchRow } from "@/lib/matches";
import { getOrCreateDirectConversation } from "@/lib/messaging";
import { loadBlockedUserIdSet } from "@/lib/safety";
import WhoLikedMeView from "@/components/WhoLikedMeView";

type MatchProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  photos: string[] | null;
  location: string | null;
};

type UiMatch = {
  matchId: string;
  conversationId: string | null;
  otherUserId: string;
  name: string;
  photo: string | null;
  location: string | null;
  createdAt: string;
  isNewMatch: boolean;
  hasUnread: boolean;
  lastMessageText?: string | null;
  lastMessageAt?: string | null;
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

const NEW_MATCH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const MatchesView: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"matches" | "liked">("matches");
  const [matches, setMatches] = useState<UiMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  const [icebreakerMatchId, setIcebreakerMatchId] = useState<string | null>(null);
  const [icebreakerSuggestions, setIcebreakerSuggestions] = useState<string[]>([]);
  const [icebreakerLoading, setIcebreakerLoading] = useState(false);
  const blockedUserIdsKey = useMemo(
    () => Array.from(blockedUserIds).sort().join(","),
    [blockedUserIds]
  );

  const toUiMatch = (row: MatchRow, myId: string, prof?: MatchProfileRow): UiMatch => {
    const otherUserId = row.user1_id === myId ? row.user2_id : row.user1_id;
    const createdAtMs = new Date(row.created_at).getTime();
    return {
      matchId: row.id,
      conversationId: row.conversation_id,
      otherUserId,
      name: prof?.full_name || prof?.username || "Member",
      photo: prof?.photos?.[0] ?? null,
      location: prof?.location ?? null,
      createdAt: row.created_at,
      hasUnread: false,
      lastMessageText: null,
      lastMessageAt: null,
      isNewMatch: !Number.isNaN(createdAtMs) && Date.now() - createdAtMs <= NEW_MATCH_WINDOW_MS,
    };
  };

  const fetchIcebreakers = async (match: UiMatch) => {
    if (icebreakerMatchId === match.matchId) {
      setIcebreakerMatchId(null);
      setIcebreakerSuggestions([]);
      return;
    }
    setIcebreakerMatchId(match.matchId);
    setIcebreakerSuggestions([]);
    setIcebreakerLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/ai-icebreaker`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ matchProfileId: match.otherUserId }),
      });
      const json = await res.json();
      setIcebreakerSuggestions(json.suggestions ?? []);
    } catch {
      toast({ title: "Could not load icebreakers", variant: "destructive" });
      setIcebreakerMatchId(null);
    } finally {
      setIcebreakerLoading(false);
    }
  };

  const sendIcebreaker = async (match: UiMatch, text: string) => {
    try {
      let conversationId = match.conversationId;
      if (!conversationId) {
        conversationId = await getOrCreateDirectConversation(user!.id, match.otherUserId);
      }
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user!.id,
        content: text,
      });
      setIcebreakerMatchId(null);
      setIcebreakerSuggestions([]);
      navigate(`/chat?c=${conversationId}`);
    } catch (e: any) {
      toast({ title: "Could not send message", description: e?.message, variant: "destructive" });
    }
  };

  const openMatchChat = async (match: UiMatch) => {
    if (!user) return;
    try {
      setMatches((prev) =>
        prev.map((m) => m.matchId === match.matchId ? { ...m, hasUnread: false } : m)
      );
      let conversationId = match.conversationId;
      if (!conversationId) {
        conversationId = await getOrCreateDirectConversation(user.id, match.otherUserId);
        setMatches((prev) =>
          prev.map((m) => m.matchId === match.matchId ? { ...m, conversationId } : m)
        );
      }
      navigate(`/chat?c=${conversationId}`);
    } catch (e: any) {
      toast({ title: "Could not open chat", description: e?.message || "Please try again." });
    }
  };

  useEffect(() => {
    if (!user) {
      setMatches([]);
      setError(null);
      setLoading(false);
      setBlockedUserIds(new Set());
      return;
    }

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const blockedSet = await loadBlockedUserIdSet(user.id);
        const nextBlockedKey = Array.from(blockedSet).sort().join(",");
        if (nextBlockedKey !== blockedUserIdsKey) setBlockedUserIds(blockedSet);

        const rows = await fetchMyMatches(user.id);
        const visibleRows = rows.filter((row) => {
          const otherId = row.user1_id === user.id ? row.user2_id : row.user1_id;
          return !blockedSet.has(otherId);
        });

        if (visibleRows.length === 0) { setMatches([]); return; }

        const { data: memRows, error: memErr } = await supabase
          .from("conversation_members")
          .select("conversation_id, last_read_at")
          .eq("user_id", user.id);
        if (memErr) throw memErr;

        const lastReadByConvo = new Map<string, string | null>();
        (memRows ?? []).forEach((m: any) => lastReadByConvo.set(m.conversation_id, m.last_read_at ?? null));

        const otherUserIds = Array.from(new Set(
          visibleRows.map((m) => (m.user1_id === user.id ? m.user2_id : m.user1_id))
        ));

        let profileRows: MatchProfileRow[] = [];
        if (otherUserIds.length > 0) {
          const { data, error: profileError } = await supabase
            .from("profiles")
            .select("id, full_name, username, photos, location")
            .in("id", otherUserIds);
          if (profileError) throw profileError;
          profileRows = (data ?? []) as MatchProfileRow[];
        }

        const profileById = new Map<string, MatchProfileRow>();
        profileRows.forEach((p) => profileById.set(p.id, p));

        const uiRows = visibleRows.map((m: MatchRow) => {
          const otherId = m.user1_id === user.id ? m.user2_id : m.user1_id;
          return toUiMatch(m, user.id, profileById.get(otherId));
        });

        const convoIds = uiRows.map((m) => m.conversationId).filter(Boolean) as string[];
        if (convoIds.length > 0) {
          const { data: msgRows, error: msgErr } = await supabase
            .from("messages")
            .select("conversation_id, body, created_at")
            .in("conversation_id", convoIds)
            .order("created_at", { ascending: false })
            .limit(200);

          if (!msgErr) {
            const latestByConvo = new Map<string, { body: string; created_at: string }>();
            for (const r of msgRows ?? []) {
              if (!latestByConvo.has(r.conversation_id))
                latestByConvo.set(r.conversation_id, { body: r.body, created_at: r.created_at });
            }
            uiRows.forEach((m) => {
              if (!m.conversationId) return;
              const latest = latestByConvo.get(m.conversationId);
              if (!latest) return;
              m.lastMessageText = latest.body;
              m.lastMessageAt = latest.created_at;
            });
          }
        }

        uiRows.forEach((m) => {
          if (!m.conversationId) { m.hasUnread = false; return; }
          const lastReadAt = lastReadByConvo.get(m.conversationId) ?? null;
          m.hasUnread = !!m.lastMessageAt &&
            (!lastReadAt || new Date(m.lastMessageAt).getTime() > new Date(lastReadAt).getTime());
        });

        uiRows.sort((a, b) => {
          if (a.hasUnread !== b.hasUnread) return a.hasUnread ? -1 : 1;
          const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.createdAt).getTime();
          const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.createdAt).getTime();
          return tb - ta;
        });

        setMatches(uiRows);
      } catch (e: any) {
        setError(e?.message || "Failed to load matches");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [user?.id, blockedUserIdsKey]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`vv-matches-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "matches" }, async (payload) => {
        const row = (payload as any).new as MatchRow | undefined;
        if (!row) return;
        if (row.user1_id !== user.id && row.user2_id !== user.id) return;
        const otherUserId = row.user1_id === user.id ? row.user2_id : row.user1_id;
        if (blockedUserIds.has(otherUserId)) return;
        const { data: profileRow } = await supabase
          .from("profiles").select("id, full_name, username, photos, location")
          .eq("id", otherUserId).maybeSingle();
        const ui = toUiMatch(row, user.id, (profileRow as MatchProfileRow | null) ?? undefined);
        setMatches((prev) => {
          if (prev.some((m) => m.matchId === row.id)) return prev;
          return [ui, ...prev];
        });
        toast({ title: "New match 💜", description: `You matched with ${ui.name}.` });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matches" }, (payload) => {
        const row = (payload as any).new as MatchRow | undefined;
        if (!row) return;
        if (row.user1_id !== user.id && row.user2_id !== user.id) return;
        setMatches((prev) =>
          prev.map((m) => m.matchId === row.id ? { ...m, conversationId: row.conversation_id } : m)
        );
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, toast, blockedUserIdsKey]);

  const newMatches = useMemo(() => matches.filter((m) => m.isNewMatch), [matches]);
  const oldMatches = useMemo(() => matches.filter((m) => !m.isNewMatch), [matches]);

  if (authLoading || loading) {
    return (
      <div className="vv-matches-content">
        <div className="vv-matches-loading">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          Loading matches…
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="vv-matches-content">
        <p className="vv-matches-none">Please sign in to see your matches.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="vv-matches-content">
        <div className="vv-matches-error">{error}</div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="vv-matches-empty">
        <div className="vv-matches-empty-emoji" aria-hidden>🌙💜🌸</div>
        <div className="vv-matches-empty-label">
          <Heart className="w-5 h-5 fill-current" aria-hidden />
          Matches
        </div>
        <h2 className="vv-matches-empty-heading">No matches yet.</h2>
        <p className="vv-matches-empty-body">Keep connecting and check back soon.</p>
        <div className="vv-matches-empty-divider">
          <span className="vv-matches-divider-line" aria-hidden />
          <span aria-hidden>🌸</span>
          <span className="vv-matches-divider-line" aria-hidden />
        </div>
      </div>
    );
  }

  return (
    <div className="vv-matches-content">
      {/* Tab switcher */}
      <div className="vv-matches-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "matches" ? "true" : "false"}
          onClick={() => setActiveTab("matches")}
          className={`vv-matches-tab${activeTab === "matches" ? " vv-matches-tab--active" : ""}`}
        >
          <Heart className="w-4 h-4" aria-hidden />
          Matches
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "liked" ? "true" : "false"}
          onClick={() => setActiveTab("liked")}
          className={`vv-matches-tab${activeTab === "liked" ? " vv-matches-tab--active-star" : ""}`}
        >
          <Star className="w-4 h-4" aria-hidden />
          Liked Me
        </button>
      </div>

      {activeTab === "liked" ? (
        <WhoLikedMeView />
      ) : (
        <>
          {/* New Matches */}
          <div className="vv-matches-section">
            <h2 className="vv-matches-section-title">
              <Heart className="w-4 h-4 fill-current" aria-hidden />
              New Matches
            </h2>
            {newMatches.length === 0 ? (
              <p className="vv-matches-none">No new matches this week.</p>
            ) : (
              <div className="vv-matches-bubble-row" aria-label="New matches">
                {newMatches.map((match) => (
                  <div key={match.matchId} className="vv-match-bubble">
                    <button
                      type="button"
                      className="vv-match-bubble-btn"
                      onClick={() => void openMatchChat(match)}
                    >
                      <div className="vv-match-bubble-avatar">
                        {match.photo ? (
                          <img
                            src={match.photo}
                            alt={match.name}
                            className="vv-match-bubble-img"
                            loading="lazy"
                          />
                        ) : (
                          <div className="vv-match-bubble-placeholder">
                            {match.name.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div className="vv-match-sparkle-badge" aria-hidden>
                          <Sparkles className="w-3 h-3 text-white" />
                        </div>
                      </div>
                      <p className="vv-match-bubble-name">{match.name}</p>
                    </button>

                    <div className="vv-match-bubble-actions">
                      <button
                        type="button"
                        className="vv-match-action-btn"
                        onClick={() => void openMatchChat(match)}
                      >
                        Message
                      </button>
                      <button
                        type="button"
                        className="vv-match-action-btn"
                        onClick={() => navigate(`/profile/${match.otherUserId}`)}
                      >
                        Profile
                      </button>
                      <button
                        type="button"
                        className={`vv-match-action-btn${icebreakerMatchId === match.matchId ? " vv-match-action-btn--ice" : ""}`}
                        onClick={() => void fetchIcebreakers(match)}
                      >
                        <Wand2 className="w-3 h-3" aria-hidden />
                        {icebreakerMatchId === match.matchId && icebreakerLoading ? "…" : "Icebreaker"}
                      </button>
                    </div>

                    {icebreakerMatchId === match.matchId && !icebreakerLoading && icebreakerSuggestions.length > 0 && (
                      <div className="vv-icebreaker-list">
                        {icebreakerSuggestions.map((s, i) => (
                          <button
                            key={i}
                            type="button"
                            className="vv-icebreaker-btn"
                            onClick={() => void sendIcebreaker(match, s)}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="vv-matches-section">
            <h2 className="vv-matches-section-title">
              <MessageCircle className="w-4 h-4" aria-hidden />
              Messages
            </h2>
            {oldMatches.length === 0 ? (
              <p className="vv-matches-none">No message threads yet.</p>
            ) : (
              <div className="vv-matches-list">
                {oldMatches.map((match) => (
                  <button
                    key={match.matchId}
                    type="button"
                    className="vv-match-row"
                    onClick={() => void openMatchChat(match)}
                  >
                    <div className="vv-match-row-avatar">
                      {match.photo ? (
                        <img src={match.photo} alt={match.name} loading="lazy" />
                      ) : (
                        <div className="vv-match-row-avatar-placeholder">
                          {match.name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      {match.hasUnread && <span className="vv-match-unread-dot" aria-label="Unread message" />}
                    </div>

                    <div className="vv-match-row-info">
                      <div className="vv-match-row-name-row">
                        <span className="vv-match-row-name">{match.name}</span>
                        <span className="vv-match-row-time">{timeAgo(match.lastMessageAt || match.createdAt)}</span>
                      </div>
                      <p className="vv-match-row-preview">
                        {match.lastMessageText ?? "Tap to open chat"}
                      </p>
                      {match.location && (
                        <p className="vv-match-row-location">{match.location}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MatchesView;
