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
  // Fetch only completed profiles excluding the current user
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, bio, location, photos, profile_completed")
    .neq("id", myId) // Exclude the current user
    .eq("profile_completed", true) // Only completed profiles
    .order("updated_at", { ascending: false }) // Order by most recent updates
    .limit(50); // Limit results to a manageable number (can be paginated later)

  if (error) throw error;
  return (data ?? []) as ProfileRow[];
}
