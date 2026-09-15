"use server";

// Cart cookie mutation actions — each validates payload, merges into
// parseCartCookie, writes the cookie. Next re-renders the current route
// so the badge updates in the same roundtrip. See Phase 2 spec §4.

import { cookies } from "next/headers";
import {
  parseCartCookie,
  serializeCart,
  CART_COOKIE,
  ID_RE,
  type CartMap,
} from "@/lib/cart";
import { SEGMENT_RE, buildLineKey } from "@/lib/variants/line-key";

export type CartActionState = { ok?: boolean; error?: string };

const CART_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

async function readCart(): Promise<CartMap> {
  const cookieStore = await cookies();
  return parseCartCookie(cookieStore.get(CART_COOKIE)?.value ?? null);
}

async function writeCart(cart: CartMap): Promise<void> {
  const cookieStore = await cookies();
  if (Object.keys(cart).length === 0) {
    cookieStore.delete(CART_COOKIE);
  } else {
    cookieStore.set(CART_COOKIE, serializeCart(cart), {
      httpOnly: false, // client reads for badge (optional)
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: CART_MAX_AGE,
    });
  }
}

export async function addToCartItem(
  _prev: CartActionState,
  fd: FormData,
): Promise<CartActionState> {
  const productId = String(fd.get("productId") ?? "");

  if (!ID_RE.test(productId)) {
    return { error: "Invalid product." };
  }

  const optionIds = fd
    .getAll("option")
    .map((v) => String(v))
    .filter((v) => SEGMENT_RE.test(v));
  if (optionIds.length > 2) {
    return { error: "Invalid product." };
  }

  const key = buildLineKey(productId, optionIds);
  const cart = await readCart();
  const current = cart[key] ?? 0;
  cart[key] = Math.min(current + 1, 9);

  await writeCart(cart);
  return { ok: true };
}

export async function setCartQty(
  _prev: CartActionState,
  fd: FormData,
): Promise<CartActionState> {
  const productId = String(fd.get("productId") ?? "");
  const qty = Number(fd.get("qty"));

  if (!ID_RE.test(productId)) {
    return { error: "Invalid product." };
  }

  const cart = await readCart();

  if (!Number.isInteger(qty) || qty <= 0) {
    delete cart[productId];
  } else {
    cart[productId] = Math.max(1, Math.min(9, qty));
  }

  await writeCart(cart);
  return { ok: true };
}

export async function clearCart(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CART_COOKIE);
}
