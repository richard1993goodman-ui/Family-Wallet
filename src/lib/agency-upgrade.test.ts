import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  agencyUpdates: [] as unknown[],
  subRow: null as Record<string, unknown> | null,
  agencyPlan: "partner",
  billingRow: null as Record<string, unknown> | null,
  prices: [{ id: "price_growth" }] as { id: string }[],
  portalCreate: vi.fn(),
  priceList: vi.fn(),
  retrieve: vi.fn(),
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      let updated: unknown = null;
      const q: Record<string, unknown> = {
        select: () => q, eq: () => q, order: () => q, limit: () => q,
        update: (v: unknown) => { updated = v; if (table === "partner_agencies") m.agencyUpdates.push(v); return q; },
        maybeSingle: async () => {
          if (table === "family_subscriptions") return { data: updated ? m.subRow : m.billingRow };
          if (table === "partner_agencies") return { data: { plan: m.agencyPlan } };
          return { data: null };
        },
        then: (resolve: (v: unknown) => void) => resolve({ error: null }),
      };
      return q;
    },
  },
}));
vi.mock("./wallet.server", () => ({ generateAccessCode: () => "ABC123", hashCode: () => "hash" }));
vi.mock("./email.server", () => ({ sendEmail: vi.fn().mockResolvedValue(true) }));
vi.mock("./stripe.server", () => ({
  createStripeClient: () => ({
    prices: { list: m.priceList },
    subscriptions: { retrieve: m.retrieve },
    billingPortal: { sessions: { create: m.portalCreate } },
  }),
}));

import { agencyBillingUrl, applySubscription } from "./billing.server";

const growthSub = (status: string) => ({
  id: "sub_1",
  status,
  items: { data: [{ price: { lookup_key: "fw_agency_growth_month" } }] },
});

beforeEach(() => {
  m.agencyUpdates = [];
  m.subRow = { family_id: null, agency_id: "a1" };
  m.agencyPlan = "partner";
  m.billingRow = { stripe_customer_id: "cus_1", stripe_subscription_id: "sub_1", environment: "sandbox" };
  m.portalCreate.mockReset().mockResolvedValue({ url: "https://billing.stripe.com/p/session" });
  m.priceList.mockReset().mockResolvedValue({ data: [{ id: "price_growth" }] });
  m.retrieve.mockReset().mockResolvedValue({ items: { data: [{ id: "si_1" }] } });
});

describe("agency plan follows its Stripe subscription", () => {
  it("releases the new tier's seats when a bigger plan is paid for", async () => {
    await applySubscription(growthSub("active") as never);
    expect(m.agencyUpdates).toContainEqual({ plan: "growth", household_allowance: null });
  });

  it("does not change the plan for a subscription that is not live", async () => {
    await applySubscription(growthSub("canceled") as never);
    expect(m.agencyUpdates).toHaveLength(0);
  });
});

describe("agency upgrade link", () => {
  it("opens a confirm-and-pay screen for the next tier", async () => {
    const result = await agencyBillingUrl("a1", "upgrade", "https://familywallet.io/admin?billing=done");
    expect(result).toEqual({ url: "https://billing.stripe.com/p/session", fallback: false });
    const args = m.portalCreate.mock.calls[0]![0];
    expect(args.customer).toBe("cus_1");
    expect(args.flow_data.type).toBe("subscription_update_confirm");
    expect(args.flow_data.subscription_update_confirm.items).toEqual([{ id: "si_1", price: "price_growth", quantity: 1 }]);
    expect(m.priceList.mock.calls[0]![0].lookup_keys).toEqual(["fw_agency_growth_month"]);
  });

  it("falls back to the general billing portal when the confirm screen can't be built", async () => {
    m.priceList.mockResolvedValue({ data: [] });
    const result = await agencyBillingUrl("a1", "upgrade", "https://familywallet.io/admin");
    expect(result.fallback).toBe(true);
    expect(m.portalCreate.mock.calls[0]![0].flow_data).toBeUndefined();
  });

  it("opens the plain portal for managing billing", async () => {
    const result = await agencyBillingUrl("a1", "manage", "https://familywallet.io/admin");
    expect(result.fallback).toBe(false);
    expect(m.portalCreate).toHaveBeenCalledOnce();
    expect(m.priceList).not.toHaveBeenCalled();
  });

  it("says so when no billing is linked, and when already on the top tier", async () => {
    m.billingRow = null;
    await expect(agencyBillingUrl("a1", "upgrade", "x")).rejects.toThrow("Billing isn't linked");
    m.billingRow = { stripe_customer_id: "cus_1", stripe_subscription_id: "sub_1", environment: "live" };
    m.agencyPlan = "scale";
    await expect(agencyBillingUrl("a1", "upgrade", "x")).rejects.toThrow("top self-serve plan");
  });
});
