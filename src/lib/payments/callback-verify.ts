import { prisma } from "@/lib/db";
import { log } from "@/lib/log";
import type { PaymentGatewayId } from "./types";
import { getPaymentAdapter } from "./index";

type OrderRow = {
  id: string;
  orderNo: number;
  totalNpr: number;
  paymentStatus: string;
  storeId: string;
};

/**
 * Verify a payment and CAS-update the order from unpaid → paid.
 * Idempotent: if the order is already paid, the compound-where CAS
 * returns P2025 (no rows matched) → safe no-op.
 *
 * `lookupKey` is either:
 *  - `{ orderId: "..." }` — eSewa callback has oid which we map to orderId
 *  - `{ pidx: "..." }` — Khalti callback sends pidx; the T6 checkout action
 *    pre-saved it to Order.paymentRef at payment-initiation time, so a first
 *    callback finds the order by that pre-saved value.
 *
 * Returns orderNo + storeSlug for redirect, or null on failure.
 */
export async function verifyAndMarkPaid(params: {
  lookupBy: { orderId: string } | { pidx: string };
  pidx: string;       // the gateway's transaction reference (stored in Order.paymentRef)
  gatewayId: PaymentGatewayId;
}): Promise<{ orderNo: number; storeSlug: string } | null> {
  const { lookupBy, pidx, gatewayId } = params;

  // 1. Find the order
  let order: OrderRow | null = null;

  if ("orderId" in lookupBy) {
    order = await prisma.order.findFirst({
      where: { id: lookupBy.orderId },
      select: { id: true, orderNo: true, totalNpr: true, paymentStatus: true, storeId: true },
    });
  } else {
    // Lookup by pidx — pre-saved to paymentRef by T6 right after initiating the payment
    order = await prisma.order.findFirst({
      where: { paymentRef: lookupBy.pidx },
      select: { id: true, orderNo: true, totalNpr: true, paymentStatus: true, storeId: true },
    });
  }

  if (!order) {
    log("payments:callback:order-not-found", { lookupBy, gatewayId });
    return null;
  }

  // Already paid — idempotent no-op
  if (order.paymentStatus === "paid") {
    const store = await prisma.store.findUnique({
      where: { id: order.storeId },
      select: { slug: true },
    });
    return { orderNo: order.orderNo, storeSlug: store?.slug ?? "" };
  }

  const adapter = await getPaymentAdapter(gatewayId);
  if (!adapter) {
    log("payments:callback:no-adapter", { gatewayId });
    return null;
  }

  const result = await adapter.verifyPayment({ pidx, amountNpr: order.totalNpr });
  if (!result.ok) {
    log("payments:callback:verify-failed", { orderId: order.id, reason: result.reason });
    return null;
  }

  // Structural check (mirrors `isUniqueViolation` in checkout/actions.ts) so it
  // survives adapter-wrapped errors where `instanceof` across copies can fail.
  function casNoMatch(e: unknown): boolean {
    return (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code?: unknown }).code === "P2025"
    );
  }

  // CAS: only update when currently unpaid
  try {
    await prisma.order.update({
      where: { id: order.id, paymentStatus: "unpaid" },
      data: {
        paymentStatus: "paid",
        paymentRef: pidx,
        paidAt: new Date(),
      },
    });
  } catch (e: unknown) {
    if (casNoMatch(e)) {
      // Already paid between our read and this write — safe (the pidx write was a
      // no-op re-write of the value T6 pre-saved; only the status/paidAt mattered)
      log("payments:callback:cas-race", { orderId: order.id });
    } else {
      log("payments:callback:cas-error", e);
      return null;
    }
  }

  const store = await prisma.store.findUnique({
    where: { id: order.storeId },
    select: { slug: true },
  });

  return { orderNo: order.orderNo, storeSlug: store?.slug ?? "" };
}
