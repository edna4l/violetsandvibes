import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchDiscoverProfiles, type ProfileRow } from "@/lib/profiles";
import { DiscoverProfileCard } from "@/components/DiscoverProfileCard";
import { useNavigate } from "react-router-dom";
import { useStreak } from "@/hooks/useStreak";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight } from "lucide-react";

const Index: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { currentStreak } = useStreak();
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, [user?.id]);

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
    <div className="vv-discover-content">
      {/* Streak banner */}
      {currentStreak > 0 && (
        <div className="vv-streak-banner" role="status" aria-label="Streak status">
          <div className="vv-streak-left">
            <div aria-hidden className="vv-flame-icon" />
            <span className="vv-streak-text">
              <strong>{currentStreak}-day streak</strong>
              <span className="vv-streak-dash">
                {currentStreak >= 7 ? " 🔥 On fire!" : " — keep it up!"}
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => void handleShareProfile()}
            className="vv-share-streak-btn"
          >
            Share
          </button>
        </div>
      )}

      {/* Hero section */}
      <div className="vv-hero-body">
        <div className="vv-hero-img-col" aria-hidden>
          <span className="vv-hero-star vv-hero-star-1">✦</span>
          <span className="vv-hero-star vv-hero-star-2">✧</span>
          <span className="vv-hero-star vv-hero-star-3">✦</span>
          <span className="vv-hero-star vv-hero-star-4">✦</span>
          <span className="vv-hero-star vv-hero-star-5">✧</span>
          <span className="vv-hero-star vv-hero-star-6">✦</span>
          <span className="vv-hero-star vv-hero-star-7">✦</span>
          <span className="vv-hero-heart vv-hero-heart-1">♥</span>
          <span className="vv-hero-heart vv-hero-heart-2">♥</span>
          <span className="vv-hero-heart vv-hero-heart-3">♥</span>
        </div>
        <div className="vv-hero-text-col">
          <span aria-hidden className="vv-hero-star vv-hero-star-8">✦</span>
          <span aria-hidden className="vv-hero-star vv-hero-star-9">✧</span>
          <span aria-hidden className="vv-hero-star vv-hero-star-10">✦</span>
          <span aria-hidden className="vv-hero-star vv-hero-star-11">✧</span>
          <span aria-hidden className="vv-hero-star vv-hero-star-12">✦</span>
          <span aria-hidden className="vv-hero-star vv-hero-star-13">✦</span>
          <span aria-hidden className="vv-hero-star vv-hero-star-14">✧</span>
          <span aria-hidden className="vv-hero-star vv-hero-star-15">✦</span>
          <span aria-hidden className="vv-hero-star vv-hero-star-16">✧</span>
          <span aria-hidden className="vv-hero-star vv-hero-star-17">✦</span>
          <span aria-hidden className="vv-hero-heart vv-hero-heart-4">♥</span>
          <span aria-hidden className="vv-hero-heart vv-hero-heart-5">♥</span>
          <span aria-hidden className="vv-hero-heart vv-hero-heart-6">♥</span>
          <span aria-hidden className="vv-hero-heart vv-hero-heart-7">♥</span>
          <h2 className="vv-hero-heading">Discover</h2>
          <p className="vv-hero-tagline">Find your people and feel the vibe</p>
          <div className="vv-hero-pills" aria-label="Platform values">
            <span>Women-centered</span>
            <div aria-hidden className="vv-hero-pill-dot" />
            <span>Inclusive</span>
            <div aria-hidden className="vv-hero-pill-dot" />
            <span>Safety-first</span>
          </div>
          <p className="vv-hero-body-text">
            Meet people who value real connection and community.
          </p>
          <button
            type="button"
            className="vv-hero-cta"
            onClick={() => navigate('/social')}
          >
            Go to Social <ChevronRight size={13} aria-hidden />
          </button>
        </div>
      </div>

      {/* Profile cards */}
      {loading ? (
        <p className="text-[#a29dc4]">Loading profiles…</p>
      ) : error ? (
        <p className="text-[#f472b6] bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] rounded-xl px-3 py-2">
          {error}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-[#a29dc4]">
          No profiles found. Invite a friend or check back soon 💜
        </p>
      ) : (
        <ul className="vv-cards-grid" aria-label="People to discover">
          {rows.map((p) => (
            <DiscoverProfileCard key={p.id} profile={p} />
          ))}
        </ul>
      )}
    </div>
  );
};

export default Index;
