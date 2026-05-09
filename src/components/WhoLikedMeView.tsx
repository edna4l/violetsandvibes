import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Lock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveSubscriptionTier } from "@/lib/subscriptionTier";

type LikerProfile = {
  id: string;
  full_name: string | null;
  photos: string[] | null;
  isSuperLike: boolean;
  likedAt: string;
};

const WhoLikedMeView: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [likers, setLikers] = useState<LikerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState<string>("free");

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);
      try {
        const resolvedTier = await resolveSubscriptionTier(user.id);
        setTier(resolvedTier);

        // Load people who liked me
        const { data: likeRows, error: likeErr } = await supabase
          .from("likes")
          .select("liker_id, created_at")
          .eq("liked_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (likeErr) throw likeErr;

        // Load super likes for me
        const { data: superRows } = await supabase
          .from("super_likes")
          .select("sender_id, created_at")
          .eq("recipient_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        const superLikerIds = new Set((superRows ?? []).map((r: any) => r.sender_id));

        const likerIds = Array.from(new Set((likeRows ?? []).map((r: any) => r.liker_id)));

        // Also add super likers not in regular likes
        (superRows ?? []).forEach((r: any) => {
          if (!likerIds.includes(r.sender_id)) likerIds.push(r.sender_id);
        });

        if (likerIds.length === 0) {
          setLikers([]);
          return;
        }

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, photos")
          .in("id", likerIds);

        const likeTimeById = new Map<string, string>();
        (likeRows ?? []).forEach((r: any) => likeTimeById.set(r.liker_id, r.created_at));
        (superRows ?? []).forEach((r: any) => {
          if (!likeTimeById.has(r.sender_id)) likeTimeById.set(r.sender_id, r.created_at);
        });

        const mapped = (profiles ?? []).map((p: any) => ({
          id: p.id,
          full_name: p.full_name,
          photos: p.photos,
          isSuperLike: superLikerIds.has(p.id),
          likedAt: likeTimeById.get(p.id) ?? "",
        })) as LikerProfile[];

        mapped.sort((a, b) => {
          if (a.isSuperLike !== b.isSuperLike) return a.isSuperLike ? -1 : 1;
          return new Date(b.likedAt).getTime() - new Date(a.likedAt).getTime();
        });

        setLikers(mapped);
      } catch (e: any) {
        console.warn("Who liked me load failed:", e.message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [user?.id]);

  const isPremium = tier === "premium" || tier === "elite";

  if (loading) {
    return (
      <div className="p-4 flex items-center gap-2 text-white/70">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (likers.length === 0) {
    return (
      <div className="p-4 text-white/60 text-sm">
        No likes yet. Keep connecting 💜
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <p className="text-xs text-white/50">
        {likers.length} {likers.length === 1 ? "person has" : "people have"} liked you
        {!isPremium && " — upgrade to see who"}
      </p>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {likers.map((liker) => (
          <div
            key={liker.id}
            className="relative rounded-xl overflow-hidden aspect-square"
          >
            {liker.photos?.[0] ? (
              <img
                src={liker.photos[0]}
                alt={liker.full_name ?? "Member"}
                className={`w-full h-full object-cover ${!isPremium ? "blur-md scale-110" : ""}`}
                loading="lazy"
              />
            ) : (
              <div className={`w-full h-full bg-violet-900 flex items-center justify-center ${!isPremium ? "blur-md" : ""}`}>
                <span className="text-white text-xl font-bold">
                  {(liker.full_name ?? "M").slice(0, 1)}
                </span>
              </div>
            )}

            {/* Super like badge */}
            {liker.isSuperLike && (
              <div className="absolute top-1 right-1 bg-yellow-400 rounded-full w-5 h-5 flex items-center justify-center">
                <Star className="w-3 h-3 text-white fill-current" />
              </div>
            )}

            {/* Unlock overlay for free users */}
            {!isPremium && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                <Lock className="w-5 h-5 text-white/80" />
              </div>
            )}

            {/* Name (premium only) */}
            {isPremium && (
              <button
                type="button"
                onClick={() => navigate(`/profile/${liker.id}`)}
                className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5"
              >
                <span className="text-[11px] text-white truncate block">
                  {liker.full_name ?? "Member"}
                </span>
              </button>
            )}
          </div>
        ))}
      </div>

      {!isPremium && (
        <Button
          onClick={() => navigate("/subscription")}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 border-0"
        >
          <Lock className="w-4 h-4 mr-2" />
          Upgrade to see who liked you
        </Button>
      )}
    </div>
  );
};

export default WhoLikedMeView;
