"use client";

import type { Locale } from "@/lib/i18n";

/** Toggles the language preference cookie, then reloads so server-rendered text changes. */
export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const next: Locale = locale === "en" ? "ne" : "en";

  function switchLanguage() {
    document.cookie = `swiftshop_lang=${next}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  }

  // Button always shows the language you'll switch TO.
  return (
    <button
      onClick={switchLanguage}
      className="text-sm font-medium text-teal-700 hover:text-teal-900"
    >
      {next === "ne" ? "नेपाली" : "English"}
    </button>
  );
}