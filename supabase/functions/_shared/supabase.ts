import { createClient, type User } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { jsonResponse } from "./cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing required Supabase environment variables in Edge Function runtime.");
}

export const createServiceClient = () =>
  createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

export const createAuthedClient = (authorizationHeader: string) =>
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: authorizationHeader,
      },
    },
    auth: { autoRefreshToken: false, persistSession: false },
  });

export async function requireUser(req: Request): Promise<{
  user: User | null;
  errorResponse?: Response;
}> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return {
      user: null,
      errorResponse: jsonResponse({ error: "Missing Authorization header" }, 401),
    };
  }

  const authedClient = createAuthedClient(authHeader);
  const { data, error } = await authedClient.auth.getUser();
  if (error || !data.user) {
    return {
      user: null,
      errorResponse: jsonResponse({ error: "Unauthorized" }, 401),
    };
  }

  return { user: data.user };
}
