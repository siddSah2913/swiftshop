// Dashboard "More" page — settings and overflow. On phones there is no
// sidebar rail, so the language switcher and sign-out live here; desktop
// reaches the same tools from the sidebar. See Phase 3 spec §?

import { cookies } from "next/headers";
import Link from "next/link";
import { requireStore } from "@/lib/require-store";
import { getLocale, t } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SignOutButton } from "@/components/sign-out-button";

export default async function MorePage() {
  const { store } = await requireStore();
  const locale = getLocale(
    (await cookies()).get("swiftshop_lang")?.value ?? null,
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900">
        {t(locale, "more.title")}
      </h1>
      <p className="mt-1 text-sm text-zinc-500">{t(locale, "more.subtitle")}</p>

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <Link
          href={`/${store.slug}`}
          className="block border-b border-zinc-100 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          {t(locale, "nav.viewShop")}
        </Link>
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <LanguageSwitcher locale={locale} />
          <SignOutButton label={t(locale, "nav.signOut")} />
        </div>
      </div>
    </div>
  );
}