import { describe, expect, it, vi } from "vitest";

// Ending a staff member's access must stop their account too, kill pending claim links, log it, and keep records.
const calls: { table: string; patch: Record<string, unknown> }[] = [];
const audits: unknown[] = [];

vi.mock("@/integrations/supabase/client.server", () => {
  const chain = (table: string, patch: Record<string, unknown>) => {
    calls.push({ table, patch });
    const c: Record<string, unknown> = {};
    for (const m of ["eq", "is", "select"]) c[m] = () => c;
    c["maybeSingle"] = async () => ({ data: table === "household_members" ? { id: "member-1" } : null, error: null });
    c["then"] = (resolve: (v: unknown) => void) => resolve({ error: null });
    return c;
  };
  return { supabaseAdmin: { from: (table: string) => ({ update: (patch: Record<string, unknown>) => chain(table, patch) }) } };
});
vi.mock("./family.server", () => ({ requireFamily: async () => ({ id: "family-1" }) }));
vi.mock("./audit.server", () => ({ audit: async (e: unknown) => void audits.push(e) }));

describe("ending a staff member's access", () => {
  it("archives them, ends the membership, expires claim links and logs it, without touching records", async () => {
    const { archiveNanny } = await import("./nannies.server");
    await archiveNanny("some-slug", "nanny-1");
    const tables = calls.map((c) => c.table);
    expect(tables).toEqual(["family_nannies", "household_members", "account_claims"]);
    expect(calls[0]!.patch).toMatchObject({ status: "archived", nanny_code: null, nanny_code_hash: null });
    expect(calls[1]!.patch).toMatchObject({ status: "ended" });
    expect(audits).toEqual([expect.objectContaining({ action: "staff_ended", familyId: "family-1" })]);
    expect(tables).not.toContain("document_signatures");
    expect(tables).not.toContain("nanny_agreements");
  });
});
