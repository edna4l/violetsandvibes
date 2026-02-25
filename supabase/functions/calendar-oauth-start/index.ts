import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { buildAuthorizeUrl, type Provider } from "../_shared/calendarProviders.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createSignedState } from "../_shared/oauthState.ts";
import { requireUser } from "../_shared/supabase.ts";

type StatePayload = {
  provider: Provider;
  userId: string;
  returnPath: string;
  ts: number;
  v: 1;
};

const sanitizeReturnPath = (value: unknown) => {
  if (typeof value !== "string") return "/calendar";
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return "/calendar";
  if (trimmed.startsWith("//")) return "/calendar";
  return trimmed;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const { user, errorResponse } = await requireUser(req);
  if (errorResponse || !user) return errorResponse!;

  try {
    const payload = await req.json().catch(() => ({}));
    const provider = payload?.provider as Provider;

    if (provider !== "google" && provider !== "outlook") {
      return jsonResponse({ error: "provider must be 'google' or 'outlook'" }, 400);
    }

    const returnPath = sanitizeReturnPath(payload?.returnPath);

    const state: StatePayload = {
      provider,
      userId: user.id,
      returnPath,
      ts: Date.now(),
      v: 1,
    };

    const encodedState = await createSignedState(state);
    const authorizeUrl = buildAuthorizeUrl(provider, encodedState);
    return jsonResponse({ url: authorizeUrl });
  } catch (error) {
    console.error("calendar-oauth-start failed:", error);
    return jsonResponse(
      { error: (error as Error)?.message || "Could not start OAuth flow" },
      500
    );
  }
});
