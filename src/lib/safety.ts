import { supabase } from "@/lib/supabase";

function toStringIdArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => `${entry ?? ""}`.trim()).filter(Boolean);
}

export function extractBlockedUserIds(safetySettings: unknown): string[] {
  if (!safetySettings || typeof safetySettings !== "object") return [];
  return toStringIdArray((safetySettings as Record<string, unknown>).blocked_user_ids);
}

export async function loadBlockedUserIdSet(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("profiles")
    .select("safety_settings")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  return new Set(extractBlockedUserIds(data?.safety_settings));
}

