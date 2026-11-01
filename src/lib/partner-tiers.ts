// Partner retainer tiers, billed monthly per active family band. No setup fee.
// Active family = wallet live and accessible (status "active"); archived families don't count.
export type PartnerTier = { name: string; min: number; max: number | null; monthly: number | null };

export const PARTNER_TIERS: PartnerTier[] = [
  { name: "Starter", min: 0, max: 5, monthly: 150 },
  { name: "Growth", min: 6, max: 10, monthly: 250 },
  { name: "Scale", min: 11, max: 15, monthly: 350 },
  { name: "Established", min: 16, max: 20, monthly: 400 },
  { name: "Enterprise", min: 21, max: 30, monthly: 500 },
  { name: "Bespoke", min: 31, max: null, monthly: null },
];

export const PARTNER_SETUP_FEE = 0;
/** Introductory per-family rate for an agency's first few active families. */
export const INTRO_PER_FAMILY = 35;
export const INTRO_MAX_FAMILIES = 3;

export function tierFor(activeFamilies: number): PartnerTier {
  return PARTNER_TIERS.find((t) => t.max === null || activeFamilies <= t.max)!;
}

/** Monthly fee (+ VAT) and label, honouring the introductory per-family offer when enabled. */
export function partnerFee(activeFamilies: number, introPricing: boolean) {
  if (introPricing && activeFamilies <= INTRO_MAX_FAMILIES) {
    return { label: "Introductory", monthly: activeFamilies * INTRO_PER_FAMILY, max: INTRO_MAX_FAMILIES };
  }
  const t = tierFor(activeFamilies);
  return { label: t.name, monthly: t.monthly, max: t.max };
}
