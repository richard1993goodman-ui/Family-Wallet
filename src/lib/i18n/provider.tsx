import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_LOCALE,
  ENABLED_LOCALES,
  directionOf,
  isLocale,
  suggestLocale,
  translate,
  type Locale,
  type Vars,
} from "./core";
import type { MessageKey } from "./en-GB";

const STORAGE_KEY = "fw-language";

type I18n = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, vars?: Vars) => string;
};

const I18nContext = createContext<I18n>({
  locale: DEFAULT_LOCALE,
  setLocale: () => undefined,
  t: (key, vars) => translate(DEFAULT_LOCALE, key, vars),
});

/**
 * Holds the chosen language. The server always renders English so the first paint matches; the device language or the
 * person's saved choice is applied straight after. Open any page with ?lang=pseudo to see which words are not yet translatable.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    let chosen: Locale | null = null;
    try {
      if (new URLSearchParams(window.location.search).get("lang") === "pseudo") chosen = "pseudo";
      else {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (isLocale(stored) && ENABLED_LOCALES.includes(stored)) chosen = stored;
      }
    } catch {
      /* storage can be blocked: carry on without it */
    }
    chosen ??= suggestLocale(
      navigator.languages?.length ? navigator.languages : [navigator.language],
    );
    if (chosen) setLocaleState(chosen);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "pseudo" ? DEFAULT_LOCALE : locale;
    document.documentElement.dir = directionOf(locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* not saved, but the choice still applies for this visit */
    }
  }, []);

  const value = useMemo<I18n>(
    () => ({ locale, setLocale, t: (key, vars) => translate(locale, key, vars) }),
    [locale, setLocale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
export const useT = () => useContext(I18nContext).t;
