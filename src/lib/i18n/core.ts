// The translation core: pure functions, no React, no dependencies beyond the browser's own Intl.
// A message is a string with {placeholders}, or an object with plural forms chosen by the {count} value.
import { enGB, type MessageKey } from "./en-GB";

export type Message =
  | string
  | { zero?: string; one?: string; two?: string; few?: string; many?: string; other: string };
export type Catalogue = Record<string, Message>;
export type Vars = Record<string, string | number>;

/** Languages people can choose. Add a language here and give it a catalogue; "pseudo" is for checking coverage. */
export const LOCALES = {
  "en-GB": { label: "English (UK)", dir: "ltr" as const },
  pseudo: { label: "Pseudo (testing)", dir: "ltr" as const },
} as const;
export type Locale = keyof typeof LOCALES;

/** The languages offered in the picker. A language is added here only once it has been translated and reviewed. */
export const ENABLED_LOCALES: Locale[] = ["en-GB"];
export const DEFAULT_LOCALE: Locale = "en-GB";

export const isLocale = (value: unknown): value is Locale =>
  typeof value === "string" && value in LOCALES;

/** Right-to-left languages flip the page. Arabic and Hebrew are listed ahead of their catalogues. */
const RTL = new Set(["ar", "he", "fa", "ur"]);
export const directionOf = (locale: string): "ltr" | "rtl" =>
  RTL.has(locale.split("-")[0]!) ? "rtl" : "ltr";

/** A device language we can offer, or null. "en-US" gives "en-GB" only if no closer match exists. */
export function suggestLocale(
  deviceLanguages: readonly string[],
  enabled: readonly Locale[] = ENABLED_LOCALES,
): Locale | null {
  for (const raw of deviceLanguages) {
    const exact = enabled.find((l) => l.toLowerCase() === raw.toLowerCase());
    if (exact) return exact;
    const base = enabled.find(
      (l) => l.split("-")[0]!.toLowerCase() === raw.split("-")[0]!.toLowerCase(),
    );
    if (base) return base;
  }
  return null;
}

const ACCENTS: Record<string, string> = {
  a: "á",
  e: "é",
  i: "í",
  o: "ó",
  u: "ú",
  A: "Á",
  E: "É",
  I: "Í",
  O: "Ó",
  U: "Ú",
  c: "ç",
  n: "ñ",
  y: "ý",
};
/** Makes text look foreign but readable, keeping {placeholders} intact, so untranslated strings are easy to spot. */
export function pseudo(text: string): string {
  return (
    "⟦" +
    text
      .split(/(\{[^}]+\})/)
      .map((part) =>
        part.startsWith("{") ? part : part.replace(/[aeiouAEIOUcny]/g, (c) => ACCENTS[c] ?? c),
      )
      .join("") +
    "⟧"
  );
}

const pseudoMessage = (m: Message): Message =>
  typeof m === "string"
    ? pseudo(m)
    : (Object.fromEntries(Object.entries(m).map(([k, v]) => [k, pseudo(v as string)])) as Message);

const CATALOGUES: Partial<Record<Locale, Catalogue>> = {
  "en-GB": enGB,
  pseudo: Object.fromEntries(Object.entries(enGB).map(([k, v]) => [k, pseudoMessage(v)])),
};

const interpolate = (text: string, vars: Vars = {}) =>
  text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));

/** The message for a key in a language, falling back to English, then to the key itself so nothing is ever blank. */
export function translate(locale: Locale, key: MessageKey, vars?: Vars): string {
  const message = (CATALOGUES[locale]?.[key] ?? enGB[key] ?? key) as Message;
  if (typeof message === "string") return interpolate(message, vars);
  const count = Number(vars?.["count"] ?? 0);
  const rule = new Intl.PluralRules(locale === "pseudo" ? "en-GB" : locale).select(
    count,
  ) as keyof typeof message;
  return interpolate((count === 0 && message.zero) || message[rule] || message.other, vars);
}

/** Every language must define exactly the keys English does. Used by tests. */
export const missingKeys = (catalogue: Catalogue) =>
  Object.keys(enGB).filter((k) => !(k in catalogue));
export const catalogueFor = (locale: Locale) => CATALOGUES[locale];
