import { supabase } from "@/lib/supabase";

export type ProfileRow = {
  id: string;
  full_name: string | null;
  bio: string | null;
  location: string | null;
  photos: string[] | null;
  profile_completed: boolean | null;
  birthdate?: string | null;
  interests?: string[] | null;
  gender_identity?: string | null;
};

type MatchingPreferences = {
  showMeOnPride: boolean;
  prioritizeVerified: boolean;
  hideAlreadySeen: boolean;
};

const DEFAULT_MATCHING_PREFERENCES: MatchingPreferences = {
  showMeOnPride: true,
  prioritizeVerified: false,
  hideAlreadySeen: true,
};

type DiscoverProfileRowRaw = ProfileRow & {
  updated_at?: string | null;
  privacy_settings?: Record<string, any> | null;
  safety_settings?: Record<string, any> | null;
};

const isTruthy = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

async function loadMyMatchingPreferences(myId: string): Promise<MatchingPreferences> {
  const { data, error } = await supabase
    .from("profiles")
    .select("privacy_settings")
    .eq("id", myId)
    .maybeSingle();

  if (error) {
    console.warn("Could not load matching preferences. Falling back to defaults.", error.message);
    return { ...DEFAULT_MATCHING_PREFERENCES };
  }

  const privacy =
    data?.privacy_settings && typeof data.privacy_settings === "object"
      ? (data.privacy_settings as Record<string, any>)
      : {};
  const matching =
    privacy.matching && typeof privacy.matching === "object"
      ? (privacy.matching as Record<string, any>)
      : {};

  return {
    showMeOnPride: isTruthy(matching.showMeOnPride, DEFAULT_MATCHING_PREFERENCES.showMeOnPride),
    prioritizeVerified: isTruthy(
      matching.prioritizeVerified,
      DEFAULT_MATCHING_PREFERENCES.prioritizeVerified
    ),
    hideAlreadySeen: isTruthy(matching.hideAlreadySeen, DEFAULT_MATCHING_PREFERENCES.hideAlreadySeen),
  };
}

async function loadSeenIds(myId: string): Promise<Set<string>> {
  const seenIds = new Set<string>();

  const { data: likeRows, error: likeError } = await supabase
    .from("likes")
    .select("liked_id")
    .eq("liker_id", myId);
  if (!likeError) {
    (likeRows ?? []).forEach((row: any) => {
      if (typeof row.liked_id === "string") seenIds.add(row.liked_id);
    });
  } else {
    console.warn("Could not load seen profiles from likes.", likeError.message);
  }

  const { data: matchRows, error: matchError } = await supabase
    .from("matches")
    .select("user1_id, user2_id")
    .or(`user1_id.eq.${myId},user2_id.eq.${myId}`);
  if (!matchError) {
    (matchRows ?? []).forEach((row: any) => {
      if (row.user1_id && row.user1_id !== myId) seenIds.add(row.user1_id);
      if (row.user2_id && row.user2_id !== myId) seenIds.add(row.user2_id);
    });
  } else {
    console.warn("Could not load seen profiles from matches.", matchError.message);
  }

  return seenIds;
}

export async function fetchDiscoverProfiles(myId: string) {
  const matchingPrefs = await loadMyMatchingPreferences(myId);

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, bio, location, photos, profile_completed, birthdate, interests, gender_identity, updated_at, privacy_settings, safety_settings"
    )
    .neq("id", myId)
    .eq("profile_completed", true)
    .order("updated_at", { ascending: false })
    .limit(120);

  if (error) throw error;

  let rows = (data ?? []) as DiscoverProfileRowRaw[];

  // Respect each user's discoverability toggle. Missing setting defaults to visible.
  rows = rows.filter((row) => {
    const matching = row.privacy_settings?.matching;
    if (!matching || typeof matching !== "object") return true;
    return matching.showMeOnPride !== false;
  });

  if (matchingPrefs.hideAlreadySeen) {
    const seenIds = await loadSeenIds(myId);
    rows = rows.filter((row) => !seenIds.has(row.id));
  }

  if (matchingPrefs.prioritizeVerified) {
    rows.sort((a, b) => {
      const aVerified = a.safety_settings?.photoVerification === true ? 1 : 0;
      const bVerified = b.safety_settings?.photoVerification === true ? 1 : 0;
      if (aVerified !== bVerified) return bVerified - aVerified;

      const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return bTime - aTime;
    });
  }

  return rows.slice(0, 50).map((row) => ({
    id: row.id,
    full_name: row.full_name,
    bio: row.bio,
    location: row.location,
    photos: row.photos,
    profile_completed: row.profile_completed,
    birthdate: (row as any).birthdate ?? null,
    interests: (row as any).interests ?? [],
    gender_identity: (row as any).gender_identity ?? null,
  })) as ProfileRow[];
}
