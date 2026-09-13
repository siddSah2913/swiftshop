import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PROVINCES } from "@/lib/nepal";
import { getLocale, t } from "@/lib/i18n";
import { OnboardingForm } from "@/components/onboarding-form";

// If the owner already has a store, onboarding is done — send them to design.
export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const store = await prisma.store.findUnique({ where: { ownerId: session.user.id } });
  if (store) redirect("/dashboard");

  const locale = getLocale((await cookies()).get("swiftshop_lang")?.value ?? null);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">{t(locale, "onboarding.title")}</h1>
      <p className="mt-1 text-zinc-600">{t(locale, "onboarding.subtitle")}</p>
      <OnboardingForm
        labels={{
          shopName: t(locale, "onboarding.shopName"),
          shopNameHint: t(locale, "onboarding.shopNameHint"),
          category: t(locale, "onboarding.category"),
          categoryClothing: t(locale, "onboarding.category.clothing"),
          categoryElectronics: t(locale, "onboarding.category.electronics"),
          categoryGeneral: t(locale, "onboarding.category.general"),
          city: t(locale, "onboarding.city"),
          selectProvince: t(locale, "onboarding.selectProvince"),
          selectDistrict: t(locale, "onboarding.selectDistrict"),
          slug: t(locale, "onboarding.slug"),
          slugHint: t(locale, "onboarding.slugHint"),
          slugTaken: t(locale, "onboarding.slugTaken"),
          slugAvailable: t(locale, "onboarding.slugAvailable"),
          createButton: t(locale, "onboarding.createButton"),
          provinceLabels: Object.fromEntries(
            PROVINCES.map((p) => [p.id, t(locale, `onboarding.province.${p.id}` as const)]),
          ),
        }}
      />
    </div>
  );
}