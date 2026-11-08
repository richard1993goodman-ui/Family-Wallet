import { describe, expect, it } from "vitest";

import { verifyStripeSignature } from "./stripe.server";

const secret = "whsec_test_secret";
const body = JSON.stringify({ type: "checkout.session.completed" });
const now = 1_700_000_000_000;

async function sign(payload: string, t: number, key = secret) {
  const k = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(`${t}.${payload}`));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

describe("verifyStripeSignature", () => {
  it("accepts a correctly signed, fresh request", async () => {
    const t = now / 1000;
    expect(await verifyStripeSignature(body, `t=${t},v1=${await sign(body, t)}`, secret, 300, now)).toBe(true);
  });

  it("accepts when any of several v1 signatures matches", async () => {
    const t = now / 1000;
    const header = `t=${t},v1=deadbeef,v1=${await sign(body, t)}`;
    expect(await verifyStripeSignature(body, header, secret, 300, now)).toBe(true);
  });

  it("rejects a tampered body", async () => {
    const t = now / 1000;
    const header = `t=${t},v1=${await sign(body, t)}`;
    expect(await verifyStripeSignature(`${body} `, header, secret, 300, now)).toBe(false);
  });

  it("rejects the wrong secret", async () => {
    const t = now / 1000;
    const header = `t=${t},v1=${await sign(body, t, "whsec_other")}`;
    expect(await verifyStripeSignature(body, header, secret, 300, now)).toBe(false);
  });

  it("rejects an old timestamp even if the signature is valid", async () => {
    const t = now / 1000 - 3600;
    const header = `t=${t},v1=${await sign(body, t)}`;
    expect(await verifyStripeSignature(body, header, secret, 300, now)).toBe(false);
  });

  it("rejects a missing header or secret", async () => {
    expect(await verifyStripeSignature(body, null, secret, 300, now)).toBe(false);
    expect(await verifyStripeSignature(body, "t=1,v1=abc", "", 300, now)).toBe(false);
    expect(await verifyStripeSignature(body, "garbage", secret, 300, now)).toBe(false);
  });
});
