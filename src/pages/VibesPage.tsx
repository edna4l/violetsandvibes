import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Heart, MessageCircle, Share2, Plus, Volume2, VolumeX,
  ChevronUp, ChevronDown, Image, Video, Type, X, Send,
  Trash2, Repeat2, Maximize2, LayoutTemplate
} from "lucide-react";
import BottomNavigation from "@/components/BottomNavigation";

type Vibe = {
  id: string;
  author_id: string;
  media_url: string | null;
  media_type: "image" | "video" | null;
  caption: string | null;
  view_count: number;
  created_at: string;
  display_mode: "full" | "card";
  repost_of_id: string | null;
  repost_of_author: string | null;
  authorName: string;
  authorPhoto: string | null;
  liked: boolean;
  likeCount: number;
};

const TEXT_GRADIENTS = [
  "from-violet-600 via-purple-600 to-pink-600",
  "from-pink-500 via-rose-500 to-orange-400",
  "from-indigo-600 via-violet-600 to-purple-600",
  "from-emerald-500 via-teal-500 to-cyan-500",
  "from-amber-500 via-orange-500 to-pink-500",
];

const VibesPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const [vibes, setVibes] = useState<Vibe[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [posting, setPosting] = useState(false);
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});

  // Compose modal
  const [showCompose, setShowCompose] = useState(false);
  const [composeText, setComposeText] = useState("");
  const [composeFile, setComposeFile] = useState<File | null>(null);
  const [composePreview, setComposePreview] = useState<string | null>(null);
  const [composeDisplayMode, setComposeDisplayMode] = useState<"full" | "card">("full");

  // Repost modal
  const [repostTarget, setRepostTarget] = useState<Vibe | null>(null);
  const [repostCaption, setRepostCaption] = useState("");
  const [reposting, setReposting] = useState(false);

  const loadVibes = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from("stories")
        .select("id, author_id, media_url, media_type, caption, view_count, created_at, display_mode, repost_of_id, repost_of_author")
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const authorIds = Array.from(new Set((rows ?? []).map((r: any) => r.author_id)));
      let profiles: any[] = [];
      if (authorIds.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, username, photos")
          .in("id", authorIds);
        profiles = data ?? [];
      }
      const profileById = new Map(profiles.map((p) => [p.id, p]));

      const { data: likeRows } = await supabase
        .from("story_views")
        .select("story_id")
        .eq("viewer_id", user.id);
      const likedIds = new Set((likeRows ?? []).map((r: any) => r.story_id));

      setVibes(
        (rows ?? []).map((r: any) => {
          const prof = profileById.get(r.author_id);
          return {
            ...r,
            display_mode: r.display_mode ?? "full",
            authorName: prof?.full_name || prof?.username || "Member",
            authorPhoto: prof?.photos?.[0] ?? null,
            liked: likedIds.has(r.id),
            likeCount: r.view_count ?? 0,
          };
        })
      );
    } catch (e: any) {
      console.warn("Could not load vibes:", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadVibes(); }, [user?.id]);

  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([idx, el]) => {
      if (!el) return;
      Number(idx) === activeIndex ? el.play().catch(() => {}) : el.pause();
    });
  }, [activeIndex]);

  useEffect(() => {
    const items = containerRef.current?.querySelectorAll("[data-vibe-index]");
    if (!items) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveIndex(Number((entry.target as HTMLElement).dataset.vibeIndex));
          }
        });
      },
      { threshold: 0.6 }
    );
    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [vibes]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setComposeFile(file);
    setComposePreview(URL.createObjectURL(file));
  };

  const openFilepicker = (accept: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = (e) => handleFileSelect(e as any);
    input.click();
  };

  const clearFile = () => {
    setComposeFile(null);
    if (composePreview) URL.revokeObjectURL(composePreview);
    setComposePreview(null);
  };

  const handlePost = async () => {
    if (!user) return;
    if (!composeText.trim() && !composeFile) {
      toast({ title: "Add some text or media to post a Vibe", variant: "destructive" });
      return;
    }

    // Client-side size check before attempting upload
    if (composeFile) {
      const isVideo = composeFile.type.startsWith("video/") || composeFile.type === "video/quicktime";
      const maxBytes = isVideo ? 500 * 1024 * 1024 : 50 * 1024 * 1024; // 500 MB video / 50 MB photo
      const maxLabel = isVideo ? "500 MB" : "50 MB";
      if (composeFile.size > maxBytes) {
        const fileMB = (composeFile.size / 1024 / 1024).toFixed(1);
        toast({
          title: `File too large (${fileMB} MB)`,
          description: isVideo
            ? `Videos must be under ${maxLabel}. Try trimming the clip or recording at a lower quality setting in your camera app.`
            : `Photos must be under ${maxLabel}. Try compressing the image first.`,
          variant: "destructive",
        });
        return;
      }
    }

    setPosting(true);
    try {
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;

      if (composeFile) {
        const isVideo = composeFile.type.startsWith("video/");
        const ext = composeFile.name.split(".").pop() || "jpg";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const contentType = composeFile.type === "video/quicktime" ? "video/mp4" : composeFile.type;
        const { error: uploadError } = await supabase.storage
          .from("story-media")
          .upload(path, composeFile, { upsert: false, contentType });
        if (uploadError) throw new Error(`Upload failed: ${uploadError.message} (${uploadError.error ?? "storage"})`);

        const { data: urlData } = supabase.storage.from("story-media").getPublicUrl(path);
        mediaUrl = urlData.publicUrl;
        mediaType = isVideo ? "video" : "image";
      }

      const { error } = await supabase.from("stories").insert({
        author_id: user.id,
        media_url: mediaUrl ?? "text",
        media_type: mediaType ?? "image",
        caption: composeText.trim() || null,
        display_mode: composeFile ? composeDisplayMode : "full",
      });
      if (error) throw error;

      toast({ title: "Vibe posted! 💜", description: "Live for 24 hours." });
      setShowCompose(false);
      setComposeText("");
      setComposeDisplayMode("full");
      clearFile();
      await loadVibes();
    } catch (e: any) {
      toast({ title: "Could not post vibe", description: e?.message, variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (vibe: Vibe, i: number) => {
    if (!user) return;
    setVibes((prev) =>
      prev.map((v, idx) =>
        idx === i ? { ...v, liked: !v.liked, likeCount: v.liked ? v.likeCount - 1 : v.likeCount + 1 } : v
      )
    );
    await supabase.from("story_views").upsert({ story_id: vibe.id, viewer_id: user.id });
  };

  const handleShare = async (vibe: Vibe) => {
    const url = `${window.location.origin}/vibes`;
    try {
      if (navigator.share) {
        await navigator.share({ title: vibe.authorName + " on Violets & Vibes", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied!" });
      }
    } catch {}
  };

  const handleDeleteVibe = async (vibe: Vibe) => {
    if (!user || vibe.author_id !== user.id) return;
    if (!window.confirm("Delete this vibe? This cannot be undone.")) return;
    setVibes((prev) => prev.filter((v) => v.id !== vibe.id));
    await supabase.from("stories").delete().eq("id", vibe.id).eq("author_id", user.id);
    toast({ title: "Vibe deleted" });
  };

  const handleRepost = async () => {
    if (!user || !repostTarget) return;
    setReposting(true);
    try {
      const myProfile = await supabase.from("profiles").select("full_name, username").eq("id", user.id).maybeSingle();
      const myName = myProfile.data?.full_name || myProfile.data?.username || "Member";

      const { error } = await supabase.from("stories").insert({
        author_id: user.id,
        media_url: repostTarget.media_url,
        media_type: repostTarget.media_type,
        caption: repostCaption.trim() || repostTarget.caption,
        display_mode: repostTarget.display_mode,
        repost_of_id: repostTarget.id,
        repost_of_author: repostTarget.authorName,
      });
      if (error) throw error;

      toast({ title: "Reposted! 🔁", description: "Live for 24 hours." });
      setRepostTarget(null);
      setRepostCaption("");
      await loadVibes();
    } catch (e: any) {
      toast({ title: "Could not repost", description: e?.message, variant: "destructive" });
    } finally {
      setReposting(false);
    }
  };

  const scrollTo = (idx: number) => {
    containerRef.current?.querySelector(`[data-vibe-index="${idx}"]`)?.scrollIntoView({ behavior: "smooth" });
  };

  const isTextOnly = (vibe: Vibe) => !vibe.media_url || vibe.media_url === "text";
  const gradientFor = (i: number) => TEXT_GRADIENTS[i % TEXT_GRADIENTS.length];

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-3 pb-2">
        <span className="text-white font-bold text-lg tracking-wide">Vibes</span>
        <button
          type="button"
          onClick={() => setShowCompose(true)}
          className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-3 py-1.5 rounded-full border border-white/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Vibe
        </button>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-white/60 text-sm">Loading vibes…</div>
      ) : vibes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="text-6xl">💜</div>
          <div className="text-white text-xl font-semibold">No vibes yet</div>
          <div className="text-white/60 text-sm">Be the first! Share a thought, photo, or video — lives for 24 hours.</div>
          <button
            type="button"
            onClick={() => setShowCompose(true)}
            className="mt-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold px-6 py-3 rounded-full"
          >
            Post your first vibe
          </button>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="flex-1 overflow-y-scroll snap-y snap-mandatory [scrollbar-width:none]"
        >
          {vibes.map((vibe, i) => {
            const isCard = !isTextOnly(vibe) && vibe.display_mode === "card";
            const isOwn = vibe.author_id === user?.id;

            return (
              <div
                key={vibe.id}
                data-vibe-index={i}
                className="relative w-full snap-start snap-always flex-shrink-0 h-dvh"
              >
                {/* Background */}
                {isTextOnly(vibe) ? (
                  <div className={`w-full h-full bg-gradient-to-br ${gradientFor(i)} flex items-center justify-center p-8`}>
                    <p className="text-white text-2xl font-semibold text-center leading-snug drop-shadow-lg">
                      {vibe.caption}
                    </p>
                  </div>
                ) : isCard ? (
                  /* Card mode: gradient bg + media in a centered card */
                  <div className={`w-full h-full bg-gradient-to-br ${gradientFor(i)} flex flex-col items-center justify-center gap-4 p-6`}>
                    <div className="w-full max-h-[65vh] rounded-2xl overflow-hidden shadow-2xl">
                      {vibe.media_type === "video" ? (
                        <video
                          ref={(el) => { videoRefs.current[i] = el; }}
                          src={vibe.media_url!}
                          className="w-full max-h-[65vh] object-contain bg-black"
                          loop muted={muted} playsInline autoPlay={i === 0}
                        />
                      ) : (
                        <img src={vibe.media_url!} alt={vibe.authorName} className="w-full max-h-[65vh] object-contain bg-black" />
                      )}
                    </div>
                    {vibe.caption && (
                      <p className="text-white text-lg font-semibold text-center drop-shadow-lg">{vibe.caption}</p>
                    )}
                  </div>
                ) : (
                  /* Full-screen mode */
                  <>
                    {vibe.media_type === "video" ? (
                      <video
                        ref={(el) => { videoRefs.current[i] = el; }}
                        src={vibe.media_url!}
                        className="w-full h-full object-cover"
                        loop muted={muted} playsInline autoPlay={i === 0}
                      />
                    ) : (
                      <img src={vibe.media_url!} alt={vibe.authorName} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />
                  </>
                )}

                {/* Repost banner */}
                {vibe.repost_of_id && (
                  <div className="absolute top-14 left-4 z-10 flex items-center gap-1.5 bg-black/40 rounded-full px-3 py-1">
                    <Repeat2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-white/80 text-xs">Reposted from {vibe.repost_of_author}</span>
                  </div>
                )}

                {/* Author + caption (bottom left) */}
                <div className="absolute bottom-24 left-4 right-20 z-10">
                  <button
                    type="button"
                    onClick={() => navigate(`/profile/${vibe.author_id}`)}
                    className="flex items-center gap-2 mb-2"
                  >
                    {vibe.authorPhoto ? (
                      <img src={vibe.authorPhoto} className="w-9 h-9 rounded-full border-2 border-white object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full border-2 border-white bg-violet-700 flex items-center justify-center text-white text-xs font-bold">
                        {vibe.authorName[0]}
                      </div>
                    )}
                    <span className="text-white font-semibold text-sm drop-shadow">{vibe.authorName}</span>
                  </button>
                  {!isTextOnly(vibe) && !isCard && vibe.caption && (
                    <p className="text-white text-sm leading-snug drop-shadow">{vibe.caption}</p>
                  )}
                </div>

                {/* LEFT: Up/Down nav */}
                <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2">
                  {i > 0 && (
                    <button
                      type="button"
                      onClick={() => scrollTo(i - 1)}
                      className="w-9 h-9 rounded-full bg-black/40 border border-white/20 flex items-center justify-center text-white shadow-lg"
                    >
                      <ChevronUp className="w-5 h-5" />
                    </button>
                  )}
                  {i < vibes.length - 1 && (
                    <button
                      type="button"
                      onClick={() => scrollTo(i + 1)}
                      className="w-9 h-9 rounded-full bg-black/40 border border-white/20 flex items-center justify-center text-white shadow-lg"
                    >
                      <ChevronDown className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* RIGHT: Action buttons */}
                <div className="absolute right-3 bottom-28 z-10 flex flex-col items-center gap-5">
                  {/* Like */}
                  <button type="button" onClick={() => void handleLike(vibe, i)} className="flex flex-col items-center gap-1">
                    <Heart className={`w-7 h-7 drop-shadow ${vibe.liked ? "fill-pink-500 text-pink-500" : "text-white"}`} />
                    <span className="text-white text-xs drop-shadow">{vibe.likeCount}</span>
                  </button>
                  {/* Chat */}
                  <button type="button" onClick={() => navigate("/chat")} className="flex flex-col items-center gap-1">
                    <MessageCircle className="w-7 h-7 text-white drop-shadow" />
                    <span className="text-white text-xs drop-shadow">Chat</span>
                  </button>
                  {/* Repost (other users' vibes only) */}
                  {!isOwn && (
                    <button type="button" onClick={() => { setRepostTarget(vibe); setRepostCaption(""); }} className="flex flex-col items-center gap-1">
                      <Repeat2 className="w-7 h-7 text-emerald-400 drop-shadow" />
                      <span className="text-emerald-300 text-xs drop-shadow">Repost</span>
                    </button>
                  )}
                  {/* Share */}
                  <button type="button" onClick={() => void handleShare(vibe)} className="flex flex-col items-center gap-1">
                    <Share2 className="w-7 h-7 text-white drop-shadow" />
                    <span className="text-white text-xs drop-shadow">Share</span>
                  </button>
                  {/* Mute (video only) */}
                  {vibe.media_type === "video" && (
                    <button type="button" onClick={() => setMuted((m) => !m)} className="flex flex-col items-center gap-1">
                      {muted ? <VolumeX className="w-6 h-6 text-white drop-shadow" /> : <Volume2 className="w-6 h-6 text-white drop-shadow" />}
                    </button>
                  )}
                  {/* Delete (own vibes only) */}
                  {isOwn && (
                    <button
                      type="button"
                      onClick={() => void handleDeleteVibe(vibe)}
                      className="flex flex-col items-center gap-1"
                    >
                      <Trash2 className="w-6 h-6 text-red-400 drop-shadow" />
                      <span className="text-red-300 text-xs drop-shadow">Delete</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compose modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center" onClick={() => setShowCompose(false)}>
          <div
            className="w-full max-w-lg bg-zinc-900 rounded-t-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold text-base">New Vibe</span>
              <button type="button" aria-label="Close" onClick={() => setShowCompose(false)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <textarea
              className="w-full bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 px-4 py-3 text-sm resize-none focus:outline-none focus:border-purple-400"
              rows={3}
              placeholder="What's your vibe? Share a thought, feeling, or caption…"
              value={composeText}
              onChange={(e) => setComposeText(e.target.value)}
              maxLength={300}
            />

            {/* File preview */}
            {composePreview && (
              <div className="relative w-full h-40 rounded-xl overflow-hidden bg-black">
                {composeFile?.type.startsWith("video/") ? (
                  <video src={composePreview} className="w-full h-full object-cover" muted playsInline />
                ) : (
                  <img src={composePreview} className="w-full h-full object-cover" alt="Preview" />
                )}
                <button
                  type="button"
                  aria-label="Remove media"
                  onClick={clearFile}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Display mode picker — only shown when media is attached */}
            {composeFile && (
              <div className="space-y-1.5">
                <span className="text-xs text-white/50 uppercase tracking-wide">Display style</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setComposeDisplayMode("full")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border text-sm font-medium transition-all ${
                      composeDisplayMode === "full"
                        ? "border-purple-400 bg-purple-500/20 text-white"
                        : "border-white/15 bg-white/5 text-white/50"
                    }`}
                  >
                    <Maximize2 className="w-4 h-4" />
                    Full screen
                  </button>
                  <button
                    type="button"
                    onClick={() => setComposeDisplayMode("card")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border text-sm font-medium transition-all ${
                      composeDisplayMode === "card"
                        ? "border-pink-400 bg-pink-500/20 text-white"
                        : "border-white/15 bg-white/5 text-white/50"
                    }`}
                  >
                    <LayoutTemplate className="w-4 h-4" />
                    Card style
                  </button>
                </div>
              </div>
            )}

            {/* Media / type buttons */}
            <div className="flex gap-2 items-center">
              <button
                type="button"
                onClick={() => openFilepicker("image/*")}
                className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg border border-white/10 transition-colors"
              >
                <Image className="w-4 h-4" />
                Photo
              </button>
              <button
                type="button"
                onClick={() => openFilepicker("video/*")}
                className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg border border-white/10 transition-colors"
              >
                <Video className="w-4 h-4" />
                Video
              </button>
              <button
                type="button"
                onClick={clearFile}
                className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-2 rounded-lg border border-white/10 transition-colors"
              >
                <Type className="w-4 h-4" />
                Text only
              </button>
              <div className="flex-1" />
              <span className="text-xs text-white/30 self-center">{composeText.length}/300</span>
            </div>

            <button
              type="button"
              onClick={() => void handlePost()}
              disabled={posting || (!composeText.trim() && !composeFile)}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-opacity"
            >
              <Send className="w-4 h-4" />
              {posting ? "Posting…" : "Post Vibe"}
            </button>
          </div>
        </div>
      )}

      {/* Repost modal */}
      {repostTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center" onClick={() => setRepostTarget(null)}>
          <div
            className="w-full max-w-lg bg-zinc-900 rounded-t-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat2 className="w-5 h-5 text-emerald-400" />
                <span className="text-white font-semibold text-base">Repost vibe</span>
              </div>
              <button type="button" aria-label="Close" onClick={() => setRepostTarget(null)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
              <p className="text-xs text-white/50 mb-1">Original by {repostTarget.authorName}</p>
              <p className="text-white/80 text-sm">{repostTarget.caption || "(media post)"}</p>
            </div>

            <textarea
              className="w-full bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 px-4 py-3 text-sm resize-none focus:outline-none focus:border-emerald-400"
              rows={2}
              placeholder="Add your own caption (optional)…"
              value={repostCaption}
              onChange={(e) => setRepostCaption(e.target.value)}
              maxLength={200}
            />

            <button
              type="button"
              onClick={() => void handleRepost()}
              disabled={reposting}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-opacity"
            >
              <Repeat2 className="w-4 h-4" />
              {reposting ? "Reposting…" : "Repost to your Vibes"}
            </button>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <div className="relative z-30">
        <BottomNavigation />
      </div>
    </div>
  );
};

export default VibesPage;
