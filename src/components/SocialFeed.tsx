import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EventCard from "./EventCard";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

type PostRow = {
  id: string;
  author_id: string;
  title: string | null;
  body: string;
  created_at: string;
};

type FeedPost = PostRow & {
  authorName: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

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

const SocialFeed: React.FC = () => {
  const { user } = useAuth();

  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);

  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Events (still mock for now)
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    maxAttendees: 10,
  });

  const mockEvents = useMemo(
    () => [
      {
        id: "1",
        title: "Pride Book Club Meetup",
        description:
          'Join us for our monthly book discussion! This month we\'re reading "Red: A Crayon\'s Story"',
        date: "March 15, 2024",
        time: "7:00 PM",
        location: "Rainbow Café, Downtown",
        attendees: 8,
        maxAttendees: 15,
        tags: ["Books", "Community", "Discussion"],
        organizer: "Sarah Chen",
        isAttending: false,
      },
      {
        id: "2",
        title: "Queer Hiking Adventure",
        description:
          "Let's explore nature together! Family-friendly hike with beautiful views.",
        date: "March 18, 2024",
        time: "9:00 AM",
        location: "Sunset Trail, Mountain Park",
        attendees: 12,
        maxAttendees: 20,
        tags: ["Outdoors", "Hiking", "Nature"],
        organizer: "Alex Rivera",
        isAttending: true,
      },
      {
        id: "3",
        title: "Lesbian Speed Dating Night",
        description:
          "Meet new people in a fun, relaxed environment! Ages 25-40.",
        date: "March 22, 2024",
        time: "6:30 PM",
        location: "The Rainbow Room",
        attendees: 24,
        maxAttendees: 30,
        tags: ["Dating", "Social", "Networking"],
        organizer: "Maya Patel",
        isAttending: false,
      },
    ],
    []
  );

  const loadFeed = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // 1) Load posts
      const { data: postRows, error: postsError } = await supabase
        .from("posts")
        .select("id, author_id, title, body, created_at")
        .order("created_at", { ascending: false })
        .limit(30);

      if (postsError) throw postsError;

      const basePosts = (postRows ?? []) as PostRow[];
      const postIds = basePosts.map((p) => p.id);
      const authorIds = Array.from(new Set(basePosts.map((p) => p.author_id)));

      // 2) Load author names from profiles
      const { data: profileRows, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", authorIds);

      if (profilesError) {
        // Don’t block feed if names fail; fallback below
        console.warn("profiles lookup failed:", profilesError.message);
      }

      const nameById = new Map<string, string>();
      (profileRows ?? []).forEach((r: any) => {
        nameById.set(r.id, r.full_name || r.name || r.username || "Member");
      });

      // 3) Likes count per post
      const { data: likeRows, error: likesError } = await supabase
        .from("post_likes")
        .select("post_id, user_id")
        .in("post_id", postIds);

      if (likesError) throw likesError;

      const likeCountByPost = new Map<string, number>();
      const likedByMeSet = new Set<string>();

      (likeRows ?? []).forEach((r: any) => {
        likeCountByPost.set(r.post_id, (likeCountByPost.get(r.post_id) ?? 0) + 1);
        if (r.user_id === user.id) likedByMeSet.add(r.post_id);
      });

      // 4) Comments count per post (optional but nice)
      const { data: commentRows, error: commentsError } = await supabase
        .from("post_comments")
        .select("post_id")
        .in("post_id", postIds);

      if (commentsError) throw commentsError;

      const commentCountByPost = new Map<string, number>();
      (commentRows ?? []).forEach((r: any) => {
        commentCountByPost.set(
          r.post_id,
          (commentCountByPost.get(r.post_id) ?? 0) + 1
        );
      });

      const hydrated: FeedPost[] = basePosts.map((p) => ({
        ...p,
        authorName:
          p.author_id === user.id
            ? "You"
            : nameById.get(p.author_id) || "Member",
        likeCount: likeCountByPost.get(p.id) ?? 0,
        commentCount: commentCountByPost.get(p.id) ?? 0,
        likedByMe: likedByMeSet.has(p.id),
      }));

      setPosts(hydrated);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to load feed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleCreatePost = async () => {
    if (!user) {
      setError("Please sign in to post.");
      return;
    }

    const body = newPost.trim();
    if (!body) return;

    setPosting(true);
    setError(null);

    try {
      // First try: insert with body (+ title fallback)
      const { data, error: insertError } = await supabase
        .from("posts")
        .insert({
          author_id: user.id,
          body,
          // If your DB allows null title, this is fine.
          // If title is NOT NULL, this prevents the constraint error.
          title: "Community post",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setNewPost("");

      // Optional: optimistic update if you keep posts in state
      // setPosts((prev) => [data, ...prev]);

      await loadFeed();
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Could not post. Try again.");
    } finally {
      setPosting(false);
    }
  };

  const toggleLike = async (postId: string, likedByMe: boolean) => {
    if (!user) return;

    // optimistic UI
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              likedByMe: !likedByMe,
              likeCount: Math.max(0, p.likeCount + (likedByMe ? -1 : 1)),
            }
          : p
      )
    );

    try {
      if (likedByMe) {
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("post_likes").insert({
          post_id: postId,
          user_id: user.id,
        });

        // if unique constraint triggers, reload (rare)
        if (error) throw error;
      }
    } catch (e) {
      console.error(e);
      // revert by reloading truth
      await loadFeed();
    }
  };

  const handleCreateEvent = () => {
    console.log("Creating event:", newEvent);
    setNewEvent({
      title: "",
      description: "",
      date: "",
      time: "",
      location: "",
      maxAttendees: 10,
    });
    setShowCreateEvent(false);
  };

  const handleJoinEvent = (eventId: string) => {
    console.log("Joining event:", eventId);
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <Tabs defaultValue="feed" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 bg-violet-900/70 border border-violet-400/30">
          <TabsTrigger
            value="feed"
            className="wedding-heading text-white data-[state=active]:bg-violet-700 data-[state=active]:text-white"
          >
            Community Feed
          </TabsTrigger>
          <TabsTrigger
            value="events"
            className="wedding-heading text-white data-[state=active]:bg-violet-700 data-[state=active]:text-white"
          >
            Events
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="space-y-4">
          {/* Create Post */}
          <Card className="bg-violet-950/80 border-violet-400/40 text-white backdrop-blur-sm">
            <CardContent className="p-4">
              <Textarea
                placeholder="Share something with the community..."
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                className="mb-3 bg-violet-900/70 border-violet-500/50 text-white placeholder:text-white/70 focus-visible:border-violet-300"
                maxLength={1000}
              />
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-white/80">
                  {newPost.trim().length}/1000
                </div>
                <Button
                  onClick={handleCreatePost}
                  disabled={!newPost.trim() || posting}
                  className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                >
                  {posting ? "Posting…" : "Share Post"}
                </Button>
              </div>
              {error && (
                <div className="text-sm text-red-300 mt-2">{error}</div>
              )}
            </CardContent>
          </Card>

          {/* Feed */}
          {loading ? (
            <div className="text-white/80">Loading feed…</div>
          ) : posts.length === 0 ? (
            <div className="text-white/80">
              No posts yet. Be the first to share something 💜
            </div>
          ) : (
            posts.map((post) => (
              <Card key={post.id} className="bg-violet-950/75 border-violet-400/40 text-white backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {(post.authorName || "M")[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-white">
                        {post.authorName}
                      </p>
                      <p className="text-sm text-white/70">
                        {timeAgo(post.created_at)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-white/90 mb-3 whitespace-pre-wrap">
                    {post.body}
                  </p>

                  <div className="flex space-x-4 text-sm text-white/80">
                    <button
                      className={`hover:text-pink-300 ${
                        post.likedByMe ? "text-pink-300" : ""
                      }`}
                      onClick={() => toggleLike(post.id, post.likedByMe)}
                      type="button"
                    >
                      {post.likedByMe ? "💜" : "🤍"} {post.likeCount}
                    </button>

                    <button
                      className="hover:text-pink-300"
                      type="button"
                      onClick={() => {
                        // next step: open comments UI
                        alert("Comments UI is next 💬");
                      }}
                    >
                      💬 {post.commentCount}
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Button
            onClick={() => setShowCreateEvent(!showCreateEvent)}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 mb-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Event
          </Button>

          {showCreateEvent && (
            <Card className="bg-gradient-to-br from-pink-50 to-purple-50 border-pink-200 mb-4">
              <CardContent className="p-4 space-y-3">
                <Input
                  placeholder="Event title"
                  value={newEvent.title}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, title: e.target.value })
                  }
                />
                <Textarea
                  placeholder="Event description"
                  value={newEvent.description}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, description: e.target.value })
                  }
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={newEvent.date}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, date: e.target.value })
                    }
                  />
                  <Input
                    type="time"
                    value={newEvent.time}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, time: e.target.value })
                    }
                  />
                </div>
                <Input
                  placeholder="Location"
                  value={newEvent.location}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, location: e.target.value })
                  }
                />
                <div className="flex space-x-2">
                  <Button onClick={handleCreateEvent} className="flex-1">
                    Create
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateEvent(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {mockEvents.map((event) => (
            <EventCard key={event.id} event={event} onJoin={handleJoinEvent} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SocialFeed;
