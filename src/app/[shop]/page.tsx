// Public storefront — product grid for the store resolved by slug.
// Dynamic render (reads cookies for the cart + locale). See Phase 2 spec §3.

import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getLocale, t } from "@/lib/i18n";
import { ProductCard } from "@/components/product-card";

type Props = {
  params: Promise<{ shop: string }>;
};

export default async function StorePage({ params }: Props) {
  const { shop } = await params;
  const slug = shop.toLowerCase().trim();
  const locale = getLocale((await cookies()).get("swiftshop_lang")?.value);

  const store = await prisma.store.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      primaryColor: true,
    },
  });

  if (!store) notFound();

  const products = await prisma.product.findMany({
    where: { storeId: store.id, available: true },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { optionGroups: true } } },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">{store.name}</h1>

      {products.length === 0 ? (
        <p className="text-zinc-500">No products yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              storeSlug={slug}
              primaryColor={store.primaryColor}
              priceLabel={t(locale, "product.priceNpr")}
              addToCartLabel={t(locale, "product.addToCart")}
              addedLabel={t(locale, "product.added")}
              hasOptions={p._count.optionGroups > 0}
              chooseOptionsLabel={t(locale, "product.chooseOptions")}
            />
          ))}
        </div>
      )}
    </div>
  );
}