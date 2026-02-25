const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const fromBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const getStateSecret = () =>
  Deno.env.get("CALENDAR_OAUTH_STATE_SECRET") ||
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  "";

async function sign(payloadBase64: string) {
  const secret = getStateSecret();
  if (!secret) throw new Error("Missing CALENDAR_OAUTH_STATE_SECRET.");

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadBase64));
  return toBase64Url(new Uint8Array(signature));
}

export async function createSignedState(payload: unknown) {
  const payloadBase64 = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signatureBase64 = await sign(payloadBase64);
  return `${payloadBase64}.${signatureBase64}`;
}

export async function parseSignedState<T>(signedState: string): Promise<T> {
  const [payloadBase64, signatureBase64] = signedState.split(".");
  if (!payloadBase64 || !signatureBase64) {
    throw new Error("Invalid OAuth state.");
  }

  const expected = await sign(payloadBase64);
  if (expected !== signatureBase64) {
    throw new Error("OAuth state signature mismatch.");
  }

  const payloadJson = decoder.decode(fromBase64Url(payloadBase64));
  return JSON.parse(payloadJson) as T;
}
