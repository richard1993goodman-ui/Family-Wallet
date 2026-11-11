import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  access: { level: "family" as "family" | "nanny", nannyId: null as string | null },
  recentCodes: 0,
  codeRow: null as null | { id: string; code_hash: string; attempts: number },
  inserted: [] as Record<string, unknown>[],
  updates: [] as { table: string; patch: Record<string, unknown> }[],
  emails: [] as { to: string; text: string; subject: string }[],
  emailOn: true,
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const q: Record<string, unknown> = {
        select: (_cols?: string, opts?: { head?: boolean }) => (opts?.head ? Object.assign(Promise.resolve({ count: state.recentCodes }), q) : q),
        eq: () => q, gte: () => q, gt: () => q, is: () => q, order: () => q, limit: () => q,
        insert: async (row: Record<string, unknown>) => { state.inserted.push(row); return { error: null }; },
        update: (patch: Record<string, unknown>) => {
          state.updates.push({ table, patch });
          const chain: Record<string, unknown> = { eq: () => chain, is: () => chain, select: async () => ({ data: [{ id: "x" }] }) };
          return chain;
        },
        maybeSingle: async () => ({ data: table === "families" ? { id: "fam-1", family_name: "Harrington", nanny_name: null, start_date: null } : table === "signing_codes" ? state.codeRow : null }),
        then: (resolve: (v: unknown) => void) => resolve({ count: state.recentCodes, data: [], error: null }),
      };
      return q;
    },
  },
}));
vi.mock("./wallet.server", () => ({
  sessionAccess: async () => state.access,
  isUnlocked: async () => true,
  listNannyRows: async () => [{ id: "nan-1", name: "Jess" }],
}));
vi.mock("./email.server", () => ({
  emailConfigured: () => state.emailOn,
  sendEmail: async (m: { to: string; text: string; subject: string }) => { state.emails.push(m); return true; },
}));

import { consumeSigningCode, hashSigningCode, requestSigningCode, signingVerificationRequired } from "./agreement.server";

beforeEach(() => {
  state.access = { level: "family", nannyId: null };
  state.recentCodes = 0;
  state.codeRow = null;
  state.inserted = [];
  state.updates = [];
  state.emails = [];
  state.emailOn = true;
});
afterEach(() => vi.unstubAllEnvs());

describe("signing verification switch", () => {
  it("is off unless SIGNING_VERIFICATION is on, so nothing changes before it is tested", () => {
    expect(signingVerificationRequired()).toBe(false);
    vi.stubEnv("SIGNING_VERIFICATION", "on");
    expect(signingVerificationRequired()).toBe(true);
  });

  it("refuses to send codes while it is off", async () => {
    await expect(requestSigningCode("slug", "parent", "a@b.co")).rejects.toThrow("isn't needed");
  });
});

describe("requesting a code", () => {
  beforeEach(() => vi.stubEnv("SIGNING_VERIFICATION", "on"));

  it("emails a six-digit code and stores only its hash", async () => {
    expect(await requestSigningCode("slug", "parent", " A@B.co ")).toEqual({ ok: true });
    const code = /\b(\d{6})\b/.exec(state.emails[0]!.text)![1]!;
    expect(state.emails[0]!.to).toBe("a@b.co");
    expect(state.inserted[0]).toMatchObject({ family_id: "fam-1", signer_role: "parent", email: "a@b.co", code_hash: hashSigningCode(code, "fam-1", "parent", "a@b.co") });
    expect(JSON.stringify(state.inserted[0])).not.toContain(code);
  });

  it("refuses a bad email, too many requests, and a nanny asking to sign as the parent", async () => {
    expect(await requestSigningCode("slug", "parent", "nope")).toMatchObject({ ok: false, reason: "email" });
    state.recentCodes = 5;
    expect(await requestSigningCode("slug", "parent", "a@b.co")).toMatchObject({ ok: false, reason: "too_many" });
    state.recentCodes = 0;
    state.access = { level: "nanny", nannyId: "nan-1" };
    expect(await requestSigningCode("slug", "parent", "a@b.co")).toMatchObject({ ok: false, reason: "locked" });
  });

  it("says so when email is not set up, instead of pretending to send", async () => {
    state.emailOn = false;
    expect(await requestSigningCode("slug", "parent", "a@b.co")).toMatchObject({ ok: false, reason: "email_off" });
    expect(state.inserted).toEqual([]);
  });
});

describe("using a code", () => {
  const row = (code: string, attempts = 0) => ({ id: "c1", code_hash: hashSigningCode(code, "fam-1", "nanny", "j@x.co"), attempts });

  it("accepts the right code once", async () => {
    state.codeRow = row("123456");
    expect(await consumeSigningCode("fam-1", "nanny", "j@x.co", " 123456 ")).toBe(true);
    expect(state.updates.some((u) => u.table === "signing_codes" && "used_at" in u.patch)).toBe(true);
  });

  it("counts a wrong code and does not accept it", async () => {
    state.codeRow = row("123456", 1);
    expect(await consumeSigningCode("fam-1", "nanny", "j@x.co", "000000")).toBe(false);
    expect(state.updates.find((u) => u.table === "signing_codes")!.patch).toEqual({ attempts: 2 });
  });

  it("locks the code after five wrong tries, even for the right code", async () => {
    state.codeRow = row("123456", 5);
    expect(await consumeSigningCode("fam-1", "nanny", "j@x.co", "123456")).toBe(false);
  });

  it("refuses when there is no live code (expired, used or never asked for)", async () => {
    state.codeRow = null;
    expect(await consumeSigningCode("fam-1", "nanny", "j@x.co", "123456")).toBe(false);
  });

  it("does not accept a code issued for another person's email", async () => {
    state.codeRow = { id: "c1", code_hash: hashSigningCode("123456", "fam-1", "nanny", "other@x.co"), attempts: 0 };
    expect(await consumeSigningCode("fam-1", "nanny", "j@x.co", "123456")).toBe(false);
  });
});
