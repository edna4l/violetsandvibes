import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createServiceClient, requireUser } from "../_shared/supabase.ts";

async function cleanupUserStorage(
  service: ReturnType<typeof createServiceClient>,
  userId: string,
  bucketId: string
) {
  const { data: rows, error } = await service
    .from("storage.objects")
    .select("name")
    .eq("bucket_id", bucketId)
    .like("name", `${userId}/%`);

  if (error || !rows || rows.length === 0) return;

  const paths = rows
    .map((row: { name: string | null }) => row.name)
    .filter((name): name is string => typeof name === "string" && name.length > 0);

  if (paths.length === 0) return;

  const { error: removeError } = await service.storage.from(bucketId).remove(paths);
  if (removeError) {
    throw removeError;
  }
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
    if (payload?.confirm !== true) {
      return jsonResponse({ error: "Confirmation required" }, 400);
    }

    const service = createServiceClient();

    // Best-effort storage cleanup before deleting auth user.
    for (const bucketId of ["profile-media", "verification-media"]) {
      try {
        await cleanupUserStorage(service, user.id, bucketId);
      } catch (error) {
        console.warn(`Storage cleanup warning (${bucketId}):`, error);
      }
    }

    const { error: deleteError } = await service.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    return jsonResponse({
      success: true,
      deletedUserId: user.id,
      deletedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("delete-account failed:", error);
    return jsonResponse(
      { error: (error as Error)?.message || "Could not delete account." },
      500
    );
  }
});

