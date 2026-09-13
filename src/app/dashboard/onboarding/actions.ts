"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getLocale, t } from "@/lib/i18n";
import { log } from "@/lib/log";
import { onboardingSchema } from "./schema";

export type OnboardingState = { error?: string };

/** Create the caller's store if they don't have one; then send them to design. */
export async function createStore(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const locale = getLocale((await cookies()).get("swiftshop_lang")?.value ?? null);

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const parsed = onboardingSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    province: formData.get("province"),
    district: formData.get("district"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) {
    const [issue] = parsed.error.issues;
    return {
      error:
        issue.path[0] === "slug"
          ? t(locale, "onboarding.slugInvalid")
          : t(locale, "common.error"),
    };
  }

  let alreadyHasStore = false;
  try {
    // An owner may open /dashboard/onboarding twice; second time, just send on.
    const existing = await prisma.store.findUnique({
      where: { ownerId: session.user.id },
    });
    alreadyHasStore = existing !== null;

    if (!alreadyHasStore) {
      const taken = await prisma.store.findUnique({
        where: { slug: parsed.data.slug },
      });
      if (taken) return { error: t(locale, "onboarding.slugTaken") };

      await prisma.store.create({
        data: {
          ownerId: session.user.id,
          name: parsed.data.name,
          category: parsed.data.category,
          city: parsed.data.district, // province grouping lives in the picker, not in Store.city
          template: parsed.data.category, // template defaults to the category for v1
          slug: parsed.data.slug,
        },
      });
    }
  } catch (error) {
    // A slug raced in from a parallel creation (unique conflict) or a DB hiccup.
    log("onboarding:createStore", error);
    return { error: t(locale, "common.error") };
  }

  redirect(alreadyHasStore ? "/dashboard" : "/dashboard/design");
}

/** Live slug availability — callable from the client (debounced). */
export async function checkSlug(slug: string): Promise<{ available: boolean }> {
  const clean = slug.trim().toLowerCase();
  if (!clean) return { available: true };
  const taken = await prisma.store.findUnique({ where: { slug: clean } });
  return { available: !taken };
}