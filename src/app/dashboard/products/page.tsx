import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { requireStore } from "@/lib/require-store";
import { getLocale, t } from "@/lib/i18n";
import { ProductList } from "@/components/product-list";

export default async function ProductsPage() {
  const { store } = await requireStore();
  const locale = getLocale((await cookies()).get("swiftshop_lang")?.value ?? null);

  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">{t(locale, "products.title")}</h1>
        <a
          href="/dashboard/products/new"
          className="rounded-md bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800"
        >
          {t(locale, "products.add")}
        </a>
      </div>

      {products.length === 0 ? (
        <p className="mt-8 text-zinc-500">{t(locale, "products.empty")}</p>
      ) : (
        <ProductList
          products={products}
          labels={{
            priceNpr: t(locale, "products.priceNpr"),
            edit: t(locale, "products.edit"),
            delete: t(locale, "products.delete"),
            deleteConfirm: t(locale, "products.deleteConfirm"),
          }}
        />
      )}
    </div>
  );
}