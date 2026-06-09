import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Star, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { ProfileRow } from "@/lib/profiles";

function calcAge(birthdate?: string | null) {
  if (!birthdate) return null;
  const d = new Date(birthdate);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() - d.getMonth() < 0 || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
  return age;
}

function isOnline(lastActiveAt?: string | null) {
  if (!lastActiveAt) return false;
  return Date.now() - new Date(lastActiveAt).getTime() < 5 * 60 * 1000;
}

export function DiscoverProfileCard({ profile }: { profile: ProfileRow & { last_active_at?: string | null; icebreaker_prompts?: Array<{ prompt: string; answer: string }> | null } }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [imageFailed, setImageFailed] = React.useState(false);
  const [superLiked, setSuperLiked] = useState(false);
  const [superLiking, setSuperLiking] = useState(false);

  const name = profile.full_name || "Member";
  const bio = (profile.bio || "").trim();
  const photo = profile.photos?.[0];
  const showPhoto = !!photo && !imageFailed;
  const age = calcAge(profile.birthdate);
  const online = isOnline(profile.last_active_at);
  const interests = (profile.interests ?? []).slice(0, 3);
  const icebreaker = profile.icebreaker_prompts?.[0];

  const handleSuperLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || superLiked || superLiking) return;
    setSuperLiking(true);
    try {
      const { error } = await supabase.from("super_likes").insert({
        sender_id: user.id,
        recipient_id: profile.id,
      });
      if (error && error.code !== "23505") throw error;
      setSuperLiked(true);
      toast({ title: "Super like sent! ⭐", description: `${name} will see your super like.` });
    } catch (e: any) {
      toast({ title: "Could not send super like", description: e?.message, variant: "destructive" });
    } finally {
      setSuperLiking(false);
    }
  };

  return (
    <Card className="discover-profile-card bg-violet-950/90 border-violet-400/35 text-white overflow-hidden shadow-xl hover:shadow-pink-500/20 hover:scale-[1.01] transition-all duration-200">
      <div className="relative">
        {showPhoto ? (
          <div className="discover-profile-photo h-52 w-full">
            <img
              src={photo}
              alt={name}
              className="h-52 w-full object-cover"
              loading="lazy"
              onError={() => setImageFailed(true)}
            />
          </div>
        ) : (
          <div className="discover-profile-photo h-52 w-full bg-white/5 flex items-center justify-center text-white/60">
            No photo yet
          </div>
        )}

        {/* Online indicator */}
        {online && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/50 rounded-full px-2 py-0.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[11px] text-green-300 font-medium">Online</span>
          </div>
        )}

        {/* Super like button */}
        <button
          type="button"
          onClick={handleSuperLike}
          disabled={superLiked || superLiking}
          className={`discover-super-like absolute top-2 right-2 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            superLiked
              ? "bg-yellow-400 text-white shadow-lg shadow-yellow-400/40"
              : "bg-black/50 text-white/80 hover:bg-yellow-400/80 hover:text-white"
          }`}
          title={superLiked ? "Super liked!" : "Super like"}
        >
          <Star className={`w-4 h-4 ${superLiked ? "fill-current" : ""}`} />
        </button>
      </div>

      <CardContent className="discover-profile-content p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-base">{name}</span>
            {age !== null && (
              <span className="text-sm text-white/70">{age}</span>
            )}
          </div>
          {profile.location ? (
            <div className="flex items-center gap-1 text-xs text-white/60 min-w-0">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{profile.location}</span>
            </div>
          ) : null}
        </div>

        {/* Relationship type + interests badges */}
        <div className="flex flex-wrap gap-1">
          {(profile as any).relationship_type && (
            <Badge
              variant="outline"
              className="text-[11px] border-pink-400/40 text-pink-200 px-1.5 py-0"
            >
              {(profile as any).relationship_type}
            </Badge>
          )}
          {(profile as any).has_children && (
            <Badge
              variant="outline"
              className="text-[11px] border-violet-400/40 text-violet-200 px-1.5 py-0"
            >
              Has children
            </Badge>
          )}
          {interests.map((interest) => (
            <Badge
              key={interest}
              variant="outline"
              className="text-[11px] border-violet-400/40 text-violet-200 px-1.5 py-0"
            >
              {String(interest).split(":").pop()?.trim() || interest}
            </Badge>
          ))}
        </div>

        {icebreaker ? (
          <div className="bg-white/5 rounded-lg p-2.5 border border-white/10">
            <p className="text-[11px] text-white/50 mb-0.5">{icebreaker.prompt}</p>
            <p className="text-sm text-white/90 line-clamp-2">{icebreaker.answer}</p>
          </div>
        ) : bio ? (
          <div className="text-sm text-white/85 line-clamp-2">{bio}</div>
        ) : (
          <div className="text-sm text-white/50">No bio yet.</div>
        )}

        <Button
          className="discover-view-profile w-full mt-1 bg-gradient-to-r from-pink-500/80 to-purple-600/80 hover:from-pink-500 hover:to-purple-600 border-0"
          onClick={() => navigate(`/profile/${profile.id}`)}
        >
          View profile
        </Button>
      </CardContent>
    </Card>
  );
}
