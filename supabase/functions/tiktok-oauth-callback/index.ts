import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { parseSignedState } from "../_shared/oauthState.ts";
import { createServiceClient } from "../_shared/supabase.ts";

type StatePayload = {
  provider: "tiktok";
  returnPath: string;
  ts: number;
  v: 1;
};

type TikTokTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
  open_id?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type TikTokUserProfile = {
  open_id: string;
  union_id?: string | null;
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  email?: string | null;
};

const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const TIKTOK_USER_INFO_URL =
  "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,display_name,username,avatar_url";
const STATE_TTL_MS = 20 * 60 * 1000;

const getRequiredEnv = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const getCallbackUrl = () =>
  Deno.env.get("TIKTOK_OAUTH_CALLBACK_URL") ||
  `${getRequiredEnv("SUPABASE_URL")}/functions/v1/tiktok-oauth-callback`;

const getAppSiteUrl = () => Deno.env.get("APP_SITE_URL") || "https://violetsandvibes.com";

const sanitizeReturnPath = (value: unknown) => {
  if (typeof value !== "string") return "/signin";
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return "/signin";
  if (trimmed.startsWith("//")) return "/signin";
  return trimmed;
};

const redirect = (location: string) =>
  new Response(null, {
    status: 302,
    headers: { Location: location },
  });

const buildAppRedirect = (returnPath: string, params: Record<string, string>) => {
  const base = getAppSiteUrl().replace(/\/+$/, "");
  const url = new URL(`${base}${sanitizeReturnPath(returnPath)}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
};

const toSafeReason = (value: unknown) => {
  if (!value) return "oauth_failed";
  const text = String(value).trim().slice(0, 140);
  return text.replace(/\s+/g, "_");
};

async function exchangeCodeForTokens(code: string) {
  const body = new URLSearchParams({
    client_key: getRequiredEnv("TIKTOK_CLIENT_KEY"),
    client_secret: getRequiredEnv("TIKTOK_CLIENT_SECRET"),
    code,
    grant_type: "authorization_code",
    redirect_uri: getCallbackUrl(),
  });

  const response = await fetch(TIKTOK_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = (await response.json()) as TikTokTokenResponse;
  if (!response.ok || data.error) {
    throw new Error(data.error_description || data.error || "token_exchange_failed");
  }

  if (!data.access_token) {
    throw new Error("missing_access_token");
  }

  return data;
}

async function fetchTikTokProfile(accessToken: string): Promise<TikTokUserProfile> {
  const response = await fetch(TIKTOK_USER_INFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await response.json();

  if (!response.ok || data?.error?.code) {
    throw new Error(data?.error?.message || "profile_fetch_failed");
  }

  const profile = (data?.data?.user || data?.user || null) as TikTokUserProfile | null;
  if (!profile?.open_id) {
    throw new Error("missing_open_id");
  }

  return profile;
}

async function findAuthUserByEmail(service: ReturnType<typeof createServiceClient>, email: string) {
  let page = 1;
  while (page <= 10) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const user = (data?.users || []).find((item) => item.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if ((data?.users || []).length < 200) break;
    page += 1;
  }
  return null;
}

const toSyntheticEmail = (openId: string) => {
  const cleaned = openId.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40) || "user";
  return `tiktok_${cleaned}@social.violetsandvibes.local`;
};

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const rawState = url.searchParams.get("state");
    const oauthError = url.searchParams.get("error");
    const oauthErrorDescription = url.searchParams.get("error_description");

    let state: StatePayload | null = null;
    if (rawState) {
      try {
        state = await parseSignedState<StatePayload>(rawState);
      } catch (error) {
        console.error("tiktok-oauth-callback state parse failed:", error);
      }
    }

    const returnPath = sanitizeReturnPath(state?.returnPath);
    if (!state || state.v !== 1 || Date.now() - state.ts > STATE_TTL_MS) {
      return redirect(
        buildAppRedirect(returnPath, {
          social_error: "invalid_or_expired_state",
          provider: "tiktok",
        })
      );
    }

    if (oauthError) {
      return redirect(
        buildAppRedirect(returnPath, {
          social_error: toSafeReason(oauthErrorDescription || oauthError),
          provider: "tiktok",
        })
      );
    }

    if (!code) {
      return redirect(
        buildAppRedirect(returnPath, {
          social_error: "missing_oauth_code",
          provider: "tiktok",
        })
      );
    }

    const service = createServiceClient();
    const tokenData = await exchangeCodeForTokens(code);
    const profile = await fetchTikTokProfile(tokenData.access_token as string);

    const providerUserId = profile.open_id || tokenData.open_id || "";
    if (!providerUserId) {
      throw new Error("missing_provider_user_id");
    }

    let resolvedUserId: string | null = null;
    let resolvedEmail: string | null = null;

    const { data: linkedIdentity, error: identityLookupError } = await service
      .from("social_identity_links")
      .select("user_id, provider_email")
      .eq("provider", "tiktok")
      .eq("provider_user_id", providerUserId)
      .maybeSingle();

    if (identityLookupError) throw identityLookupError;

    if (linkedIdentity?.user_id) {
      resolvedUserId = linkedIdentity.user_id;
      const { data: userLookup, error: userLookupError } = await service.auth.admin.getUserById(
        resolvedUserId
      );
      if (userLookupError) throw userLookupError;
      resolvedEmail = userLookup?.user?.email || linkedIdentity.provider_email || null;
    } else {
      const candidateEmail =
        profile.email?.trim().toLowerCase() || toSyntheticEmail(providerUserId);

      let existingUser = await findAuthUserByEmail(service, candidateEmail);
      if (!existingUser) {
        const { data: created, error: createError } = await service.auth.admin.createUser({
          email: candidateEmail,
          email_confirm: true,
          user_metadata: {
            full_name: profile.display_name || profile.username || "TikTok User",
            username: profile.username || null,
            avatar_url: profile.avatar_url || null,
            auth_provider: "tiktok",
            provider_user_id: providerUserId,
          },
        });
        if (createError) throw createError;
        existingUser = created.user;
      }

      if (!existingUser?.id || !existingUser.email) {
        throw new Error("user_resolution_failed");
      }

      resolvedUserId = existingUser.id;
      resolvedEmail = existingUser.email;

    }

    if (!resolvedEmail) {
      throw new Error("missing_resolved_email");
    }

    const { error: linkError } = await service.from("social_identity_links").upsert(
      {
        user_id: resolvedUserId,
        provider: "tiktok",
        provider_user_id: providerUserId,
        provider_username: profile.username || null,
        provider_email: resolvedEmail,
        raw_profile: profile as unknown as Record<string, unknown>,
      },
      { onConflict: "provider,provider_user_id" }
    );
    if (linkError) throw linkError;

    const targetRedirect = `${getAppSiteUrl().replace(/\/+$/, "")}${sanitizeReturnPath(returnPath)}`;

    const { data: linkData, error: magicLinkError } = await service.auth.admin.generateLink({
      type: "magiclink",
      email: resolvedEmail,
      options: {
        redirectTo: targetRedirect,
      },
    });
    if (magicLinkError) throw magicLinkError;

    const actionLink = linkData?.properties?.action_link;
    if (!actionLink) throw new Error("missing_magic_link");

    return redirect(actionLink);
  } catch (error) {
    console.error("tiktok-oauth-callback failed:", error);
    return redirect(
      buildAppRedirect("/signin", {
        social_error: toSafeReason((error as Error)?.message || "callback_failed"),
        provider: "tiktok",
      })
    );
  }
});
