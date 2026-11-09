import { beforeEach, describe, expect, it, vi } from "vitest";
import { assertFamilyInScope, assertPathInScope, canSeeFamily } from "./staff.scope";

const state = vi.hoisted(() => ({ familyAgency: null as string | null }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: () => {
      const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: { partner_agency_id: state.familyAgency } }) };
      return query;
    },
  },
}));

const owner = { kind: "owner" } as const;
const partnerA = { kind: "partner", agencyId: "a", agencyName: "A" } as const;
const FAMILY = "11111111-1111-1111-1111-111111111111";

describe("owner cannot see partner agency families", () => {
  beforeEach(() => { state.familyAgency = null; });

  it("canSeeFamily", () => {
    expect(canSeeFamily(owner, null)).toBe(true);
    expect(canSeeFamily(owner, "a")).toBe(false);
    expect(canSeeFamily(partnerA, "a")).toBe(true);
    expect(canSeeFamily(partnerA, "b")).toBe(false);
    expect(canSeeFamily(partnerA, null)).toBe(false);
  });

  it("owner is blocked from a partner family and its files", async () => {
    state.familyAgency = "a";
    await expect(assertFamilyInScope(owner, FAMILY)).rejects.toThrow("Family not found");
    await expect(assertPathInScope(owner, `${FAMILY}/doc.pdf`)).rejects.toThrow("Family not found");
  });

  it("owner still reaches the owner agency's own families", async () => {
    await expect(assertFamilyInScope(owner, FAMILY)).resolves.toBeUndefined();
  });
});
