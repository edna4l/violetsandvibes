import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  createOrUpdateRemoteEvent,
  listRemoteEvents,
  refreshAccessToken,
  type Provider,
} from "../_shared/calendarProviders.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createServiceClient, requireUser } from "../_shared/supabase.ts";

type ConnectionRow = {
  id: string;
  user_id: string;
  provider: Provider;
  provider_calendar_id: string | null;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
};

type LocalEventRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  source: "local";
  provider_event_ids: Record<string, string> | null;
};

const SYNC_PAST_DAYS = 60;
const SYNC_FUTURE_DAYS = 365;

const isExpiredOrNearExpiry = (expiresAt: string | null) => {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now() + 60 * 1000;
};

const toProviderEventIds = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([, id]) => typeof id === "string" && id.length > 0
  );
  return Object.fromEntries(entries) as Record<string, string>;
};

async function ensureAccessToken(service: ReturnType<typeof createServiceClient>, row: ConnectionRow) {
  if (!isExpiredOrNearExpiry(row.expires_at)) return row;
  if (!row.refresh_token) {
    throw new Error(`Token expired for ${row.provider}, and no refresh token is available.`);
  }

  const refreshed = await refreshAccessToken(row.provider, row.refresh_token);
  const nextAccessToken = refreshed.access_token;
  const nextRefreshToken = refreshed.refresh_token || row.refresh_token;
  const nextExpiresAt =
    refreshed.expires_in && refreshed.expires_in > 0
      ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
      : row.expires_at;

  const { error } = await service
    .from("calendar_connections")
    .update({
      access_token: nextAccessToken,
      refresh_token: nextRefreshToken,
      token_type: refreshed.token_type || null,
      scope: refreshed.scope || null,
      expires_at: nextExpiresAt,
    })
    .eq("id", row.id);
  if (error) throw error;

  return {
    ...row,
    access_token: nextAccessToken,
    refresh_token: nextRefreshToken,
    expires_at: nextExpiresAt,
  };
}

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
    const eventId =
      typeof payload?.eventId === "string" && payload.eventId.trim()
        ? payload.eventId.trim()
        : null;
    const pullRemoteEvents = !eventId;

    const service = createServiceClient();

    const { data: connectionRows, error: connectionError } = await service
      .from("calendar_connections")
      .select(
        "id, user_id, provider, provider_calendar_id, access_token, refresh_token, expires_at"
      )
      .eq("user_id", user.id);
    if (connectionError) throw connectionError;

    const connections = (connectionRows || []) as ConnectionRow[];
    if (connections.length === 0) {
      return jsonResponse({
        pushed: 0,
        imported: 0,
        skipped: 0,
        errors: [],
        message: "No connected calendars.",
      });
    }

    const localEventQuery = service
      .from("calendar_events")
      .select("id, user_id, title, description, location, starts_at, ends_at, source, provider_event_ids")
      .eq("user_id", user.id)
      .eq("source", "local");

    const filteredLocalEventQuery = eventId ? localEventQuery.eq("id", eventId) : localEventQuery;
    const { data: localEventRows, error: localEventError } = await filteredLocalEventQuery;
    if (localEventError) throw localEventError;

    const localEvents = ((localEventRows || []) as LocalEventRow[]).map((row) => ({
      ...row,
      provider_event_ids: toProviderEventIds(row.provider_event_ids),
    }));

    if (eventId && localEvents.length === 0) {
      return jsonResponse({ error: "Requested event was not found." }, 404);
    }

    const linkedRemoteEventIdsByProvider: Record<Provider, Set<string>> = {
      google: new Set<string>(),
      outlook: new Set<string>(),
    };

    localEvents.forEach((event) => {
      const ids = toProviderEventIds(event.provider_event_ids);
      if (ids.google) linkedRemoteEventIdsByProvider.google.add(ids.google);
      if (ids.outlook) linkedRemoteEventIdsByProvider.outlook.add(ids.outlook);
    });

    let pushed = 0;
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    const windowStart = new Date(Date.now() - SYNC_PAST_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const windowEnd = new Date(Date.now() + SYNC_FUTURE_DAYS * 24 * 60 * 60 * 1000).toISOString();

    for (const rawConnection of connections) {
      let connection = rawConnection;
      try {
        connection = await ensureAccessToken(service, rawConnection);
      } catch (error) {
        const message = `${rawConnection.provider}: ${(error as Error)?.message || "Token refresh failed."}`;
        errors.push(message);
        continue;
      }

      const provider = connection.provider;
      const calendarId = connection.provider_calendar_id || "primary";

      for (const event of localEvents) {
        try {
          const providerEventIds = toProviderEventIds(event.provider_event_ids);
          const existingProviderEventId = providerEventIds[provider];

          const remoteEventId = await createOrUpdateRemoteEvent({
            provider,
            accessToken: connection.access_token,
            calendarId,
            providerEventId: existingProviderEventId,
            event: {
              title: event.title,
              description: event.description,
              location: event.location,
              startsAt: event.starts_at,
              endsAt: event.ends_at,
            },
          });

          const nextProviderEventIds = {
            ...providerEventIds,
            [provider]: remoteEventId,
          };

          const { error: updateEventError } = await service
            .from("calendar_events")
            .update({
              provider_event_ids: nextProviderEventIds,
              sync_state: "synced",
              sync_error: null,
            })
            .eq("id", event.id)
            .eq("user_id", user.id);
          if (updateEventError) throw updateEventError;

          event.provider_event_ids = nextProviderEventIds;
          linkedRemoteEventIdsByProvider[provider].add(remoteEventId);
          pushed += 1;
        } catch (error) {
          const message = `${provider} push failed for "${event.title}": ${
            (error as Error)?.message || "Unknown error"
          }`;
          errors.push(message);
          await service
            .from("calendar_events")
            .update({
              sync_state: "error",
              sync_error: message.slice(0, 500),
            })
            .eq("id", event.id)
            .eq("user_id", user.id);
        }
      }

      if (!pullRemoteEvents) continue;

      try {
        const remoteRows = await listRemoteEvents({
          provider,
          accessToken: connection.access_token,
          calendarId,
          startAt: windowStart,
          endAt: windowEnd,
        });

        const rowsToUpsert = remoteRows
          .filter((row) => {
            if (linkedRemoteEventIdsByProvider[provider].has(row.providerEventId)) {
              skipped += 1;
              return false;
            }
            return true;
          })
          .map((row) => ({
            user_id: user.id,
            title: row.title,
            description: row.description,
            location: row.location,
            starts_at: row.startsAt,
            ends_at: row.endsAt,
            source: provider,
            source_event_id: row.providerEventId,
            sync_state: "synced",
            sync_error: null,
          }));

        if (rowsToUpsert.length > 0) {
          const { error: upsertError } = await service
            .from("calendar_events")
            .upsert(rowsToUpsert, { onConflict: "user_id,source,source_event_id" });
          if (upsertError) throw upsertError;
          imported += rowsToUpsert.length;
        }
      } catch (error) {
        errors.push(
          `${provider} pull failed: ${(error as Error)?.message || "Could not read remote events."}`
        );
      }
    }

    return jsonResponse({
      pushed,
      imported,
      skipped,
      errors,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("calendar-sync failed:", error);
    return jsonResponse(
      { error: (error as Error)?.message || "Could not sync calendar events." },
      500
    );
  }
});
