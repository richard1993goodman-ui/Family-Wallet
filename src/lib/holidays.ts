// Public holidays by country. A provider is added only when its dates have been checked; a country without one is
// reported as "not set up" rather than guessed, so a household is never shown another country's holidays as its own.
import { countryConfig } from "./countries";
import { bankHolidays, type OffPeriod } from "./work-hours";

export type HolidayProvider = {
  id: string;
  label: string;
  holidays: (year: number) => OffPeriod[];
};

const PROVIDERS: Record<string, HolidayProvider> = {
  "gb-eng": { id: "gb-eng", label: "England and Wales bank holidays", holidays: bankHolidays },
};

/**
 * The provider for a household's country and region, or null. A UK household with no region keeps today's behaviour
 * (England). Scotland and Northern Ireland have different dates and are not set up yet.
 */
export function providerFor(
  country: string | null | undefined,
  region?: string | null,
): HolidayProvider | null {
  const config = countryConfig(country);
  if (!config?.holidayProvider) return null;
  const r = (region ?? "").trim().toLowerCase();
  if (config.code === "GB" && r !== "" && r !== "england" && r !== "wales") return null;
  return PROVIDERS[config.holidayProvider] ?? null;
}

/** Public holidays from today for the next two calendar years, or `configured: false` when the country has no provider. */
export function keyDatesFor(
  country: string | null | undefined,
  region?: string | null,
  today = new Date(),
) {
  const provider = providerFor(country, region);
  if (!provider) return { configured: false as const, label: null, dates: [] as OffPeriod[] };
  const from = today.toISOString().slice(0, 10);
  const year = today.getUTCFullYear();
  const dates = [...provider.holidays(year), ...provider.holidays(year + 1)].filter(
    (p) => p.end >= from,
  );
  return { configured: true as const, label: provider.label, dates };
}
