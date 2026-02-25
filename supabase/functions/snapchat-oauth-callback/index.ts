import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { parseSignedState } from "../_shared/oauthState.ts";
import { createServiceClient } from "../_shared/supabase.ts";

type StatePayload = {
  provider: "snapchat";
  returnPath: string;
  ts: number;
  v: 1;
  codeVerifier: string;
};

type SnapchatTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type SnapchatProfileResponse = {
  data?: {
    me?: {
      externalId?: string;
      displayName?: string;
      bitmoji?: {
        avatar?: string;
        id?: string;
      };
    };
  };
  errors?: Array<{ message?: string }>;
};

type SnapchatProfile = {
  externalId: string;
  displayName: string | null;
  bitmojiAvatar: string | null;
  bitmojiId: string | null;
};

const SNAPCHAT_TOKEN_URL = "https://accounts.snapchat.com/accounts/oauth2/token";
const SNAPCHAT_PROFILE_URL = "https://kit.snapchat.com/v1/me";
const SNAPCHAT_PROFILE_QUERY =
  "{me{externalId displayName bitmoji{avatar id}}}";
const STATE_TTL_MS = 20 * 60 * 1000;

const getRequiredEnv = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const getCallbackUrl = () =>
  Deno.env.get("SNAPCHAT_OAUTH_CALLBACK_URL") ||
  `${getRequiredEnv("SUPABASE_URL")}/functions/v1/snapchat-oauth-callback`;

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

async function exchangeCodeForTokens(code: string, codeVerifier: string) {
  const clientId = getRequiredEnv("SNAPCHAT_CLIENT_ID");
  const clientSecret = getRequiredEnv("SNAPCHAT_CLIENT_SECRET");
  const basicAuth = btoa(`${clientId}:${clientSecret}`);

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: getCallbackUrl(),
    code_verifier: codeVerifier,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(SNAPCHAT_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: body.toString(),
  });

  const data = (await response.json()) as SnapchatTokenResponse;
  if (!response.ok || data.error) {
    throw new Error(data.error_description || data.error || "token_exchange_failed");
  }

  if (!data.access_token) {
    throw new Error("missing_access_token");
  }

  return data;
}

async function fetchSnapchatProfile(accessToken: string): Promise<SnapchatProfile> {
  const profileUrl = `${SNAPCHAT_PROFILE_URL}?query=${encodeURIComponent(SNAPCHAT_PROFILE_QUERY)}`;
  const response = await fetch(profileUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = (await response.json()) as SnapchatProfileResponse;
  if (!response.ok || (data.errors && data.errors.length > 0)) {
    const firstError = data.errors?.[0]?.message;
    throw new Error(firstError || "profile_fetch_failed");
  }

  const me = data.data?.me;
  if (!me?.externalId) {
    throw new Error("missing_external_id");
  }

  return {
    externalId: me.externalId,
    displayName: me.displayName || null,
    bitmojiAvatar: me.bitmoji?.avatar || null,
    bitmojiId: me.bitmoji?.id || null,
  };
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

const toSyntheticEmail = (externalId: string) => {
  const cleaned = externalId.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40) || "user";
  return `snapchat_${cleaned}@social.violetsandvibes.local`;
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
        console.error("snapchat-oauth-callback state parse failed:", error);
      }
    }

    const returnPath = sanitizeReturnPath(state?.returnPath);
    if (!state || state.v !== 1 || Date.now() - state.ts > STATE_TTL_MS) {
      return redirect(
        buildAppRedirect(returnPath, {
          social_error: "invalid_or_expired_state",
          provider: "snapchat",
        })
      );
    }

    if (oauthError) {
      return redirect(
        buildAppRedirect(returnPath, {
          social_error: toSafeReason(oauthErrorDescription || oauthError),
          provider: "snapchat",
        })
      );
    }

    if (!code) {
      return redirect(
        buildAppRedirect(returnPath, {
          social_error: "missing_oauth_code",
          provider: "snapchat",
        })
      );
    }

    const service = createServiceClient();
    const tokenData = await exchangeCodeForTokens(code, state.codeVerifier);
    const profile = await fetchSnapchatProfile(tokenData.access_token as string);

    let resolvedUserId: string | null = null;
    let resolvedEmail: string | null = null;

    const { data: linkedIdentity, error: identityLookupError } = await service
      .from("social_identity_links")
      .select("user_id, provider_email")
      .eq("provider", "snapchat")
      .eq("provider_user_id", profile.externalId)
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
      const candidateEmail = toSyntheticEmail(profile.externalId);

      let existingUser = await findAuthUserByEmail(service, candidateEmail);
      if (!existingUser) {
        const { data: created, error: createError } = await service.auth.admin.createUser({
          email: candidateEmail,
          email_confirm: true,
          user_metadata: {
            full_name: profile.displayName || "Snapchat User",
            username: null,
            avatar_url: profile.bitmojiAvatar,
            auth_provider: "snapchat",
            provider_user_id: profile.externalId,
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

    if (!resolvedUserId || !resolvedEmail) {
      throw new Error("missing_resolved_user");
    }

    const { error: linkError } = await service.from("social_identity_links").upsert(
      {
        user_id: resolvedUserId,
        provider: "snapchat",
        provider_user_id: profile.externalId,
        provider_username: profile.displayName || null,
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
    console.error("snapchat-oauth-callback failed:", error);
    return redirect(
      buildAppRedirect("/signin", {
        social_error: toSafeReason((error as Error)?.message || "callback_failed"),
        provider: "snapchat",
      })
    );
  }
});
