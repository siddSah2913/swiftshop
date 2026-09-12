import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getLocale, t } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SignOutButton } from "@/components/sign-out-button";

// Phase 0 auth guard: every /dashboard/* page renders through here.
// Redirects to /login when no valid session/JWT. (Middleware arrives in
// Phase 3 once auth.config is split for the edge runtime — see DECISIONS.md.)
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const locale = getLocale(
    (await cookies()).get("swiftshop_lang")?.value ?? null,
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
        <p className="font-bold text-teal-700">{t(locale, "brand.name")}</p>
        <div className="flex items-center gap-4">
          <LanguageSwitcher locale={locale} />
          <SignOutButton label={t(locale, "nav.signOut")} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}