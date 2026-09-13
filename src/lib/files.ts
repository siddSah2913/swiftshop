// Photo upload shared helpers. Next 16 server-action bodies cap at 1MB by
// default (see next.config.ts bodySizeLimit raise) — per-file and per-batch
// caps live here so callers (product/design actions) stay small.

import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_PHOTOS_PER_SUBMISSION = 6;

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Extension for an accepted image mime type, else null. */
export function imageExt(mime: string): string | null {
  return EXT_BY_MIME[mime] ?? null;
}

/** Returns an i18n key describing the first problem, or null when the file is OK. */
export function validateImageFile(
  file: File,
): "products.invalidImage" | "products.imageTooBig" | null {
  if (!imageExt(file.type)) return "products.invalidImage";
  if (file.size === 0) return "products.invalidImage";
  if (file.size > MAX_FILE_BYTES) return "products.imageTooBig";
  return null;
}

/** Public URL for a stored upload (served from Next's public/ folder). */
export function uploadUrl(storeId: string, filename: string): string {
  return `/uploads-original/${storeId}/${filename}`;
}

/**
 * Write one uploaded file under public/uploads-original/<storeId>/, returning
 * its public URL. Filenames are randomUUID + extension — never the client's own
 * name — so they are unique and untrusted-externally.
 */
export async function writeUpload(
  file: File,
  storeId: string,
  prefix = "",
): Promise<string> {
  const ext = imageExt(file.type); // validated upstream; throw here on misuse
  if (!ext) throw new Error(`unexpected mime for upload: ${file.type}`);
  const dir = path.join(process.cwd(), "public", "uploads-original", storeId);
  const filename = `${prefix}${randomUUID()}.${ext}`;
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
  return uploadUrl(storeId, filename);
}