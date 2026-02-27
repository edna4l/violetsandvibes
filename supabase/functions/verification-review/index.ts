import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createServiceClient, requireUser } from "../_shared/supabase.ts";

type VerificationStatus = "pending" | "submitted" | "approved" | "rejected";
type ReviewTarget = "photo" | "id" | "both";
type ReviewDecision = "approve" | "reject";

const VERIFICATION_MEDIA_BUCKET =
  Deno.env.get("VERIFICATION_MEDIA_BUCKET") ?? "verification-media";

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function normalizeStatus(value: unknown, fallback: VerificationStatus): VerificationStatus {
  if (typeof value !== "string") return fallback;
  const lowered = value.trim().toLowerCase();
  if (lowered === "pending" || lowered === "submitted" || lowered === "approved" || lowered === "rejected") {
    return lowered;
  }
  return fallback;
}

function normalizeTarget(value: unknown): ReviewTarget | null {
  if (typeof value !== "string") return null;
  const lowered = value.trim().toLowerCase();
  if (lowered === "photo" || lowered === "id" || lowered === "both") return lowered;
  return null;
}

function normalizeDecision(value: unknown): ReviewDecision | null {
  if (typeof value !== "string") return null;
  const lowered = value.trim().toLowerCase();
  if (lowered === "approve" || lowered === "reject") return lowered;
  return null;
}

function toIsoOrNull(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function buildComputedState(safetySettings: Record<string, unknown>) {
  const photoStatus = normalizeStatus(
    safetySettings.verification_photo_status ?? safetySettings.photo_status,
    "pending"
  );
  const idStatus = normalizeStatus(
    safetySettings.verification_id_status ?? safetySettings.id_status,
    "pending"
  );

  const fullyApproved = photoStatus === "approved" && idStatus === "approved";
  const submittedForReview =
    (photoStatus === "submitted" || photoStatus === "approved") &&
    (idStatus === "submitted" || idStatus === "approved");
  const underReview = !fullyApproved && submittedForReview && photoStatus !== "rejected" && idStatus !== "rejected";
  const completeForAccess = fullyApproved;

  return {
    photoStatus,
    idStatus,
    fullyApproved,
    submittedForReview,
    underReview,
    completeForAccess,
  };
}

async function requireAdmin(service: ReturnType<typeof createServiceClient>, userId: string) {
  const { data, error } = await service
    .from("admin_roles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    const message = String(error.message || "");
    if (message.toLowerCase().includes("does not exist")) {
      throw new Error("admin_roles table is missing. Add admin_roles before using verification reviews.");
    }
    throw error;
  }

  return !!data;
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
    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action.trim().toLowerCase() : "";
    const service = createServiceClient();

    const isAdmin = await requireAdmin(service, user.id);
    if (!isAdmin) {
      return jsonResponse({ error: "Admin access required." }, 403);
    }

    if (action === "list_pending") {
      const { data: rows, error } = await service
        .from("profiles")
        .select("id, full_name, username, safety_settings, updated_at")
        .order("updated_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      const items: Array<Record<string, unknown>> = [];
      for (const row of rows ?? []) {
        const safety = asObject((row as Record<string, unknown>).safety_settings);
        const computed = buildComputedState(safety);

        const photoPath =
          typeof safety.verification_photo_storage_path === "string"
            ? safety.verification_photo_storage_path
            : null;
        const idPath =
          typeof safety.verification_id_storage_path === "string"
            ? safety.verification_id_storage_path
            : null;

        const needsPhotoDecision = computed.photoStatus === "submitted";
        const needsIdDecision = computed.idStatus === "submitted";
        const hasPendingDecision = needsPhotoDecision || needsIdDecision;

        if (!hasPendingDecision) continue;

        let photoUrl: string | null = null;
        let idUrl: string | null = null;

        if (photoPath) {
          const { data: signed } = await service.storage
            .from(VERIFICATION_MEDIA_BUCKET)
            .createSignedUrl(photoPath, 60 * 30);
          photoUrl = signed?.signedUrl ?? null;
        }

        if (idPath) {
          const { data: signed } = await service.storage
            .from(VERIFICATION_MEDIA_BUCKET)
            .createSignedUrl(idPath, 60 * 30);
          idUrl = signed?.signedUrl ?? null;
        }

        const submittedAt =
          toIsoOrNull(safety.verification_submitted_at) ??
          toIsoOrNull((row as Record<string, unknown>).updated_at) ??
          new Date().toISOString();

        items.push({
          userId: row.id,
          name: row.full_name ?? row.username ?? "Member",
          username: row.username ?? null,
          submittedAt,
          underReview: computed.underReview,
          photoStatus: computed.photoStatus,
          idStatus: computed.idStatus,
          photoPath,
          idPath,
          photoUrl,
          idUrl,
        });
      }

      items.sort((a, b) => {
        const ta = new Date(String(a.submittedAt ?? 0)).getTime();
        const tb = new Date(String(b.submittedAt ?? 0)).getTime();
        return tb - ta;
      });

      return jsonResponse({
        success: true,
        items,
      });
    }

    if (action === "decide") {
      const targetUserId = typeof body?.targetUserId === "string" ? body.targetUserId.trim() : "";
      const target = normalizeTarget(body?.target);
      const decision = normalizeDecision(body?.decision);
      const notes = typeof body?.notes === "string" ? body.notes.trim() : null;

      if (!targetUserId) return jsonResponse({ error: "targetUserId is required." }, 400);
      if (!target) return jsonResponse({ error: "target must be photo, id, or both." }, 400);
      if (!decision) return jsonResponse({ error: "decision must be approve or reject." }, 400);

      const { data: profileRow, error: profileError } = await service
        .from("profiles")
        .select("id, safety_settings")
        .eq("id", targetUserId)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileRow) return jsonResponse({ error: "Profile not found." }, 404);

      const now = new Date().toISOString();
      const safety = asObject(profileRow.safety_settings);
      const nextSafety: Record<string, unknown> = { ...safety };
      const nextStatus: VerificationStatus = decision === "approve" ? "approved" : "rejected";

      if (target === "photo" || target === "both") {
        nextSafety.verification_photo_status = nextStatus;
        nextSafety.verification_photo_reviewed_at = now;
      }

      if (target === "id" || target === "both") {
        nextSafety.verification_id_status = nextStatus;
        nextSafety.verification_id_reviewed_at = now;
      }

      const computed = buildComputedState(nextSafety);
      nextSafety.verification_under_review = computed.underReview;
      nextSafety.photoVerification = computed.fullyApproved;
      nextSafety.verification_reviewed_at = now;
      nextSafety.verification_reviewed_by = user.id;

      if (decision === "reject") {
        nextSafety.verification_rejection_reason = notes || null;
      } else if (decision === "approve") {
        nextSafety.verification_rejection_reason = null;
      }

      const { error: updateError } = await service
        .from("profiles")
        .update({
          safety_settings: nextSafety,
          updated_at: now,
        })
        .eq("id", targetUserId);

      if (updateError) throw updateError;

      const { error: reviewError } = await service
        .from("verification_reviews")
        .insert({
          target_user_id: targetUserId,
          reviewer_id: user.id,
          target,
          decision,
          notes,
        });

      if (reviewError) throw reviewError;

      return jsonResponse({
        success: true,
        targetUserId,
        target,
        decision,
        photoStatus: computed.photoStatus,
        idStatus: computed.idStatus,
        completeForAccess: computed.completeForAccess,
        underReview: computed.underReview,
      });
    }

    return jsonResponse({ error: "Unsupported action." }, 400);
  } catch (error) {
    console.error("verification-review failed:", error);
    return jsonResponse(
      { error: (error as Error)?.message || "Verification review function failed." },
      500
    );
  }
});
