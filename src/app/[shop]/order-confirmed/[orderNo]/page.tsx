// Thank-you page — order number, "we'll call to confirm", WhatsApp link.
// Reads order by storeId + orderNo. Random access to another store's
// orderNo must 404. See Phase 2 spec §3.

import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getLocale, t } from "@/lib/i18n";
import {
  PAYMENT_TYPE_I18N_KEY,
  type PaymentType,
} from "@/lib/payments/types";

type Props = {
  params: Promise<{ shop: string; orderNo: string }>;
};

export default async function OrderConfirmedPage({ params }: Props) {
  const { shop, orderNo } = await params;
  const slug = shop.toLowerCase().trim();
  const locale = getLocale((await cookies()).get("swiftshop_lang")?.value);
  const orderNoNum = parseInt(orderNo, 10);

  if (!Number.isInteger(orderNoNum) || orderNoNum < 1) notFound();

  const store = await prisma.store.findUnique({
    where: { slug },
    select: { id: true, name: true, whatsappNumber: true },
  });

  if (!store) notFound();

  const order = await prisma.order.findFirst({
    where: { storeId: store.id, orderNo: orderNoNum },
    select: { id: true, orderNo: true, totalNpr: true, paymentType: true },
  });

  if (!order) notFound();

  const whatsappUrl = store.whatsappNumber
    ? `https://wa.me/${store.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Order #${order.orderNo} placed on ${store.name}`
      )}`
    : null;

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
        ✓
      </div>

      <h1 className="text-2xl font-bold text-zinc-900">
        {t(locale, "order.confirmed")}
      </h1>

      <p className="mt-2 text-lg text-zinc-700">
        {t(locale, "order.number")}
        <span className="font-bold">{order.orderNo}</span>
      </p>

      <p className="mt-4 text-zinc-500">
        {t(locale, "order.thankYou")}
      </p>

      <p className="mt-2 text-sm text-zinc-500">
        {t(locale, "cart.total")}: NPR {order.totalNpr.toLocaleString("en-IN")} ·{" "}
        {t(locale, PAYMENT_TYPE_I18N_KEY[order.paymentType as PaymentType] ?? "checkout.qr")}
      </p>

      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition"
        >
          {t(locale, "order.whatsapp")}
        </a>
      ) : null}

      <div className="mt-8">
        <Link
          href={`/${slug}`}
          className="text-sm text-zinc-500 hover:text-zinc-700"
        >
          {t(locale, "order.backToShop")}
        </Link>
      </div>
    </div>
  );
}
