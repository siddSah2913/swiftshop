// Public storefront layout — resolves store by slug, provides themed shell.
// No auth required. Every query scoped by store.id. See Phase 2 spec §3.

import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { parseCartCookie, CART_COOKIE } from "@/lib/cart";
import { getLocale, t } from "@/lib/i18n";
import { StorefrontHeader } from "@/components/storefront-header";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ shop: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shop } = await params;
  const store = await prisma.store.findUnique({
    where: { slug: shop.toLowerCase().trim() },
    select: { name: true },
  });
  return { title: store ? `${store.name} | SwiftShop` : "Shop not found" };
}

export default async function StorefrontLayout({ params, children }: Props) {
  const { shop } = await params;
  const slug = shop.toLowerCase().trim();

  const store = await prisma.store.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      primaryColor: true,
      logoUrl: true,
    },
  });

  if (!store) notFound();

  const locale = getLocale((await cookies()).get("swiftshop_lang")?.value);

  // Read cart cookie for badge count
  const cookieStore = await cookies();
  const cartValue = cookieStore.get(CART_COOKIE)?.value ?? null;
  const cart = parseCartCookie(cartValue);
  const cartCount = Object.values(cart).reduce((sum, q) => sum + q, 0);

  return (
    <div className="min-h-screen bg-zinc-50">
      <StorefrontHeader
        storeName={store.name}
        storeSlug={store.slug}
        logoUrl={store.logoUrl}
        primaryColor={store.primaryColor}
        cartCount={cartCount}
        cartLabel={t(locale, "cart.nav")}
      />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}