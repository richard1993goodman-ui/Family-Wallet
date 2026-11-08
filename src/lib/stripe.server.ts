// Minimal Stripe REST client. Plain fetch keeps the Cloudflare worker free of the Node SDK.
// Server-only: never import this from a component.

// Stripe takes nested params as form fields: line_items[0][price]=...
function toForm(value: unknown, key: string, out: URLSearchParams) {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) value.forEach((v, i) => toForm(v, `${key}[${i}]`, out));
  else if (typeof value === "object")
    for (const [k, v] of Object.entries(value)) toForm(v, key ? `${key}[${k}]` : k, out);
  else out.append(key, String(value));
}

export async function stripe<T>(
  path: string,
  params: Record<string, unknown> = {},
  method: "GET" | "POST" = "POST",
): Promise<T> {
  const key = process.env["STRIPE_SECRET_KEY"] || process.env["STRIPE_RESTRICTED_API_KEY"];
  if (!key) throw new Error("Stripe key is not set");
  const form = new URLSearchParams();
  toForm(params, "", form);
  const query = method === "GET" && form.size ? `?${form}` : "";
  const res = await fetch(`https://api.stripe.com/v1${path}${query}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    ...(method === "POST" && { body: form }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${body?.error?.message ?? "request failed"}`);
  return body as T;
}

const enc = new TextEncoder();

function hex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sameString(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Checks a Stripe-Signature header against the raw request body.
 * The header looks like `t=1700000000,v1=<hex>,v1=<hex>`; the signed text is `${t}.${body}`.
 * Rejects anything older than `toleranceSeconds` so a captured request can't be replayed later.
 */
export async function verifyStripeSignature(
  body: string,
  header: string | null,
  secret: string,
  toleranceSeconds = 300,
  now = Date.now(),
) {
  if (!header || !secret) return false;
  const parts = header.split(",").map((p) => p.trim().split("="));
  const timestamp = parts.find(([k]) => k === "t")?.[1];
  const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v ?? "");
  if (!timestamp || signatures.length === 0) return false;
  const age = Math.abs(now / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = hex(await crypto.subtle.sign("HMAC", key, enc.encode(`${timestamp}.${body}`)));
  return signatures.some((s) => sameString(s, expected));
}
