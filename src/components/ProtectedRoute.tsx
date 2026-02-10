import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";

type Props = {
  children: React.ReactNode;
  requireProfile?: boolean;
};

export default function ProtectedRoute({ children, requireProfile = false }: Props) {
  const location = useLocation();
  const [status, setStatus] = useState<"loading" | "authed" | "noauth" | "noprofile">("loading");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      // 1) Auth check
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!session?.user) {
        if (!cancelled) setStatus("noauth");
        return;
      }

      // 2) Profile check (optional)
      if (requireProfile) {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, profile_completed")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error) {
          // If table doesn't exist yet or RLS blocks, treat as missing profile for now
          if (!cancelled) setStatus("noprofile");
          return;
        }

        if (!data || !data.profile_completed) {
          if (!cancelled) setStatus("noprofile");
          return;
        }
      }

      if (!cancelled) setStatus("authed");
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [requireProfile]);

  if (status === "loading") {
    return (
      <div className="page-calm flex items-center justify-center">
        <div className="glass-card p-6 text-center">
          <div className="text-lg font-semibold">Checking session...</div>
          <div className="text-sm text-white/70 mt-1">One sec 💜</div>
        </div>
      </div>
    );
  }

  if (status === "noauth") {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/signin?redirect=${redirect}`} replace />;
  }

  if (status === "noprofile") {
    return <Navigate to="/create-new-profile" replace />;
  }

  return <>{children}</>;
}
