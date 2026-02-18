import { supabase } from "@/lib/supabase";

export type ProfileRow = {
  id: string;
  full_name: string | null;
  bio: string | null;
  location: string | null;
  photos: string[] | null;
  profile_completed: boolean | null;
};

export async function fetchDiscoverProfiles(myId: string) {
  // Keep this conservative: only fetch what you need for cards
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, bio, location, photos, profile_completed")
    .neq("id", myId)
    .eq("profile_completed", true)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []) as ProfileRow[];
}
