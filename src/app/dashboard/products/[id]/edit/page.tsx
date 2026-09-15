import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStore } from "@/lib/require-store";
import { getLocale, t } from "@/lib/i18n";
import { ProductForm } from "@/components/product-form";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { store } = await requireStore();
  const { id } = await params; // Next 16: params is a Promise
  const locale = getLocale((await cookies()).get("swiftshop_lang")?.value ?? null);

  const product = await prisma.product.findFirst({
    where: { id, storeId: store.id },
    include: {
      optionGroups: {
        orderBy: { sortOrder: "asc" },
        include: { options: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
  if (!product) notFound();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">{product.name}</h1>
      <ProductForm
        mode="single"
        productId={product.id}
        product={{
          name: product.name,
          caption: product.caption,
          priceNpr: product.priceNpr,
          imageUrls: product.imageUrls,
          optionSets: product.optionGroups.map((g) => ({
            name: g.name,
            options: g.options.map((o) => ({ name: o.name, stock: o.stock })),
          })),
        }}
        labels={{
          name: t(locale, "products.name"),
          caption: t(locale, "products.caption"),
          priceNpr: t(locale, "products.priceNpr"),
          photo: t(locale, "products.photo"),
          addPhoto: t(locale, "products.addPhoto"),
          remove: t(locale, "products.remove"),
          save: t(locale, "products.save"),
          saveAll: t(locale, "products.saveAll"),
          bulkMode: t(locale, "products.bulkMode"),
          singleMode: t(locale, "products.singleMode"),
          bulkHint: t(locale, "products.bulkHint"),
          options: t(locale, "products.optionSets"),
          optionsHint: t(locale, "products.optionsHint"),
          optionGroupName: t(locale, "products.optionGroupName"),
          optionName: t(locale, "products.optionName"),
          optionStock: t(locale, "products.optionStock"),
          addOptionGroup: t(locale, "products.addOptionGroup"),
          addOption: t(locale, "products.addOption"),
        }}
      />
    </div>
  );
}