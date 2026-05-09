/**
 * Stripe webhook handler — runs as a Supabase Edge Function.
 *
 * Setup:
 *   1. Create a Stripe account and add products for:
 *        - Premium monthly: price_xxx  (set STRIPE_PRICE_PREMIUM_MONTHLY)
 *        - Premium annual:  price_xxx  (set STRIPE_PRICE_PREMIUM_ANNUAL)
 *        - Elite monthly:   price_xxx  (set STRIPE_PRICE_ELITE_MONTHLY)
 *        - Elite annual:    price_xxx  (set STRIPE_PRICE_ELITE_ANNUAL)
 *   2. Set env vars in Supabase Dashboard → Settings → Edge Functions:
 *        STRIPE_SECRET_KEY      = sk_live_...
 *        STRIPE_WEBHOOK_SECRET  = whsec_...
 *        SUPABASE_SERVICE_ROLE_KEY (auto-set by Supabase)
 *        SUPABASE_URL              (auto-set by Supabase)
 *   3. Register this function URL as a Stripe webhook endpoint listening for:
 *        customer.subscription.created
 *        customer.subscription.updated
 *        customer.subscription.deleted
 *        checkout.session.completed
 *
 * Deploy: supabase functions deploy stripe-webhook
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const PRICE_TO_TIER: Record<string, string> = {
  [Deno.env.get("STRIPE_PRICE_PREMIUM_MONTHLY") ?? ""]: "premium",
  [Deno.env.get("STRIPE_PRICE_PREMIUM_ANNUAL") ?? ""]: "premium",
  [Deno.env.get("STRIPE_PRICE_ELITE_MONTHLY") ?? ""]: "elite",
  [Deno.env.get("STRIPE_PRICE_ELITE_ANNUAL") ?? ""]: "elite",
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const body = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        if (!userId) break;
        const subscriptionId = session.subscription as string;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id ?? "";
        const tier = PRICE_TO_TIER[priceId] ?? "free";

        await supabase.from("profiles").update({ subscription_tier: tier }).eq("id", userId);
        await supabase.from("billing_transactions").insert({
          user_id: userId,
          stripe_subscription_id: subscriptionId,
          tier,
          amount_cents: subscription.items.data[0]?.price.unit_amount ?? 0,
          currency: subscription.items.data[0]?.price.currency ?? "usd",
          status: "active",
        });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.supabase_user_id;
        if (!userId) break;
        const priceId = sub.items.data[0]?.price.id ?? "";
        const tier = sub.status === "active" ? (PRICE_TO_TIER[priceId] ?? "free") : "free";
        await supabase.from("profiles").update({ subscription_tier: tier }).eq("id", userId);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.supabase_user_id;
        if (userId) {
          await supabase.from("profiles").update({ subscription_tier: "free" }).eq("id", userId);
        }
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new Response("Handler error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
});
