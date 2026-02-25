export type AppPreferences = {
  darkMode: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  autoPlayVideos: boolean;
  soundEffects: boolean;
};

export const APP_PREFERENCES_STORAGE_KEY = "vv_app_preferences";
export const APP_PREFERENCES_EVENT = "vv:app-preferences-changed";

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  darkMode: false,
  reducedMotion: false,
  highContrast: false,
  largeText: false,
  autoPlayVideos: true,
  soundEffects: true,
};

const getBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

export function normalizeAppPreferences(source: unknown): AppPreferences {
  const input =
    source && typeof source === "object" ? (source as Record<string, unknown>) : {};

  return {
    darkMode: getBoolean(input.darkMode, DEFAULT_APP_PREFERENCES.darkMode),
    reducedMotion: getBoolean(input.reducedMotion, DEFAULT_APP_PREFERENCES.reducedMotion),
    highContrast: getBoolean(input.highContrast, DEFAULT_APP_PREFERENCES.highContrast),
    largeText: getBoolean(input.largeText, DEFAULT_APP_PREFERENCES.largeText),
    autoPlayVideos: getBoolean(input.autoPlayVideos, DEFAULT_APP_PREFERENCES.autoPlayVideos),
    soundEffects: getBoolean(input.soundEffects, DEFAULT_APP_PREFERENCES.soundEffects),
  };
}

export function readStoredAppPreferences(): AppPreferences {
  if (typeof window === "undefined") return { ...DEFAULT_APP_PREFERENCES };

  try {
    const raw = window.localStorage.getItem(APP_PREFERENCES_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_APP_PREFERENCES };
    return normalizeAppPreferences(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_APP_PREFERENCES };
  }
}

export function getAutoPlayVideosEnabled(): boolean {
  if (typeof document !== "undefined") {
    const attr = document.documentElement.getAttribute("data-autoplay-videos");
    if (attr === "true") return true;
    if (attr === "false") return false;
  }
  return readStoredAppPreferences().autoPlayVideos;
}

export function applyAppPreferences(
  preferences: AppPreferences,
  setTheme?: (theme: "light" | "dark" | "system") => void
) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.classList.toggle("vv-reduced-motion", preferences.reducedMotion);
  root.classList.toggle("vv-high-contrast", preferences.highContrast);
  root.classList.toggle("vv-large-text", preferences.largeText);
  root.setAttribute("data-autoplay-videos", preferences.autoPlayVideos ? "true" : "false");
  root.setAttribute("data-sound-effects", preferences.soundEffects ? "true" : "false");

  if (setTheme) {
    setTheme(preferences.darkMode ? "dark" : "light");
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(APP_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
    window.dispatchEvent(
      new CustomEvent(APP_PREFERENCES_EVENT, {
        detail: preferences,
      })
    );
  }
}
