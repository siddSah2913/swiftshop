// Product card for the storefront grid — server presentational component.
// Shows main image (or placeholder), name, NPR price. See Phase 2 spec §10.

import Link from "next/link";
import type { ProductModel } from "@/generated/prisma/models";
import { AddToCartButton } from "@/components/add-to-cart";

type Props = {
  product: ProductModel;
  storeSlug: string;
  primaryColor: string;
  priceLabel: string;
  addToCartLabel: string;
  addedLabel: string;
  hasOptions: boolean;
  chooseOptionsLabel: string;
};

export function ProductCard({
  product,
  storeSlug,
  primaryColor,
  priceLabel,
  addToCartLabel,
  addedLabel,
  hasOptions,
  chooseOptionsLabel,
}: Props) {
  const main = product.imageUrls[0];

  return (
    <div className="group overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <Link href={`/${storeSlug}/product/${product.id}`} className="block">
        {main ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={main}
            alt={product.name}
            className="aspect-square w-full object-cover transition group-hover:opacity-90"
          />
        ) : (
          <div className="aspect-square w-full bg-zinc-100" />
        )}
      </Link>
      <div className="p-3">
        <Link
          href={`/${storeSlug}/product/${product.id}`}
          className="block truncate font-medium text-zinc-900 hover:text-zinc-700"
        >
          {product.name}
        </Link>
        <p className="mt-1 text-sm text-zinc-500">
          {priceLabel} {product.priceNpr.toLocaleString("en-IN")}
        </p>
        {hasOptions ? (
          <Link
            href={`/${storeSlug}/product/${product.id}`}
            className="mt-2 block w-full rounded-md px-3 py-2 text-center text-sm font-medium text-white transition"
            style={{ backgroundColor: primaryColor }}
          >
            {chooseOptionsLabel}
          </Link>
        ) : (
          <AddToCartButton
            productId={product.id}
            label={addToCartLabel}
            addedLabel={addedLabel}
            primaryColor={primaryColor}
          />
        )}
      </div>
    </div>
  );
}