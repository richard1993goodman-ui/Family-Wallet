// Agency plans, matching the pricing page. An "active household" is a wallet someone has
// opened in the last 30 days, so quiet clients do not count towards the allowance.

export type AgencyPlanId = "partner" | "growth" | "scale" | "enterprise";

export type AgencyPlan = {
  name: string;
  /** Households included in the monthly price. null = priced to the agreement (no fixed cap). */
  allowance: number | null;
  /** Monthly price in pence, excluding VAT. null = custom. */
  pence: number | null;
  /** Price in pence for each household over the allowance. */
  extraPence: number | null;
};

export const AGENCY_PLANS: Record<AgencyPlanId, AgencyPlan> = {
  partner: { name: "Partner", allowance: 10, pence: 6900, extraPence: 300 },
  growth: { name: "Growth", allowance: 50, pence: 14900, extraPence: 200 },
  scale: { name: "Scale", allowance: 100, pence: 24900, extraPence: 150 },
  enterprise: { name: "Enterprise", allowance: null, pence: null, extraPence: null },
};

export const ACTIVE_WINDOW_DAYS = 30;
const NEAR_LIMIT = 0.8;

export const isAgencyPlan = (value: unknown): value is AgencyPlanId =>
  typeof value === "string" && value in AGENCY_PLANS;

/** The cut-off: a household seen on or after this moment counts as active. */
export function activeSince(now = new Date()) {
  return new Date(now.getTime() - ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

export function isActiveHousehold(lastActiveAt: string | null | undefined, now = new Date()) {
  if (!lastActiveAt) return false;
  const seen = new Date(lastActiveAt).getTime();
  return !Number.isNaN(seen) && seen >= activeSince(now).getTime();
}

export type AllowanceLevel = "ok" | "near" | "over" | "unlimited";

export type AllowanceUsage = {
  plan: AgencyPlanId;
  planName: string;
  allowance: number | null;
  used: number;
  remaining: number | null;
  over: number;
  /** 0 to 100, for a progress bar. */
  percent: number;
  level: AllowanceLevel;
  /** Estimated extra monthly charge in pence for households over the allowance. */
  extraPence: number;
  basePence: number | null;
};

/**
 * @param override an agency-specific allowance agreed with us; wins over the plan default.
 */
export function allowanceUsage(
  plan: AgencyPlanId,
  override: number | null | undefined,
  used: number,
): AllowanceUsage {
  const def = AGENCY_PLANS[plan];
  const allowance = override ?? def.allowance;
  if (allowance === null) {
    return {
      plan,
      planName: def.name,
      allowance: null,
      used,
      remaining: null,
      over: 0,
      percent: 0,
      level: "unlimited",
      extraPence: 0,
      basePence: def.pence,
    };
  }
  const over = Math.max(0, used - allowance);
  const level: AllowanceLevel = over > 0 ? "over" : allowance > 0 && used / allowance >= NEAR_LIMIT ? "near" : "ok";
  return {
    plan,
    planName: def.name,
    allowance,
    used,
    remaining: Math.max(0, allowance - used),
    over,
    percent: allowance === 0 ? 100 : Math.min(100, Math.round((used / allowance) * 100)),
    level,
    extraPence: over * (def.extraPence ?? 0),
    basePence: def.pence,
  };
}

export const formatPounds = (pence: number) =>
  `£${(pence / 100).toLocaleString("en-GB", { minimumFractionDigits: Number.isInteger(pence / 100) ? 0 : 2, maximumFractionDigits: 2 })}`;
