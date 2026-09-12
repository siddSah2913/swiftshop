// i18n helper — bilingual English + Nepali.
// Every word lives in the dictionaries (src/locales). Keys are dotted strings
// so a missing translation breaks the type, not at runtime.
// See webplan.md §12.

import { en, type Dict } from "@/locales/en";
import { ne } from "@/locales/ne";

export type Locale = "en" | "ne";

const dictionaries: Record<Locale, Dict> = { en, ne };

export type TranslationKey = keyof Dict;

/** Translate a key for the given locale. */
export function t(locale: Locale, key: TranslationKey): string {
  return dictionaries[locale][key];
}

/** Turn the browser's cookie value into a Locale (default: English). */
export function getLocale(cookie?: string | null): Locale {
  return cookie === "ne" ? "ne" : "en";
}