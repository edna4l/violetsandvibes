import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Camera, Plus, X, ChevronLeft, ChevronRight } from "lucide-react";

type StoryRow = {
  id: string;
  author_id: string;
  media_url: string;
  media_type: "image" | "video";
  caption: string | null;
  view_count: number;
  created_at: string;
  expires_at: string;
  authorName?: string;
  authorPhoto?: string | null;
};

type StoryGroup = {
  authorId: string;
  authorName: string;
  authorPhoto: string | null;
  stories: StoryRow[];
  hasViewed: boolean;
};

const StoriesRow: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [viewingGroup, setViewingGroup] = useState<StoryGroup | null>(null);
  const [viewingIndex, setViewingIndex] = useState(0);
  const [caption, setCaption] = useState("");
  const [showCaption, setShowCaption] = useState(false);
  const progressTimerRef = useRef<number | null>(null);
  const [progress, setProgress] = useState(0);

  const loadStories = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: storyRows, error } = await supabase
        .from("stories")
        .select("id, author_id, media_url, media_type, caption, view_count, created_at, expires_at")
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      const rows = (storyRows ?? []) as StoryRow[];
      const authorIds = Array.from(new Set(rows.map((r) => r.author_id)));

      let profiles: any[] = [];
      if (authorIds.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, username, photos")
          .in("id", authorIds);
        profiles = data ?? [];
      }

      const profileById = new Map(profiles.map((p) => [p.id, p]));

      const { data: viewRows } = await supabase
        .from("story_views")
        .select("story_id")
        .eq("viewer_id", user.id);

      const viewedIds = new Set((viewRows ?? []).map((v: any) => v.story_id));

      const groupMap = new Map<string, StoryGroup>();
      rows.forEach((row) => {
        const prof = profileById.get(row.author_id);
        if (!groupMap.has(row.author_id)) {
          groupMap.set(row.author_id, {
            authorId: row.author_id,
            authorName: prof?.full_name || prof?.username || "Member",
            authorPhoto: prof?.photos?.[0] ?? null,
            stories: [],
            hasViewed: false,
          });
        }
        const g = groupMap.get(row.author_id)!;
        g.stories.push({ ...row, authorName: g.authorName, authorPhoto: g.authorPhoto });
        if (!viewedIds.has(row.id)) g.hasViewed = false;
      });

      // Show own story first, then unseen, then seen
      const myGroup = groupMap.get(user.id);
      const others = Array.from(groupMap.values()).filter((g) => g.authorId !== user.id);
      const unseen = others.filter((g) => !g.hasViewed);
      const seen = others.filter((g) => g.hasViewed);

      const sorted: StoryGroup[] = [];
      if (myGroup) sorted.push(myGroup);
      sorted.push(...unseen, ...seen);

      setGroups(sorted);
    } catch (e: any) {
      console.warn("Stories load failed:", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStories();
  }, [user?.id]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) {
      toast({ title: "Only images and videos allowed", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("story-media")
        .upload(path, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("story-media").getPublicUrl(path);

      const { error: insertError } = await supabase.from("stories").insert({
        author_id: user.id,
        media_url: urlData.publicUrl,
        media_type: isVideo ? "video" : "image",
        caption: caption.trim() || null,
      });

      if (insertError) throw insertError;

      toast({ title: "Story posted! 📸", description: "Your story is live for 24 hours." });
      setCaption("");
      setShowCaption(false);
      await loadStories();
    } catch (e: any) {
      toast({ title: "Could not post story", description: e?.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const openStoryGroup = async (group: StoryGroup, idx = 0) => {
    setViewingGroup(group);
    setViewingIndex(idx);
    setProgress(0);
    // record view
    const story = group.stories[idx];
    if (user && story && story.author_id !== user.id) {
      await supabase.from("story_views").upsert({ story_id: story.id, viewer_id: user.id }).throwOnError().catch(() => {});
    }
  };

  useEffect(() => {
    if (!viewingGroup) return;
    if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
    setProgress(0);

    progressTimerRef.current = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          // advance to next story
          const next = viewingIndex + 1;
          if (next < viewingGroup.stories.length) {
            setViewingIndex(next);
            void openStoryGroup(viewingGroup, next);
          } else {
            setViewingGroup(null);
          }
          return 0;
        }
        return p + 2;
      });
    }, 100);

    return () => {
      if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
    };
  }, [viewingGroup?.authorId, viewingIndex]);

  if (loading) return null;

  const currentStory = viewingGroup?.stories[viewingIndex];

  return (
    <>
      {/* Stories strip */}
      <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar px-1">
        {/* Add your story button */}
        <button
          type="button"
          onClick={() => {
            if (uploading) return;
            setShowCaption(true);
            fileInputRef.current?.click();
          }}
          className="flex-shrink-0 flex flex-col items-center gap-1"
        >
          <div className="w-14 h-14 rounded-full border-2 border-dashed border-pink-400/60 flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors relative">
            {uploading ? (
              <div className="w-4 h-4 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Plus className="w-5 h-5 text-pink-400" />
            )}
          </div>
          <span className="text-[10px] text-white/70">Your story</span>
        </button>

        {/* Story rings */}
        {groups.map((group) => (
          <button
            key={group.authorId}
            type="button"
            onClick={() => void openStoryGroup(group)}
            className="flex-shrink-0 flex flex-col items-center gap-1"
          >
            <div
              className={`w-14 h-14 rounded-full p-[2px] ${
                group.hasViewed
                  ? "bg-white/20"
                  : "bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500"
              }`}
            >
              {group.authorPhoto ? (
                <img
                  src={group.authorPhoto}
                  alt={group.authorName}
                  className="w-full h-full rounded-full object-cover border-2 border-black"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full rounded-full border-2 border-black bg-violet-900 flex items-center justify-center text-white font-semibold text-sm">
                  {group.authorName.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <span className="text-[10px] text-white/70 max-w-[56px] truncate">{group.authorName}</span>
          </button>
        ))}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Story viewer modal */}
      {viewingGroup && currentStory && (
        <div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={() => setViewingGroup(null)}
        >
          {/* Progress bars */}
          <div className="absolute top-3 left-3 right-3 flex gap-1 z-10">
            {viewingGroup.stories.map((s, i) => (
              <div key={s.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-none"
                  style={{
                    width: i < viewingIndex ? "100%" : i === viewingIndex ? `${progress}%` : "0%",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Author header */}
          <div className="absolute top-8 left-3 flex items-center gap-2 z-10">
            {viewingGroup.authorPhoto ? (
              <img src={viewingGroup.authorPhoto} className="w-8 h-8 rounded-full object-cover border border-white/30" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-violet-700 flex items-center justify-center text-white text-xs font-semibold">
                {viewingGroup.authorName[0]}
              </div>
            )}
            <span className="text-white font-semibold text-sm">{viewingGroup.authorName}</span>
          </div>

          {/* Close */}
          <button
            type="button"
            onClick={() => setViewingGroup(null)}
            className="absolute top-8 right-3 z-10 text-white"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Media */}
          <div className="w-full h-full" onClick={(e) => e.stopPropagation()}>
            {currentStory.media_type === "video" ? (
              <video
                src={currentStory.media_url}
                className="w-full h-full object-contain"
                autoPlay
                muted
                playsInline
              />
            ) : (
              <img
                src={currentStory.media_url}
                alt="Story"
                className="w-full h-full object-contain"
              />
            )}
          </div>

          {/* Caption */}
          {currentStory.caption && (
            <div className="absolute bottom-16 left-4 right-4 bg-black/60 rounded-xl p-3 text-white text-sm">
              {currentStory.caption}
            </div>
          )}

          {/* Prev / Next tap zones */}
          <button
            type="button"
            className="absolute left-0 top-0 h-full w-1/3 z-20"
            onClick={(e) => {
              e.stopPropagation();
              const prev = viewingIndex - 1;
              if (prev >= 0) void openStoryGroup(viewingGroup, prev);
              else setViewingGroup(null);
            }}
          />
          <button
            type="button"
            className="absolute right-0 top-0 h-full w-1/3 z-20"
            onClick={(e) => {
              e.stopPropagation();
              const next = viewingIndex + 1;
              if (next < viewingGroup.stories.length) void openStoryGroup(viewingGroup, next);
              else setViewingGroup(null);
            }}
          />
        </div>
      )}
    </>
  );
};

export default StoriesRow;
