import { describe, expect, it, vi } from "vitest";

// Each call is scoped by agency id in the query, so another agency's invitation is simply not found.
const rows = vi.hoisted(() => [{ id: "inv-b", agency_id: "agency-b", email: "family-b@seat.invalid", status: "pending" }]);
const updates = vi.hoisted(() => [] as unknown[]);

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const filters: Record<string, unknown> = {};
      const q: Record<string, unknown> = {
        select: () => q, in: () => q, order: () => q, lt: () => q, gt: () => q,
        update: (patch: unknown) => { updates.push(patch); return q; },
        eq: (col: string, val: unknown) => { filters[col] = val; return q; },
        maybeSingle: async () => ({
          data:
            table === "agency_invites"
              ? rows.find((r) => Object.entries(filters).every(([c, v]) => (r as Record<string, unknown>)[c] === v)) ?? null
              : { name: "Agency", brand_name: null, plan: "partner", household_allowance: null },
        }),
        then: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
      };
      return q;
    },
  },
}));
vi.mock("./email.server", () => ({ emailConfigured: () => true, sendEmail: async () => true }));
vi.mock("./audit.server", () => ({ audit: async () => undefined }));

import { resendSeatInvite, revokeSeatInvite } from "./seat-invites.server";

describe("one agency cannot touch another agency's invitations", () => {
  it("cannot renew it", async () => {
    await expect(resendSeatInvite("agency-a", "inv-b")).rejects.toThrow("can't be changed");
    expect(updates).toEqual([]);
  });
  it("cannot revoke it", async () => {
    await expect(revokeSeatInvite("agency-a", "inv-b")).rejects.toThrow("can't be changed");
    expect(updates).toEqual([]);
  });
  it("the owning agency can renew it and gets a fresh link and code, never a wallet credential", async () => {
    const out = await resendSeatInvite("agency-b", "inv-b");
    expect(out.url).toContain("/join/");
    expect(out.code).toMatch(/^[A-Z2-9]{8}$/);
    expect(Object.keys(out).sort()).toEqual(["agencyName", "code", "emailed", "expiresAt", "familyName", "url"]);
    expect(out.emailed).toBe(false);
  });
});
