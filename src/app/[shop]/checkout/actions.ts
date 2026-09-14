"use server";

// The security core — place an order from a cart cookie.
// Never trust the cookie's prices/ids. Re-read every line from the DB
// scoped to the store resolved from slug. See Phase 2 spec §5.

import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { parseCartCookie, CART_COOKIE } from "@/lib/cart";
import { computeTotal } from "@/lib/order";
import { checkoutSchema } from "./schema";
import { getLocale, t, type TranslationKey } from "@/lib/i18n";
import { log } from "@/lib/log";

export type CheckoutFormState = { error?: string };

export async function placeOrder(
  _prev: CheckoutFormState,
  fd: FormData,
  slug: string,
): Promise<CheckoutFormState> {
  const locale = getLocale((await cookies()).get("locale")?.value);
  const trimmedSlug = slug.toLowerCase().trim();

  // 1. Resolve store
  const store = await prisma.store.findUnique({
    where: { slug: trimmedSlug },
    select: { id: true, qrImageUrl: true },
  });
  if (!store) notFound();

  // 2. Validate checkout form
  const raw = {
    name: String(fd.get("name") ?? ""),
    phone: String(fd.get("phone") ?? ""),
    address: String(fd.get("address") ?? ""),
    paymentType: String(fd.get("paymentType") ?? ""),
  };

  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError =
      parsed.error.issues[0]?.message ?? "checkout.invalidPayment";
    return { error: t(locale, firstError as TranslationKey) };
  }

  const { name, phone, address, paymentType } = parsed.data;

  // QR guard — owner must have uploaded a QR
  if (paymentType === "qr" && !store.qrImageUrl) {
    return { error: t(locale, "checkout.noQr") };
  }

  // 3. Read cart from cookie, then re-read every product from DB
  const cookieStore = await cookies();
  const cart = parseCartCookie(cookieStore.get(CART_COOKIE)?.value ?? null);
  const productIds = Object.keys(cart);

  if (productIds.length === 0) {
    return { error: t(locale, "checkout.cartEmpty") };
  }

  const dbProducts = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      storeId: store.id,
      available: true,
    },
  });

  // Build validated lines (drop foreign/disabled products silently)
  const lines = dbProducts
    .map((p) => ({
      productId: p.id,
      name: p.name,
      priceNpr: p.priceNpr,
      qty: cart[p.id] ?? 1,
    }))
    .filter((l) => l.qty >= 1 && l.qty <= 9);

  if (lines.length === 0) {
    return { error: t(locale, "checkout.cartEmpty") };
  }

  const totalNpr = computeTotal(
    lines.map((l) => ({ priceNpr: l.priceNpr, qty: l.qty }))
  );

  // 4. DB write in ONE transaction — the callback returns the new orderNo so
  //    the redirect target is typed (never an unassigned outer variable).
  let orderNo: number | null = null;
  try {
    orderNo = await prisma.$transaction(async (tx): Promise<number> => {
      // Find or create Customer (dedupe by storeId + phone)
      let customer = await tx.customer.findFirst({
        where: { storeId: store.id, phone },
        select: { id: true },
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: { storeId: store.id, name, phone, address },
          select: { id: true },
        });
      }

      // Compute next orderNo (max + 1 for this store)
      const lastOrder = await tx.order.findFirst({
        where: { storeId: store.id },
        orderBy: { orderNo: "desc" },
        select: { orderNo: true },
      });
      const nextOrderNo = (lastOrder?.orderNo ?? 0) + 1;

      // Create Order
      const order = await tx.order.create({
        data: {
          storeId: store.id,
          customerId: customer.id,
          orderNo: nextOrderNo,
          totalNpr,
          paymentType,
          paymentStatus: "unpaid",
          status: "new",
        },
        select: { id: true, orderNo: true },
      });

      // Create OrderItems (snapshotted name + price)
      await tx.orderItem.createMany({
        data: lines.map((l) => ({
          orderId: order.id,
          productId: l.productId,
          name: l.name,
          priceNpr: l.priceNpr,
          qty: l.qty,
        })),
      });

      // Create Delivery (ready for handoff)
      await tx.delivery.create({
        data: {
          orderId: order.id,
          partner: "self",
          status: "ready",
        },
      });

      return order.orderNo;
    });
  } catch (e) {
    log("checkout:placeOrder", e);
    return { error: t(locale, "common.error") };
  }

  // 5. Clear the cart cookie
  cookieStore.delete(CART_COOKIE);

  // 6. Redirect OUTSIDE the try
  redirect(`/${trimmedSlug}/order-confirmed/${orderNo}`);
}