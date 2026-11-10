// Server-only: never import this from a component. All Stripe traffic goes through the
// Lovable connector gateway, which holds the real secret key; this file never sees it.
import Stripe from "stripe";

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not configured`);
  return value;
};

export type StripeEnv = "sandbox" | "live";

const GATEWAY_STRIPE_BASE = "https://connector-gateway.lovable.dev/stripe";

export function getConnectionApiKey(env: StripeEnv): string {
  return env === "sandbox" ? getEnv("STRIPE_SANDBOX_API_KEY") : getEnv("STRIPE_LIVE_API_KEY");
}

/** Every request to api.stripe.com is rewritten to the gateway, which attaches the real key. */
export function createStripeClient(env: StripeEnv): Stripe {
  const connectionApiKey = getConnectionApiKey(env);
  const lovableApiKey = getEnv("LOVABLE_API_KEY");

  return new Stripe(connectionApiKey, {
    apiVersion: "2026-03-25.dahlia",
    httpClient: Stripe.createFetchHttpClient((input, init) => {
      const stripeUrl = input instanceof Request ? input.url : input.toString();
      const gatewayUrl = stripeUrl.replace("https://api.stripe.com", GATEWAY_STRIPE_BASE);
      return fetch(gatewayUrl, {
        ...init,
        headers: {
          ...Object.fromEntries(
            new Headers(
              init?.headers ?? (input instanceof Request ? input.headers : undefined),
            ).entries(),
          ),
          "X-Connection-Api-Key": connectionApiKey,
          "Lovable-API-Key": lovableApiKey,
        },
      });
    }),
  });
}

/** Stripe's own wording, so a failed payment says what actually went wrong. */
export function getStripeErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const e = error as {
      message?: string;
      type?: string;
      code?: string;
      decline_code?: string;
      param?: string;
      requestId?: string;
      raw?: {
        message?: string;
        type?: string;
        code?: string;
        decline_code?: string;
        param?: string;
        requestId?: string;
      };
    };
    const message = e.raw?.message ?? e.message;
    if (message) {
      const details = [
        e.raw?.type ?? e.type,
        e.raw?.code ?? e.code,
        e.raw?.decline_code ?? e.decline_code,
        e.raw?.param ?? e.param,
        e.raw?.requestId ?? e.requestId,
      ].filter(Boolean);
      return details.length ? `${message} (${details.join(", ")})` : message;
    }
  }
  return "Stripe request failed";
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

/** Reads the body once, checks the signature with the secret for that environment, then parses it. */
export async function verifyWebhook(
  req: Request,
  env: StripeEnv,
): Promise<{ type: string; data: { object: Record<string, unknown> } }> {
  const body = await req.text();
  const secret =
    env === "sandbox" ? getEnv("PAYMENTS_SANDBOX_WEBHOOK_SECRET") : getEnv("PAYMENTS_LIVE_WEBHOOK_SECRET");
  const valid = await verifyStripeSignature(body, req.headers.get("stripe-signature"), secret);
  if (!valid) throw new Error("Invalid webhook signature");
  return JSON.parse(body) as { type: string; data: { object: Record<string, unknown> } };
}
