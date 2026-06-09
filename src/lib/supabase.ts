import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? "";
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  if (!import.meta.env.DEV) {
    throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
  }

  console.warn(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Public pages can render locally, but auth and data features need a populated .env file."
  );
}

const localDevFallbackUrl = "https://localhost.supabase.co";
const localDevFallbackAnonKey = "local-dev-anon-key";

export const supabase = createClient(
  supabaseUrl || localDevFallbackUrl,
  supabaseAnonKey || localDevFallbackAnonKey
);
