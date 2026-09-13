// Turn a product FormData into typed, validated groups. Pure and unit-tested
// (Node 20+ has global File/FormData). The actions in actions.ts call these,
// then write files + rows server-side.

import type { TranslationKey } from "@/lib/i18n";
import { MAX_PHOTOS_PER_SUBMISSION, validateImageFile } from "@/lib/files";

export type ProductInput = {
  name: string;
  caption: string;
  priceNpr: number;
  photoFiles: File[];
};

export type ParseResult =
  | { ok: true; data: ProductInput }
  | { ok: false; errorKey: TranslationKey };

export type BulkGroup = {
  name: string;
  caption: string;
  priceNpr: number;
  photo: File | null;
};

export type BulkParseResult =
  | { ok: true; groups: BulkGroup[] }
  | { ok: false; errorKey: TranslationKey };

/** One NPR price check shared by both parsers. Integers only, 0..10,000,000. */
function priceError(raw: string): "products.invalidPrice" | null {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 10_000_000) return "products.invalidPrice";
  return null;
}

/**
 * Single-product mode: `photo` (one or more files, `getAll`), `name`,
 * `caption`, `priceNpr`. `requirePhoto: false` is used by updateProduct, where
 * the owner may keep existing photos and add none.
 */
export function parseSingleForm(
  formData: FormData,
  opts: { requirePhoto?: boolean } = {},
): ParseResult {
  const photos = formData.getAll("photo").filter((f): f is File => f instanceof File);
  if (photos.length > MAX_PHOTOS_PER_SUBMISSION) {
    return { ok: false, errorKey: "products.tooManyPhotos" };
  }
  for (const p of photos) {
    const err = validateImageFile(p);
    if (err) return { ok: false, errorKey: err };
  }

  const name = String(formData.get("name") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim();
  if (!name) return { ok: false, errorKey: "products.invalidName" };

  const bad = priceError(String(formData.get("priceNpr") ?? ""));
  if (bad) return { ok: false, errorKey: bad };

  if ((opts.requirePhoto ?? true) && photos.length === 0) {
    return { ok: false, errorKey: "products.invalidImage" };
  }

  return {
    ok: true,
    data: { name, caption, priceNpr: Number(formData.get("priceNpr")), photoFiles: photos },
  };
}

/**
 * Bulk mode: index-prefixed groups `item<i>photo`, `item<i>name`,
 * `item<i>caption`, `item<i>price`, one per product. Iterates 0..N-1 until the
 * first missing index.
 */
export function parseBulkForm(formData: FormData): BulkParseResult {
  const groups: BulkGroup[] = [];
  let i = 0;
  for (;;) {
    const photo = formData.get(`item${i}photo`);
    const name = String(formData.get(`item${i}name`) ?? "").trim();
    if (!(photo instanceof File) && name === "") break; // end of submitted groups

    const caption = String(formData.get(`item${i}caption`) ?? "").trim();
    const bad = photo instanceof File
      ? validateImageFile(photo) ?? (!name ? "products.invalidName" : priceError(String(formData.get(`item${i}price`) ?? "")))
      : "products.invalidImage";
    if (bad) return { ok: false, errorKey: bad };

    groups.push({
      name,
      caption,
      priceNpr: photo instanceof File ? Number(formData.get(`item${i}price`)) : 0,
      photo: photo instanceof File ? photo : null,
    });
    i++;
  }

  if (groups.length === 0) return { ok: false, errorKey: "products.invalidImage" };
  if (groups.length > MAX_PHOTOS_PER_SUBMISSION) {
    return { ok: false, errorKey: "products.tooManyPhotos" };
  }
  return { ok: true, groups };
}