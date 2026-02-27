import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { BasicInfoStep } from "./BasicInfoStep";
import { IdentityStep } from "./IdentityStep";
import { LifestyleStep } from "./LifestyleStep";
import { PhotosStep } from "./PhotosStep";
import { PrivacyStep } from "./PrivacyStep";
import { SafetyStep } from "./SafetyStep";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

const DRAFT_KEY = "vv_profile_draft_v1";
const DRAFT_VERSION = 1;
const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type DraftEnvelope = {
  version: number;
  updatedAt: number;
  data: any;
};

type ProfileDraft = {
  name: string;
  age: string;
  location: string;
  occupation: string;
  bio: string;
  genderIdentity: string;
  sexualOrientation: string;
  showPronouns: boolean;
  pridePins: string[];
  interests: string[];
  photos: string[];
  lifestyle: Record<string, any>;
  safety: Record<string, any>;
  privacy: {
    profileVisibility: string;
    showLastActive: boolean;
    showDistance: boolean;
    showAge: boolean;
    allowMessagesFromStrangers: boolean;
    photoVerificationRequired: boolean;
    hideProfileFromSearch: boolean;
  };
};

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function stripPhotos(profile: ProfileDraft) {
  // Privacy + size: don’t autosave photos locally by default
  const { photos, ...rest } = profile;
  return rest;
}

function persistedPhotoUrls(photos: string[] | undefined | null) {
  if (!Array.isArray(photos)) return [];
  return photos
    .map((p) => `${p ?? ""}`.trim())
    .filter((p) => !!p && !p.startsWith("blob:") && !p.startsWith("data:"));
}

function computeBirthdateISO(ageStr: string): string | null {
  const ageNum = Number.parseInt(ageStr || "0", 10);
  if (!Number.isFinite(ageNum) || ageNum <= 0) return null;
  const d = new Date();
  d.setFullYear(d.getFullYear() - ageNum);
  return d.toISOString().split("T")[0];
}

function isMissingBirthdateColumnError(error: unknown): boolean {
  const message = (error as { message?: string })?.message ?? "";
  return message.includes("Could not find the 'birthdate' column") || message.includes('Could not find the "birthdate" column');
}

function isMissingFullNameColumnError(error: unknown): boolean {
  const message = (error as { message?: string })?.message ?? "";
  return message.includes("Could not find the 'full_name' column") || message.includes('Could not find the "full_name" column');
}

const ProfileCreationFlow: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [draftStatus, setDraftStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [draftRestored, setDraftRestored] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  const [showFinish, setShowFinish] = useState(false);
  const [finishMessage, setFinishMessage] = useState("Profile complete 💜");

  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState<ProfileDraft>({
    name: "",
    age: "",
    location: "",
    occupation: "",
    bio: "",
    genderIdentity: "",
    sexualOrientation: "",
    showPronouns: false,
    pridePins: [],
    interests: [],
    photos: [],
    lifestyle: {},
    safety: {},
    privacy: {
      profileVisibility: "public",
      showLastActive: true,
      showDistance: true,
      showAge: true,
      allowMessagesFromStrangers: true,
      photoVerificationRequired: false,
      hideProfileFromSearch: false,
    },
  });

  const [affirmation, setAffirmation] = useState<string | null>(null);

  const affirmationsByStep = useMemo(
    () => ({
      0: "Nice — the basics are in 💜",
      1: "Thanks for sharing. We’ve got you.",
      2: "Love that. This helps people connect with you.",
      3: "Looking good. You can change photos anytime.",
      4: "You’re in control of privacy — always.",
      5: "Safety first. Proud of you for setting boundaries.",
    }),
    []
  );

  const steps = useMemo(
    () => [
      { title: "Basic Info", component: BasicInfoStep },
      { title: "Identity", component: IdentityStep },
      { title: "Lifestyle", component: LifestyleStep },
      { title: "Photos", component: PhotosStep },
      { title: "Privacy", component: PrivacyStep },
      { title: "Safety", component: SafetyStep },
    ],
    []
  );

  const updateProfile = (updates: Partial<ProfileDraft>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  };

  const validateStep = (step: number): { ok: boolean; message?: string } => {
    switch (step) {
      case 0:
        if (!profile.name) return { ok: false, message: "Add a name you’d like to go by." };
        if (!profile.age) return { ok: false, message: "Add your age so people can find you." };
        if (!profile.bio) return { ok: false, message: "Add a short bio — even 1–2 sentences is perfect." };
        return { ok: true };

      case 1:
        if (!profile.genderIdentity) return { ok: false, message: "Choose a gender identity to continue." };
        if (!profile.sexualOrientation) return { ok: false, message: "Choose a sexual orientation to continue." };
        return { ok: true };

      case 2:
        if (!profile.interests || profile.interests.length === 0) return { ok: false, message: "Pick at least 1 interest." };
        return { ok: true };

      case 3:
        if (persistedPhotoUrls(profile.photos).length === 0) {
          return { ok: false, message: "Add at least 1 uploaded photo to continue." };
        }
        return { ok: true };

      default:
        return { ok: true };
    }
  };

  const clearLocalDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setDraftStatus("idle");
    setDraftRestored(false);
    setLastSavedAt(null);
  };

  // Restore local draft on mount
  useEffect(() => {
    const env = safeJsonParse<DraftEnvelope>(localStorage.getItem(DRAFT_KEY));
    if (!env) return;

    if (env.version !== DRAFT_VERSION) return;

    const tooOld = Date.now() - env.updatedAt > DRAFT_MAX_AGE_MS;
    if (tooOld) {
      localStorage.removeItem(DRAFT_KEY);
      return;
    }

    setProfile((prev) => ({ ...prev, ...env.data }));
    setDraftRestored(true);
    setLastSavedAt(env.updatedAt);
    setDraftStatus("saved");
  }, []);

  // Debounced autosave local draft (photos excluded)
  useEffect(() => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);

    setDraftStatus("saving");

    saveTimerRef.current = window.setTimeout(() => {
      try {
        const envelope: DraftEnvelope = {
          version: DRAFT_VERSION,
          updatedAt: Date.now(),
          data: stripPhotos(profile),
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(envelope));
        setLastSavedAt(envelope.updatedAt);
        setDraftStatus("saved");
      } catch {
        setDraftStatus("error");
      }
    }, 700);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [profile]);

  const saveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const birthdateISO = computeBirthdateISO(profile.age);
      const photos = persistedPhotoUrls(profile.photos);
      const lifestyleInterests = {
        ...(profile.lifestyle || {}),
        pride_pins: Array.isArray(profile.pridePins) ? profile.pridePins : [],
      };

      const profileData = {
        id: user.id,
        full_name: profile.name || null,
        display_name: profile.name || user.user_metadata?.name || user.email || "Member",
        bio: profile.bio || null,
        location: profile.location || null,
        occupation: profile.occupation || null,
        birthdate: birthdateISO, // can be null
        gender_identity: profile.genderIdentity || null,
        sexual_orientation: profile.sexualOrientation || null,
        interests: profile.interests || [],
        photos,
        lifestyle_interests: lifestyleInterests,
        privacy_settings: profile.privacy || {},
        safety_settings: profile.safety || {},
        profile_completed: true,
        updated_at: new Date().toISOString(),
      };

      let { error } = await supabase.from("profiles").upsert(profileData);

      if (error && (isMissingBirthdateColumnError(error) || isMissingFullNameColumnError(error))) {
        const { birthdate: _birthdate, full_name: _full_name, ...fallbackProfileData } = profileData;
        const retry = await supabase.from("profiles").upsert(fallbackProfileData);
        error = retry.error;
      }

      if (error) throw error;

      clearLocalDraft();

      setFinishMessage("Profile complete 💜");
      setShowFinish(true);

      window.setTimeout(() => {
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get("redirect");
        const target = redirect && redirect.startsWith("/") ? redirect : "/social";
        setShowFinish(false);
        const next = encodeURIComponent(target);
        navigate(`/verification?redirect=${next}`, { replace: true });
      }, 1200);
    } catch (error: any) {
      console.error("Error saving profile:", error);
      alert(error?.message || "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const saveDraftToCloud = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const birthdateISO = computeBirthdateISO(profile.age);
      const photos = persistedPhotoUrls(profile.photos);
      const lifestyleInterests = {
        ...(profile.lifestyle || {}),
        pride_pins: Array.isArray(profile.pridePins) ? profile.pridePins : [],
      };

      const profileData = {
        id: user.id,
        full_name: profile.name || null,
        display_name: profile.name || user.user_metadata?.name || user.email || "Member",
        bio: profile.bio || null,
        location: profile.location || null,
        occupation: profile.occupation || null,
        birthdate: birthdateISO, // can be null
        gender_identity: profile.genderIdentity || null,
        sexual_orientation: profile.sexualOrientation || null,
        interests: profile.interests || [],
        photos,
        lifestyle_interests: lifestyleInterests,
        privacy_settings: profile.privacy || {},
        safety_settings: profile.safety || {},
        profile_completed: false,
        updated_at: new Date().toISOString(),
      };

      let { error } = await supabase.from("profiles").upsert(profileData);

      if (error && (isMissingBirthdateColumnError(error) || isMissingFullNameColumnError(error))) {
        const { birthdate: _birthdate, full_name: _full_name, ...fallbackProfileData } = profileData;
        const retry = await supabase.from("profiles").upsert(fallbackProfileData);
        error = retry.error;
      }

      if (error) throw error;

      setFinishMessage("Saved 💜 You can finish anytime.");
      setShowFinish(true);

      window.setTimeout(() => {
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get("redirect");
        const target = redirect && redirect.startsWith("/") ? redirect : "/social";
        setShowFinish(false);
        navigate(target, { replace: true });
      }, 1200);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Couldn’t save your draft to your account. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const nextStep = () => {
    const stepIsValid = validateStep(currentStep);
    if (!stepIsValid.ok) return;

    setAffirmation(affirmationsByStep[currentStep as keyof typeof affirmationsByStep] ?? null);
    window.setTimeout(() => setAffirmation(null), 1800);

    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      saveProfile();
    }
  };

  const prevStep = () => {
    setCurrentStep((s) => Math.max(0, s - 1));
  };

  const CurrentStepComponent = steps[currentStep].component;
  const progress = ((currentStep + 1) / steps.length) * 100;
  const validation = validateStep(currentStep);
  const isValid = validation.ok;

  const continueLabel =
    currentStep === steps.length - 1
      ? "Finish my profile"
      : currentStep === 3
      ? "Save photo & continue"
      : "Continue";

  return (
    <div className="page-calm min-h-screen p-4">
      <div className="max-w-2xl mx-auto">
        <div className="glass-card p-6">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <Badge variant="outline">{currentStep + 1} of {steps.length}</Badge>
              <h1 className="text-lg font-semibold text-white">{steps[currentStep].title}</h1>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
              <p className="text-sm text-white/80">
                You’re in control. Share only what feels right — you can change this anytime.
              </p>

              <div className="text-xs text-white/60 flex items-center gap-2 flex-wrap justify-end">
                {draftStatus === "saving" && <span>Saving draft…</span>}
                {draftStatus === "saved" && <span>Draft saved on this device</span>}
                {draftStatus === "error" && <span>Draft couldn’t save</span>}

                {draftRestored && lastSavedAt && (
                  <span className="text-white/50">
                    • Restored {new Date(lastSavedAt).toLocaleString()}
                  </span>
                )}

                <button type="button" onClick={clearLocalDraft} className="underline hover:text-white">
                  Clear draft
                </button>
              </div>
            </div>

            <Progress value={progress} className="mb-2 mt-4" />
            <p className="text-xs text-white/60 mt-2">
              Step {currentStep + 1} of {steps.length} • About {Math.max(1, steps.length - (currentStep + 1))} min left
            </p>

            <div className="mt-4 text-sm text-white/90 bg-white/10 border border-white/20 rounded-md px-3 py-2">
              Take your time. Your profile does not need to be perfect today.
              Thoughtful, honest details help keep this space respectful,
              safe, and meaningful for everyone.
            </div>
          </div>

          {affirmation && (
            <div className="text-sm text-white bg-white/10 border border-white/15 rounded-md px-3 py-2 mb-4">
              {affirmation}
            </div>
          )}

          <CurrentStepComponent profile={profile} onUpdate={updateProfile} />

          {currentStep === steps.length - 1 && (
            <div className="mt-5 text-sm text-white/90 bg-gradient-to-r from-pink-600/20 via-purple-600/20 to-indigo-600/20 border border-pink-200/30 rounded-md px-3 py-2">
              Violets &amp; Vibes is a women-centered space. Please complete your profile thoughtfully.
              Culture matters here.
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:justify-between gap-3 mt-8">
            <Button variant="outline" onClick={prevStep} disabled={currentStep === 0}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Button type="button" variant="outline" onClick={saveDraftToCloud} disabled={saving || !user}>
                Save & finish later
              </Button>

              <Button onClick={nextStep} disabled={!isValid || saving} className="bg-pink-500 hover:bg-pink-600">
                {saving ? "Saving..." : continueLabel}
                {currentStep < steps.length - 1 && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </div>
          </div>

          {!validation.ok && (
            <div className="text-sm text-white/80 mt-3">
              {validation.message}
            </div>
          )}

          {currentStep === 3 && (
            <div className="text-xs text-white/60 mt-2">
              Photos aren’t auto-saved as drafts. If you refresh, you may need to re-add them.
            </div>
          )}
        </div>
      </div>

      {showFinish && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl px-6 py-5 text-center max-w-sm">
            <div className="text-2xl mb-2">💜</div>
            <div className="text-lg font-semibold">{finishMessage}</div>
            <div className="text-sm text-slate-600 mt-1">One moment…</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileCreationFlow;
