import { ReactNode, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

interface AuthGateProps {
  children: ReactNode;
}

export const AuthGate = ({ children }: AuthGateProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    const enforceRules = async () => {
      // 1. Not logged in → signin
      if (!user) {
        navigate(`/signin?redirect=${location.pathname}`, { replace: true });
        return;
      }

      // 2. Logged in → check profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("profile_completed")
        .eq("id", user.id)
        .single();

      // 3. Profile missing or incomplete → force creation
      if (!profile || !profile.profile_completed) {
        if (location.pathname !== "/create-new-profile") {
          navigate("/create-new-profile", { replace: true });
        }
        return;
      }

      // 4. Profile complete but user is on signin
      if (location.pathname === "/signin") {
        navigate("/social", { replace: true });
      }
    };

    enforceRules();
  }, [user, loading, location.pathname, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Checking session…
      </div>
    );
  }

  return <>{children}</>;
};
