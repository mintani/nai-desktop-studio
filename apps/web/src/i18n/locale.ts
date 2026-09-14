export const LOCALES = ["en", "ja", "zh"] as const;
export type Locale = (typeof LOCALES)[number];

/** English is the base language; the others fall back to it key by key. */
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ja: "日本語",
  zh: "简体中文",
};

export const LOCALE_STORAGE_KEY = "nai-locale";

export function isLocale(value: string | null): value is Locale {
  return value !== null && LOCALES.some((locale) => locale === value);
}
