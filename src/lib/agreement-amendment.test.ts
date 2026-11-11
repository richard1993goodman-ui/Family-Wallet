import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  existing: null as null | Record<string, unknown>,
  updates: [] as Record<string, unknown>[],
  inserts: [] as { table: string; row: Record<string, unknown> }[],
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const q: Record<string, unknown> = {
        select: () => q,
        eq: () => q,
        update: (patch: Record<string, unknown>) => {
          state.updates.push(patch);
          return Object.assign(Promise.resolve({ error: null }), { eq: () => Promise.resolve({ error: null }) });
        },
        insert: (row: Record<string, unknown>) => {
          state.inserts.push({ table, row });
          return Object.assign(Promise.resolve({ error: null }), { select: () => ({ single: async () => ({ data: { id: "agreement-1" }, error: null }) }) });
        },
        maybeSingle: async () => ({ data: table === "nanny_agreements" ? state.existing : null }),
      };
      return q;
    },
  },
}));
vi.mock("./wallet.server", () => ({
  listNannyRows: async () => [{ id: "nanny-1", name: "Jess" }],
  isUnlocked: async () => true,
  sessionAccess: async () => null,
}));

import { defaultAgreementData, normalizeAgreement } from "./agreement.model";
import { adminSaveAgreement } from "./agreement.server";

const issued = normalizeAgreement(defaultAgreementData);
const edited = { ...issued, holidayAllowance: "A changed holiday clause" };
const row = (status: string) => ({ id: "agreement-1", version: 1, status, agreement_data: issued });

beforeEach(() => {
  state.existing = null;
  state.updates = [];
  state.inserts = [];
});

describe("amending an issued agreement", () => {
  it("holds edits as pending changes and leaves the signed wording, version and status alone", async () => {
    state.existing = row("issued");
    const result = await adminSaveAgreement("family-1", edited, false, "nanny-1");
    expect(result).toMatchObject({ ok: true, pending: true });
    expect(state.updates).toHaveLength(1);
    expect(Object.keys(state.updates[0]!).sort()).toEqual(["draft_data", "updated_at"]);
    expect(state.inserts.filter((i) => i.table === "agreement_versions")).toEqual([]);
  });

  it("clears pending changes when the edit puts the wording back as issued", async () => {
    state.existing = row("issued");
    await adminSaveAgreement("family-1", issued, false, "nanny-1");
    expect(state.updates[0]).toMatchObject({ draft_data: null });
  });

  it("issuing changed wording makes version 2, keeps version 1, and clears the pending changes", async () => {
    state.existing = row("issued");
    await adminSaveAgreement("family-1", edited, true, "nanny-1");
    expect(state.updates[0]).toMatchObject({ version: 2, status: "issued", draft_data: null });
    const versions = state.inserts.filter((i) => i.table === "agreement_versions");
    expect(versions).toHaveLength(1);
    expect(versions[0]!.row).toMatchObject({ version: 2, agreement_id: "agreement-1" });
  });

  it("issuing again without changes does not make a new version", async () => {
    state.existing = row("issued");
    await adminSaveAgreement("family-1", issued, true, "nanny-1");
    expect(state.updates[0]).toMatchObject({ version: 1, draft_data: null });
    expect(state.inserts.filter((i) => i.table === "agreement_versions")).toEqual([]);
  });

  it("a draft that was never issued is still saved straight into the agreement", async () => {
    state.existing = row("draft");
    await adminSaveAgreement("family-1", edited, false, "nanny-1");
    expect(state.updates[0]).toHaveProperty("agreement_data");
    expect(state.updates[0]).not.toHaveProperty("draft_data");
  });

  it("issuing a brand new agreement records version 1", async () => {
    await adminSaveAgreement("family-1", issued, true, "nanny-1");
    expect(state.inserts.map((i) => i.table)).toEqual(["nanny_agreements", "agreement_versions"]);
    expect(state.inserts[1]!.row).toMatchObject({ version: 1 });
  });
});
