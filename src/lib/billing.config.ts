// The self-serve plans. Amounts are in pence, excluding VAT, and must match the pricing page.
// The plans are created in the payment provider by Lovable's payments tooling, and found
// again by their lookup key (fw_<plan>_<interval>).

export type PlanId =
  | "family"
  | "agency_partner"
  | "agency_growth"
  | "agency_scale";
export type Interval = "month" | "year";

export const PLANS: Record<
  PlanId,
  {
    name: string;
    description: string;
    pence: Record<Interval, number>;
    /** Agency plans are billed monthly only, and carry a household allowance. */
    allowance?: number;
  }
> = {
  family: {
    name: "Family Wallet: Family",
    description:
      "A private wallet for your household with unlimited staff, every feature in the app and dedicated customer support by email.",
    pence: { month: 1999, year: 19900 },
  },
  agency_partner: {
    name: "Family Wallet: Agency Partner",
    description:
      "Give your first families a wallet: 10 household seats, sent to parents and nannies by email.",
    pence: { month: 7900, year: 7900 },
    allowance: 10,
  },
  agency_growth: {
    name: "Family Wallet: Agency Growth",
    description:
      "Make it part of your membership: 50 household seats, sent to parents and nannies by email.",
    pence: { month: 19900, year: 19900 },
    allowance: 50,
  },
  agency_scale: {
    name: "Family Wallet: Agency Scale",
    description:
      "A growing client base: 100 household seats, sent to parents and nannies by email.",
    pence: { month: 34900, year: 34900 },
    allowance: 100,
  },
};

export const AGENCY_PLANS = ["agency_partner", "agency_growth", "agency_scale"] as const;
export type AgencyPlanId = (typeof AGENCY_PLANS)[number];

export const isAgencyPlan = (value: unknown): value is AgencyPlanId =>
  AGENCY_PLANS.includes(value as AgencyPlanId);

/** Agency plans are monthly only, so the pricing page and checkout never offer a year. */
export const intervalsFor = (plan: PlanId): Interval[] =>
  isAgencyPlan(plan) ? ["month"] : ["month", "year"];

export const priceLookupKey = (plan: PlanId, interval: Interval) => `fw_${plan}_${interval}`;

/** Every lookup key this app sells, so a Stripe price can be traced back to its plan. */
const LOOKUP_KEYS = new Map<string, PlanId>(
  (Object.keys(PLANS) as PlanId[]).flatMap((plan) =>
    intervalsFor(plan).map((interval) => [priceLookupKey(plan, interval), plan] as const),
  ),
);

/** The plan a Stripe price belongs to, read back from its lookup key (fw_<plan>_<interval>). */
export function planFromLookupKey(key: unknown): PlanId | null {
  return typeof key === "string" ? LOOKUP_KEYS.get(key) ?? null : null;
}

export const isPlan = (value: unknown): value is PlanId =>
  typeof value === "string" && value in PLANS;
export const isInterval = (value: unknown): value is Interval =>
  value === "month" || value === "year";
