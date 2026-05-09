import React from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Circle, ChevronRight } from "lucide-react";
import type { ProfileRow } from "@/lib/profiles";

type FullProfile = ProfileRow & {
  bio?: string | null;
  birthdate?: string | null;
  gender_identity?: string | null;
  interests?: string[] | null;
  photos?: string[] | null;
  icebreaker_prompts?: any[] | null;
};

type CheckItem = {
  label: string;
  done: boolean;
  nudge: string;
  path: string;
};

function scoreProfile(profile: FullProfile): { score: number; items: CheckItem[] } {
  const items: CheckItem[] = [
    {
      label: "Add your name",
      done: !!profile.full_name?.trim(),
      nudge: "Add your name",
      path: "/edit-profile",
    },
    {
      label: "Write a bio",
      done: !!profile.bio && profile.bio.trim().length > 20,
      nudge: "Write a bio (20+ chars)",
      path: "/edit-profile",
    },
    {
      label: "Add your birthday",
      done: !!profile.birthdate,
      nudge: "Add your birthday so others see your age",
      path: "/edit-profile",
    },
    {
      label: "Add at least one photo",
      done: (profile.photos?.length ?? 0) >= 1,
      nudge: "Upload at least one photo",
      path: "/edit-profile",
    },
    {
      label: "Add 3+ photos",
      done: (profile.photos?.length ?? 0) >= 3,
      nudge: "Profiles with 3+ photos get 2x more matches",
      path: "/edit-profile",
    },
    {
      label: "Choose your identity",
      done: !!profile.gender_identity,
      nudge: "Select your gender identity",
      path: "/edit-profile",
    },
    {
      label: "Add interests",
      done: (profile.interests?.length ?? 0) >= 3,
      nudge: "Add 3+ interests — it helps us find your people",
      path: "/edit-profile",
    },
    {
      label: "Set your location",
      done: !!profile.location,
      nudge: "Add your location to find nearby matches",
      path: "/edit-profile",
    },
    {
      label: "Add an icebreaker",
      done: (profile.icebreaker_prompts?.length ?? 0) >= 1,
      nudge: "Answer a prompt — it starts 5x more conversations",
      path: "/edit-profile",
    },
    {
      label: "Get verified",
      done: !!(profile as any).safety_settings?.photoVerification,
      nudge: "Verify your photo to unlock full access",
      path: "/verification",
    },
  ];

  const done = items.filter((i) => i.done).length;
  const score = Math.round((done / items.length) * 100);
  return { score, items };
}

interface ProfileCompletenessScoreProps {
  profile: FullProfile;
  compact?: boolean;
}

const ProfileCompletenessScore: React.FC<ProfileCompletenessScoreProps> = ({
  profile,
  compact = false,
}) => {
  const navigate = useNavigate();
  const { score, items } = scoreProfile(profile);
  const incomplete = items.filter((i) => !i.done);
  const nextNudge = incomplete[0];

  const color =
    score >= 80 ? "from-green-400 to-emerald-500" :
    score >= 50 ? "from-yellow-400 to-orange-400" :
    "from-pink-500 to-purple-500";

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="relative w-8 h-8">
          <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
            <circle
              cx="16" cy="16" r="13"
              fill="none"
              stroke="url(#scoreGrad)"
              strokeWidth="3"
              strokeDasharray={`${2 * Math.PI * 13}`}
              strokeDashoffset={`${2 * Math.PI * 13 * (1 - score / 100)}`}
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">
            {score}%
          </span>
        </div>
        <span className="text-xs text-white/70">Profile {score}% complete</span>
      </div>
    );
  }

  return (
    <div className="bg-violet-950/80 border border-violet-400/30 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">Profile completeness</span>
        <span
          className={`text-sm font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent`}
        >
          {score}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Next action nudge */}
      {nextNudge && (
        <button
          type="button"
          onClick={() => navigate(nextNudge.path)}
          className="w-full flex items-center justify-between p-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-left"
        >
          <div className="flex items-center gap-2">
            <Circle className="w-4 h-4 text-pink-400 shrink-0" />
            <span className="text-sm text-white/90">{nextNudge.nudge}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-white/40 shrink-0" />
        </button>
      )}

      {/* Full checklist (collapsed) */}
      <details className="group">
        <summary className="text-xs text-white/50 cursor-pointer hover:text-white/70 list-none flex items-center gap-1">
          <span>See all {items.length} items</span>
          <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
        </summary>
        <div className="mt-2 space-y-1.5">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 text-xs"
            >
              {item.done ? (
                <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-white/30 shrink-0" />
              )}
              <span className={item.done ? "text-white/60 line-through" : "text-white/80"}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
};

export default ProfileCompletenessScore;
