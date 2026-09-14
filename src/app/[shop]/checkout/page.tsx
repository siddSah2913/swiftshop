// Checkout page — read-only cart summary + checkout form.
// Dynamic render (reads cookies for cart). See Phase 2 spec §3.

import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { parseCartCookie, CART_COOKIE } from "@/lib/cart";
import { computeTotal } from "@/lib/order";
import { getLocale, t } from "@/lib/i18n";
import { CheckoutForm } from "@/components/checkout-form";

type Props = {
  params: Promise<{ shop: string }>;
};

export default async function CheckoutPage({ params }: Props) {
  const { shop } = await params;
  const slug = shop.toLowerCase().trim();
  const locale = getLocale((await cookies()).get("locale")?.value);

  const store = await prisma.store.findUnique({
    where: { slug },
    select: {
      id: true,
      primaryColor: true,
      qrImageUrl: true,
    },
  });

  if (!store) notFound();

  const cookieStore = await cookies();
  const cart = parseCartCookie(cookieStore.get(CART_COOKIE)?.value ?? null);
  const productIds = Object.keys(cart);

  if (productIds.length === 0) {
    return (
      <div className="py-12 text-center">
        <h1 className="text-2xl font-bold text-zinc-900">
          {t(locale, "checkout.title")}
        </h1>
        <p className="mt-4 text-zinc-500">{t(locale, "checkout.cartEmpty")}</p>
        <Link
          href={`/${slug}`}
          className="mt-4 inline-block text-sm font-medium text-teal-700 hover:text-teal-800"
        >
          {t(locale, "store.backToShop")}
        </Link>
      </div>
    );
  }

  const dbProducts = await prisma.product.findMany({
    where: { id: { in: productIds }, storeId: store.id, available: true },
  });

  const lines = dbProducts
    .map((p) => ({
      product: p,
      qty: cart[p.id] ?? 1,
    }))
    .sort((a, b) => a.product.name.localeCompare(b.product.name));

  if (lines.length === 0) {
    return (
      <div className="py-12 text-center">
        <h1 className="text-2xl font-bold text-zinc-900">
          {t(locale, "checkout.title")}
        </h1>
        <p className="mt-4 text-zinc-500">{t(locale, "checkout.cartEmpty")}</p>
        <Link
          href={`/${slug}`}
          className="mt-4 inline-block text-sm font-medium text-teal-700 hover:text-teal-800"
        >
          {t(locale, "store.backToShop")}
        </Link>
      </div>
    );
  }

  const total = computeTotal(
    lines.map((l) => ({ priceNpr: l.product.priceNpr, qty: l.qty }))
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900">
        {t(locale, "checkout.title")}
      </h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        {/* Order summary */}
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">
            {t(locale, "checkout.orderSummary")}
          </h2>
          <ul className="mt-3 divide-y divide-zinc-200">
            {lines.map(({ product, qty }) => (
              <li key={product.id} className="flex items-center gap-3 py-3">
                {product.imageUrls[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.imageUrls[0]}
                    alt=""
                    className="h-12 w-12 rounded-md object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-md bg-zinc-100" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900">
                    {product.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {qty} × {t(locale, "product.priceNpr")}{" "}
                    {product.priceNpr.toLocaleString("en-IN")}
                  </p>
                </div>
                <p className="text-sm font-medium text-zinc-900">
                  {t(locale, "product.priceNpr")}{" "}
                  {(product.priceNpr * qty).toLocaleString("en-IN")}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-zinc-200 pt-4 text-right">
            <p className="text-lg font-semibold text-zinc-900">
              {t(locale, "cart.total")}: {t(locale, "product.priceNpr")}{" "}
              {total.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        {/* Checkout form */}
        <CheckoutForm
          slug={slug}
          primaryColor={store.primaryColor}
          hasQr={!!store.qrImageUrl}
          labels={{
            name: t(locale, "checkout.name"),
            phone: t(locale, "checkout.phone"),
            phoneHint: t(locale, "checkout.phoneHint"),
            address: t(locale, "checkout.address"),
            addressHint: t(locale, "checkout.addressHint"),
            payment: t(locale, "checkout.payment"),
            cod: t(locale, "checkout.cod"),
            qr: t(locale, "checkout.qr"),
            qrHint: t(locale, "checkout.qrHint"),
            placeOrder: t(locale, "checkout.placeOrder"),
          }}
        />
      </div>
    </div>
  );
}