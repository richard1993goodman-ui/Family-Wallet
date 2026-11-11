import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  insertError: null as { code: string; message: string } | null,
  nannyColumnMissing: false,
  inserted: [] as Record<string, unknown>[],
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      let columns = "";
      let inserting: Record<string, unknown> | null = null;
      const q: Record<string, unknown> = {
        select: (c?: string) => { columns = c ?? ""; return q; },
        eq: () => q, in: () => q, order: () => q, lt: () => q, update: () => q,
        insert: (row: Record<string, unknown>) => { inserting = row; return q; },
        delete: () => q,
        single: async () => {
          if (state.insertError) return { data: null, error: state.insertError };
          state.inserted.push(inserting ?? {});
          return { data: { id: "new" }, error: null };
        },
        maybeSingle: async () => ({ data: table === "partner_agencies" ? { name: "A", brand_name: null, plan: "partner", household_allowance: null } : null }),
        then: (resolve: (v: unknown) => void) => {
          if (table === "agency_invites" && columns.includes("nanny_email") && state.nannyColumnMissing)
            return resolve({ data: null, error: { code: "42703", message: "column nanny_email does not exist" } });
          return resolve({ data: [], error: null });
        },
      };
      return q;
    },
  },
}));
vi.mock("./email.server", () => ({ emailConfigured: () => true, sendEmail: async () => true }));

import { createSeatInvite, getSeatBoard } from "./seat-invites.server";
vi.mock("./audit.server", () => ({ audit: async () => undefined }));

beforeEach(() => {
  state.insertError = null;
  state.nannyColumnMissing = false;
  state.inserted = [];
});

describe("seat invitation errors", () => {
  it("only says the seat is in use when the database says it is", async () => {
    state.insertError = { code: "23505", message: "duplicate key" };
    await expect(createSeatInvite("a1", 1, "The Smiths", { email: "parent@example.com" })).rejects.toThrow("already in use");
  });

  it("does not blame the seat or email for some other failure", async () => {
    state.insertError = { code: "42703", message: 'column "something" does not exist' };
    await expect(createSeatInvite("a1", 1, "The Smiths", { email: "parent@example.com" })).rejects.toThrow("Couldn't save the invitation");
  });

  it("shows the seat board", async () => {
    const board = await getSeatBoard("a1");
    expect(board.total).toBe(10);
  });
});
