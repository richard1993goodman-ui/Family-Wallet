import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  retrieve: vi.fn(),
  portal: vi.fn(),
  client: vi.fn(),
  storedSubscription: null as { stripe_customer_id: string; environment: string } | null,
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        limit: () => query,
        update: () => query,
        delete: () => query,
        insert: (row: unknown) => { mocks.insert(table, row); return query; },
        single: async () => ({ data: { id: "created-record" }, error: null }),
        maybeSingle: async () => ({
          data: table === "family_subscriptions" ? mocks.storedSubscription : {
            slug: "test-household", access_code: "fictional-code", family_name: "Test household",
          },
          error: null,
        }),
        then: (resolve: (value: unknown) => unknown) => resolve({ error: null }),
      };
      return query;
    },
  },
}));
vi.mock("./wallet.server", () => ({ generateAccessCode: () => "fictional-code", hashCode: () => "fictional-hash" }));
vi.mock("./email.server", () => ({ sendEmail: vi.fn().mockResolvedValue(true) }));
vi.mock("./stripe.server", () => ({
  createStripeClient: mocks.client,
}));

import { portalUrlFor, provisionFromSession } from "./billing.server";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.storedSubscription = null;
  mocks.client.mockReturnValue({ checkout: { sessions: { retrieve: mocks.retrieve } }, billingPortal: { sessions: { create: mocks.portal } } });
  mocks.portal.mockResolvedValue({ url: "https://billing.stripe.com/test-portal" });
});

describe("subscription payment environment", () => {
  for (const environment of ["live", "sandbox"] as const) {
    for (const purchase of ["existing family", "new family", "agency"] as const) {
      it(`persists ${environment} for a ${purchase} purchase`, async () => {
        mocks.retrieve.mockResolvedValue({
          mode: "subscription", payment_status: "paid", customer: "cus_test_fixture",
          customer_email: null, subscription: { id: "sub_test_fixture", status: "active" },
          metadata: {
            app: "family_wallet", plan: purchase === "agency" ? "agency_partner" : "family", interval: "month",
            ...(purchase === "existing family" ? { family_id: "existing-family" } : {}),
          },
        });
        const result = await provisionFromSession("cs_test_fixture", environment);
        expect(result.status).toBe("ready");
        expect(mocks.insert).toHaveBeenCalledWith("family_subscriptions", expect.objectContaining({ environment }));
        expect(mocks.client).toHaveBeenCalledWith(environment);
      });
    }

    it(`opens the portal in the stored ${environment} account`, async () => {
      mocks.storedSubscription = { stripe_customer_id: "cus_test_fixture", environment };
      expect(await portalUrlFor("existing-family", "https://familywallet.io/billing/test-household")).toBe("https://billing.stripe.com/test-portal");
      expect(mocks.client).toHaveBeenCalledWith(environment);
      expect(mocks.portal).toHaveBeenCalledWith({ customer: "cus_test_fixture", return_url: "https://familywallet.io/billing/test-household" });
    });
  }
});