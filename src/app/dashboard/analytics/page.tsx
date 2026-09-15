// Analytics page (Phase 6) — five store-scoped dimensions: revenue trend,
// orders by status, top products, payment split, customer growth. Range and
// granularity are searchParams (links), so this stays a server component with
// no client state. All aggregation comes from the pure lib in src/lib/analytics.

import { cookies } from "next/headers";
import Link from "next/link";
import { requireStore } from "@/lib/require-store";
import { prisma } from "@/lib/db";
import type { TranslationKey } from "@/lib/i18n";
import { getLocale, t } from "@/lib/i18n";
import {
  ORDER_STATUSES,
  ORDER_STATUS_BADGE,
  STATUS_LABEL_KEYS,
  type OrderStatus,
} from "@/lib/order-status";
import {
  PAYMENT_TYPES,
  PAYMENT_TYPE_I18N_KEY,
  type PaymentType,
} from "@/lib/payments/types";
import {
  ANALYTICS_GRANULARITIES,
  ANALYTICS_RANGES,
  isAnalyticsGranularity,
  isAnalyticsRange,
  rangeStart,
  rangeWhere,
  type AnalyticsGranularity,
  type AnalyticsRange,
} from "@/lib/analytics/types";
import {
  bucketCounts,
  bucketOrders,
  type Bucket,
} from "@/lib/analytics/buckets";
import { aggregateTopProducts } from "@/lib/analytics/top-products";

const RANGE_LABEL_KEYS: Record<AnalyticsRange, TranslationKey> = {
  "7d": "analytics.range7d",
  "30d": "analytics.range30d",
  all: "analytics.rangeAll",
};

const GRANULARITY_LABEL_KEYS: Record<AnalyticsGranularity, TranslationKey> = {
  day: "analytics.granularityDay",
  week: "analytics.granularityWeek",
  month: "analytics.granularityMonth",
};

type Props = {
  searchParams: Promise<{ range?: string; granularity?: string }>;
};

/** Hand-built bar strip — zero-dependency, scales bars against the max. */
function Bars({ buckets, max }: { buckets: Bucket[]; max: number }) {
  if (buckets.every((b) => b.value === 0)) return null;
  return (
    <div className="flex h-40 items-end gap-1">
      {buckets.map((b) => (
        <div key={b.start.toISOString()} className="flex h-full flex-1 items-end">
          <div
            className={`w-full rounded-t ${b.value > 0 ? "bg-teal-600" : "bg-zinc-100"}`}
            style={{
              height: `${Math.max(b.value > 0 ? 4 : 2, (b.value / max) * 100)}%`,
            }}
            title={`${b.start.toDateString()} — ${b.value.toLocaleString("en-IN")}`}
          />
        </div>
      ))}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function AnalyticsPage({ searchParams }: Props) {
  const { store } = await requireStore();
  const locale = getLocale(
    (await cookies()).get("swiftshop_lang")?.value ?? null,
  );
  const sp = await searchParams;

  const rangeParam = sp.range ?? "";
  const range: AnalyticsRange = isAnalyticsRange(rangeParam)
    ? rangeParam
    : "30d";
  const granularityParam = sp.granularity ?? "";
  const granularity: AnalyticsGranularity = isAnalyticsGranularity(
    granularityParam,
  )
    ? granularityParam
    : "day";

  const start = rangeStart(range);
  const chartStart = start ?? new Date(0); // "all": chart shows most-recent 12 caps
  const end = new Date();

  const [orders, statusGroups, paymentGroups, itemRows, customerRows] =
    await Promise.all([
      prisma.order.findMany({
        where: { storeId: store.id, ...rangeWhere(range) },
        select: { createdAt: true, totalNpr: true },
      }),
      prisma.order.groupBy({
        by: ["status"],
        where: { storeId: store.id, ...rangeWhere(range) },
        _count: { _all: true },
      }),
      prisma.order.groupBy({
        by: ["paymentType"],
        where: { storeId: store.id, ...rangeWhere(range) },
        _count: { _all: true },
        _sum: { totalNpr: true },
      }),
      prisma.orderItem.findMany({
        where: { order: { storeId: store.id, ...rangeWhere(range) } },
        select: { name: true, priceNpr: true, qty: true },
      }),
      prisma.customer.findMany({
        where: { storeId: store.id, ...rangeWhere(range) },
        select: { createdAt: true },
      }),
    ]);

  const revenueBuckets = bucketOrders(orders, chartStart, end, granularity);
  const maxRevenue = Math.max(...revenueBuckets.map((b) => b.value), 1);
  const totalRevenue = revenueBuckets.reduce((s, b) => s + b.value, 0);

  const customerBuckets = bucketCounts(customerRows, chartStart, end, granularity);
  const maxCustomers = Math.max(...customerBuckets.map((b) => b.value), 1);
  const totalCustomers = customerBuckets.reduce((s, b) => s + b.value, 0);

  const topProducts = aggregateTopProducts(itemRows, 10);

  const statusCounts = new Map(
    statusGroups.map((g) => [g.status as OrderStatus, g._count._all]),
  );
  const statusRows = ORDER_STATUSES.map((s) => ({
    status: s,
    count: statusCounts.get(s) ?? 0,
  }));
  const statusTotal = Math.max(
    statusRows.reduce((s, r) => s + r.count, 0),
    1,
  );

  const paymentMap = new Map(
    paymentGroups.map((g) => [
      g.paymentType as PaymentType,
      { count: g._count._all, revenue: g._sum.totalNpr ?? 0 },
    ]),
  );
  const paymentRows = PAYMENT_TYPES.map((p) => ({
    type: p,
    ...(paymentMap.get(p) ?? { count: 0, revenue: 0 }),
  }));

  const rangePills = ANALYTICS_RANGES.map((r) => {
    const active = range === r;
    return (
      <Link
        key={r}
        href={`/dashboard/analytics?range=${r}&granularity=${granularity}`}
        className={`rounded-full px-3 py-1 text-sm transition ${
          active
            ? "bg-zinc-900 text-white"
            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
        }`}
      >
        {t(locale, RANGE_LABEL_KEYS[r])}
      </Link>
    );
  });

  const granularityPills = ANALYTICS_GRANULARITIES.map((g) => {
    const active = granularity === g;
    return (
      <Link
        key={g}
        href={`/dashboard/analytics?range=${range}&granularity=${g}`}
        className={`rounded-full px-3 py-1 text-sm transition ${
          active
            ? "bg-zinc-900 text-white"
            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
        }`}
      >
        {t(locale, GRANULARITY_LABEL_KEYS[g])}
      </Link>
    );
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-zinc-900">
          {t(locale, "analytics.title")}
        </h1>
        <Link
          href={`/api/dashboard/export?range=${range}`}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800"
        >
          {t(locale, "analytics.export")}
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex gap-2">{rangePills}</div>
        <span className="text-zinc-300">·</span>
        <div className="flex gap-2">{granularityPills}</div>
      </div>

      <div className="mt-6 grid gap-4">
        <Card title={t(locale, "analytics.revenue")}>
          <p className="mb-4 text-2xl font-semibold text-zinc-900">
            {t(locale, "product.priceNpr")} {totalRevenue.toLocaleString("en-IN")}
          </p>
          {orders.length === 0 ? (
            <p className="text-sm text-zinc-500">{t(locale, "analytics.empty")}</p>
          ) : (
            <Bars buckets={revenueBuckets} max={maxRevenue} />
          )}
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card title={t(locale, "analytics.ordersByStatus")}>
            <div className="flex h-4 w-full overflow-hidden rounded-full bg-zinc-100">
              {statusRows.map((r) =>
                r.count > 0 ? (
                  <div
                    key={r.status}
                    className={ORDER_STATUS_BADGE[r.status]}
                    style={{ width: `${(r.count / statusTotal) * 100}%` }}
                  />
                ) : null,
              )}
            </div>
            <ul className="mt-4 space-y-1.5">
              {statusRows.map((r) => (
                <li
                  key={r.status}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="flex items-center gap-2 text-zinc-600">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${ORDER_STATUS_BADGE[r.status]}`}
                    />
                    {t(locale, STATUS_LABEL_KEYS[r.status])}
                  </span>
                  <span className="font-medium text-zinc-800">{r.count}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title={t(locale, "analytics.paymentSplit")}>
            <ul className="divide-y divide-zinc-100">
              {paymentRows.map((r) => (
                <li
                  key={r.type}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="text-zinc-700">
                    {t(locale, PAYMENT_TYPE_I18N_KEY[r.type])}
                  </span>
                  <span className="text-zinc-500">
                    {r.count}{" "}
                    <span className="text-zinc-300">·</span>{" "}
                    {t(locale, "product.priceNpr")}{" "}
                    {r.revenue.toLocaleString("en-IN")}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card title={t(locale, "analytics.topProducts")}>
            {topProducts.length === 0 ? (
              <p className="text-sm text-zinc-500">{t(locale, "analytics.empty")}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-zinc-400">
                    <th className="pb-2 font-medium">
                      {t(locale, "analytics.product")}
                    </th>
                    <th className="pb-2 text-right font-medium">
                      {t(locale, "analytics.qtySold")}
                    </th>
                    <th className="pb-2 text-right font-medium">
                      {t(locale, "analytics.revenueNpr")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p) => (
                    <tr key={p.name} className="border-t border-zinc-100">
                      <td className="py-2 pr-2">{p.name}</td>
                      <td className="py-2 text-right text-zinc-600">{p.qtySold}</td>
                      <td className="py-2 text-right font-medium">
                        {p.revenueNpr.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card title={t(locale, "analytics.customerGrowth")}>
            <p className="mb-4 text-2xl font-semibold text-zinc-900">
              {totalCustomers}
            </p>
            {customerRows.length === 0 ? (
              <p className="text-sm text-zinc-500">{t(locale, "analytics.empty")}</p>
            ) : (
              <Bars buckets={customerBuckets} max={maxCustomers} />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}