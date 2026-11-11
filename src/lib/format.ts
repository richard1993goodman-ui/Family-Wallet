// One place for how money, dates and times are shown, so a household's currency, language and time zone can change
// without touching every screen. Defaults are today's behaviour: pounds, UK English, the device's own time zone.

export const DEFAULT_LOCALE = "en-GB";
export const DEFAULT_CURRENCY = "GBP";
export const DEFAULT_TIME_ZONE = "Europe/London";

/**
 * The language dates and numbers are shown in. The language provider sets this when the language changes, so
 * every formatter below follows the chosen language without each screen passing it in.
 */
let activeLocale = DEFAULT_LOCALE;
export function setFormatLocale(locale: string) {
  activeLocale = locale === "pseudo" ? DEFAULT_LOCALE : locale;
}
export const formatLocale = () => activeLocale;

/** Money, with the currency's own symbol and decimals (pounds and euros have two, yen has none). */
export function formatMoney(amount: number | null | undefined, currency: string = DEFAULT_CURRENCY, locale: string = activeLocale) {
  const value = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
  } catch {
    // An unknown currency code or locale must never break a screen: fall back to the defaults.
    return new Intl.NumberFormat(DEFAULT_LOCALE, { style: "currency", currency: DEFAULT_CURRENCY }).format(value);
  }
}

const asDate = (value: string | number | Date) => (value instanceof Date ? value : new Date(value));

/**
 * A date (or date and time, depending on the options) in the chosen language. Date-only strings (2026-11-11) are
 * shown as that calendar day. A moment is shown in the time zone given, or the device's own if none is.
 */
export function formatDate(
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
  locale: string = activeLocale,
  timeZone?: string,
) {
  const dateOnly = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const zone = options.timeZone ?? (dateOnly ? "UTC" : timeZone);
  return new Intl.DateTimeFormat(locale, { ...options, ...(zone ? { timeZone: zone } : {}) }).format(
    dateOnly ? new Date(`${value}T00:00:00Z`) : asDate(value),
  );
}

/** A clock time in the chosen language and a time zone. */
export function formatTime(value: string | number | Date, locale: string = activeLocale, timeZone: string = DEFAULT_TIME_ZONE) {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone }).format(asDate(value));
}
