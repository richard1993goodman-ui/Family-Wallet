import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {} }));
import { vapidAuthorization } from "./push.server";

const b64u = (b: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64u = (t: string) => Uint8Array.from(atob(t.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

describe("vapidAuthorization", () => {
  it("signs a JWT the public key can verify, scoped to the push service origin", async () => {
    const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    const pubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
    const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
    const header = await vapidAuthorization("https://push.example.com/abc/def", b64u(pubRaw), jwk.d!, "mailto:test@example.com");

    const [, t, k] = /^vapid t=([^,]+), k=(.+)$/.exec(header)!;
    expect(k).toBe(b64u(pubRaw));
    const [h, p, sig] = t!.split(".");
    const payload = JSON.parse(new TextDecoder().decode(fromB64u(p!)));
    expect(payload.aud).toBe("https://push.example.com");
    expect(payload.sub).toBe("mailto:test@example.com");
    expect(payload.exp).toBeGreaterThan(Date.now() / 1000);
    const ok = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      pair.publicKey,
      fromB64u(sig!),
      new TextEncoder().encode(`${h}.${p}`),
    );
    expect(ok).toBe(true);
  });
});
