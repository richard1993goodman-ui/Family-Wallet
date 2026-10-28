// Partner retainer tiers, billed monthly per active family band. No setup fee.
export type PartnerTier = { name: string; min: number; max: number | null; monthly: number | null };

export const PARTNER_TIERS: PartnerTier[] = [
  { name: "Starter", min: 0, max: 5, monthly: 125 },
  { name: "Growth", min: 6, max: 10, monthly: 225 },
  { name: "Established", min: 11, max: 15, monthly: 300 },
  { name: "Premier", min: 16, max: 20, monthly: 375 },
  { name: "Enterprise", min: 21, max: 30, monthly: 500 },
  { name: "Custom", min: 31, max: null, monthly: null },
];

export const PARTNER_SETUP_FEE = 0;

export function tierFor(activeFamilies: number): PartnerTier {
  return PARTNER_TIERS.find((t) => t.max === null || activeFamilies <= t.max)!;
}
