import { cookies } from "next/headers";
import Link from "next/link";
import { requireStore } from "@/lib/require-store";
import { prisma } from "@/lib/db";
import { getLocale, t } from "@/lib/i18n";

// Dashboard home — a compact "Today" strip. At a glance the owner sees the two
// numbers that matter when they open the app: how many fresh ("new") orders
// need attention, and what has sold so far today (integer NPR). Both stats
// link to the orders list, where the supporting rows live.
export default async function DashboardPage() {
  const { store } = await requireStore();
  const locale = getLocale(
    (await cookies()).get("swiftshop_lang")?.value ?? null,
  );

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [newOrders, salesToday] = await Promise.all([
    prisma.order.count({ where: { storeId: store.id, status: "new" } }),
    prisma.order.aggregate({
      _sum: { totalNpr: true },
      where: { storeId: store.id, createdAt: { gte: todayStart } },
    }),
  ]);

  const amountNpr = salesToday._sum.totalNpr ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900">
        {t(locale, "dashboard.today")}
      </h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/orders"
          className="rounded-lg border border-zinc-200 bg-white p-5 transition hover:border-teal-300 hover:shadow-sm"
        >
          <p className="text-sm text-zinc-500">
            {t(locale, "dashboard.newOrders")}
          </p>
          <p className="mt-1 text-3xl font-semibold text-zinc-900">
            {newOrders}
          </p>
        </Link>

        <Link
          href="/dashboard/orders"
          className="rounded-lg border border-zinc-200 bg-white p-5 transition hover:border-teal-300 hover:shadow-sm"
        >
          <p className="text-sm text-zinc-500">
            {t(locale, "dashboard.salesToday")}
          </p>
          <p className="mt-1 text-3xl font-semibold text-zinc-900">
            {t(locale, "product.priceNpr")} {amountNpr.toLocaleString("en-IN")}
          </p>
        </Link>

        <Link
          href="/dashboard/analytics"
          className="col-span-full rounded-lg border border-zinc-200 bg-white p-5 transition hover:border-teal-300 hover:shadow-sm"
        >
          <p className="text-sm text-zinc-500">{t(locale, "dashboard.analytics")}</p>
          <p className="mt-1 text-sm text-zinc-400">
            {t(locale, "dashboard.analyticsHint")}
          </p>
        </Link>
      </div>
    </div>
  );
}