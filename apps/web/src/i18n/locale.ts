export const LOCALES = ["en", "ja"] as const;
export type Locale = (typeof LOCALES)[number];

/** English is the base language; Japanese is the alternative. */
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ja: "日本語",
};

export const LOCALE_STORAGE_KEY = "nai-locale";

export function isLocale(value: string | null): value is Locale {
  return value !== null && LOCALES.some((locale) => locale === value);
}
