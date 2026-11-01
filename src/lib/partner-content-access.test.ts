import { beforeEach, describe, expect, it, vi } from "vitest";
import { assertContentRow, assertFamiliesInAgency, requireContentScope } from "./staff.scope";

const state = vi.hoisted(() => ({ agencyId: "agency-a", rowAgency: "agency-a", recipientAgency: "agency-a" }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        in: async () => ({ data: [{ id: "family-a", partner_agency_id: state.recipientAgency }] }),
        maybeSingle: async () => ({ data:
          table === "partner_agency_staff" ? { id: "staff-a", agency_id: state.agencyId } :
          table === "partner_agencies" ? { id: state.agencyId, name: "Agency A", status: "active", allow_challenges: false, allow_perks: false, allow_playbooks: false } :
          { agency_id: state.rowAgency }
        }),
      };
      return query;
    },
  },
}));

const context = { userId: "staff-user", claims: { aal: "aal2" }, supabase: { rpc: async () => ({ data: false }) } };

describe("partner content management boundaries", () => {
  beforeEach(() => { state.rowAgency = "agency-a"; state.recipientAgency = "agency-a"; });

  it.each(["challenges", "perks", "playbooks"] as const)("grants active partner %s controls without owner switches", async (feature) => {
    await expect(requireContentScope(context, feature)).resolves.toBe("agency-a");
  });

  it.each(["agency_challenges", "partner_perks", "seasonal_playbooks"] as const)("allows editing own %s records but rejects another agency's", async (table) => {
    await expect(assertContentRow(table, "record", "agency-a")).resolves.toBeUndefined();
    state.rowAgency = "agency-b";
    await expect(assertContentRow(table, "record", "agency-a")).rejects.toThrow("Not found");
  });

  it("only permits recipient families belonging to the content agency", async () => {
    await expect(assertFamiliesInAgency(["family-a"], "agency-a")).resolves.toBeUndefined();
    state.recipientAgency = "agency-b";
    await expect(assertFamiliesInAgency(["family-a"], "agency-a")).rejects.toThrow("Family not found");
  });

  it("still requires authenticator verification for partner content management", async () => {
    await expect(requireContentScope({ ...context, claims: { aal: "aal1" } }, "perks")).rejects.toThrow("Two-step verification required");
  });
});