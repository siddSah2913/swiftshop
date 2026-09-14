"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { requireStore } from "@/lib/require-store";
import { getLocale, t, type TranslationKey } from "@/lib/i18n";
import { log } from "@/lib/log";
import {
  canTransition,
  deliveredPaymentUpdate,
  isOrderStatus,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/order-status";
import { orderIdSchema } from "./schema";

// Status actions for the order detail page. Each is a useActionState action
// `(prev, fd, orderId)` — the client closure binds orderId. On success we
// revalidatePath and return { ok: true } (the in-place router refresh triggers
// re-render); a redirect() would interrupt that refresh, so we never call it.
export type OrdersActionState = { ok?: boolean; error?: string };

async function locale() {
  return getLocale((await cookies()).get("swiftshop_lang")?.value ?? null);
}

type ActionOrder = {
  status: string;
  paymentType: string;
  paymentStatus: string;
};

type Update = {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  deliveredAt?: Date;
};

type ErrorResult = { kind: "error"; error: TranslationKey };
type UpdateResult = { kind: "update" } & Update;

/** Shared plumbing: validate the id, load the caller's own order, run `apply`,
 * persist, revalidate both list and detail routes. Invalid ids and orders that
 * are not this store's return "orders.invalidOrderId" (no tenant leak). */
async function runAction(
  orderId: string,
  apply: (order: ActionOrder) => ErrorResult | UpdateResult,
): Promise<OrdersActionState> {
  const loc = await locale();

  const parsed = orderIdSchema.safeParse({ orderId });
  if (!parsed.success) return { error: t(loc, "orders.invalidOrderId") };

  // requireStore() redirects by throwing (no session / no store) — keep it
  // OUTSIDE the try so the redirect is never swallowed.
  const { store } = await requireStore();

  try {
    const order = await prisma.order.findFirst({
      where: { id: parsed.data.orderId, storeId: store.id },
    });
    if (!order) return { error: t(loc, "orders.invalidOrderId") };

    const result = apply(order);
    if (result.kind === "error") return { error: t(loc, result.error) };

    const data: Prisma.OrderUpdateInput = {};
    if (result.status) data.status = result.status;
    if (result.paymentStatus) data.paymentStatus = result.paymentStatus;
    if (result.deliveredAt) data.deliveredAt = result.deliveredAt;

    await prisma.order.update({ where: { id: order.id }, data });
  } catch (error) {
    log("orders:runAction", error);
    return { error: t(loc, "common.error") };
  }

  revalidatePath("/dashboard/orders", "page");
  revalidatePath("/dashboard/orders/[id]", "page");
  return { ok: true };
}

/** Confirm a new order (new → confirmed). */
export async function confirmOrder(
  _prev: OrdersActionState,
  _formData: FormData,
  orderId: string,
): Promise<OrdersActionState> {
  return runAction(orderId, (order) => {
    if (!isOrderStatus(order.status) || !canTransition(order.status, "confirmed")) {
      return { kind: "error", error: "orders.invalidAction" };
    }
    return { kind: "update", status: "confirmed" };
  });
}

/** Mark delivered (confirmed|handed → delivered). COD settles to paid on
 * delivery (cash is collected at the door); other payment types keep their
 * status for a manual "mark paid". Also stamps deliveredAt. */
export async function markDelivered(
  _prev: OrdersActionState,
  _formData: FormData,
  orderId: string,
): Promise<OrdersActionState> {
  return runAction(orderId, (order) => {
    if (!isOrderStatus(order.status) || !canTransition(order.status, "delivered")) {
      return { kind: "error", error: "orders.invalidAction" };
    }
    return {
      kind: "update",
      status: "delivered",
      paymentStatus: deliveredPaymentUpdate(
        order.paymentType,
        order.paymentStatus as PaymentStatus,
      ),
      deliveredAt: new Date(),
    };
  });
}

/** Mark the payment received (unpaid → paid) for non-COD orders. */
export async function markPaid(
  _prev: OrdersActionState,
  _formData: FormData,
  orderId: string,
): Promise<OrdersActionState> {
  return runAction(orderId, (order) => {
    if (order.paymentStatus === "paid") {
      return { kind: "error", error: "orders.invalidAction" };
    }
    return { kind: "update", paymentStatus: "paid" };
  });
}