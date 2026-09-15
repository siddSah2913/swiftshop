// Cart page — reads cookie server-side, joins against DB for
// name/price/availability, renders lines. See Phase 2 spec §3.

import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { parseCartCookie, CART_COOKIE } from "@/lib/cart";
import { computeTotal } from "@/lib/order";
import { parseLineKey } from "@/lib/variants/line-key";
import { formatVariantName } from "@/lib/variants/label";
import { validateSelection } from "@/lib/variants/validate";
import { getLocale, t } from "@/lib/i18n";
import { CartLines } from "@/components/cart-lines";

type Props = {
  params: Promise<{ shop: string }>;
};

export default async function CartPage({ params }: Props) {
  const { shop } = await params;
  const slug = shop.toLowerCase().trim();
  const locale = getLocale((await cookies()).get("swiftshop_lang")?.value);

  const store = await prisma.store.findUnique({
    where: { slug },
    select: { id: true, primaryColor: true },
  });

  if (!store) notFound();

  const cookieStore = await cookies();
  const cart = parseCartCookie(cookieStore.get(CART_COOKIE)?.value ?? null);
  const keys = Object.keys(cart)
    .map((key) => ({ key, ...parseLineKey(key) }))
    .filter((k) => k.productId);

  if (keys.length === 0) {
    return (
      <div className="py-12 text-center">
        <h1 className="text-2xl font-bold text-zinc-900">
          {t(locale, "cart.title")}
        </h1>
        <p className="mt-4 text-zinc-500">{t(locale, "cart.empty")}</p>
        <Link
          href={`/${slug}`}
          className="mt-4 inline-block text-sm font-medium text-teal-700 hover:text-teal-800"
        >
          {t(locale, "cart.continueShopping")}
        </Link>
      </div>
    );
  }

  // Re-read products from DB scoped to this store — drop foreign/disabled
  // products AND lines whose chosen option is missing/sold-out/malformed.
  const productIds = [...new Set(keys.map((k) => k.productId))];
  const dbProducts = await prisma.product.findMany({
    where: { id: { in: productIds }, storeId: store.id, available: true },
    include: {
      optionGroups: {
        orderBy: { sortOrder: "asc" },
        include: { options: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
  const byId = new Map(dbProducts.map((p) => [p.id, p]));

  const lines = keys
    .map(({ key, productId, optionIds }) => {
      const product = byId.get(productId);
      if (!product) return null;
      const qty = cart[key] ?? 1;
      const sel = validateSelection(product.optionGroups, optionIds);
      if (!sel.ok) return null;
      return {
        lineKey: key,
        lineName: formatVariantName(product.name, sel.optionNames),
        priceNpr: product.priceNpr,
        imageUrl: product.imageUrls[0],
        qty,
      };
    })
    .filter((line): line is NonNullable<typeof line> => line !== null)
    .sort((a, b) => a.lineName.localeCompare(b.lineName));

  if (lines.length === 0) {
    return (
      <div className="py-12 text-center">
        <h1 className="text-2xl font-bold text-zinc-900">
          {t(locale, "cart.title")}
        </h1>
        <p className="mt-4 text-zinc-500">{t(locale, "cart.empty")}</p>
        <Link
          href={`/${slug}`}
          className="mt-4 inline-block text-sm font-medium text-teal-700 hover:text-teal-800"
        >
          {t(locale, "cart.continueShopping")}
        </Link>
      </div>
    );
  }

  const total = computeTotal(
    lines.map((l) => ({ priceNpr: l.priceNpr, qty: l.qty })),
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900">
        {t(locale, "cart.title")}
      </h1>

      <CartLines
        lines={lines}
        storeSlug={slug}
        total={total}
        totalLabel={t(locale, "cart.total")}
        checkoutLabel={t(locale, "cart.checkout")}
        removeLabel={t(locale, "cart.removeItem")}
        qtyLabel={t(locale, "cart.qtyLabel")}
        continueLabel={t(locale, "cart.continueShopping")}
        primaryColor={store.primaryColor}
      />
    </div>
  );
}