import { useEffect } from "react";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
  applyAppPreferences,
  normalizeAppPreferences,
  readStoredAppPreferences,
} from "@/lib/appPreferences";

const AppPreferencesBootstrapper: React.FC = () => {
  const { setTheme } = useTheme();
  const { user } = useAuth();

  useEffect(() => {
    applyAppPreferences(readStoredAppPreferences(), setTheme);
  }, [setTheme]);

  useEffect(() => {
    let cancelled = false;

    const loadAndApply = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("privacy_settings")
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;
        if (cancelled) return;

        const privacySettings =
          data?.privacy_settings && typeof data.privacy_settings === "object"
            ? (data.privacy_settings as Record<string, unknown>)
            : {};

        const serverApp = normalizeAppPreferences(privacySettings.app);
        applyAppPreferences(serverApp, setTheme);
      } catch (error) {
        console.warn("Could not load app preferences from profile:", error);
      }
    };

    void loadAndApply();

    return () => {
      cancelled = true;
    };
  }, [user?.id, setTheme]);

  return null;
};

export default AppPreferencesBootstrapper;
