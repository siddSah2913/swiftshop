import { cookies } from "next/headers";
import Link from "next/link";
import { requireStore } from "@/lib/require-store";
import { prisma } from "@/lib/db";
import { getLocale, t } from "@/lib/i18n";
import {
  ORDER_STATUSES,
  ORDER_STATUS_BADGE,
  STATUS_LABEL_KEYS,
  isOrderStatus,
  type OrderStatus,
} from "@/lib/order-status";

// Orders list — server-side search + status filter chips. Both filters feed
// the Prisma `where`, and any GET (form submit / chip click / page reload) just
// re-runs this page, so each row links to its detail page at [id].
export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; status?: string | string[] }>;
}) {
  const { store } = await requireStore();
  const locale = getLocale(
    (await cookies()).get("swiftshop_lang")?.value ?? null,
  );

  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const rawStatus = typeof params.status === "string" ? params.status : "";
  const status = isOrderStatus(rawStatus) ? rawStatus : undefined;

  // A purely-numeric search means "order #N"; anything else is a name/phone match.
  const orderNo = /^\d+$/.test(q) ? Number(q) : undefined;

  const orders = await prisma.order.findMany({
    where: {
      storeId: store.id,
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { customer: { name: { contains: q, mode: "insensitive" } } },
              { customer: { phone: { contains: q } } },
              ...(orderNo !== undefined ? [{ orderNo }] : []),
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { customer: true },
  });

  const hasFilter = q !== "" || status !== undefined;
  const dateFmt = new Intl.DateTimeFormat(
    locale === "ne" ? "ne-NP" : "en-IN",
    { dateStyle: "medium", timeStyle: "short" },
  );

  const chip = (active: boolean) =>
    active
      ? "whitespace-nowrap rounded-full bg-teal-700 px-3 py-1.5 text-sm font-medium text-white"
      : "whitespace-nowrap rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 hover:border-teal-300";

  const statusHref = (s: string) =>
    `/dashboard/orders?${q ? `q=${encodeURIComponent(q)}&` : ""}status=${s}`;

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900">
        {t(locale, "nav.orders")}
      </h1>

      <form action="/dashboard/orders" method="get" className="mt-5 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder={t(locale, "orders.searchPlaceholder")}
          className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-teal-600 focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
        >
          {t(locale, "orders.search")}
        </button>
      </form>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        <Link
          href={q ? `/dashboard/orders?q=${encodeURIComponent(q)}` : "/dashboard/orders"}
          className={chip(!status)}
        >
          {t(locale, "orders.all")}
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s} href={statusHref(s)} className={chip(status === s)}>
            {t(locale, STATUS_LABEL_KEYS[s])}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <p className="mt-10 text-center text-sm text-zinc-500">
          {hasFilter ? t(locale, "orders.noMatch") : t(locale, "orders.empty")}
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/dashboard/orders/${o.id}`}
              className="block rounded-lg border border-zinc-200 bg-white p-4 transition hover:border-teal-300 hover:shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="truncate font-medium text-zinc-900">
                  #{o.orderNo} · {o.customer.name}
                </p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${ORDER_STATUS_BADGE[o.status as OrderStatus]}`}
                >
                  {t(locale, STATUS_LABEL_KEYS[o.status as OrderStatus])}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-3 text-sm text-zinc-500">
                <p className="truncate">
                  {t(locale, "product.priceNpr")}{" "}
                  {o.totalNpr.toLocaleString("en-IN")} · {dateFmt.format(o.createdAt)}
                </p>
                <p className="shrink-0">{o.customer.phone}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}