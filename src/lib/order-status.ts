// Order status machine (Phase 4 — full machine).
// Legal flow: new→confirmed→handed→delivered, with cancel reachable from
// `new` and `confirmed`. Once an order is handed to a partner, it can only be
// delivered; delivered and cancelled are terminal. `transitionOrder()` is the
// single enforcement point used by the server actions — anything that isn't
// in the map is rejected with a reason the caller logs.

import type { TranslationKey } from "@/lib/i18n";

/** The five statuses an order can hold (order matters — used for ordering). */
export const ORDER_STATUSES = [
  "new",
  "confirmed",
  "handed",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type PaymentStatus = "unpaid" | "paid";

/** i18n key for each status label (dashboard badges + filters). */
export const STATUS_LABEL_KEYS: Record<OrderStatus, TranslationKey> = {
  new: "orders.new",
  confirmed: "orders.confirmed",
  handed: "orders.handed",
  delivered: "orders.delivered",
  cancelled: "orders.cancelled",
};

export const PAYMENT_LABEL_KEYS: Record<PaymentStatus, TranslationKey> = {
  unpaid: "orders.unpaid",
  paid: "orders.paid",
};

/** Narrow a raw string to an OrderStatus (guards searchParams / filters). */
export function isOrderStatus(v: string): v is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(v);
}

/** The full Phase 4 transition map (single source of truth). */
const ALLOWED: Record<OrderStatus, readonly OrderStatus[]> = {
  new: ["confirmed", "cancelled"],
  confirmed: ["handed", "cancelled"],
  handed: ["delivered"],
  delivered: [],
  cancelled: [],
};

export type OrderTransitionFailure =
  | "from-unknown"
  | "to-unknown"
  | "not-allowed";

export type TransitionResult =
  | { ok: true }
  | { ok: false; reason: OrderTransitionFailure };

/**
 * Enforce a single step of the flow. Returns the reason an order can't move so
 * the caller can log it ("from/to not an OrderStatus", or the jump isn't in
 * ALLOWED). Pure — no side effects; callers decide what to log.
 */
export function transitionOrder(
  from: OrderStatus,
  to: OrderStatus,
): TransitionResult {
  if (!isOrderStatus(from)) return { ok: false, reason: "from-unknown" };
  if (!isOrderStatus(to)) return { ok: false, reason: "to-unknown" };
  if (!ALLOWED[from].includes(to)) return { ok: false, reason: "not-allowed" };
  return { ok: true };
}

/** Is `from → to` a valid move in the machine? (UI buttons derive from this.) */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return transitionOrder(from, to).ok;
}

/**
 * Payment status once an order is marked delivered: COD settles to paid (cash
 * is collected on delivery); other payment types keep their current status —
 * the owner confirms receipt via the "mark paid" action.
 */
export function deliveredPaymentUpdate(
  paymentType: string,
  paymentStatus: PaymentStatus,
): PaymentStatus {
  return paymentType === "cod" ? "paid" : paymentStatus;
}

/** Tailwind pill classes for each status (dashboard badges). */
export const ORDER_STATUS_BADGE: Record<OrderStatus, string> = {
  new: "bg-blue-50 text-blue-700",
  confirmed: "bg-amber-50 text-amber-700",
  handed: "bg-purple-50 text-purple-700",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
};