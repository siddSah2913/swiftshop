import Link from "next/link";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { getLocale, t } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

export default async function HomePage() {
  const session = await auth();
  const locale = getLocale(
    (await cookies()).get("swiftshop_lang")?.value ?? null,
  );

  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
        <p className="text-lg font-bold text-teal-700">{t(locale, "brand.name")}</p>
        <nav className="flex items-center gap-4 text-sm">
          <LanguageSwitcher locale={locale} />
          {session?.user ? (
            <Link
              href="/dashboard"
              className="font-medium text-zinc-700 hover:text-teal-700"
            >
              {t(locale, "nav.dashboard")}
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-zinc-600 hover:text-zinc-900"
            >
              {t(locale, "nav.signIn")}
            </Link>
          )}
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-4 pb-16 text-center">
        <h1 className="mt-16 max-w-2xl text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
          {t(locale, "home.hero")}
        </h1>
        <p className="mt-4 max-w-xl text-lg text-zinc-600">{t(locale, "home.sub")}</p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href={session?.user ? "/dashboard" : "/signup"}
            className="rounded-full bg-teal-700 px-8 py-3 font-medium text-white hover:bg-teal-800"
          >
            {t(locale, "home.cta")}
          </Link>
          {!session?.user ? (
            <Link
              href="/login"
              className="rounded-full border border-zinc-300 px-8 py-3 font-medium text-zinc-700 hover:bg-zinc-100"
            >
              {t(locale, "nav.signIn")}
            </Link>
          ) : null}
        </div>

        <section className="mt-20 w-full">
          <h2 className="text-xl font-semibold text-zinc-900">
            {t(locale, "home.how")}
          </h2>
          <ol className="mt-4 space-y-2 text-zinc-600">
            <li>{t(locale, "home.how1")}</li>
            <li>{t(locale, "home.how2")}</li>
            <li>{t(locale, "home.how3")}</li>
          </ol>
        </section>

        <p className="mt-16 text-xs text-zinc-400">{t(locale, "home.demoNote")}</p>
      </main>
    </div>
  );
}