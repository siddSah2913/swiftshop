// Composite cart line keys. A line is keyed by `productId` (no options) or
// `productId:optId[:optId]` — the chosen option ids joined by `:`. Caution:
// cuids contain no `:`, so the separator is unambiguous. Only ids ride in the
// cookie; labels/prices are resolved from the DB at read/order time.

export const SEGMENT_RE = /^[a-zA-Z0-9-]{1,64}$/;
/** productId with 0–2 `:optionId` suffixes. Plain product ids (legacy carts) match. */
export const LINE_KEY_RE = /^[a-zA-Z0-9-]{1,64}(:[a-zA-Z0-9-]{1,64}){0,2}$/;

export type LineKeyParts = { productId: string; optionIds: string[] };

export function isLineKey(key: string): boolean {
  return LINE_KEY_RE.test(key);
}

/** Split a line key. Malformed input → `{ productId: "", optionIds: [] }`. */
export function parseLineKey(key: string): LineKeyParts {
  const [head, ...rest] = key.split(":");
  if (!SEGMENT_RE.test(head)) return { productId: "", optionIds: [] };
  if (rest.length > 2 || rest.some((s) => !SEGMENT_RE.test(s))) {
    return { productId: "", optionIds: [] };
  }
  return { productId: head, optionIds: rest };
}

/** Build a line key. `optionIds` must be length 0–2. */
export function buildLineKey(productId: string, optionIds: string[]): string {
  if (optionIds.length === 0) return productId;
  return [productId, ...optionIds].join(":");
}