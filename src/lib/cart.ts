// Cookie-based cart helpers — pure, unit-tested.
// The cart cookie is a cart INTENT, not a trust boundary. The server re-reads
// every line from the DB scoped to the current store at read time and at order
// time, dropping foreign/disabled products. See Phase 2 spec §4.

import { LINE_KEY_RE } from "@/lib/variants/line-key";

export const CART_COOKIE = "swiftshop_cart";

/** productId → qty (1–9). */
export type CartMap = Record<string, number>;

const MAX_QTY = 9;
const MIN_QTY = 1;
const MAX_LINES = 20;
/** Valid product id — matches Prisma cuid strings (shared with cart actions). */
export const ID_RE = /^[a-zA-Z0-9-]{1,64}$/;

/**
 * Parse the cart cookie value into a validated CartMap.
 * Invalid ids, out-of-range qty, non-integers, and oversized cookies are
 * silently dropped. Invalid/missing/empty input → empty cart.
 */
export function parseCartCookie(value: string | null): CartMap {
  if (!value) return {};

  try {
    const decoded = decodeURIComponent(value);
    const raw = JSON.parse(decoded);

    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

    const cart: CartMap = {};
    let count = 0;

    for (const [id, qty] of Object.entries(raw)) {
      if (count >= MAX_LINES) break;
      if (!LINE_KEY_RE.test(id)) continue;

      const q = Number(qty);
      if (typeof qty !== "number" || !Number.isInteger(q)) continue;
      // q <= 0 means "remove this line" — drop it, don't clamp it to a real order.
      if (q < MIN_QTY) continue;

      cart[id] = Math.min(MAX_QTY, q);
      count++;
    }

    return cart;
  } catch {
    return {};
  }
}

/** Serialize a CartMap into a cookie-safe URL-encoded JSON string. */
export function serializeCart(cart: CartMap): string {
  return encodeURIComponent(JSON.stringify(cart));
}
