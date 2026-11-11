// Every plan includes every tool. Plans differ only by how many staff a household can add, so nothing
// here is gated. The check stays as the single place to change if that ever needs to differ.

export type GatedFeature = "agreement" | "house_manual" | "live_in";

export const HOUSEHOLD_FEATURES: GatedFeature[] = ["agreement", "house_manual", "live_in"];

/** True when a wallet on this plan (null = no self-serve plan) may use the feature. */
export function planIncludes(_plan: string | null, _feature: GatedFeature): boolean {
  return true;
}

export const UPGRADE_MESSAGE = "This is part of the Household plan. Upgrade to use it.";
