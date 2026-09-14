// Cookie-based cart helpers — pure, unit-tested.
// The cart cookie is a cart INTENT, not a trust boundary. The server re-reads
// every line from the DB scoped to the current store at read time and at order
// time, dropping foreign/disabled products. See Phase 2 spec §4.

export const CART_COOKIE = "swiftshop_cart";

/** productId → qty (1–9). */
export type CartMap = Record<string, number>;

const MAX_QTY = 9;
const MIN_QTY = 1;
const MAX_LINES = 20;
const ID_RE = /^[a-zA-Z0-9-]{1,64}$/;

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
      if (!ID_RE.test(id)) continue;

      const q = Number(qty);
      if (typeof qty !== "number" || !Number.isInteger(q)) continue;
      const clamped = Math.max(MIN_QTY, Math.min(MAX_QTY, q));

      cart[id] = clamped;
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
