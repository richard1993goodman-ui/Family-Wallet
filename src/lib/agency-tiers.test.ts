import { beforeEach, describe, expect, it, vi } from "vitest";
import { AGENCY_PLANS, nextAgencyPlan } from "./agency-plans";
import { getTierBoard, upgradeTier } from "./agency-tiers.server";

const state = vi.hoisted(() => ({ plan: "partner", updates: [] as unknown[] }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const q: Record<string, unknown> = {
        select: () => q, eq: () => q, in: () => q, not: () => q, order: () => q, limit: () => q,
        update: (v: unknown) => { state.updates.push({ table, v }); return q; },
        maybeSingle: async () => ({ data: table === "partner_agencies" ? { id: "a1", plan: state.plan, status: "active" } : null }),
        then: (resolve: (v: unknown) => void) =>
          resolve({
            data:
              table === "partner_agencies"
                ? [{ id: "a1", name: "Agency", brand_name: null, plan: "partner", household_allowance: null }]
                : [{ agency_id: "a1", status: "accepted" }, { agency_id: "a1", status: "accepted" }, { agency_id: "a1", status: "pending" }],
          }),
      };
      return q;
    },
  },
}));

describe("tiers", () => {
  beforeEach(() => { state.plan = "partner"; state.updates = []; });

  it("moves one tier at a time and stops before enterprise", () => {
    expect(nextAgencyPlan("partner")).toBe("growth");
    expect(nextAgencyPlan("growth")).toBe("scale");
    expect(nextAgencyPlan("scale")).toBeNull();
    expect(nextAgencyPlan("enterprise")).toBeNull();
  });

  it("prices match the live pricing page", () => {
    expect([AGENCY_PLANS.partner.pence, AGENCY_PLANS.growth.pence, AGENCY_PLANS.scale.pence]).toEqual([6900, 14900, 24900]);
  });

  it("the owner board returns names, tier and seat counts only", async () => {
    const [row] = await getTierBoard();
    expect(Object.keys(row!).sort()).toEqual(["allowance", "id", "invited", "name", "next", "occupied", "pence", "plan", "remaining", "tier"]);
    expect(row).toMatchObject({ occupied: 2, invited: 1, remaining: 7, allowance: 10 });
  });

  it("refuses a stale page so a tier can never be skipped", async () => {
    state.plan = "growth";
    await expect(upgradeTier("a1", "partner")).rejects.toThrow("tier has changed");
    expect(state.updates).toHaveLength(0);
  });

  it("refuses to go above the top self-serve tier", async () => {
    state.plan = "scale";
    await expect(upgradeTier("a1", "scale")).rejects.toThrow("no higher tier");
  });

  it("without a Stripe subscription it changes the agency record and says billing was not touched", async () => {
    const result = await upgradeTier("a1", "partner");
    expect(result).toEqual({ plan: "growth", billing: "manual" });
  });
});
