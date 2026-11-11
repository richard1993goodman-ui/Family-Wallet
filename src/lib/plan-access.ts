// Every plan includes every tool. There is one plan with unlimited staff, so nothing
// here is gated. The check stays as the single place to change if that ever needs to differ.

export type GatedFeature = "agreement" | "house_manual" | "live_in";

export const HOUSEHOLD_FEATURES: GatedFeature[] = ["agreement", "house_manual", "live_in"];

/** True when a wallet on this plan (null = no self-serve plan) may use the feature. */
export function planIncludes(_plan: string | null, _feature: GatedFeature): boolean {
  return true;
}

export const UPGRADE_MESSAGE = "This is part of the Family plan. Upgrade to use it.";
