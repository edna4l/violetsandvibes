import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createSignedState } from "../_shared/oauthState.ts";

type StatePayload = {
  provider: "tiktok";
  returnPath: string;
  ts: number;
  v: 1;
};

const TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";

const getRequiredEnv = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const getCallbackUrl = () =>
  Deno.env.get("TIKTOK_OAUTH_CALLBACK_URL") ||
  `${getRequiredEnv("SUPABASE_URL")}/functions/v1/tiktok-oauth-callback`;

const sanitizeReturnPath = (value: unknown) => {
  if (typeof value !== "string") return "/social";
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return "/social";
  if (trimmed.startsWith("//")) return "/social";
  return trimmed;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const payload = await req.json().catch(() => ({}));
    const returnPath = sanitizeReturnPath(payload?.returnPath);

    const state: StatePayload = {
      provider: "tiktok",
      returnPath,
      ts: Date.now(),
      v: 1,
    };

    const signedState = await createSignedState(state);
    const params = new URLSearchParams({
      client_key: getRequiredEnv("TIKTOK_CLIENT_KEY"),
      scope: Deno.env.get("TIKTOK_LOGIN_SCOPE") || "user.info.basic",
      response_type: "code",
      redirect_uri: getCallbackUrl(),
      state: signedState,
    });

    return jsonResponse({ url: `${TIKTOK_AUTH_URL}?${params.toString()}` });
  } catch (error) {
    console.error("tiktok-oauth-start failed:", error);
    return jsonResponse(
      { error: (error as Error)?.message || "Could not start TikTok OAuth." },
      500
    );
  }
});
