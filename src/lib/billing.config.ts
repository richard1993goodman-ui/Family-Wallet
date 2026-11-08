// The self-serve plans. Amounts are in pence, excluding VAT, and must match the pricing page.
// scripts/stripe-seed.ts creates a Stripe Price for each, found again by its lookup key.

export type PlanId = "family" | "household";
export type Interval = "month" | "year";

export const PLANS: Record<PlanId, { name: string; description: string; pence: Record<Interval, number> }> = {
  family: {
    name: "The Family Wallet: Family",
    description:
      "A private wallet for one nanny or au pair: shared week, daily log, signed agreement, house manual and codes, emergency card, medication log, timesheets and weekly report.",
    pence: { month: 799, year: 7900 },
  },
  household: {
    name: "The Family Wallet: Household",
    description:
      "Everything in Family for up to six staff, plus the employment cost calculator and priority support.",
    pence: { month: 1499, year: 14900 },
  },
};

export const priceLookupKey = (plan: PlanId, interval: Interval) => `fw_${plan}_${interval}`;

export const isPlan = (value: unknown): value is PlanId => value === "family" || value === "household";
export const isInterval = (value: unknown): value is Interval => value === "month" || value === "year";
