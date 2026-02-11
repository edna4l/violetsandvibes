import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

type Status = "loading" | "complete" | "incomplete" | "error";

export function useProfileStatus() {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (authLoading) return;

      // Not logged in => don't decide here (ProtectedRoute handles it)
      if (!user) {
        setStatus("incomplete");
        return;
      }

      try {
        setStatus("loading");

        const { data, error } = await supabase
          .from("profiles")
          .select("profile_completed")
          .eq("id", user.id)
          .maybeSingle();

        if (cancelled) return;

        if (error) throw error;

        const complete = !!data?.profile_completed;
        setStatus(complete ? "complete" : "incomplete");
      } catch (e) {
        if (!cancelled) setStatus("error");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return { status };
}
