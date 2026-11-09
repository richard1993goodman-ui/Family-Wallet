import { beforeEach, describe, expect, it, vi } from "vitest";
import { assertSeatAvailable, seatsFor } from "./seats.server";

const state = vi.hoisted(() => ({ plan: "partner", allowance: null as number | null, used: 0 }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const query: Record<string, unknown> = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({ data: { plan: state.plan, household_allowance: state.allowance } }),
        // The families count is awaited directly.
        then: (resolve: (v: { count: number }) => void) => resolve({ count: table === "families" ? state.used : 0 }),
      };
      return query;
    },
  },
}));

describe("agency seats", () => {
  beforeEach(() => Object.assign(state, { plan: "partner", allowance: null, used: 0 }));

  it("uses the plan's allowance as the number of seats, or the agency's own number when set", async () => {
    expect((await seatsFor("a")).seats).toBe(10);
    state.allowance = 15;
    expect((await seatsFor("a")).seats).toBe(15);
  });

  it("lets an agency add a family while a seat is free", async () => {
    state.used = 9;
    await expect(assertSeatAvailable("a")).resolves.toBeUndefined();
  });

  it("blocks adding a family once every seat is used", async () => {
    state.used = 10;
    await expect(assertSeatAvailable("a")).rejects.toThrow("All 10 of your seats are in use");
  });

  it("has no limit on a plan priced to the agreement", async () => {
    state.plan = "enterprise";
    state.used = 500;
    await expect(assertSeatAvailable("a")).resolves.toBeUndefined();
  });
});
