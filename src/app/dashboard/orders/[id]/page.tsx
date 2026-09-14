import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStore } from "@/lib/require-store";
import { prisma } from "@/lib/db";
import { getLocale, t } from "@/lib/i18n";
import { buildWaUrl } from "@/lib/whatsapp";
import {
  ORDER_STATUS_BADGE,
  PAYMENT_LABEL_KEYS,
  STATUS_LABEL_KEYS,
  canTransition,
  isOrderStatus,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/order-status";
import { OrderStatusButtons } from "@/components/order-status-buttons";

// Order detail — one order in THIS store's scope. Unknown ids and other
// stores' orders both fall through to notFound() (404), never a 500.
export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { store } = await requireStore();
  const locale = getLocale(
    (await cookies()).get("swiftshop_lang")?.value ?? null,
  );

  const order = await prisma.order.findFirst({
    where: { id, storeId: store.id },
    include: { customer: true, items: true },
  });
  if (!order) notFound();

  const status = isOrderStatus(order.status) ? order.status : "new";
  const paymentStatus = (
    order.paymentStatus === "paid" ? "paid" : "unpaid"
  ) as PaymentStatus;

  const dateFmt = new Intl.DateTimeFormat(
    locale === "ne" ? "ne-NP" : "en-IN",
    { dateStyle: "medium", timeStyle: "short" },
  );

  const waMessage =
    `${store.name} — ${t(locale, "order.thankYou")} ` +
    `${t(locale, "order.number")}${order.orderNo} · ` +
    `${t(locale, "product.priceNpr")} ${order.totalNpr.toLocaleString("en-IN")}`;
  const waUrl = buildWaUrl(order.customer.phone, waMessage);

  return (
    <div>
      <Link
        href="/dashboard/orders"
        className="text-sm text-zinc-500 hover:text-zinc-900"
      >
        {t(locale, "orders.backToList")}
      </Link>

      <div className="mt-2 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-zinc-900">
          {t(locale, "order.number")}
          {order.orderNo}
        </h1>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${ORDER_STATUS_BADGE[status]}`}
        >
          {t(locale, STATUS_LABEL_KEYS[status])}
        </span>
      </div>
      <p className="mt-1 text-sm text-zinc-500">
        {t(locale, "orders.placedOn")}: {dateFmt.format(order.createdAt)}
      </p>

      <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {t(locale, "orders.customer")}
        </h2>
        <p className="mt-2 font-medium text-zinc-900">{order.customer.name}</p>
        <a
          href={`tel:${order.customer.phone}`}
          className="mt-1 block text-sm text-teal-700 hover:underline"
        >
          {t(locale, "orders.phone")}: {order.customer.phone}
        </a>
        {order.customer.address ? (
          <p className="mt-1 text-sm text-zinc-600">
            {t(locale, "orders.address")}: {order.customer.address}
          </p>
        ) : null}
      </section>

      <section className="mt-4 rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {t(locale, "orders.payment")}
        </h2>
        <p className="mt-2 text-sm font-medium text-zinc-900">
          {order.paymentType === "cod"
            ? t(locale, "checkout.cod")
            : t(locale, "checkout.qr")}
        </p>
        <span className="mt-2 inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
          {t(locale, PAYMENT_LABEL_KEYS[paymentStatus])}
        </span>
      </section>

      <section className="mt-4 rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {t(locale, "orders.items")}
        </h2>
        <ul className="mt-2 divide-y divide-zinc-100">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 py-2 text-sm"
            >
              <p className="truncate text-zinc-900">
                {item.name} <span className="text-zinc-500">× {item.qty}</span>
              </p>
              <p className="shrink-0 text-zinc-600">
                {t(locale, "product.priceNpr")}{" "}
                {(item.priceNpr * item.qty).toLocaleString("en-IN")}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex items-center justify-between border-t border-zinc-200 pt-3 text-sm font-semibold text-zinc-900">
          <span>{t(locale, "cart.total")}</span>
          <span>
            {t(locale, "product.priceNpr")}{" "}
            {order.totalNpr.toLocaleString("en-IN")}
          </span>
        </p>
      </section>

      <div className="mt-6">
        <OrderStatusButtons
          orderId={order.id}
          canConfirm={canTransition(status, "confirmed")}
          canDeliver={canTransition(status, "delivered")}
          canMarkPaid={paymentStatus === "unpaid"}
          labels={{
            confirm: t(locale, "orders.confirm"),
            markDelivered: t(locale, "orders.markDelivered"),
            markPaid: t(locale, "orders.markPaid"),
            whatsapp: t(locale, "orders.whatsapp"),
          }}
          waUrl={waUrl}
        />
      </div>
    </div>
  );
}