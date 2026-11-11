import { ENABLED_LOCALES, LOCALES, isLocale } from "@/lib/i18n/core";
import { useI18n, useT } from "@/lib/i18n/provider";

/** Lets someone change language. Hidden until a second language has been translated and enabled. */
export function LanguagePicker() {
  const { locale, setLocale } = useI18n();
  const t = useT();
  if (ENABLED_LOCALES.length < 2) return null;
  return (
    <label className="mt-4 block text-sm font-medium text-foreground">
      {t("account.language")}
      <select
        className="mt-1.5 block w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
        value={locale}
        onChange={(e) => isLocale(e.target.value) && setLocale(e.target.value)}
      >
        {ENABLED_LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALES[l].label}
          </option>
        ))}
      </select>
    </label>
  );
}
