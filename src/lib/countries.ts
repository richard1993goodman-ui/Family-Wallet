// Which countries the platform is set up for, and what each one needs. Only the UK is configured: adding a country
// here is a deliberate step taken after its readiness report, never a side effect. Pure, so it is easy to test.

export type CountryConfig = {
  code: string;
  name: string;
  currency: string;
  timeZone: string;
  language: string;
  /** Which public-holiday provider to use (see holidays.ts), or null when none is set up. */
  holidayProvider: string | null;
  /** The shape of a postcode, or null when none is configured (then any non-empty value is accepted). */
  postcode: RegExp | null;
  status: "live" | "not_enabled";
};

export const COUNTRIES: Record<string, CountryConfig> = {
  GB: {
    code: "GB",
    name: "United Kingdom",
    currency: "GBP",
    timeZone: "Europe/London",
    language: "en-GB",
    holidayProvider: "gb-eng",
    postcode: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i,
    status: "live",
  },
};

export const countryConfig = (code: string | null | undefined) => COUNTRIES[(code ?? "").toUpperCase()] ?? null;
export const isCountryEnabled = (code: string | null | undefined) => countryConfig(code)?.status === "live";

/** True or false when the country has a postcode rule; null when it does not (so the caller accepts any value). */
export function isValidPostcode(code: string | null | undefined, value: string): boolean | null {
  const rule = countryConfig(code)?.postcode;
  if (!rule) return null;
  return rule.test(value.trim());
}
