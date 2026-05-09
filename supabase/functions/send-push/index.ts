/**
 * Push notification sender — Supabase Edge Function.
 *
 * Setup:
 *   1. Create a Firebase project at console.firebase.google.com
 *   2. Enable Cloud Messaging, download the service account JSON
 *   3. Set env vars:
 *        FIREBASE_PROJECT_ID       = your-project-id
 *        FIREBASE_SERVICE_ACCOUNT  = <base64-encoded service account JSON>
 *   4. Install Capacitor Push Notifications plugin in the app:
 *        npm install @capacitor/push-notifications
 *   5. Store FCM tokens in a `push_tokens` table:
 *        CREATE TABLE push_tokens (
 *          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *          user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
 *          token text NOT NULL,
 *          platform text CHECK (platform IN ('ios','android','web')),
 *          created_at timestamptz DEFAULT now(),
 *          UNIQUE(user_id, token)
 *        );
 *   6. Call this function from other Edge Functions or DB triggers:
 *        await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
 *          method: 'POST',
 *          headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
 *          body: JSON.stringify({ userId, title, body, data })
 *        });
 *
 * Deploy: supabase functions deploy send-push
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

async function getAccessToken(): Promise<string> {
  const serviceAccountB64 = Deno.env.get("FIREBASE_SERVICE_ACCOUNT") ?? "";
  const serviceAccount = JSON.parse(atob(serviceAccountB64));

  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    new TextEncoder().encode(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${payload}`));
  const jwt = `${header}.${payload}.${btoa(String.fromCharCode(...new Uint8Array(sig)))}`;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const { access_token } = await resp.json();
  return access_token;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { userId, title, body, data = {} } = await req.json();
  if (!userId || !title) return new Response("Missing userId or title", { status: 400 });

  const { data: tokenRows, error } = await supabase
    .from("push_tokens")
    .select("token, platform")
    .eq("user_id", userId);

  if (error || !tokenRows?.length) return new Response("No tokens", { status: 200 });

  const projectId = Deno.env.get("FIREBASE_PROJECT_ID") ?? "";
  const accessToken = await getAccessToken();
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  const results = await Promise.allSettled(
    tokenRows.map((row: any) =>
      fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: row.token,
            notification: { title, body },
            data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
            apns: { payload: { aps: { badge: 1, sound: "default" } } },
          },
        }),
      }).then((r) => r.json())
    )
  );

  console.log("Push results:", JSON.stringify(results));
  return new Response(JSON.stringify({ sent: tokenRows.length }), { status: 200 });
});
