import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createServiceClient, requireUser } from "../_shared/supabase.ts";

type SubscriptionTier = "free" | "premium" | "elite";
type BillingPeriod = "monthly" | "yearly";

const TIER_PRICES_CENTS: Record<Exclude<SubscriptionTier, "free">, Record<BillingPeriod, number>> = {
  premium: {
    monthly: 500,
    yearly: 5000,
  },
  elite: {
    monthly: 1000,
    yearly: 10000,
  },
};

const TIER_LABELS: Record<SubscriptionTier, string> = {
  free: "💜 Violets Verified Free",
  premium: "💜 Violets Verified Plus",
  elite: "💜 Violets Verified Premium",
};

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function normalizeTier(value: unknown): SubscriptionTier | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "free") return "free";
  if (normalized === "premium") return "premium";
  if (normalized === "elite") return "elite";
  return null;
}

function normalizeBillingPeriod(value: unknown): BillingPeriod {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  return raw === "yearly" ? "yearly" : "monthly";
}

function paymentMethodLabel(raw: unknown) {
  if (typeof raw === "string" && raw.trim().length > 0) return raw.trim();
  return "card";
}

async function updateProfileTier(
  service: ReturnType<typeof createServiceClient>,
  userId: string,
  tier: SubscriptionTier
) {
  const { data: profile, error: profileError } = await service
    .from("profiles")
    .select("privacy_settings, safety_settings")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) throw profileError;

  const privacySettings = asObject(profile?.privacy_settings);
  const safetySettings = asObject(profile?.safety_settings);
  const currentVioletsVerified = asObject(privacySettings.violets_verified);

  const nextPrivacySettings = {
    ...privacySettings,
    subscription_tier: tier,
    subscriptionTier: tier,
    violets_verified: {
      ...currentVioletsVerified,
      subscription_tier: tier,
      tier,
    },
  };

  const nextSafetySettings = {
    ...safetySettings,
    subscription_tier: tier,
    subscriptionTier: tier,
    violets_verified_unlocked: tier !== "free",
  };

  const { error: updateError } = await service
    .from("profiles")
    .update({
      privacy_settings: nextPrivacySettings,
      safety_settings: nextSafetySettings,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (updateError) throw updateError;
}

async function insertBillingTransaction(
  service: ReturnType<typeof createServiceClient>,
  params: {
    userId: string;
    tier: SubscriptionTier;
    billingPeriod: BillingPeriod | null;
    amountCents: number;
    status: "paid" | "pending" | "failed" | "refunded" | "cancelled";
    description: string;
    paymentMethod?: string;
    metadata?: Record<string, unknown>;
    invoiceUrl?: string | null;
  }
) {
  const { data, error } = await service
    .from("billing_transactions")
    .insert({
      user_id: params.userId,
      tier: params.tier,
      billing_period: params.billingPeriod,
      amount_cents: params.amountCents,
      status: params.status,
      description: params.description,
      payment_method: paymentMethodLabel(params.paymentMethod),
      metadata: params.metadata ?? {},
      invoice_url: params.invoiceUrl ?? null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data?.id as string;
}

function buildInlineInvoiceDataUrl(params: {
  invoiceId: string;
  date: string;
  description: string;
  amountCents: number;
  status: string;
}) {
  const amount = (params.amountCents / 100).toFixed(2);
  const lines = [
    "Violets & Vibes Invoice",
    "-----------------------",
    `Invoice ID: ${params.invoiceId}`,
    `Date: ${new Date(params.date).toISOString()}`,
    `Description: ${params.description}`,
    `Amount: $${amount}`,
    `Status: ${params.status}`,
  ].join("\n");

  return `data:text/plain;charset=utf-8,${encodeURIComponent(lines)}`;
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

    if (
      action === "get_billing_history" ||
      action === "billing_history" ||
      action === "list_invoices"
    ) {
      const { data, error } = await service
        .from("billing_transactions")
        .select(
          "id, created_at, amount_cents, status, description, invoice_url, payment_method, tier, billing_period"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return jsonResponse({ success: true, transactions: data ?? [] });
    }

    if (action === "create_subscription") {
      const tier = normalizeTier(body?.tier);
      if (!tier || tier === "free") {
        return jsonResponse({ error: "Paid tier required for subscription." }, 400);
      }

      const billingPeriod = normalizeBillingPeriod(body?.billingPeriod ?? body?.billing_period);
      const amountCents = TIER_PRICES_CENTS[tier][billingPeriod];
      const description = `${TIER_LABELS[tier]} ${
        billingPeriod.charAt(0).toUpperCase() + billingPeriod.slice(1)
      }`;

      await updateProfileTier(service, user.id, tier);
      await insertBillingTransaction(service, {
        userId: user.id,
        tier,
        billingPeriod,
        amountCents,
        status: "paid",
        description,
        paymentMethod: "card",
        metadata: {
          source: "handle-payment",
          action,
        },
      });

      return jsonResponse({
        success: true,
        tier,
        billingPeriod,
        amountCents,
        message: `Subscription updated to ${TIER_LABELS[tier]}.`,
      });
    }

    if (action === "cancel_subscription") {
      await updateProfileTier(service, user.id, "free");
      await insertBillingTransaction(service, {
        userId: user.id,
        tier: "free",
        billingPeriod: null,
        amountCents: 0,
        status: "cancelled",
        description: "Subscription cancelled",
        paymentMethod: "card",
        metadata: { source: "handle-payment", action },
      });

      return jsonResponse({
        success: true,
        tier: "free",
        message: "Subscription cancelled. Your plan is now 💜 Violets Verified Free.",
      });
    }

    if (action === "update_payment_method") {
      return jsonResponse({
        success: true,
        message: "Payment method management is enabled. Integrate provider checkout to update cards.",
      });
    }

    if (action === "download_invoice" || action === "get_invoice_url") {
      const invoiceId = String(body?.invoiceId ?? body?.invoice_id ?? "").trim();
      if (!invoiceId) {
        return jsonResponse({ error: "invoiceId is required." }, 400);
      }

      const { data: row, error } = await service
        .from("billing_transactions")
        .select("id, created_at, amount_cents, status, description, invoice_url")
        .eq("id", invoiceId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (!row) return jsonResponse({ error: "Invoice not found." }, 404);

      const invoiceUrl =
        row.invoice_url ||
        buildInlineInvoiceDataUrl({
          invoiceId: row.id,
          date: row.created_at,
          description: row.description,
          amountCents: row.amount_cents,
          status: row.status,
        });

      return jsonResponse({
        success: true,
        invoiceId: row.id,
        invoiceUrl,
      });
    }

    return jsonResponse({ error: "Unsupported action." }, 400);
  } catch (error) {
    console.error("handle-payment failed:", error);
    return jsonResponse(
      { error: (error as Error)?.message || "Payment handler failed." },
      500
    );
  }
});
