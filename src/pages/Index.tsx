import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchDiscoverProfiles, type ProfileRow } from "@/lib/profiles";
import { DiscoverProfileCard } from "@/components/DiscoverProfileCard";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useStreak } from "@/hooks/useStreak";
import { Flame, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isSupabaseConfigured } from "@/lib/supabase";

const previewProfiles: Array<ProfileRow & Record<string, unknown>> = [
  {
    id: "preview-marie",
    full_name: "marie",
    bio: "nada",
    location: "anywhere",
    photos: ["/discover-profile-marie.png"],
    profile_completed: true,
    birthdate: "1979-01-01",
    relationship_type: "Monogamous",
  },
  {
    id: "preview-misty",
    full_name: "Misty Cole",
    bio: "I am woman truck driver. Mom of 4, granma of 8.",
    location: "Harker Heights, TX",
    photos: ["/discover-profile-misty.png"],
    profile_completed: true,
    birthdate: "1979-01-01",
    relationship_type: "Monogamous",
    has_children: true,
  },
];

const Index: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { currentStreak } = useStreak();
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const showLocalPreview = import.meta.env.DEV && !isSupabaseConfigured;
  const displayStreak = showLocalPreview ? 1 : currentStreak;

  useEffect(() => {
    if (showLocalPreview) {
      setRows(previewProfiles as ProfileRow[]);
      setError(null);
      setLoading(false);
      return;
    }

    if (!user) {
      setRows([]);
      setError(null);
      setLoading(false);
      return;
    }

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchDiscoverProfiles(user.id);
        setRows(data);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to load profiles");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [showLocalPreview, user?.id]);

  const handleShareProfile = async () => {
    if (!user) return;
    const url = `${window.location.origin}/profile/${user.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Violets & Vibes", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Profile link copied!", description: url });
      }
    } catch {
      await navigator.clipboard.writeText(url).catch(() => {});
      toast({ title: "Profile link copied!" });
    }
  };

  return (
    <div className="discover-page">
      <div className="discover-content-shell">
        {/* Streak banner */}
        {displayStreak > 0 && (
          <div className="discover-streak-banner">
            <div className="flex items-center gap-2 text-sm text-white/90">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>
                <strong className="text-orange-300">{displayStreak}-day streak</strong>
                {displayStreak >= 7 ? " 🔥 On fire!" : " — keep it up!"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void handleShareProfile()}
              className="flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
          </div>
        )}

        <section className="discover-hero-live" aria-labelledby="discover-heading">
          <h1 id="discover-heading" className="sr-only">
            Discover people and feel the vibe
          </h1>
          <p className="sr-only">
            Women-centered, inclusive, safety-first. Meet people who value real connection and
            community.
          </p>
          <Button asChild className="discover-social-cta">
            <Link to={user || showLocalPreview ? "/social" : "/signin"}>Go to Social</Link>
          </Button>
        </section>

        {loading ? (
          <div className="discover-status">Loading profiles...</div>
        ) : error ? (
          <div className="discover-status discover-status-error">
            {error}
          </div>
        ) : rows.length === 0 ? (
          <div className="discover-status">
            No profiles found. Invite a friend or check back soon.
          </div>
        ) : (
          <div className="discover-card-grid">
            {rows.map((p) => (
              <DiscoverProfileCard key={p.id} profile={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
