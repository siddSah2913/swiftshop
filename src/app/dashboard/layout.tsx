import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getLocale, t } from "@/lib/i18n";
import { DashboardNav, type DashboardNavItem } from "@/components/dashboard-nav";

// Phase 3 dashboard shell — responsive by form factor:
//   - mobile: a fixed bottom tab bar (4 tabs)
//   - desktop: a persistent left sidebar rail (brand + tabs + language/sign-out)
// Phase 0 auth guard stays: /dashboard/* redirects to /login without a session.
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

  // Same item set drives both form factors (labels translated server-side).
  const tabs: DashboardNavItem[] = [
    { href: "/dashboard/orders", label: t(locale, "nav.orders") },
    { href: "/dashboard/products", label: t(locale, "nav.products") },
    { href: "/dashboard/customers", label: t(locale, "nav.customers") },
    { href: "/dashboard/more", label: t(locale, "nav.more") },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 md:flex">
      {/* Desktop sidebar rail (hidden on phones) */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-200 bg-white md:flex">
        <DashboardNav
          items={tabs}
          variant="side"
          brandLabel={t(locale, "brand.name")}
          signOutLabel={t(locale, "nav.signOut")}
          locale={locale}
        />
      </aside>

      {/* Main column + mobile bottom tab bar */}
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-6 md:max-w-5xl md:pb-8">
          {children}
        </main>
        <DashboardNav items={tabs} variant="bottom" />
      </div>
    </div>
  );
}