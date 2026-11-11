import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sendEmail } from "./email.server";
import { buildWalletEmail } from "./wallet-email";

describe("buildWalletEmail", () => {
  const wallet = { familyName: "The Smiths", url: "https://familywallet.io/w/smith-4f2a", code: "K7M2PQ" };

  it("puts the link and code in both the text and html versions", () => {
    const m = buildWalletEmail("welcome", [wallet]);
    expect(m.subject).toContain("Welcome to Family Wallet");
    for (const body of [m.text, m.html]) {
      expect(body).toContain("https://familywallet.io/w/smith-4f2a");
      expect(body).toContain("K7M2PQ");
    }
  });

  it("welcomes a new family with save advice, the first steps and where to get help", () => {
    const m = buildWalletEmail("welcome", [wallet]);
    for (const body of [m.text, m.html]) {
      expect(body).toContain("no separate password");
      expect(body).toContain("Add your nanny");
      expect(body).toContain("https://familywallet.io/nannies/smith-4f2a");
      expect(body).toContain("https://familywallet.io/hours/smith-4f2a");
      expect(body).toContain("https://familywallet.io/notifications/smith-4f2a");
      expect(body).toContain("https://familywallet.io/support/smith-4f2a");
    }
  });

  it("an agency invite names the agency and leaves out subscription wording", () => {
    const m = buildWalletEmail("invite", [wallet], { agencyName: "Bright Nannies" });
    expect(m.subject).toContain("Bright Nannies has set up your Family Wallet");
    for (const body of [m.text, m.html]) {
      expect(body).toContain("K7M2PQ");
      expect(body).toContain("Add your nanny");
      expect(body).not.toContain("thank you for subscribing");
      expect(body).not.toContain("cancel your subscription");
    }
  });

  it("offers a reply address for help when one is set", () => {
    const m = buildWalletEmail("welcome", [wallet], { supportEmail: "help@example.com" });
    expect(m.text).toContain("help@example.com");
    expect(m.html).toContain("mailto:help@example.com");
    expect(m.text).not.toContain("/support/");
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
    vi.stubEnv("LOVABLE_API_KEY", "project_test");
    expect(await sendEmail(message)).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("posts through the Resend connection with both keys and the recipient", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("LOVABLE_API_KEY", "project_test");
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 200 }));
    expect(await sendEmail(message)).toBe(true);
    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(url).toBe("https://connector-gateway.lovable.dev/resend/emails");
    expect((init!.headers as Record<string, string>)["Authorization"]).toBe("Bearer project_test");
    expect((init!.headers as Record<string, string>)["X-Connection-Api-Key"]).toBe("re_test");
    expect(JSON.parse(String(init!.body)).to).toEqual(["a@b.co"]);
  });

  it("sends replies to the support address unless another reply address is set", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("LOVABLE_API_KEY", "project_test");
    vi.stubEnv("EMAIL_REPLY_TO", "");
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 200 }));
    await sendEmail(message);
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[0]![1]!.body)).reply_to).toBe("info@familywallet.io");
    vi.stubEnv("EMAIL_REPLY_TO", "me@example.com");
    await sendEmail(message);
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[1]![1]!.body)).reply_to).toBe("me@example.com");
  });

  it("reports failure when Resend refuses, instead of throwing", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("LOVABLE_API_KEY", "project_test");
    vi.mocked(fetch).mockResolvedValue(new Response("nope", { status: 403 }));
    expect(await sendEmail(message)).toBe(false);
  });

  it("reports failure when the network breaks", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("LOVABLE_API_KEY", "project_test");
    vi.mocked(fetch).mockRejectedValue(new Error("offline"));
    expect(await sendEmail(message)).toBe(false);
  });
});
