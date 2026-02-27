import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { getVerificationState } from "@/lib/verification";
import { isAdminBypassUser } from "@/lib/subscriptionTier";

type Status = "loading" | "complete" | "incomplete" | "error";

type Props = {
  children: React.ReactNode;
};

export const VerificationGate: React.FC<Props> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (authLoading) return;

      if (!user) {
        setStatus("incomplete");
        return;
      }

      try {
        setStatus("loading");
        const adminBypass = await isAdminBypassUser(user.id);
        if (cancelled) return;
        if (adminBypass) {
          setStatus("complete");
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("safety_settings")
          .eq("id", user.id)
          .maybeSingle();

        if (cancelled) return;
        if (error) throw error;

        const verification = getVerificationState(data?.safety_settings || {});
        setStatus(verification.completeForAccess ? "complete" : "incomplete");
      } catch (error) {
        console.warn("Verification status check failed:", error);
        if (!cancelled) setStatus("error");
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading]);

  if (status === "loading") {
    return (
      <div className="page-calm min-h-screen flex items-center justify-center">
        <div className="text-white/80">Checking verification...</div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="page-calm min-h-screen flex items-center justify-center px-4">
        <div className="text-white/80 text-center">
          Could not verify your verification status. Please refresh and try again.
        </div>
      </div>
    );
  }

  if (status === "incomplete") {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/verification?redirect=${redirect}`} replace />;
  }

  return <>{children}</>;
};

export default VerificationGate;
