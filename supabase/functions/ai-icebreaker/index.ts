/**
 * AI Icebreaker generator — Supabase Edge Function powered by Claude.
 *
 * Setup:
 *   1. Set env vars in Supabase Dashboard → Settings → Edge Functions:
 *        ANTHROPIC_API_KEY = sk-ant-...
 *   2. Call from the frontend after a new match:
 *        const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-icebreaker`, {
 *          method: 'POST',
 *          headers: { Authorization: `Bearer ${userAccessToken}`, 'Content-Type': 'application/json' },
 *          body: JSON.stringify({ matchProfileId })
 *        });
 *        const { suggestions } = await res.json();
 *        // suggestions: string[] of 3 opening lines
 *
 * Deploy: supabase functions deploy ai-icebreaker
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.30.0";

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") ?? "" });

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return new Response("Unauthorized", { status: 401 });

  const { matchProfileId } = await req.json();
  if (!matchProfileId) return new Response("Missing matchProfileId", { status: 400 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, bio, interests, gender_identity, icebreaker_prompts, lifestyle_interests")
    .eq("id", matchProfileId)
    .maybeSingle();

  if (!profile) return new Response("Profile not found", { status: 404 });

  const interestsList = (profile.interests ?? []).slice(0, 5).join(", ");
  const icebreakers = (profile.icebreaker_prompts ?? [])
    .slice(0, 2)
    .map((p: any) => `Q: "${p.prompt}" → A: "${p.answer}"`)
    .join("\n");

  const prompt = `You are helping someone send a first message on Violets & Vibes, a women-centered community and connection app for friendship, dating, and community — open to all women.

Here's what you know about the person they matched with:
- Name: ${profile.full_name ?? "unknown"}
- Bio: ${profile.bio ?? "none"}
- Interests: ${interestsList || "not specified"}
- Gender identity: ${profile.gender_identity ?? "not specified"}
${icebreakers ? `- Icebreaker answers:\n${icebreakers}` : ""}

Generate exactly 3 short, genuine, non-cheesy opening messages they could send. Each should:
- Feel personal, not like a template
- Reference something specific from the profile
- Be 1-2 sentences max
- Have a warm, inclusive, women-positive tone

Return only a JSON array of 3 strings, no other text. Example: ["Message 1", "Message 2", "Message 3"]`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  const text = (message.content[0] as any).text ?? "[]";

  let suggestions: string[] = [];
  try {
    suggestions = JSON.parse(text);
  } catch {
    suggestions = [text];
  }

  return new Response(JSON.stringify({ suggestions }), {
    headers: { "Content-Type": "application/json" },
  });
});
