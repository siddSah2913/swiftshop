"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { requireStore } from "@/lib/require-store";
import { getLocale, t, type TranslationKey } from "@/lib/i18n";
import { generateManifest } from "@/lib/delivery";
import type { DeliveryPartnerId } from "@/lib/delivery";
import { log } from "@/lib/log";
import {
  canTransition,
  deliveredPaymentUpdate,
  isOrderStatus,
  transitionOrder,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/order-status";
import { handToPartnerSchema, orderIdSchema } from "./schema";

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
  /** Mirror state on the 1:1 Delivery row (always present — checkout creates it). */
  delivery?: { status?: string; deliveredAt?: Date };
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
    if (result.delivery) {
      const delivery: Prisma.DeliveryUpdateWithoutOrderInput = {};
      if (result.delivery.status) delivery.status = result.delivery.status;
      if (result.delivery.deliveredAt) delivery.deliveredAt = result.delivery.deliveredAt;
      data.delivery = { update: delivery };
    }

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
      delivery: { status: "delivered", deliveredAt: new Date() },
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

/**
 * Hand a confirmed order to a delivery partner (confirmed → handed). Persists
 * the partner, the manifest snapshot (generated server-side — the authoritative
 * copy the owner pasted into the partner's app), an optional tracking ref, and
 * the hand-off time. Wrong-state hand-offs are refused by transitionOrder and
 * the reason is logged here — the Phase 4 "rejects illegal jumps, logs reason".
 */
export async function handToPartner(
  _prev: OrdersActionState,
  formData: FormData,
  orderId: string,
): Promise<OrdersActionState> {
  const loc = await locale();

  const parsedOrder = orderIdSchema.safeParse({ orderId });
  if (!parsedOrder.success) return { error: t(loc, "orders.invalidOrderId") };

  // requireStore() redirects by throwing — keep it OUTSIDE the try.
  const { store } = await requireStore();

  try {
    const order = await prisma.order.findFirst({
      where: { id: parsedOrder.data.orderId, storeId: store.id },
      include: { customer: true, items: true },
    });
    if (!order) return { error: t(loc, "orders.invalidOrderId") };

    if (!isOrderStatus(order.status)) {
      return { error: t(loc, "orders.invalidAction") };
    }
    const step = transitionOrder(order.status, "handed");
    if (!step.ok) {
      log("orders:handToPartner:rejected", {
        orderId: order.id,
        from: order.status,
        reason: step.reason,
      });
      return { error: t(loc, "orders.invalidAction") };
    }

    const parsed = handToPartnerSchema.safeParse({
      partner: String(formData.get("partner") ?? ""),
      trackingRef: formData.get("trackingRef") ?? undefined,
    });
    if (!parsed.success) {
      const key = parsed.error.issues[0]?.message ?? "delivery.partnerRequired";
      return { error: t(loc, key as TranslationKey) };
    }

    const partner = parsed.data.partner as DeliveryPartnerId;
    const manifest = generateManifest(partner, {
      order: {
        orderNo: order.orderNo,
        totalNpr: order.totalNpr,
        paymentType: order.paymentType,
        items: order.items.map((i) => ({
          name: i.name,
          qty: i.qty,
          priceNpr: i.priceNpr,
        })),
      },
      customer: {
        name: order.customer.name,
        phone: order.customer.phone,
        address: order.customer.address,
      },
      store: { name: store.name, slug: store.slug },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "handed",
        delivery: {
          update: {
            partner,
            manifest,
            trackingRef: parsed.data.trackingRef ?? null,
            status: "handed",
            handedAt: new Date(),
          },
        },
      },
    });
  } catch (error) {
    log("orders:handToPartner", error);
    return { error: t(loc, "common.error") };
  }

  revalidatePath("/dashboard/orders", "page");
  revalidatePath("/dashboard/orders/[id]", "page");
  return { ok: true };
}