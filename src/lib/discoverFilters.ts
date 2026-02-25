import { supabase } from "@/lib/supabase";

export type DiscoverPronoun = "She/Her" | "They/Them" | "He/Him" | "Any";
export type DiscoverLookingFor = "Casual" | "Serious" | "Friends" | "Networking";

export type DiscoverFilters = {
  ageRange: [number, number];
  distanceMiles: number;
  interests: string[];
  pronouns: DiscoverPronoun[];
  lookingFor: DiscoverLookingFor[];
};

export const DEFAULT_DISCOVER_FILTERS: DiscoverFilters = {
  ageRange: [22, 35],
  distanceMiles: 25,
  interests: [],
  pronouns: ["Any"],
  lookingFor: [],
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const cleanStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value.map((v) => `${v ?? ""}`.trim()).filter(Boolean);
};

export function normalizeDiscoverFilters(source: unknown): DiscoverFilters {
  const raw =
    source && typeof source === "object" ? (source as Record<string, unknown>) : {};

  const maybeRange = raw.ageRange;
  let ageRange: [number, number] = [...DEFAULT_DISCOVER_FILTERS.ageRange];
  if (
    Array.isArray(maybeRange) &&
    maybeRange.length === 2 &&
    Number.isFinite(Number(maybeRange[0])) &&
    Number.isFinite(Number(maybeRange[1]))
  ) {
    const min = clamp(Number(maybeRange[0]), 18, 80);
    const max = clamp(Number(maybeRange[1]), 18, 80);
    ageRange = [Math.min(min, max), Math.max(min, max)];
  }

  const distanceMiles = Number.isFinite(Number(raw.distanceMiles))
    ? clamp(Number(raw.distanceMiles), 1, 100)
    : DEFAULT_DISCOVER_FILTERS.distanceMiles;

  const interests = cleanStringArray(raw.interests);

  const allowedPronouns: DiscoverPronoun[] = ["She/Her", "They/Them", "He/Him", "Any"];
  const pronouns = cleanStringArray(raw.pronouns).filter((p): p is DiscoverPronoun =>
    allowedPronouns.includes(p as DiscoverPronoun)
  );
  const normalizedPronouns =
    pronouns.length === 0 || pronouns.includes("Any")
      ? ["Any"]
      : Array.from(new Set(pronouns));

  const allowedLookingFor: DiscoverLookingFor[] = ["Casual", "Serious", "Friends", "Networking"];
  const lookingFor = cleanStringArray(raw.lookingFor).filter((v): v is DiscoverLookingFor =>
    allowedLookingFor.includes(v as DiscoverLookingFor)
  );

  return {
    ageRange,
    distanceMiles,
    interests: Array.from(new Set(interests)),
    pronouns: normalizedPronouns,
    lookingFor: Array.from(new Set(lookingFor)),
  };
}

export async function loadDiscoverFilters(userId: string): Promise<DiscoverFilters> {
  const { data, error } = await supabase
    .from("profiles")
    .select("privacy_settings")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  const privacy =
    data?.privacy_settings && typeof data.privacy_settings === "object"
      ? (data.privacy_settings as Record<string, unknown>)
      : {};

  return normalizeDiscoverFilters(privacy.discoverFilters);
}

export async function saveDiscoverFilters(userId: string, filters: DiscoverFilters) {
  const normalized = normalizeDiscoverFilters(filters);

  const { data: existing, error: fetchError } = await supabase
    .from("profiles")
    .select("privacy_settings")
    .eq("id", userId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  const currentPrivacy =
    existing?.privacy_settings && typeof existing.privacy_settings === "object"
      ? (existing.privacy_settings as Record<string, unknown>)
      : {};

  const nextPrivacy = {
    ...currentPrivacy,
    discoverFilters: normalized,
  };

  const { data: updatedRow, error } = await supabase
    .from("profiles")
    .update({
      privacy_settings: nextPrivacy,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!updatedRow) throw new Error("Profile record not found");
  return normalized;
}
