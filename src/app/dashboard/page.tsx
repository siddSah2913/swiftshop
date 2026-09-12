import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { getLocale, t } from "@/lib/i18n";

// Phase 0 placeholder dashboard. The full owner dashboard (orders, products,
// customers — phone-first) is built in Phase 3.
export default async function DashboardPage() {
  const session = await auth();
  const locale = getLocale(
    (await cookies()).get("swiftshop_lang")?.value ?? null,
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900">
        {t(locale, "dashboard.title")}
      </h1>

      <p className="text-zinc-600">
        {t(locale, "dashboard.welcome")},{" "}
        <span className="font-medium text-zinc-900">
          {session?.user.name ?? session?.user.email}
        </span>
        .
      </p>

      <section className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="font-semibold text-zinc-900">
          {t(locale, "dashboard.demoDataTitle")}
        </h2>
        <p className="mt-2 text-sm text-zinc-600">
          {t(locale, "dashboard.demoDataBody")}
        </p>
        <pre className="mt-4 overflow-x-auto rounded-md bg-zinc-900 p-3 text-xs text-zinc-100">
          npx prisma studio
        </pre>
      </section>

      <p className="text-sm text-zinc-500">{t(locale, "dashboard.nextSteps")}</p>
    </div>
  );
}