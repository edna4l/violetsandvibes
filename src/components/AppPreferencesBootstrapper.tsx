import { useEffect } from "react";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
  APP_PREFERENCES_STORAGE_KEY,
  applyAppPreferences,
  normalizeAppPreferences,
  readStoredAppPreferences,
} from "@/lib/appPreferences";

const hasStoredAppPreferences = () => {
  if (typeof window === "undefined") return false;
  try {
    return !!window.localStorage.getItem(APP_PREFERENCES_STORAGE_KEY);
  } catch {
    return false;
  }
};

const AppPreferencesBootstrapper: React.FC = () => {
  const { setTheme } = useTheme();
  const { user } = useAuth();

  useEffect(() => {
    if (
      typeof document !== "undefined" &&
      document.documentElement.getAttribute("data-theme-preapplied") === "1" &&
      hasStoredAppPreferences()
    ) {
      return;
    }

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
        if (hasStoredAppPreferences()) {
          const localApp = readStoredAppPreferences();
          applyAppPreferences({ ...serverApp, ...localApp }, setTheme);
          return;
        }

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
