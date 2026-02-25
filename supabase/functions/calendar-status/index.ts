import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createServiceClient, requireUser } from "../_shared/supabase.ts";

type ProviderStatus = {
  connected: boolean;
  providerAccountEmail: string | null;
  providerCalendarId: string | null;
  expiresAt: string | null;
  updatedAt: string | null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const { user, errorResponse } = await requireUser(req);
  if (errorResponse || !user) return errorResponse!;

  try {
    const service = createServiceClient();
    const { data: rows, error } = await service
      .from("calendar_connections")
      .select("provider, provider_account_email, provider_calendar_id, expires_at, updated_at")
      .eq("user_id", user.id);

    if (error) throw error;

    const providers: Record<"google" | "outlook", ProviderStatus> = {
      google: {
        connected: false,
        providerAccountEmail: null,
        providerCalendarId: null,
        expiresAt: null,
        updatedAt: null,
      },
      outlook: {
        connected: false,
        providerAccountEmail: null,
        providerCalendarId: null,
        expiresAt: null,
        updatedAt: null,
      },
    };

    (rows || []).forEach((row: any) => {
      if (row.provider !== "google" && row.provider !== "outlook") return;
      providers[row.provider] = {
        connected: true,
        providerAccountEmail: row.provider_account_email || null,
        providerCalendarId: row.provider_calendar_id || null,
        expiresAt: row.expires_at || null,
        updatedAt: row.updated_at || null,
      };
    });

    return jsonResponse({
      providers,
      connectedCount: Object.values(providers).filter((p) => p.connected).length,
      hasAnyConnection: Object.values(providers).some((p) => p.connected),
    });
  } catch (error) {
    console.error("calendar-status failed:", error);
    return jsonResponse(
      { error: (error as Error)?.message || "Could not fetch calendar status" },
      500
    );
  }
});
