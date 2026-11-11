import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ inserted: [] as Record<string, unknown>[], audits: [] as unknown[] }));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      let inserting: Record<string, unknown> | null = null;
      const q: Record<string, unknown> = {
        select: () => q, eq: () => q, in: () => q, order: () => q, lt: () => q, update: () => q, delete: () => q,
        insert: (row: Record<string, unknown>) => { inserting = row; return q; },
        single: async () => { state.inserted.push(inserting ?? {}); return { data: { id: "new" }, error: null }; },
        maybeSingle: async () => ({ data: table === "partner_agencies" ? { name: "Agency", brand_name: null, plan: "partner", household_allowance: null } : null }),
        then: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
      };
      return q;
    },
  },
}));
vi.mock("./email.server", () => ({ emailConfigured: () => true, sendEmail: async () => true }));
vi.mock("./audit.server", () => ({ audit: async (e: unknown) => void state.audits.push(e) }));

import { createSeatInvite } from "./seat-invites.server";
import { hashBackupCode, hashInviteToken } from "./seat-invites";

beforeEach(() => { state.inserted = []; state.audits = []; });

describe("createSeatInvite", () => {
  it("returns a one-time link and backup code, and stores only their hashes", async () => {
    const out = await createSeatInvite("a1", 1, "The Smiths", { createdBy: "u1" });
    const token = out.url.split("/join/")[1]!;
    const row = state.inserted[0]!;
    expect(row["token_hash"]).toBe(hashInviteToken(token));
    expect(row["code_hash"]).toBe(hashBackupCode(out.code));
    expect(JSON.stringify(row)).not.toContain(token);
    expect(JSON.stringify(row)).not.toContain(out.code);
    expect(out.code).toMatch(/^[A-Z2-9]{8}$/);
  });

  it("works without an email, labelling the seat with an address nobody can receive", async () => {
    await createSeatInvite("a1", 1, "The Smiths");
    expect(String(state.inserted[0]!["email"])).toMatch(/^the-smiths-[a-z0-9]{4}@seat\.invalid$/);
  });

  it("expires after 48 hours by default", async () => {
    const out = await createSeatInvite("a1", 1, "The Smiths");
    const hours = (new Date(out.expiresAt).getTime() - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(47.9);
    expect(hours).toBeLessThan(48.1);
  });

  it("never returns or stores any wallet credential", async () => {
    const out = await createSeatInvite("a1", 1, "The Smiths");
    expect(Object.keys(out).sort()).toEqual(["agencyName", "code", "emailed", "expiresAt", "familyName", "url"]);
    expect(Object.keys(state.inserted[0]!)).not.toContain("access_code");
  });

  it("logs the creation without the link or code", async () => {
    const out = await createSeatInvite("a1", 2, "The Smiths", { createdBy: "u1" });
    expect(state.audits).toEqual([expect.objectContaining({ action: "invite_created", agencyId: "a1", meta: { slot: 2, emailed: false } })]);
    expect(JSON.stringify(state.audits)).not.toContain(out.code);
  });

  it("refuses to email without an address", async () => {
    await expect(createSeatInvite("a1", 1, "The Smiths", { sendEmail: true })).rejects.toThrow("Enter an email");
  });
});
