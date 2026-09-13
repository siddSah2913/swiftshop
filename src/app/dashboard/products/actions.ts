"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { requireStore } from "@/lib/require-store";
import { getLocale, t } from "@/lib/i18n";
import { log } from "@/lib/log";
import { writeUpload } from "@/lib/files";
import { parseBulkForm, parseSingleForm } from "./parse-payload";

export type ProductsFormState = { error?: string };

async function locale() {
  return getLocale((await cookies()).get("swiftshop_lang")?.value ?? null);
}

/** Create one product (with a photo gallery). */
export async function createProduct(
  _prev: ProductsFormState,
  formData: FormData,
): Promise<ProductsFormState> {
  const loc = await locale();
  const parsed = parseSingleForm(formData);
  if (!parsed.ok) return { error: t(loc, parsed.errorKey) };

  // requireStore() redirects by throwing (no session / no store) — keep it
  // OUTSIDE the try so the redirect is never swallowed.
  const { store } = await requireStore();

  try {
    const imageUrls = await Promise.all(
      parsed.data.photoFiles.map((f) => writeUpload(f, store.id)),
    );
    await prisma.product.create({
      data: {
        storeId: store.id,
        name: parsed.data.name,
        caption: parsed.data.caption,
        priceNpr: parsed.data.priceNpr,
        imageUrls,
      },
    });
  } catch (error) {
    log("products:createProduct", error);
    return { error: t(loc, "common.error") };
  }

  redirect("/dashboard/products");
}

/** Create many products at once (bulk: one photo = one product). */
export async function createProducts(
  _prev: ProductsFormState,
  formData: FormData,
): Promise<ProductsFormState> {
  const loc = await locale();
  const parsed = parseBulkForm(formData);
  if (!parsed.ok) return { error: t(loc, parsed.errorKey) };

  // requireStore() redirects by throwing (no session / no store) — keep it
  // OUTSIDE the try so the redirect is never swallowed.
  const { store } = await requireStore();

  try {
    const rows: import("@/generated/prisma/client").Prisma.ProductCreateManyInput[] = [];
    for (const g of parsed.groups) {
      const imageUrls = g.photo ? [await writeUpload(g.photo, store.id)] : [];
      rows.push({
        storeId: store.id,
        name: g.name,
        caption: g.caption,
        priceNpr: g.priceNpr,
        imageUrls,
      });
    }
    if (rows.length) await prisma.product.createMany({ data: rows });
  } catch (error) {
    log("products:createProducts", error);
    return { error: t(loc, "common.error") };
  }

  redirect("/dashboard/products");
}

/** Update caption/price/photos of a product the caller OWNS. */
export async function updateProduct(
  _prev: ProductsFormState,
  formData: FormData,
  id: string,
): Promise<ProductsFormState> {
  const loc = await locale();
  const parsed = parseSingleForm(formData, { requirePhoto: false });
  if (!parsed.ok) return { error: t(loc, parsed.errorKey) };

  // requireStore() redirects by throwing (no session / no store) — keep it
  // OUTSIDE the try so the redirect is never swallowed.
  const { store } = await requireStore();

  try {
    const existing = await prisma.product.findFirst({
      where: { id, storeId: store.id },
    });
    if (!existing) return { error: t(loc, "common.error") };

    const added = await Promise.all(
      parsed.data.photoFiles.map((f) => writeUpload(f, store.id)),
    );
    const removed = String(formData.get("removePhotos") ?? "")
      .split(",")
      .filter(Boolean);

    await prisma.product.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.name,
        caption: parsed.data.caption,
        priceNpr: parsed.data.priceNpr,
        imageUrls: {
          set: [...existing.imageUrls.filter((u) => !removed.includes(u)), ...added],
        },
      },
    });
  } catch (error) {
    log("products:updateProduct", error);
    return { error: t(loc, "common.error") };
  }

  redirect("/dashboard/products");
}

/** Delete a product the caller OWNS, removing its photo files best-effort. */
export async function deleteProduct(
  _prev: ProductsFormState,
  formData: FormData,
  id: string,
): Promise<ProductsFormState> {
  const loc = await locale();

  // requireStore() redirects by throwing (no session / no store) — keep it
  // OUTSIDE the try so the redirect is never swallowed.
  const { store } = await requireStore();

  try {
    const existing = await prisma.product.findFirst({
      where: { id, storeId: store.id },
    });
    if (!existing) return { error: t(loc, "common.error") };

    await prisma.product.delete({ where: { id: existing.id } });
    for (const u of existing.imageUrls) {
      const filePath = path.join(process.cwd(), "public", ...u.split("/").filter(Boolean));
      await unlink(filePath).catch(() => {}); // best-effort cleanup
    }
  } catch (error) {
    log("products:deleteProduct", error);
    return { error: t(loc, "common.error") };
  }

  redirect("/dashboard/products");
}