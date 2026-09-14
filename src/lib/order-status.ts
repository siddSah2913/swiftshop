// Order status machine (Phase 3 v1).
// v1 simplification: new→confirmed→delivered, and handed→delivered for orders
// that arrived in a handed state. The full machine (reaching `handed` and
// `cancelled` from real transitions) ships in Phase 4.

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

/** v1 allowed transitions. See the file header for the Phase 4 plan. */
const PHASE3_ALLOWED: Record<OrderStatus, readonly OrderStatus[]> = {
  new: ["confirmed"],
  confirmed: ["delivered"],
  handed: ["delivered"],
  delivered: [],
  cancelled: [],
};

/** Is `from → to` a valid move in the current machine? */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return PHASE3_ALLOWED[from].includes(to);
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