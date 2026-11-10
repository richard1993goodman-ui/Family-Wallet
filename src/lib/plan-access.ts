// Which tools each self-serve plan includes. The Family plan covers one carer's day-to-day
// tools; the Household plan adds the agreement builder and the house manual & codes.
// Wallets with no self-serve plan (agency families, the demo) keep every tool.

export type GatedFeature = "agreement" | "house_manual";

export const HOUSEHOLD_FEATURES: GatedFeature[] = ["agreement", "house_manual"];

/** True when a wallet on this plan (null = no self-serve plan) may use the feature. */
export function planIncludes(plan: string | null, feature: GatedFeature): boolean {
  if (plan !== "family") return true;
  return !HOUSEHOLD_FEATURES.includes(feature);
}

export const UPGRADE_MESSAGE = "This is part of the Household plan. Upgrade to use it.";
