import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  clientFailures: 0,
  globalFailures: 0,
  invite: null as null | { id: string; agency_id: string; expires_at: string },
  attempts: [] as { succeeded: boolean }[],
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      let byClient = false;
      const q: Record<string, unknown> = {
        select: () => q, gte: () => q, in: () => q, order: () => q, lt: () => q, update: () => q,
        eq: (col: string) => { if (col === "client_key") byClient = true; return q; },
        insert: (row: { succeeded: boolean }) => { state.attempts.push(row); return q; },
        maybeSingle: async () => ({
          data: table === "partner_agencies" ? { name: "Agency", brand_name: null, plan: "partner", household_allowance: null } : state.invite,
        }),
        then: (resolve: (v: unknown) => void) =>
          resolve(table === "wallet_access_attempts" ? { count: byClient ? state.clientFailures : state.globalFailures, error: null } : { data: [], error: null }),
      };
      return q;
    },
  },
}));
vi.mock("./wallet.server", () => ({ clientKey: () => "1.2.3.4" }));

import { lookupInviteByCode } from "./seat-invites.server";

beforeEach(() => {
  state.clientFailures = 0;
  state.globalFailures = 0;
  state.invite = null;
  state.attempts = [];
});
const future = () => new Date(Date.now() + 3_600_000).toISOString();

describe("redeeming by backup code", () => {
  it("accepts a valid, unexpired code and says which agency it is from", async () => {
    state.invite = { id: "i1", agency_id: "a1", expires_at: future() };
    await expect(lookupInviteByCode("ab-cd 2345")).resolves.toEqual({ agencyName: "Agency" });
    expect(state.attempts).toEqual([{ slug: "invite-code", client_key: "1.2.3.4", succeeded: true }]);
  });

  it("refuses an unknown code and counts it as a failed attempt", async () => {
    await expect(lookupInviteByCode("ABCD2345")).rejects.toThrow("isn't valid");
    expect(state.attempts[0]).toMatchObject({ succeeded: false });
  });

  it("refuses an expired code", async () => {
    state.invite = { id: "i1", agency_id: "a1", expires_at: new Date(Date.now() - 1000).toISOString() };
    await expect(lookupInviteByCode("ABCD2345")).rejects.toThrow("isn't valid");
  });

  it("refuses a code of the wrong length without even looking it up", async () => {
    state.invite = { id: "i1", agency_id: "a1", expires_at: future() };
    await expect(lookupInviteByCode("ABC")).rejects.toThrow("isn't valid");
  });

  it("locks a device out after 8 failed tries", async () => {
    state.clientFailures = 8;
    state.invite = { id: "i1", agency_id: "a1", expires_at: future() };
    await expect(lookupInviteByCode("ABCD2345")).rejects.toThrow("Too many tries");
    expect(state.attempts).toEqual([]);
  });

  it("turns codes off across the whole service during a spray of guesses", async () => {
    state.globalFailures = 100;
    await expect(lookupInviteByCode("ABCD2345")).rejects.toThrow("temporarily unavailable");
  });
});
