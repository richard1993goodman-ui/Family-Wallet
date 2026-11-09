import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { inQuietHours, isPushFeature } from "./push";

// Web Push without a payload: only a VAPID-signed empty POST is sent, so no message content passes
// through Apple/Google push services. The service worker then asks /api/push/latest what to show.
// Written with WebCrypto (no node-only packages) so it runs on the Cloudflare worker target.

const b64u = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64u = (text: string) => Uint8Array.from(atob(text.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

export function pushPublicKey(): string | null {
  return process.env["VAPID_PUBLIC_KEY"] && process.env["VAPID_PRIVATE_KEY"] ? process.env["VAPID_PUBLIC_KEY"] : null;
}

export async function vapidAuthorization(endpoint: string, publicKey: string, privateKey: string, subject: string) {
  const pub = fromB64u(publicKey); // 65 bytes: 0x04 | x | y
  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)), d: privateKey, ext: true },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const enc = new TextEncoder();
  const header = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = b64u(
    enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })),
  );
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(`${header}.${body}`));
  return `vapid t=${header}.${body}.${b64u(signature)}, k=${publicKey}`;
}

async function sendEmptyPush(endpoint: string): Promise<"ok" | "gone" | "failed"> {
  const publicKey = process.env["VAPID_PUBLIC_KEY"];
  const privateKey = process.env["VAPID_PRIVATE_KEY"];
  if (!publicKey || !privateKey) return "failed";
  try {
    const subject = process.env["VAPID_SUBJECT"] || "mailto:hello@familywallet.io";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: await vapidAuthorization(endpoint, publicKey, privateKey, subject), TTL: "3600", Urgency: "normal" },
      signal: AbortSignal.timeout(4000),
    });
    return res.status === 404 || res.status === 410 ? "gone" : res.ok ? "ok" : "failed";
  } catch {
    return "failed";
  }
}

/** Nudges the other side's devices, honouring each device's muted features and quiet hours. */
export async function pushToOtherSide(familyId: string, actor: "family" | "nanny", feature: string) {
  if (!pushPublicKey() || !isPushFeature(feature)) return;
  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, muted_features, quiet_start, quiet_end, tz")
    .eq("family_id", familyId)
    .neq("role", actor);
  const now = new Date();
  const due = (subs ?? []).filter(
    (s) => !(s.muted_features ?? []).includes(feature) && !inQuietHours(now, s.tz, s.quiet_start, s.quiet_end),
  );
  const results = await Promise.all(due.map(async (s) => ({ id: s.id, result: await sendEmptyPush(s.endpoint) })));
  const gone = results.filter((r) => r.result === "gone").map((r) => r.id);
  if (gone.length) await supabaseAdmin.from("push_subscriptions").delete().in("id", gone);
}
