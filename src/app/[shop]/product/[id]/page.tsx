// Product detail page — gallery (first = main), caption, price NPR, add to cart.
// Product must belong to the store loaded by slug. See Phase 2 spec §3.

import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getLocale, t } from "@/lib/i18n";
import { AddToCartButton } from "@/components/add-to-cart";
import { ProductShare, type ShareLabels } from "@/components/product-share";

type Props = {
  params: Promise<{ shop: string; id: string }>;
};

export default async function ProductDetailPage({ params }: Props) {
  const { shop, id } = await params;
  const slug = shop.toLowerCase().trim();
  const locale = getLocale((await cookies()).get("swiftshop_lang")?.value);

  const store = await prisma.store.findUnique({
    where: { slug },
    select: { id: true, primaryColor: true },
  });

  if (!store) notFound();

  const product = await prisma.product.findFirst({
    where: { id, storeId: store.id },
  });

  if (!product) notFound();

  const [main, ...gallery] = product.imageUrls;

  return (
    <div>
      <Link
        href={`/${slug}`}
        className="mb-4 inline-block text-sm text-zinc-500 hover:text-zinc-700"
      >
        {t(locale, "product.backToShop")}
      </Link>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          {main ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={main}
              alt={product.name}
              className="aspect-square w-full rounded-lg object-cover"
            />
          ) : (
            <div className="aspect-square w-full rounded-lg bg-zinc-100" />
          )}

          {gallery.length > 0 ? (
            <div className="mt-3 flex gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={main}
                alt={product.name}
                className="h-16 w-16 rounded-md object-cover ring-2 ring-offset-1"
                style={{ ["--tw-ring-color" as string]: store.primaryColor }}
              />
              {gallery.map((url) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={url}
                  src={url}
                  alt=""
                  className="h-16 w-16 rounded-md object-cover opacity-70 transition hover:opacity-100"
                />
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{product.name}</h1>
          {product.caption ? (
            <p className="mt-2 text-zinc-600">{product.caption}</p>
          ) : null}
          <p className="mt-4 text-xl font-semibold text-zinc-900">
            {t(locale, "product.priceNpr")}{" "}
            {product.priceNpr.toLocaleString("en-IN")}
          </p>

          <ProductShare
            slug={slug}
            productId={product.id}
            productName={product.name}
            labels={
              {
                button: t(locale, "share.button"),
                title: t(locale, "share.title"),
                copyLink: t(locale, "share.copyLink"),
                copied: t(locale, "share.copied"),
                pasteIn: t(locale, "share.pasteIn"),
                whatsapp: t(locale, "share.whatsapp"),
                facebook: t(locale, "share.facebook"),
                messenger: t(locale, "share.messenger"),
                viber: t(locale, "share.viber"),
                instagram: t(locale, "share.instagram"),
                tiktok: t(locale, "share.tiktok"),
              } satisfies ShareLabels
            }
          />

          {product.available ? (
            <AddToCartButton
              productId={product.id}
              label={t(locale, "product.addToCart")}
              addedLabel={t(locale, "product.added")}
              primaryColor={store.primaryColor}
            />
          ) : (
            <p className="mt-4 text-sm font-medium text-red-600">
              {t(locale, "product.outOfStock")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}