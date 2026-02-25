import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createSignedState } from "../_shared/oauthState.ts";

type StatePayload = {
  provider: "snapchat";
  returnPath: string;
  ts: number;
  v: 1;
  codeVerifier: string;
};

const SNAPCHAT_AUTH_URL = "https://accounts.snapchat.com/accounts/oauth2/auth";

const DEFAULT_SCOPE = [
  "https://auth.snapchat.com/oauth2/api/user.external_id",
  "https://auth.snapchat.com/oauth2/api/user.display_name",
  "https://auth.snapchat.com/oauth2/api/user.bitmoji.avatar",
].join(" ");

const getRequiredEnv = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const getCallbackUrl = () =>
  Deno.env.get("SNAPCHAT_OAUTH_CALLBACK_URL") ||
  `${getRequiredEnv("SUPABASE_URL")}/functions/v1/snapchat-oauth-callback`;

const sanitizeReturnPath = (value: unknown) => {
  if (typeof value !== "string") return "/social";
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return "/social";
  if (trimmed.startsWith("//")) return "/social";
  return trimmed;
};

const toBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const createCodeVerifier = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return toBase64Url(bytes);
};

const createCodeChallenge = async (codeVerifier: string) => {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(codeVerifier)
  );
  return toBase64Url(new Uint8Array(hash));
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

    const codeVerifier = createCodeVerifier();
    const codeChallenge = await createCodeChallenge(codeVerifier);

    const state: StatePayload = {
      provider: "snapchat",
      returnPath,
      ts: Date.now(),
      v: 1,
      codeVerifier,
    };

    const signedState = await createSignedState(state);
    const params = new URLSearchParams({
      client_id: getRequiredEnv("SNAPCHAT_CLIENT_ID"),
      response_type: "code",
      redirect_uri: getCallbackUrl(),
      scope: Deno.env.get("SNAPCHAT_LOGIN_SCOPE") || DEFAULT_SCOPE,
      state: signedState,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    return jsonResponse({ url: `${SNAPCHAT_AUTH_URL}?${params.toString()}` });
  } catch (error) {
    console.error("snapchat-oauth-start failed:", error);
    return jsonResponse(
      { error: (error as Error)?.message || "Could not start Snapchat OAuth." },
      500
    );
  }
});
