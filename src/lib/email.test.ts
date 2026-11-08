import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sendEmail } from "./email.server";
import { buildWalletEmail } from "./wallet-email";

describe("buildWalletEmail", () => {
  const wallet = { familyName: "The Smiths", url: "https://familywallet.io/w/smith-4f2a", code: "K7M2PQ" };

  it("puts the link and code in both the text and html versions", () => {
    const m = buildWalletEmail("welcome", [wallet]);
    expect(m.subject).toBe("Your Family Wallet is ready");
    for (const body of [m.text, m.html]) {
      expect(body).toContain("https://familywallet.io/w/smith-4f2a");
      expect(body).toContain("K7M2PQ");
    }
  });

  it("escapes anything a household could type into its name", () => {
    const m = buildWalletEmail("recover", [{ ...wallet, familyName: '<script>alert("x")</script>' }]);
    expect(m.html).not.toContain("<script>");
    expect(m.html).toContain("&lt;script&gt;");
  });

  it("lists every wallet when one email owns several", () => {
    const m = buildWalletEmail("recover", [wallet, { ...wallet, familyName: "The Joneses", code: "ZZZ999" }]);
    expect(m.subject).toBe("Your Family Wallet links and access codes");
    expect(m.text).toContain("The Joneses");
    expect(m.text).toContain("ZZZ999");
  });
});

describe("sendEmail", () => {
  const message = { to: "a@b.co", subject: "Hi", html: "<p>Hi</p>", text: "Hi" };
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("does nothing, and does not throw, when no key is set", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect(await sendEmail(message)).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("posts to Resend with the key and the recipient", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 200 }));
    expect(await sendEmail(message)).toBe(true);
    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    expect((init!.headers as Record<string, string>)["Authorization"]).toBe("Bearer re_test");
    expect(JSON.parse(String(init!.body)).to).toEqual(["a@b.co"]);
  });

  it("reports failure when Resend refuses, instead of throwing", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.mocked(fetch).mockResolvedValue(new Response("nope", { status: 403 }));
    expect(await sendEmail(message)).toBe(false);
  });

  it("reports failure when the network breaks", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.mocked(fetch).mockRejectedValue(new Error("offline"));
    expect(await sendEmail(message)).toBe(false);
  });
});
