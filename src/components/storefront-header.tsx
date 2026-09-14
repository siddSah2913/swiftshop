// Storefront header — themed with store's primaryColor, shows logo/name/cart badge.
// Server component. See Phase 2 spec §8.

import Link from "next/link";

type Props = {
  storeName: string;
  storeSlug: string;
  logoUrl: string | null;
  primaryColor: string;
  cartCount: number;
  cartLabel: string;
};

export function StorefrontHeader({
  storeName,
  storeSlug,
  logoUrl,
  primaryColor,
  cartCount,
  cartLabel,
}: Props) {
  return (
    <header
      className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur"
      style={{ ["--brand" as string]: primaryColor }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link
          href={`/${storeSlug}`}
          className="flex items-center gap-2 font-semibold text-zinc-900 hover:text-zinc-700"
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="h-8 w-8 rounded-md object-cover"
            />
          ) : (
            <span
              className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold text-white"
              style={{ backgroundColor: "var(--brand)" }}
            >
              {storeName.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="truncate">{storeName}</span>
        </Link>

        <Link
          href={`/${storeSlug}/cart`}
          className="relative flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
        >
          🛒 {cartLabel}
          {cartCount > 0 ? (
            <span
              className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold text-white"
              style={{ backgroundColor: "var(--brand)" }}
            >
              {cartCount}
            </span>
          ) : null}
        </Link>
      </div>
    </header>
  );
}