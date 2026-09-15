import { cookies } from "next/headers";
import { getLocale, t } from "@/lib/i18n";
import { ProductForm } from "@/components/product-form";

export default async function NewProductPage() {
  const locale = getLocale((await cookies()).get("swiftshop_lang")?.value ?? null);
  const labels = {
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
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">{t(locale, "products.add")}</h1>
      <ProductForm mode="single" labels={labels} />
    </div>
  );
}