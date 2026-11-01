export type TierBand = "1" | "2" | "3" | "4" | "5" | "6-7";

export const TIER_BANDS: {
  value: TierBand;
  days: string;
  price: string;
  name: string;
}[] = [
  { value: "1", days: "1 day per week", price: "£50 + VAT / month", name: "Bronze" },
  { value: "2", days: "2 days per week", price: "£70 + VAT / month", name: "Silver" },
  { value: "3", days: "3 days per week", price: "£80 + VAT / month", name: "Silver" },
  { value: "4", days: "4 days per week", price: "£100 + VAT / month", name: "Gold" },
  { value: "5", days: "5 days per week", price: "£120 + VAT / month", name: "Gold" },
  { value: "6-7", days: "6–7 days per week", price: "£140 + VAT / month", name: "Platinum" },
];

export function tierFor(band: string) {
  return TIER_BANDS.find((t) => t.value === band) ?? TIER_BANDS[2]!;
}

export const EXTRA_FEES = [
  { label: "Ad hoc / emergency — 1–4 hours", value: "£15 + VAT / day" },
  { label: "Ad hoc / emergency — 4+ hours", value: "£20 + VAT / day" },
  { label: "Holiday or longer bookings — over 1 week", value: "£150 + VAT / week" },
  {
    label: "Placement fee — over 20 hours/week Mon–Fri",
    value: "10% + VAT of annual nanny pay",
  },
];

export const TOOL_LINKS = [
  {
    title: "Timesheet calculator",
    description: "Log your nanny's hours and rate, then share or download the invoice.",
    href: "https://nanny-time-pay.lovable.app",
  },
  {
    title: "Nanny Fuel",
    description: "Meal, snack and baking ideas to keep everyone going after school.",
    href: "https://nanny-nourish-guide.lovable.app",
  },
  {
    title: "Nanny activity guide",
    description: "Age-appropriate indoor and outdoor activity ideas in seconds.",
    href: "https://nannyguide.lovable.app",
  },
];


export const TERMS_VERSION = "2026.1";
