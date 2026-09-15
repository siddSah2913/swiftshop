// Photo upload shared helpers. Next 16 server-action bodies cap at 1MB by
// default (see next.config.ts bodySizeLimit raise) — per-file and per-batch
// caps live here so callers (product/design actions) stay small.

// MAX_FILE_BYTES / MAX_PHOTOS_PER_SUBMISSION live in upload-limits.ts so
// client components can import them without pulling node: builtins into the
// browser bundle; import locally (used by validateImageFile below) and
// re-export so existing `@/lib/files` imports keep working.
import { MAX_FILE_BYTES, MAX_PHOTOS_PER_SUBMISSION } from "./upload-limits";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

export { MAX_FILE_BYTES, MAX_PHOTOS_PER_SUBMISSION };

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/**
 * Extension for an accepted image mime type, else null.
 * Falls back to the filename extension when the MIME type is non-canonical
 * (e.g. `image/x-png` on some Windows configs) — the browser's `accept`
 * attribute already constrains the picker, so extension-based detection is
 * a safe secondary check.
 */
export function imageExt(mime: string, filename?: string): string | null {
  const fromMime = EXT_BY_MIME[mime];
  if (fromMime) return fromMime;
  if (filename) {
    const ext = filename.split(".").pop()?.toLowerCase();
    if (ext) {
      const canonical = EXT_BY_MIME[MIME_BY_EXT[ext]];
      if (canonical) return canonical;
    }
  }
  return null;
}

/** Canonical MIME type for a known image extension, else null. */
export function extToMime(ext: string): string | null {
  return MIME_BY_EXT[ext.toLowerCase()] ?? null;
}

/** Returns an i18n key describing the first problem, or null when the file is OK. */
export function validateImageFile(
  file: File,
): "products.invalidImage" | "products.imageTooBig" | null {
  if (!imageExt(file.type, file.name)) return "products.invalidImage";
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
  const ext = imageExt(file.type, file.name); // validated upstream; throw here on misuse
  if (!ext) throw new Error(`unexpected mime for upload: ${file.type}`);
  const dir = path.join(process.cwd(), "public", "uploads-original", storeId);
  const filename = `${prefix}${randomUUID()}.${ext}`;
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
  return uploadUrl(storeId, filename);
}