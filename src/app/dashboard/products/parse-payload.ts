// Turn a product FormData into typed, validated groups. Pure and unit-tested
// (Node 20+ has global File/FormData). The actions in actions.ts call these,
// then write files + rows server-side.

import type { TranslationKey } from "@/lib/i18n";
import { MAX_PHOTOS_PER_SUBMISSION, validateImageFile } from "@/lib/files";
import {
  MAX_OPTION_GROUPS,
  MAX_OPTIONS_PER_GROUP,
  MAX_GROUP_NAME_LEN,
  MAX_OPTION_NAME_LEN,
  MAX_OPTION_STOCK,
  type OptionSetInput,
} from "@/lib/variants/types";

export type ProductInput = {
  name: string;
  caption: string;
  priceNpr: number;
  photoFiles: File[];
  optionSets: OptionSetInput[];
};

export type OptionSetParseResult =
  | { ok: true; optionSets: OptionSetInput[] }
  | { ok: false; errorKey: TranslationKey };

/**
 * Parse the admin form's hidden `optionsJson` field into validated option
 * sets. Empty/absent → []. Caps from @/lib/variants/types. Pure + unit-tested.
 */
export function parseOptionSets(raw: string): OptionSetParseResult {
  if (!raw || raw === "[]") return { ok: true, optionSets: [] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, errorKey: "products.optionsInvalid" };
  }
  if (!Array.isArray(parsed) || parsed.length > MAX_OPTION_GROUPS) {
    return { ok: false, errorKey: "products.optionsInvalid" };
  }

  const optionSets: OptionSetInput[] = [];
  for (const g of parsed) {
    if (typeof g !== "object" || g === null) {
      return { ok: false, errorKey: "products.optionsInvalid" };
    }
    const group = g as Record<string, unknown>;
    const name = typeof group.name === "string" ? group.name.trim() : "";
    const rawOptions = Array.isArray(group.options) ? group.options : null;

    if (!name || name.length > MAX_GROUP_NAME_LEN) {
      return { ok: false, errorKey: "products.optionsInvalid" };
    }
    if (!rawOptions || rawOptions.length === 0 || rawOptions.length > MAX_OPTIONS_PER_GROUP) {
      return { ok: false, errorKey: "products.optionsInvalid" };
    }

    const options: { name: string; stock: number }[] = [];
    const seen = new Set<string>();
    for (const o of rawOptions) {
      if (typeof o !== "object" || o === null) {
        return { ok: false, errorKey: "products.optionsInvalid" };
      }
      const opt = o as Record<string, unknown>;
      const oname = typeof opt.name === "string" ? opt.name.trim() : "";
      const stock = Number(opt.stock);
      if (!oname || oname.length > MAX_OPTION_NAME_LEN || seen.has(oname)) {
        return { ok: false, errorKey: "products.optionsInvalid" };
      }
      if (!Number.isInteger(stock) || stock < 0 || stock > MAX_OPTION_STOCK) {
        return { ok: false, errorKey: "products.optionsInvalid" };
      }
      seen.add(oname);
      options.push({ name: oname, stock });
    }
    optionSets.push({ name, options });
  }
  return { ok: true, optionSets };
}

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

  const optErr = parseOptionSets(String(formData.get("optionsJson") ?? ""));
  if (!optErr.ok) return { ok: false, errorKey: optErr.errorKey };

  if ((opts.requirePhoto ?? true) && photos.length === 0) {
    return { ok: false, errorKey: "products.invalidImage" };
  }

  return {
    ok: true,
    data: {
      name,
      caption,
      priceNpr: Number(formData.get("priceNpr")),
      photoFiles: photos,
      optionSets: optErr.optionSets,
    },
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