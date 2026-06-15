import { useState } from "react";
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

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function DiscoverProfileCard({ profile }: { profile: ProfileRow & { last_active_at?: string | null; icebreaker_prompts?: Array<{ prompt: string; answer: string }> | null } }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [imageFailed, setImageFailed] = useState(false);
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
    <li className="vv-profile-card">
      <div className="vv-card-photo-wrap">
        {showPhoto ? (
          <img
            src={photo}
            alt={name}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="vv-card-photo-placeholder">
            <span className="vv-photo-initials">{getInitials(name)}</span>
          </div>
        )}

        {online && (
          <div className="vv-card-online-badge">
            <span aria-hidden className="vv-card-online-dot" />
            <span className="vv-card-online-text">Online</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleSuperLike}
          disabled={superLiked || superLiking}
          className={`vv-card-star-btn${superLiked ? ' vv-card-star-btn--starred' : ''}`}
          aria-label={superLiked ? `Super liked ${name}` : `Super like ${name}`}
        >
          <Star
            size={16}
            aria-hidden
            className={superLiked ? "fill-yellow-400 text-yellow-400" : "text-[#a78bfa]"}
          />
        </button>
      </div>

      <div className="vv-card-body">
        <div className="vv-card-name-row">
          <span className="vv-card-name">{name}</span>
          {age !== null && <span className="vv-card-age">{age}</span>}
        </div>

        {profile.location && (
          <div className="vv-card-location">
            <MapPin size={11} aria-hidden />
            <span>{profile.location}</span>
          </div>
        )}

        <div className="vv-card-tags">
          {(profile as any).relationship_type && (
            <span className="vv-card-tag">{(profile as any).relationship_type}</span>
          )}
          {(profile as any).has_children && (
            <span className="vv-card-tag">Has children</span>
          )}
          {interests.map((interest) => (
            <span key={String(interest)} className="vv-card-tag">
              {String(interest).split(":").pop()?.trim() || String(interest)}
            </span>
          ))}
        </div>

        {icebreaker ? (
          <div className="vv-card-icebreaker">
            <p className="vv-card-icebreaker-prompt">{icebreaker.prompt}</p>
            <p className="vv-card-icebreaker-answer">{icebreaker.answer}</p>
          </div>
        ) : bio ? (
          <p className="vv-card-bio">{bio}</p>
        ) : (
          <p className="vv-card-bio">No bio yet.</p>
        )}

        <button
          type="button"
          className="vv-view-profile-btn"
          onClick={() => navigate(`/profile/${profile.id}`)}
        >
          View profile
        </button>
      </div>
    </li>
  );
}
