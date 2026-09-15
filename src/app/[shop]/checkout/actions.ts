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
import { getPaymentAdapter } from "@/lib/payments";
import type { PaymentGatewayId } from "@/lib/payments/types";

export type CheckoutFormState = { error?: string; redirectUrl?: string };

/** Prisma code P2002 = unique-constraint violation (orderNo collision under
 *  concurrent checkouts). Structural check so it survives adapter-wrapped
 *  errors where `instanceof` across copies can fail. */
function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: unknown }).code === "P2002"
  );
}

export async function placeOrder(
  _prev: CheckoutFormState,
  fd: FormData,
  slug: string,
): Promise<CheckoutFormState> {
  const locale = getLocale((await cookies()).get("swiftshop_lang")?.value);
  const trimmedSlug = slug.toLowerCase().trim();

  // 1. Resolve store
  const store = await prisma.store.findUnique({
    where: { slug: trimmedSlug },
    select: {
      id: true,
      qrImageUrl: true,
      paymentCod: true,
      paymentEsewa: true,
      paymentKhalti: true,
    },
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

  // Store-enabled check — the store owner must have enabled the selected
  // method (COD is always on; QR needs an uploaded image).
  const storeEnabled: Record<string, boolean> = {
    cod: store.paymentCod,
    qr: !!store.qrImageUrl,
    esewa: store.paymentEsewa,
    khalti: store.paymentKhalti,
  };
  if (!storeEnabled[paymentType]) {
    return { error: t(locale, "checkout.storeUnavailable") };
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

  // 4. DB write in ONE transaction — the callback returns the new order
  //    (id + orderNo) so the redirect target and the gateway's `createPayment`
  //    input are both typed (never an unassigned outer variable). orderNo =
  //    max+1 is a read-then-write: two simultaneous checkouts could pick the
  //    same number. @@unique([storeId, orderNo]) makes the loser fail cleanly
  //    (no corruption) — retry that collision a bounded few times.
  let orderResult: { orderId: string; orderNo: number } | null = null;
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        orderResult = await prisma.$transaction(
          async (tx): Promise<{ orderId: string; orderNo: number }> => {
            // Find or create Customer (dedupe by storeId + phone). When the
            // customer already exists, store their fresh address/name too —
            // the address on file is the only one the seller sees at handoff,
            // so a returning customer's new address must not be silently lost.
            let customer = await tx.customer.findFirst({
              where: { storeId: store.id, phone },
              select: { id: true },
            });

            if (!customer) {
              customer = await tx.customer.create({
                data: { storeId: store.id, name, phone, address },
                select: { id: true },
              });
            } else {
              customer = await tx.customer.update({
                where: { id: customer.id },
                data: { address, name },
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

            return { orderId: order.id, orderNo: order.orderNo };
          },
        );
        break;
      } catch (attemptErr) {
        if (isUniqueViolation(attemptErr) && attempt < 2) continue;
        throw attemptErr;
      }
    }
  } catch (e) {
    log("checkout:placeOrder", e);
    return { error: t(locale, "common.error") };
  }

  // 5. Online-gateway redirect path — runs BEFORE the cod/qr path so gateway
  //    errors short-circuit cleanly (the unpaid order stays in DB for
  //    investigation; the cart is cleared only after gateway initiation
  //    succeeds, so a user can retry on gateway failure).
  const ONLINE_GATEWAYS = ["esewa", "khalti"] as string[];
  if (ONLINE_GATEWAYS.includes(paymentType)) {
    if (!orderResult) return { error: t(locale, "common.error") };
    const adapter = await getPaymentAdapter(paymentType as PaymentGatewayId);
    if (!adapter) {
      return { error: t(locale, "checkout.paymentFailed") };
    }
    const payResult = await adapter.createPayment({
      orderId: orderResult.orderId,
      orderNo: orderResult.orderNo,
      amountNpr: totalNpr,
      storeSlug: trimmedSlug,
    });
    if (!payResult.ok) {
      return { error: t(locale, "checkout.paymentFailed") };
    }
    // PRE-SAVE the gateway ref (Khalti's pidx / demo ref) so T7's callback can
    // look the order up by paymentRef when the customer returns with only
    // `?pidx=...`. eSewa's callback carries `oid` directly, so no pre-save.
    if (payResult.ref) {
      await prisma.order.update({
        where: { id: orderResult.orderId },
        data: { paymentRef: payResult.ref },
      });
    }
    cookieStore.delete(CART_COOKIE);
    return { redirectUrl: payResult.redirectUrl };
  }

  // 6. Non-gateway path (cod/qr) — clear cart, redirect to confirmation.
  //    Redirect is OUTSIDE the try so Next.js's special error is never caught
  //    by the catch block above.
  cookieStore.delete(CART_COOKIE);
  redirect(`/${trimmedSlug}/order-confirmed/${orderResult!.orderNo}`);
}