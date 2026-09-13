import { cookies } from "next/headers";
import { requireStore } from "@/lib/require-store";
import { getLocale, t } from "@/lib/i18n";
import { DesignForm } from "@/components/design-form";

export default async function DesignPage() {
  const { store } = await requireStore();
  const locale = getLocale((await cookies()).get("swiftshop_lang")?.value ?? null);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">{t(locale, "design.title")}</h1>
      <DesignForm
        labels={{
          template: t(locale, "design.template"),
          templateOptions: {
            clothing: t(locale, "design.template.clothing"),
            electronics: t(locale, "design.template.electronics"),
            general: t(locale, "design.template.general"),
          },
          colorLabel: t(locale, "design.colorLabel"),
          logo: t(locale, "design.logo"),
          logoHint: t(locale, "design.logoHint"),
          save: t(locale, "design.save"),
        }}
        initial={{
          template: store.template,
          primaryColor: store.primaryColor,
          logoUrl: store.logoUrl,
        }}
      />
    </div>
  );
}