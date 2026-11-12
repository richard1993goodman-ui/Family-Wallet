import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  update: vi.fn(),
  retrieve: vi.fn(),
  client: vi.fn(),
  storedFamily: null as { slug: string; access_code: string | null; family_name: string } | null,
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        limit: () => query,
        update: (row: unknown) => { mocks.update(table, row); return query; },
        delete: () => query,
        insert: (row: unknown) => { mocks.insert(table, row); return query; },
        single: async () => ({ data: { id: "created-record" }, error: null }),
        maybeSingle: async () => ({
          data: table === "families" ? mocks.storedFamily : null,
          error: null,
        }),
        then: (resolve: (value: unknown) => unknown) => resolve({ error: null }),
      };
      return query;
    },
  },
}));
vi.mock("./wallet.server", () => ({ generateAccessCode: () => "FRESH-CODE-123", hashCode: () => "fictional-hash" }));
vi.mock("./email.server", () => ({ sendEmail: vi.fn().mockResolvedValue(true) }));
vi.mock("./stripe.server", () => ({
  createStripeClient: mocks.client,
}));

import { provisionFromSession } from "./billing.server";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.storedFamily = { slug: "test-household", access_code: null, family_name: "Test household" };
  mocks.client.mockReturnValue({ checkout: { sessions: { retrieve: mocks.retrieve } } });
  mocks.retrieve.mockResolvedValue({
    mode: "subscription", payment_status: "paid", customer: "cus_test_fixture",
    customer_email: null, subscription: { id: "sub_test_fixture", status: "active" },
    metadata: { app: "family_wallet", plan: "family", interval: "month", family_id: "existing-family" },
  });
});

describe("continue payment for an existing wallet", () => {
  it("issues a fresh access code when the stored one was wiped after sign-in", async () => {
    const result = await provisionFromSession("cs_test_fixture", "sandbox");
    expect(result.status).toBe("ready");
    if (result.status !== "ready" || result.kind !== "family") throw new Error("expected a family wallet");
    expect(result.code).toBe("FRESH-CODE-123");
    expect(mocks.update).toHaveBeenCalledWith(
      "families",
      expect.objectContaining({ access_code: "FRESH-CODE-123", access_code_hash: "fictional-hash" }),
    );
  });

  it("keeps the stored code when one is still on file", async () => {
    mocks.storedFamily = { slug: "test-household", access_code: "KEPT-CODE-456", family_name: "Test household" };
    const result = await provisionFromSession("cs_test_fixture", "sandbox");
    if (result.status !== "ready" || result.kind !== "family") throw new Error("expected a family wallet");
    expect(result.code).toBe("KEPT-CODE-456");
    expect(mocks.update).not.toHaveBeenCalledWith(
      "families",
      expect.objectContaining({ access_code: expect.anything() }),
    );
  });
});
