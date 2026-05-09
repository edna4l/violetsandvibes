import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Heart, MessageCircle, Share2, Plus, Volume2, VolumeX,
  ChevronUp, ChevronDown, Image, Video, Type, X, Send, Trash2
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [vibes, setVibes] = useState<Vibe[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [posting, setPosting] = useState(false);
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});

  // Compose modal state
  const [showCompose, setShowCompose] = useState(false);
  const [composeText, setComposeText] = useState("");
  const [composeFile, setComposeFile] = useState<File | null>(null);
  const [composePreview, setComposePreview] = useState<string | null>(null);

  const loadVibes = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from("stories")
        .select("id, author_id, media_url, media_type, caption, view_count, created_at")
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
    setPosting(true);
    try {
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;

      if (composeFile) {
        const isVideo = composeFile.type.startsWith("video/");
        const ext = composeFile.name.split(".").pop() || "jpg";
        const path = `${user.id}/${Date.now()}.${ext}`;
        // contentType override: Supabase rejects video/quicktime by default,
        // but .mov and .mp4 both play fine in browsers when served as video/mp4.
        const contentType = composeFile.type === "video/quicktime" ? "video/mp4" : composeFile.type;
        const { error: uploadError } = await supabase.storage
          .from("story-media")
          .upload(path, composeFile, { upsert: false, contentType });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("story-media").getPublicUrl(path);
        mediaUrl = urlData.publicUrl;
        mediaType = isVideo ? "video" : "image";
      }

      const { error } = await supabase.from("stories").insert({
        author_id: user.id,
        media_url: mediaUrl ?? "text",
        media_type: mediaType ?? "image",
        caption: composeText.trim() || null,
      });
      if (error) throw error;

      toast({ title: "Vibe posted! 💜", description: "Live for 24 hours." });
      setShowCompose(false);
      setComposeText("");
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
    await supabase.from("story_views").upsert({ story_id: vibe.id, viewer_id: user.id }).then(() => {});
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

  const scrollTo = (idx: number) => {
    containerRef.current?.querySelector(`[data-vibe-index="${idx}"]`)?.scrollIntoView({ behavior: "smooth" });
  };

  const handleDeleteVibe = async (vibe: Vibe) => {
    if (!user || vibe.author_id !== user.id) return;
    if (!window.confirm("Delete this vibe? This cannot be undone.")) return;
    setVibes((prev) => prev.filter((v) => v.id !== vibe.id));
    await supabase.from("stories").delete().eq("id", vibe.id).eq("author_id", user.id);
  };

  const isTextOnly = (vibe: Vibe) => !vibe.media_url || vibe.media_url === "text";

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
        <>
          <div
            ref={containerRef}
            className="flex-1 overflow-y-scroll snap-y snap-mandatory"
            style={{ scrollbarWidth: "none" }}
          >
            {vibes.map((vibe, i) => (
              <div
                key={vibe.id}
                data-vibe-index={i}
                className="relative w-full snap-start snap-always flex-shrink-0"
                style={{ height: "100dvh" }}
              >
                {/* Media / text background */}
                {isTextOnly(vibe) ? (
                  <div className={`w-full h-full bg-gradient-to-br ${TEXT_GRADIENTS[i % TEXT_GRADIENTS.length]} flex items-center justify-center p-8`}>
                    <p className="text-white text-2xl font-semibold text-center leading-snug drop-shadow-lg">
                      {vibe.caption}
                    </p>
                  </div>
                ) : vibe.media_type === "video" ? (
                  <video
                    ref={(el) => { videoRefs.current[i] = el; }}
                    src={vibe.media_url!}
                    className="w-full h-full object-cover"
                    loop muted={muted} playsInline autoPlay={i === 0}
                  />
                ) : (
                  <img src={vibe.media_url!} alt={vibe.authorName} className="w-full h-full object-cover" />
                )}

                {/* Gradient overlay (skip for text-only — already styled) */}
                {!isTextOnly(vibe) && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />
                )}

                {/* Author + caption */}
                <div className="absolute bottom-24 left-4 right-16 z-10">
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
                  {!isTextOnly(vibe) && vibe.caption && (
                    <p className="text-white text-sm leading-snug drop-shadow">{vibe.caption}</p>
                  )}
                </div>

                {/* Right action buttons */}
                <div className="absolute right-3 bottom-28 z-10 flex flex-col items-center gap-5">
                  <button type="button" onClick={() => void handleLike(vibe, i)} className="flex flex-col items-center gap-1">
                    <Heart className={`w-7 h-7 drop-shadow ${vibe.liked ? "fill-pink-500 text-pink-500" : "text-white"}`} />
                    <span className="text-white text-xs drop-shadow">{vibe.likeCount}</span>
                  </button>
                  <button type="button" onClick={() => navigate("/chat")} className="flex flex-col items-center gap-1">
                    <MessageCircle className="w-7 h-7 text-white drop-shadow" />
                    <span className="text-white text-xs drop-shadow">Chat</span>
                  </button>
                  <button type="button" onClick={() => void handleShare(vibe)} className="flex flex-col items-center gap-1">
                    <Share2 className="w-7 h-7 text-white drop-shadow" />
                    <span className="text-white text-xs drop-shadow">Share</span>
                  </button>
                  {vibe.media_type === "video" && (
                    <button type="button" onClick={() => setMuted((m) => !m)} className="flex flex-col items-center gap-1">
                      {muted ? <VolumeX className="w-6 h-6 text-white drop-shadow" /> : <Volume2 className="w-6 h-6 text-white drop-shadow" />}
                    </button>
                  )}
                  {vibe.author_id === user?.id && (
                    <button type="button" onClick={() => void handleDeleteVibe(vibe)} className="flex flex-col items-center gap-1 opacity-70 hover:opacity-100">
                      <Trash2 className="w-6 h-6 text-red-400 drop-shadow" />
                      <span className="text-red-300 text-xs drop-shadow">Delete</span>
                    </button>
                  )}
                </div>

                {/* Up/Down nav */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2">
                  {i > 0 && (
                    <button type="button" onClick={() => scrollTo(i - 1)} className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white">
                      <ChevronUp className="w-5 h-5" />
                    </button>
                  )}
                  {i < vibes.length - 1 && (
                    <button type="button" onClick={() => scrollTo(i + 1)} className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white">
                      <ChevronDown className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Dot indicators */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1.5 pointer-events-none">
            {vibes.map((_, i) => (
              <div key={i} className={`w-1 rounded-full transition-all duration-200 ${i === activeIndex ? "h-4 bg-white" : "h-1.5 bg-white/40"}`} />
            ))}
          </div>
        </>
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
              rows={4}
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

            {/* Media options */}
            <div className="flex gap-2">
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
                onClick={() => openFilePickerWithCamera()}
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

      {/* Bottom nav */}
      <div className="relative z-30">
        <BottomNavigation />
      </div>
    </div>
  );

  function openFilePickerWithCamera() {
    // "Text only" just clears any file so user can post text alone
    clearFile();
  }
};

export default VibesPage;
