"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireStore } from "@/lib/require-store";
import { getLocale, t } from "@/lib/i18n";
import { log } from "@/lib/log";
import { validateImageFile, writeUpload } from "@/lib/files";

export type DesignState = { error?: string };

const designSchema = z.object({
  template: z.enum(["clothing", "electronics", "general"]),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "design.invalidColor"),
});

/** Save template + brand color + (optional) logo; then go set up products. */
export async function updateDesign(
  _prev: DesignState,
  formData: FormData,
): Promise<DesignState> {
  const locale = getLocale((await cookies()).get("swiftshop_lang")?.value ?? null);

  const parsed = designSchema.safeParse({
    template: formData.get("template"),
    primaryColor: formData.get("primaryColor"),
  });
  if (!parsed.success) return { error: t(locale, "design.invalidColor") };

  // requireStore() redirects (throws) when unauthenticated or store-less.
  // It must stay OUTSIDE the try/catch so its NEXT_REDIRECT is never swallowed.
  const { store } = await requireStore();

  try {
    let logoUrl = store.logoUrl;
    const logo = formData.get("logo");
    if (logo instanceof File && logo.size > 0) {
      const err = validateImageFile(logo);
      if (err) return { error: t(locale, err) };
      // Replace the old logo file on disk (best-effort — a missing file is fine).
      if (store.logoUrl) {
        const old = path.join(process.cwd(), "public", ...store.logoUrl.split("/").filter(Boolean));
        await unlink(old).catch(() => {});
      }
      logoUrl = await writeUpload(logo, store.id, "logo-");
    }

    await prisma.store.update({
      where: { id: store.id },
      data: {
        template: parsed.data.template,
        primaryColor: parsed.data.primaryColor,
        ...(logoUrl !== store.logoUrl ? { logoUrl } : {}),
      },
    });
  } catch (error) {
    // A DB hiccup or upload failure. requireStore's redirect is NOT here.
    log("design:updateDesign", error);
    return { error: t(locale, "common.error") };
  }

  redirect("/dashboard/products");
}