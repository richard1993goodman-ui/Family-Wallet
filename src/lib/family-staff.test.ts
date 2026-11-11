import { describe, expect, it, vi } from "vitest";
import { requireFamilyStaff, requireStaff } from "./staff.scope";

// A signed-in partner-agency staff member with a two-step session.
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const row = table === "partner_agency_staff" ? { id: "s1", agency_id: "a1" } : { id: "a1", name: "Agency", status: "active" };
      const query = { select: () => query, eq: () => query, is: () => query, update: () => query, maybeSingle: async () => ({ data: row }) };
      return query;
    },
  },
}));

const partnerCtx = { supabase: { rpc: async () => ({ data: false }) }, userId: "u2", claims: { aal: "aal2" } };

describe("partner agency staff", () => {
  it("can sign in to their own agency scope", async () => {
    await expect(requireStaff(partnerCtx)).resolves.toMatchObject({ kind: "partner", agencyId: "a1" });
  });

  it("are always refused family-data access", async () => {
    await expect(requireFamilyStaff(partnerCtx)).rejects.toThrow("Forbidden");
  });
});
