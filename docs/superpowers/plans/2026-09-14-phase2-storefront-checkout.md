# Phase 2 — Customer Storefront + Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A customer who opens an owner's public store link can browse the product grid, open a product, add to cart, check out (name + phone + address), pay by COD or Scan QR, and land on a thank-you page showing their order number. The order (Customer + Order + OrderItem + Delivery) persists and appears in the owner's dashboard in Phase 3.

**Architecture:** All Phase 2 work lives under the public `/[shop]/*` dynamic route. No auth required — storefront pages resolve the store by slug, then scope every query by `store.id`. Cart state lives in a `swiftshop_cart` HTTP cookie (a tamperable-but-harmless JSON map of `productId → qty`). The server re-reads every cart line from the DB at read time and at order time, dropping foreign/disabled products. The `placeOrder` Server Action is the security core: it validates the checkout form (Zod), re-reads all products from the DB within a `prisma.$transaction`, computes the total, creates Customer/Order/OrderItem/Delivery rows, clears the cookie, and redirects to a thank-you page. Pure logic (cart parsing, Zod schema, total computation) sits in `src/lib/*` and `src/app/[shop]/checkout/schema.ts` and is unit-tested with vitest.

**Tech Stack:** Next.js 16.3.5 (App Router, Server Actions, `params` is a Promise) · React 19.2.8 (`useActionState`, `use` for promises) · TypeScript strict · Tailwind v4 · Prisma 7.10.0 (driver adapter) · NextAuth v5 (JWT — NOT used on storefront) · Zod 4.6.2 · vitest (pure-logic only)

**Spec:** `docs/superpowers/specs/2026-09-14-phase2-storefront-checkout-design.md`

## Global Constraints

- **Next.js 16 `params` is a Promise.** Every dynamic route `PageProps` must `await params` before accessing `shop` or `id`. See `node_modules/next/dist/docs/01-app/01-getting-started/04-layouts-and-pages.md`.
- **`redirect()` / `notFound()` throw** — never wrap them in `try/catch`. Final `redirect()` calls go OUTSIDE the try; only throwing-away-the-action code goes inside. Same contract as Phase 0's `login/actions.ts`.
- **`cookies()` is async.** Every call must `await cookies()` — never `const cookieStore = cookies()` synchronously. See Next.js docs on cookie behavior in Server Functions.
- **Money = integers (NPR, no paisa).** `priceNpr` and `totalNpr` are integers. Never floats. The total is computed as `Σ priceNpr × qty` using `Number` integer math.
- **Tenant isolation in every query.** Every storefront read resolves the store by slug first, then scopes by `store.id`. A product id from the cookie that belongs to another store is silently dropped — never ordered.
- **The cart cookie is a cart intent, not a trust boundary.** The server re-reads every line from the DB scoped to the current store. Prices, availability, and product ownership are all verified server-side.
- **Prisma 7 type names.** Generated model types are `StoreModel`, `ProductModel`, `CustomerModel`, `OrderModel`, `OrderItemModel`, `DeliveryModel` from `@/generated/prisma/models`; the instance `prisma` is imported from `@/lib/db`.
- **i18n key parity is a compile error.** Any key added to `src/locales/en.ts` must exist in `ne.ts` (typed `Dict`); a missing Nepali word fails `npm run build`.
- **Log policy:** `import { log } from "@/lib/log"`; `catch (e) { log("feature:action", e); return { error: t(locale, "common.error") }; }`. Never leak stack traces.
- Use the same `useActionState(state, init)` two-arg form, `pending` disable, and pre-translated `state.error` pattern as `src/components/signup-form.tsx`.
- **No `thankYouNote` column** — deferred to Phase 3 to avoid a schema migration mid-phase.
- Read relevant Next 16 docs first, per `AGENTS.md`: `node_modules/next/dist/docs/01-app/02-guides/dynamic-routes.md`, `.../07-mutating-data.md`, `.../02-guides/server-actions.md`.
- Every task ends with a commit; large tasks commit per sub-step.

---

### Task 1: `src/lib/cart.ts` — cookie cart pure helpers

**Files:**
- Create: `src/lib/cart.ts`
- Test: `src/lib/cart.test.ts`

**Interfaces:**
- Consumes: nothing (pure module)
- Produces:
  - `type CartMap = Record<string, number>` — `productId → qty`
  - `const CART_COOKIE = "swiftshop_cart"`
  - `parseCartCookie(value: string | null): CartMap` — parses, validates ids (`/^[a-zA-Z0-9-]{1,64}$/`), clamps qty to 1..9, caps at 20 lines, drops junk. Invalid/oversized cookies → `{}`.
  - `serializeCart(cart: CartMap): string` — `encodeURIComponent(JSON.stringify(cart))`. Used by cart actions.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/cart.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { parseCartCookie, serializeCart, CART_COOKIE } from "./cart";

describe("CART_COOKIE", () => {
  it("is the expected cookie name", () => {
    expect(CART_COOKIE).toBe("swiftshop_cart");
  });
});

describe("parseCartCookie", () => {
  it("parses a valid cart", () => {
    const cart = parseCartCookie(
      encodeURIComponent(JSON.stringify({ abc123: 2, def456: 1 }))
    );
    expect(cart).toEqual({ abc123: 2, def456: 1 });
  });

  it("returns empty cart for null", () => {
    expect(parseCartCookie(null)).toEqual({});
  });

  it("returns empty cart for empty string", () => {
    expect(parseCartCookie("")).toEqual({});
  });

  it("returns empty cart for garbage", () => {
    expect(parseCartCookie("not-json")).toEqual({});
  });

  it("drops invalid product ids (special chars)", () => {
    const raw = { "valid-id": 1, "has spaces": 2, "has@sym": 3 };
    const cart = parseCartCookie(encodeURIComponent(JSON.stringify(raw)));
    expect(cart).toEqual({ "valid-id": 1 });
  });

  it("clamps qty to 1..9", () => {
    const raw = { a: 0, b: 15, c: 5 };
    const cart = parseCartCookie(encodeURIComponent(JSON.stringify(raw)));
    expect(cart).toEqual({ a: 1, b: 9, c: 5 });
  });

  it("caps at 20 distinct products", () => {
    const raw: Record<string, number> = {};
    for (let i = 0; i < 25; i++) raw[`p${i}`] = 1;
    const cart = parseCartCookie(encodeURIComponent(JSON.stringify(raw)));
    expect(Object.keys(cart)).toHaveLength(20);
  });

  it("drops non-integer qty values", () => {
    const raw = { a: 1.5, b: NaN, c: 1 };
    const cart = parseCartCookie(encodeURIComponent(JSON.stringify(raw)));
    expect(cart).toEqual({ c: 1 });
  });

  it("drops product ids longer than 64 chars", () => {
    const longId = "a".repeat(65);
    const raw = { [longId]: 1, short: 2 };
    const cart = parseCartCookie(encodeURIComponent(JSON.stringify(raw)));
    expect(cart).toEqual({ short: 2 });
  });
});

describe("serializeCart", () => {
  it("round-trips through parseCartCookie", () => {
    const original = { "abc-123": 3, "xyz789": 1 };
    const serialized = serializeCart(original);
    const parsed = parseCartCookie(serialized);
    expect(parsed).toEqual(original);
  });

  it("produces a URL-encoded string", () => {
    const result = serializeCart({ a: 1 });
    expect(decodeURIComponent(result)).toBe('{"a":1}');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL ("Cannot find module './cart'" / `parseCartCookie` is not exported).

- [ ] **Step 3: Implement `cart.ts`**

Create `src/lib/cart.ts`:
```ts
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
      if (!Number.isInteger(q) || q < MIN_QTY || q > MAX_QTY) continue;

      cart[id] = q;
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: 10 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cart.ts src/lib/cart.test.ts
git commit -m "feat(cart): add cookie cart pure helpers + vitest suite"
```

---

### Task 2: `src/app/[shop]/checkout/schema.ts` — Zod checkout schema

**Files:**
- Create: `src/app/[shop]/checkout/schema.ts`
- Test: `src/app/[shop]/checkout/schema.test.ts`

**Interfaces:**
- Consumes: nothing (pure module)
- Produces:
  - `checkoutSchema` — Zod object: `{ name, phone, address, paymentType }`
  - `type CheckoutInput = z.infer<typeof checkoutSchema>`
  - Phone: Nepali mobile `^9[678]\d{8}$` (10 digits, no +977)
  - paymentType: `z.enum(["cod", "qr"])`

- [ ] **Step 1: Write the failing tests**

Create `src/app/[shop]/checkout/schema.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { checkoutSchema } from "./schema";

describe("checkoutSchema", () => {
  const valid = {
    name: "Ram Sharma",
    phone: "9800000000",
    address: "Kathmandu, Bagmati",
    paymentType: "cod" as const,
  };

  it("accepts a valid COD checkout", () => {
    expect(checkoutSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a valid QR checkout", () => {
    expect(
      checkoutSchema.safeParse({ ...valid, paymentType: "qr" }).success
    ).toBe(true);
  });

  it("rejects empty name", () => {
    expect(checkoutSchema.safeParse({ ...valid, name: "" }).success).toBe(
      false
    );
  });

  it("rejects name over 80 chars", () => {
    expect(
      checkoutSchema.safeParse({ ...valid, name: "a".repeat(81) }).success
    ).toBe(false);
  });

  it("rejects phone not starting with 9[678]", () => {
    expect(checkoutSchema.safeParse({ ...valid, phone: "1234567890" }).success).toBe(
      false
    );
  });

  it("rejects short phone", () => {
    expect(checkoutSchema.safeParse({ ...valid, phone: "9800" }).success).toBe(
      false
    );
  });

  it("rejects long phone", () => {
    expect(
      checkoutSchema.safeParse({ ...valid, phone: "98000000001" }).success
    ).toBe(false);
  });

  it("rejects empty address", () => {
    expect(checkoutSchema.safeParse({ ...valid, address: "" }).success).toBe(
      false
    );
  });

  it("rejects address over 200 chars", () => {
    expect(
      checkoutSchema.safeParse({ ...valid, address: "a".repeat(201) }).success
    ).toBe(false);
  });

  it("rejects invalid payment type", () => {
    expect(
      checkoutSchema.safeParse({ ...valid, paymentType: "esewa" }).success
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL ("Cannot find module './schema'").

- [ ] **Step 3: Implement the Zod schema**

Create `src/app/[shop]/checkout/schema.ts`:
```ts
// Checkout form validation — pure, unit-tested.
// Nepali mobile pattern: 98/97/96 prefix + 8 digits = 10 digits total.
// No +977, no landlines in v1. See Phase 2 spec §11.

import { z } from "zod";

export const checkoutSchema = z.object({
  name: z.string().trim().min(1, "checkout.invalidName").max(80, "checkout.invalidName"),
  phone: z
    .string()
    .trim()
    .regex(/^9[678]\d{8}$/, "checkout.invalidPhone"),
  address: z
    .string()
    .trim()
    .min(1, "checkout.invalidAddress")
    .max(200, "checkout.invalidAddress"),
  paymentType: z.enum(["cod", "qr"], {
    errorMap: () => ({ message: "checkout.invalidPayment" }),
  }),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: 12 passed (2 cart + 10 schema tests — vitest accumulates across files).

- [ ] **Step 5: Commit**

```bash
git add src/app/checkout/schema.ts src/app/checkout/schema.test.ts
git commit -m "feat(checkout): add Zod checkout schema + vitest suite"
```

Wait — the file path is `src/app/[shop]/checkout/schema.ts`. Fix the commit add path:

```bash
git add "src/app/[shop]/checkout/schema.ts" "src/app/[shop]/checkout/schema.test.ts"
git commit -m "feat(checkout): add Zod checkout schema + vitest suite"
```

---

### Task 3: `src/lib/order.ts` — computeTotal pure helper

**Files:**
- Create: `src/lib/order.ts`
- Test: `src/lib/order.test.ts`

**Interfaces:**
- Consumes: nothing (pure module)
- Produces:
  - `computeTotal(lines: { priceNpr: number; qty: number }[]): number` — sum of `priceNpr × qty`, integers. Clamps each qty to 1..9. Rejects empty lines (returns 0).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/order.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { computeTotal } from "./order";

describe("computeTotal", () => {
  it("sums priceNpr × qty for multiple lines", () => {
    expect(
      computeTotal([
        { priceNpr: 500, qty: 2 },
        { priceNpr: 1200, qty: 1 },
      ])
    ).toBe(2200);
  });

  it("returns 0 for empty lines", () => {
    expect(computeTotal([])).toBe(0);
  });

  it("handles a single line", () => {
    expect(computeTotal([{ priceNpr: 999, qty: 3 }])).toBe(2997);
  });

  it("clamps qty to 1 if below", () => {
    expect(computeTotal([{ priceNpr: 100, qty: 0 }])).toBe(100);
  });

  it("clamps qty to 9 if above", () => {
    expect(computeTotal([{ priceNpr: 100, qty: 15 }])).toBe(900);
  });

  it("handles zero price (free item)", () => {
    expect(computeTotal([{ priceNpr: 0, qty: 5 }])).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL ("Cannot find module './order'").

- [ ] **Step 3: Implement `order.ts`**

Create `src/lib/order.ts`:
```ts
// Order math helpers — pure, unit-tested.
// totalNpr = Σ priceNpr × qty, integers only. No floats, no paisa.
// See Phase 2 spec §12.

const MIN_QTY = 1;
const MAX_QTY = 9;

/**
 * Compute the total NPR for a set of cart lines.
 * Each qty is clamped to 1..9. Returns 0 for empty input.
 */
export function computeTotal(
  lines: { priceNpr: number; qty: number }[]
): number {
  let total = 0;
  for (const line of lines) {
    const q = Math.max(MIN_QTY, Math.min(MAX_QTY, Math.floor(line.qty || 1)));
    total += line.priceNpr * q;
  }
  return total;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: 18 passed (2 cart + 10 schema + 6 order).

- [ ] **Step 5: Commit**

```bash
git add src/lib/order.ts src/lib/order.test.ts
git commit -m "feat(order): add computeTotal pure helper + vitest suite"
```

---

### Task 4: i18n additions — en.ts + ne.ts

**Files:**
- Modify: `src/locales/en.ts`
- Modify: `src/locales/ne.ts`

**Interfaces:**
- Consumes: nothing
- Produces: all new translation keys for `store.*`, `cart.*`, `checkout.*`, `order.*` groups. Dict parity enforced at compile time.

- [ ] **Step 1: Add English keys**

Append the following to `src/locales/en.ts` (before the closing `} as const;`):

```ts
  // Storefront
  "store.notFound": "Shop not found.",
  "store.backToShop": "Back to shop",

  // Product
  "product.addToCart": "Add to cart",
  "product.added": "Added ✓",
  "product.outOfStock": "Out of stock",
  "product.priceNpr": "NPR",
  "product.backToShop": "← Back to shop",

  // Cart
  "cart.title": "Your cart",
  "cart.empty": "Your cart is empty.",
  "cart.removeItem": "Remove",
  "cart.total": "Total",
  "cart.checkout": "Checkout",
  "cart.continueShopping": "Continue shopping",
  "cart.qtyLabel": "Qty",

  // Checkout
  "checkout.title": "Checkout",
  "checkout.name": "Your name",
  "checkout.phone": "Phone number",
  "checkout.phoneHint": "10-digit mobile (e.g. 98XXXXXXXX)",
  "checkout.address": "Delivery address",
  "checkout.addressHint": "Ward, street, city — where should we deliver?",
  "checkout.payment": "Payment method",
  "checkout.cod": "Cash on delivery",
  "checkout.qr": "Scan QR to pay",
  "checkout.qrHint": "Show this QR at the counter or scan from your banking app.",
  "checkout.placeOrder": "Place order",
  "checkout.invalidName": "Enter your name.",
  "checkout.invalidPhone": "Enter a valid 10-digit mobile number like 98XXXXXXXX.",
  "checkout.invalidAddress": "Enter a delivery address.",
  "checkout.invalidPayment": "Choose a payment method.",
  "checkout.noQr": "QR payment is not available yet — the shop owner hasn't uploaded a QR code. Please pay by cash on delivery.",
  "checkout.cartEmpty": "Your cart is empty — add some products first.",
  "checkout.orderSummary": "Order summary",

  // Order confirmed
  "order.confirmed": "Order confirmed!",
  "order.number": "Order #",
  "order.thankYou": "Thank you for your order. We'll call you to confirm.",
  "order.whatsapp": "Message us on WhatsApp",
  "order.backToShop": "← Back to shop",
```

- [ ] **Step 2: Add Nepali keys**

Append the corresponding Nepali translations to `src/locales/ne.ts`. The Dict type will enforce parity at compile time — a missing key is a build error.

- [ ] **Step 3: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: no errors. If a key is missing in `ne.ts`, the build fails with a clear type error.

- [ ] **Step 4: Commit**

```bash
git add src/locales/en.ts src/locales/ne.ts
git commit -m "feat(i18n): add storefront, cart, checkout, order keys (en + ne)"
```

---

### Task 5: `src/app/[shop]/layout.tsx` + `storefront-header.tsx`

**Files:**
- Create: `src/app/[shop]/layout.tsx`
- Create: `src/components/storefront-header.tsx`

**Interfaces:**
- Consumes: `StoreModel` (via slug lookup), `parseCartCookie` (from `@/lib/cart`)
- Produces: storefront layout that resolves store by slug, themed header with logo/name/cart badge

- [ ] **Step 1: Implement the storefront layout**

Create `src/app/[shop]/layout.tsx`:
```tsx
// Public storefront layout — resolves store by slug, provides themed shell.
// No auth required. Every query scoped by store.id. See Phase 2 spec §3.

import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { parseCartCookie, CART_COOKIE } from "@/lib/cart";
import { StorefrontHeader } from "@/components/storefront-header";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ shop: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shop } = await params;
  const store = await prisma.store.findUnique({
    where: { slug: shop.toLowerCase().trim() },
    select: { name: true },
  });
  return { title: store ? `${store.name} | SwiftShop` : "Shop not found" };
}

export default async function StorefrontLayout({ params, children }: Props) {
  const { shop } = await params;
  const slug = shop.toLowerCase().trim();

  const store = await prisma.store.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      primaryColor: true,
      logoUrl: true,
    },
  });

  if (!store) notFound();

  // Read cart cookie for badge count
  const cookieStore = await cookies();
  const cartValue = cookieStore.get(CART_COOKIE)?.value ?? null;
  const cart = parseCartCookie(cartValue);
  const cartCount = Object.values(cart).reduce((sum, q) => sum + q, 0);

  return (
    <div className="min-h-screen bg-zinc-50">
      <StorefrontHeader
        storeName={store.name}
        storeSlug={store.slug}
        logoUrl={store.logoUrl}
        primaryColor={store.primaryColor}
        cartCount={cartCount}
      />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Implement `storefront-header.tsx`**

Create `src/components/storefront-header.tsx`:
```tsx
// Storefront header — themed with store's primaryColor, shows logo/name/cart badge.
// Server component. See Phase 2 spec §8.

import Link from "next/link";

type Props = {
  storeName: string;
  storeSlug: string;
  logoUrl: string | null;
  primaryColor: string;
  cartCount: number;
};

export function StorefrontHeader({
  storeName,
  storeSlug,
  logoUrl,
  primaryColor,
  cartCount,
}: Props) {
  return (
    <header
      className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur"
      style={{ ["--brand" as string]: primaryColor }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link
          href={`/${storeSlug}`}
          className="flex items-center gap-2 font-semibold text-zinc-900 hover:text-zinc-700"
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="h-8 w-8 rounded-md object-cover"
            />
          ) : (
            <span
              className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold text-white"
              style={{ backgroundColor: "var(--brand)" }}
            >
              {storeName.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="truncate">{storeName}</span>
        </Link>

        <Link
          href={`/${storeSlug}/cart`}
          className="relative flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
        >
          🛒 Cart
          {cartCount > 0 ? (
            <span
              className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold text-white"
              style={{ backgroundColor: "var(--brand)" }}
            >
              {cartCount}
            </span>
          ) : null}
        </Link>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: no errors. (The `[shop]/page.tsx` doesn't exist yet — Next.js will 404 on `/{slug}`, but the layout and header should typecheck.)

- [ ] **Step 4: Commit**

```bash
git add "src/app/[shop]/layout.tsx" src/components/storefront-header.tsx
git commit -m "feat(storefront): add layout + themed header with cart badge"
```

---

### Task 6: `src/app/[shop]/page.tsx` + `product-card.tsx` + `add-to-cart.tsx`

**Files:**
- Create: `src/app/[shop]/page.tsx`
- Create: `src/components/product-card.tsx`
- Create: `src/components/add-to-cart.tsx`

**Interfaces:**
- Consumes: `ProductModel` (via store-scoped query), `parseCartCookie`/`CART_COOKIE` (from `@/lib/cart`)
- Produces: product grid page, product card (server-presentational), add-to-cart button (client)

- [ ] **Step 1: Implement `product-card.tsx`**

Create `src/components/product-card.tsx`:
```tsx
// Product card for the storefront grid — server presentational component.
// Shows main image (or placeholder), name, NPR price. See Phase 2 spec §10.

import Link from "next/link";
import type { ProductModel } from "@/generated/prisma/models";

type Props = {
  product: ProductModel;
  storeSlug: string;
  priceLabel: string;
  addToCartLabel: string;
  addedLabel: string;
};

export function ProductCard({
  product,
  storeSlug,
  priceLabel,
  addToCartLabel,
  addedLabel,
}: Props) {
  const main = product.imageUrls[0];

  return (
    <div className="group rounded-lg border border-zinc-200 bg-white overflow-hidden">
      <Link href={`/${storeSlug}/product/${product.id}`} className="block">
        {main ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={main}
            alt={product.name}
            className="aspect-square w-full object-cover group-hover:opacity-90 transition"
          />
        ) : (
          <div className="aspect-square w-full bg-zinc-100" />
        )}
      </Link>
      <div className="p-3">
        <Link
          href={`/${storeSlug}/product/${product.id}`}
          className="block truncate font-medium text-zinc-900 hover:text-zinc-700"
        >
          {product.name}
        </Link>
        <p className="mt-1 text-sm text-zinc-500">
          {priceLabel} {product.priceNpr.toLocaleString("en-IN")}
        </p>
        <AddToCartButton
          productId={product.id}
          label={addToCartLabel}
          addedLabel={addedLabel}
          primaryColor="var(--brand, #0F766E)"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement `add-to-cart.tsx`**

Create `src/components/add-to-cart.tsx`:
```tsx
"use client";

import { useActionState } from "react";
import { addToCartItem, type CartActionState } from "@/app/[shop]/cart/actions";

type Props = {
  productId: string;
  label: string;
  addedLabel: string;
  primaryColor: string;
};

export function AddToCartButton({
  productId,
  label,
  addedLabel,
  primaryColor,
}: Props) {
  const [state, action, pending] = useActionState(
    (_prev: CartActionState, _fd: FormData) => addToCartItem(productId),
    {} as CartActionState,
  );

  return (
    <form action={action} className="mt-2">
      <button
        type="submit"
        disabled={pending || state.ok}
        className="w-full rounded-md px-3 py-2 text-sm font-medium text-white transition disabled:opacity-70"
        style={{ backgroundColor: state.ok ? "#16a34a" : primaryColor }}
      >
        {state.ok ? addedLabel : pending ? "..." : label}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Implement the storefront home page**

Create `src/app/[shop]/page.tsx`:
```tsx
// Public storefront — product grid for the store resolved by slug.
// Dynamic render (reads cookies for cart badge). See Phase 2 spec §3.

import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { parseCartCookie, CART_COOKIE } from "@/lib/cart";
import { getLocale, t } from "@/lib/i18n";
import { ProductCard } from "@/components/product-card";

type Props = {
  params: Promise<{ shop: string }>;
};

export default async function StorePage({ params }: Props) {
  const { shop } = await params;
  const slug = shop.toLowerCase().trim();
  const locale = getLocale((await cookies()).get("locale")?.value);

  const store = await prisma.store.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      primaryColor: true,
    },
  });

  if (!store) notFound();

  const products = await prisma.product.findMany({
    where: { storeId: store.id, available: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">{store.name}</h1>

      {products.length === 0 ? (
        <p className="text-zinc-500">No products yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              storeSlug={slug}
              priceLabel={t(locale, "product.priceNpr")}
              addToCartLabel={t(locale, "product.addToCart")}
              addedLabel={t(locale, "product.added")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

Note: `CartActionState` type and `addToCartItem` action don't exist yet — they come in Task 8. The `AddToCartButton` will import from `@/app/[shop]/cart/actions`. This file will typecheck once Task 8 lands. For now, we commit and note the forward reference.

- [ ] **Step 4: Verify build compiles (may have forward-ref error)**

Run: `npx tsc --noEmit`
Expected: the `add-to-cart.tsx` import of `@/app/[shop]/cart/actions` will fail. This is expected — we'll fix it when Task 8 lands. For now, proceed with the commit noting the dependency.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[shop]/page.tsx" src/components/product-card.tsx src/components/add-to-cart.tsx
git commit -m "feat(storefront): add product grid page + card + add-to-cart button"
```

---

### Task 7: `src/app/[shop]/product/[id]/page.tsx`

**Files:**
- Create: `src/app/[shop]/product/[id]/page.tsx`

**Interfaces:**
- Consumes: `ProductModel`, `StoreModel` (via slug + product id lookup)
- Produces: product detail page with gallery, caption, price, add-to-cart

- [ ] **Step 1: Implement the product detail page**

Create `src/app/[shop]/product/[id]/page.tsx`:
```tsx
// Product detail page — gallery (first = main), caption, price NPR, add to cart.
// Product must belong to the store loaded by slug. See Phase 2 spec §3.

import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getLocale, t } from "@/lib/i18n";
import { AddToCartButton } from "@/components/add-to-cart";
import Link from "next/link";

type Props = {
  params: Promise<{ shop: string; id: string }>;
};

export default async function ProductDetailPage({ params }: Props) {
  const { shop, id } = await params;
  const slug = shop.toLowerCase().trim();
  const locale = getLocale((await cookies()).get("locale")?.value);

  const store = await prisma.store.findUnique({
    where: { slug },
    select: { id: true, name: true, primaryColor: true },
  });

  if (!store) notFound();

  const product = await prisma.product.findFirst({
    where: { id, storeId: store.id },
  });

  if (!product) notFound();

  const [main, ...gallery] = product.imageUrls;

  return (
    <div>
      <Link
        href={`/${slug}`}
        className="mb-4 inline-block text-sm text-zinc-500 hover:text-zinc-700"
      >
        {t(locale, "product.backToShop")}
      </Link>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          {main ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={main}
              alt={product.name}
              className="aspect-square w-full rounded-lg object-cover"
            />
          ) : (
            <div className="aspect-square w-full rounded-lg bg-zinc-100" />
          )}

          {gallery.length > 0 ? (
            <div className="mt-3 flex gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={main}
                alt=""
                className="h-16 w-16 rounded-md object-cover ring-2 ring-offset-1"
                style={{ ringColor: store.primaryColor }}
              />
              {gallery.map((url) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={url}
                  src={url}
                  alt=""
                  className="h-16 w-16 rounded-md object-cover opacity-70 hover:opacity-100 transition"
                />
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{product.name}</h1>
          {product.caption ? (
            <p className="mt-2 text-zinc-600">{product.caption}</p>
          ) : null}
          <p className="mt-4 text-xl font-semibold text-zinc-900">
            {t(locale, "product.priceNpr")}{" "}
            {product.priceNpr.toLocaleString("en-IN")}
          </p>

          {product.available ? (
            <AddToCartButton
              productId={product.id}
              label={t(locale, "product.addToCart")}
              addedLabel={t(locale, "product.added")}
              primaryColor={store.primaryColor}
            />
          ) : (
            <p className="mt-4 text-sm font-medium text-red-600">
              {t(locale, "product.outOfStock")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: same forward-ref issue from Task 6 (add-to-cart imports cart actions). Will resolve in Task 8.

- [ ] **Step 3: Commit**

```bash
git add "src/app/[shop]/product/[id]/page.tsx"
git commit -m "feat(storefront): add product detail page with gallery + add-to-cart"
```

---

### Task 8: `src/app/[shop]/cart/actions.ts` + `cart/page.tsx`

**Files:**
- Create: `src/app/[shop]/cart/actions.ts`
- Create: `src/app/[shop]/cart/page.tsx`

**Interfaces:**
- Consumes: `parseCartCookie`, `serializeCart`, `CART_COOKIE` (from `@/lib/cart`), `computeTotal` (from `@/lib/order`)
- Produces:
  - `type CartActionState = { ok?: boolean; error?: string }`
  - `addToCartItem(productId: string): Promise<CartActionState>` — Server Action
  - `setCartQty(productId: string, qty: number): Promise<CartActionState>` — Server Action
  - `clearCart(): Promise<void>` — Server Action
  - Cart page: reads cookie, joins against DB, renders lines with qty steppers

- [ ] **Step 1: Implement cart actions**

Create `src/app/[shop]/cart/actions.ts`:
```ts
"use server";

// Cart cookie mutation actions — each validates payload, merges into
// parseCartCookie, writes the cookie. Next re-renders the current route
// so the badge updates in the same roundtrip. See Phase 2 spec §4.

import { cookies } from "next/headers";
import { parseCartCookie, serializeCart, CART_COOKIE, type CartMap } from "@/lib/cart";

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
  _fd: FormData,
  productId: string,
): Promise<CartActionState> {
  if (!/^[a-zA-Z0-9-]{1,64}$/.test(productId)) {
    return { error: "Invalid product." };
  }

  const cart = await readCart();
  const current = cart[productId] ?? 0;
  cart[productId] = Math.min(current + 1, 9);

  await writeCart(cart);
  return { ok: true };
}

export async function setCartQty(
  _prev: CartActionState,
  _fd: FormData,
  productId: string,
  qty: number,
): Promise<CartActionState> {
  if (!/^[a-zA-Z0-9-]{1,64}$/.test(productId)) {
    return { error: "Invalid product." };
  }

  const cart = await readCart();

  if (qty <= 0) {
    delete cart[productId];
  } else {
    cart[productId] = Math.max(1, Math.min(9, Math.floor(qty)));
  }

  await writeCart(cart);
  return { ok: true };
}

export async function clearCart(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CART_COOKIE);
}
```

- [ ] **Step 2: Implement the cart page**

Create `src/app/[shop]/cart/page.tsx`:
```tsx
// Cart page — reads cookie server-side, joins against DB for
// name/price/availability, renders lines. See Phase 2 spec §3.

import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { parseCartCookie, CART_COOKIE } from "@/lib/cart";
import { computeTotal } from "@/lib/order";
import { getLocale, t } from "@/lib/i18n";
import { CartLines } from "@/components/cart-lines";

type Props = {
  params: Promise<{ shop: string }>;
};

export default async function CartPage({ params }: Props) {
  const { shop } = await params;
  const slug = shop.toLowerCase().trim();
  const locale = getLocale((await cookies()).get("locale")?.value);

  const store = await prisma.store.findUnique({
    where: { slug },
    select: { id: true, name: true, primaryColor: true },
  });

  if (!store) notFound();

  const cookieStore = await cookies();
  const cart = parseCartCookie(cookieStore.get(CART_COOKIE)?.value ?? null);
  const productIds = Object.keys(cart);

  if (productIds.length === 0) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-zinc-900">
          {t(locale, "cart.title")}
        </h1>
        <p className="mt-4 text-zinc-500">{t(locale, "cart.empty")}</p>
        <Link
          href={`/${slug}`}
          className="mt-4 inline-block text-sm font-medium text-teal-700 hover:text-teal-800"
        >
          {t(locale, "cart.continueShopping")}
        </Link>
      </div>
    );
  }

  // Re-read products from DB scoped to this store — drop foreign/disabled
  const dbProducts = await prisma.product.findMany({
    where: { id: { in: productIds }, storeId: store.id, available: true },
  });

  const lines = dbProducts
    .map((p) => ({
      product: p,
      qty: cart[p.id] ?? 1,
    }))
    .sort((a, b) => a.product.name.localeCompare(b.product.name));

  const total = computeTotal(
    lines.map((l) => ({ priceNpr: l.product.priceNpr, qty: l.qty }))
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900">
        {t(locale, "cart.title")}
      </h1>

      <CartLines
        lines={lines}
        storeSlug={slug}
        total={total}
        totalLabel={t(locale, "cart.total")}
        checkoutLabel={t(locale, "cart.checkout")}
        removeLabel={t(locale, "cart.removeItem")}
        qtyLabel={t(locale, "cart.qtyLabel")}
        continueLabel={t(locale, "cart.continueShopping")}
        primaryColor={store.primaryColor}
      />
    </div>
  );
}
```

- [ ] **Step 3: Implement `cart-lines.tsx` client component**

Create `src/components/cart-lines.tsx`:
```tsx
"use client";

// Cart line items with qty steppers and remove — client component
// calling Server Actions. See Phase 2 spec §10.

import Link from "next/link";
import { useActionState } from "react";
import { setCartQty, clearCart, type CartActionState } from "@/app/[shop]/cart/actions";
import type { ProductModel } from "@/generated/prisma/models";

type Line = { product: ProductModel; qty: number };

type Props = {
  lines: Line[];
  storeSlug: string;
  total: number;
  totalLabel: string;
  checkoutLabel: string;
  removeLabel: string;
  qtyLabel: string;
  continueLabel: string;
  primaryColor: string;
};

export function CartLines({
  lines,
  storeSlug,
  total,
  totalLabel,
  checkoutLabel,
  removeLabel,
  qtyLabel,
  continueLabel,
  primaryColor,
}: Props) {
  return (
    <div className="mt-6">
      <ul className="divide-y divide-zinc-200">
        {lines.map(({ product, qty }) => (
          <li key={product.id} className="flex items-center gap-4 py-4">
            {product.imageUrls[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imageUrls[0]}
                alt=""
                className="h-16 w-16 rounded-md object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded-md bg-zinc-100" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-zinc-900">
                {product.name}
              </p>
              <p className="text-sm text-zinc-500">
                NPR {product.priceNpr.toLocaleString("en-IN")}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">{qtyLabel}</span>
              <QtyStepper
                productId={product.id}
                qty={qty}
                removeLabel={removeLabel}
                primaryColor={primaryColor}
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between border-t border-zinc-200 pt-4">
        <p className="text-lg font-semibold text-zinc-900">
          {totalLabel}: NPR {total.toLocaleString("en-IN")}
        </p>
        <Link
          href={`/${storeSlug}/checkout`}
          className="rounded-md px-4 py-2 text-sm font-medium text-white transition"
          style={{ backgroundColor: primaryColor }}
        >
          {checkoutLabel}
        </Link>
      </div>

      <div className="mt-4 text-center">
        <Link
          href={`/${storeSlug}`}
          className="text-sm text-zinc-500 hover:text-zinc-700"
        >
          {continueLabel}
        </Link>
      </div>
    </div>
  );
}

function QtyStepper({
  productId,
  qty,
  removeLabel,
  primaryColor,
}: {
  productId: string;
  qty: number;
  removeLabel: string;
  primaryColor: string;
}) {
  const [state, action, pending] = useActionState(
    (_prev: CartActionState, fd: FormData) => {
      const newQty = Number(fd.get("qty"));
      return setCartQty(_prev, fd, productId, newQty);
    },
    {} as CartActionState,
  );

  return (
    <div className="flex items-center gap-1">
      <form action={action}>
        <input type="hidden" name="qty" value={Math.max(0, qty - 1)} />
        <button
          type="submit"
          disabled={pending}
          className="h-7 w-7 rounded border border-zinc-300 text-sm hover:bg-zinc-100"
        >
          −
        </button>
      </form>
      <span className="w-6 text-center text-sm font-medium">{qty}</span>
      <form action={action}>
        <input type="hidden" name="qty" value={Math.min(9, qty + 1)} />
        <button
          type="submit"
          disabled={pending || qty >= 9}
          className="h-7 w-7 rounded border border-zinc-300 text-sm hover:bg-zinc-100"
        >
          +
        </button>
      </form>
      {qty <= 1 ? (
        <form action={action}>
          <input type="hidden" name="qty" value={0} />
          <button
            type="submit"
            disabled={pending}
            className="ml-1 text-xs text-red-600 hover:text-red-700"
          >
            {removeLabel}
          </button>
        </form>
      ) : null}
    </div>
  );
}
```

Note: The `setCartQty` signature in the actions file uses a curried pattern with `productId` and `qty` as extra args. The `useActionState` wrapper adapts it. Also — the `setCartQty` in the actions file has a slightly different signature: `setCartQty(prev, fd, productId, qty)`. The client component wraps it to fit `useActionState`'s expected `(prev, fd) => Promise<State>` shape.

- [ ] **Step 4: Fix the `setCartQty` signature in actions**

Update `src/app/[shop]/cart/actions.ts` — the `setCartQty` function needs to work both as a Server Action (called from client with FormData) and as a direct call from `useActionState`. The cleanest approach: make `setCartQty` a 2-arg Server Action `(prev, fd)` where `fd` contains `productId` and `qty` as hidden fields, and have the client put those in the form.

Update `setCartQty` in `actions.ts`:
```ts
export async function setCartQty(
  _prev: CartActionState,
  fd: FormData,
): Promise<CartActionState> {
  const productId = String(fd.get("productId") ?? "");
  const qty = Number(fd.get("qty"));

  if (!/^[a-zA-Z0-9-]{1,64}$/.test(productId)) {
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
```

And update `QtyStepper` in `cart-lines.tsx` to use hidden fields:
```tsx
function QtyStepper({
  productId,
  qty,
  removeLabel,
  primaryColor,
}: {
  productId: string;
  qty: number;
  removeLabel: string;
  primaryColor: string;
}) {
  const [state, action, pending] = useActionState(
    setCartQty,
    {} as CartActionState,
  );

  return (
    <div className="flex items-center gap-1">
      <form action={action}>
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="qty" value={Math.max(0, qty - 1)} />
        <button
          type="submit"
          disabled={pending}
          className="h-7 w-7 rounded border border-zinc-300 text-sm hover:bg-zinc-100"
        >
          −
        </button>
      </form>
      <span className="w-6 text-center text-sm font-medium">{qty}</span>
      <form action={action}>
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="qty" value={Math.min(9, qty + 1)} />
        <button
          type="submit"
          disabled={pending || qty >= 9}
          className="h-7 w-7 rounded border border-zinc-300 text-sm hover:bg-zinc-100"
        >
          +
        </button>
      </form>
      {qty <= 1 ? (
        <form action={action}>
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="qty" value={0} />
          <button
            type="submit"
            disabled={pending}
            className="ml-1 text-xs text-red-600 hover:text-red-700"
          >
            {removeLabel}
          </button>
        </form>
      ) : null}
    </div>
  );
}
```

Similarly, update `addToCartItem` to read `productId` from FormData:
```ts
export async function addToCartItem(
  _prev: CartActionState,
  fd: FormData,
): Promise<CartActionState> {
  const productId = String(fd.get("productId") ?? "");

  if (!/^[a-zA-Z0-9-]{1,64}$/.test(productId)) {
    return { error: "Invalid product." };
  }

  const cart = await readCart();
  const current = cart[productId] ?? 0;
  cart[productId] = Math.min(current + 1, 9);

  await writeCart(cart);
  return { ok: true };
}
```

And update `add-to-cart.tsx` to pass `productId` as a hidden field:
```tsx
"use client";

import { useActionState } from "react";
import { addToCartItem, type CartActionState } from "@/app/[shop]/cart/actions";

type Props = {
  productId: string;
  label: string;
  addedLabel: string;
  primaryColor: string;
};

export function AddToCartButton({
  productId,
  label,
  addedLabel,
  primaryColor,
}: Props) {
  const [state, action, pending] = useActionState(
    addToCartItem,
    {} as CartActionState,
  );

  return (
    <form action={action} className="mt-2">
      <input type="hidden" name="productId" value={productId} />
      <button
        type="submit"
        disabled={pending || state.ok}
        className="w-full rounded-md px-3 py-2 text-sm font-medium text-white transition disabled:opacity-70"
        style={{ backgroundColor: state.ok ? "#16a34a" : primaryColor }}
      >
        {state.ok ? addedLabel : pending ? "..." : label}
      </button>
    </form>
  );
}
```

This is the standard pattern: Server Actions receive `(prev, formData)` and read all inputs from `formData`. The `productId` goes in a hidden field, not as a closure arg.

- [ ] **Step 5: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: no errors now — the forward reference from Task 6/7 is resolved.

- [ ] **Step 6: Commit**

```bash
git add "src/app/[shop]/cart/actions.ts" "src/app/[shop]/cart/page.tsx" src/components/cart-lines.tsx src/components/add-to-cart.tsx
git commit -m "feat(cart): add cart actions, cart page, and cart-lines component"
```

---

### Task 9: `src/app/[shop]/checkout/actions.ts` + `checkout/page.tsx`

**Files:**
- Create: `src/app/[shop]/checkout/actions.ts`
- Create: `src/app/[shop]/checkout/page.tsx`

**Interfaces:**
- Consumes: `checkoutSchema` (from `./schema`), `parseCartCookie`/`CART_COOKIE` (from `@/lib/cart`), `computeTotal` (from `@/lib/order`), `getLocale`/`t` (from `@/lib/i18n`), `log` (from `@/lib/log`)
- Produces:
  - `type CheckoutFormState = { error?: string }`
  - `placeOrder(prev, fd): Promise<CheckoutFormState>` — Server Action (the security core)
  - Checkout page: read-only cart summary + checkout form

- [ ] **Step 1: Implement the `placeOrder` Server Action**

Create `src/app/[shop]/checkout/actions.ts`:
```ts
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
import { getLocale, t } from "@/lib/i18n";
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
    const firstError = parsed.error.issues[0]?.message ?? "checkout.invalidPayment";
    return { error: t(locale, firstError as any) };
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

  // 4. DB write in ONE transaction
  try {
    await prisma.$transaction(async (tx) => {
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
      const orderNo = (lastOrder?.orderNo ?? 0) + 1;

      // Create Order
      const order = await tx.order.create({
        data: {
          storeId: store.id,
          customerId: customer.id,
          orderNo,
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
    });
  } catch (e) {
    log("checkout:placeOrder", e);
    return { error: t(locale, "common.error") };
  }

  // 5. Clear the cart cookie
  cookieStore.delete(CART_COOKIE);

  // 6. Redirect OUTSIDE the try
  redirect(`/${trimmedSlug}/order-confirmed/${slug}`);
}
```

Wait — there's a bug in the redirect. The `orderNo` is computed inside the transaction but not accessible outside. Let me fix this. The `placeOrder` function needs to return the `orderNo` for the redirect. But Server Actions that redirect don't return — they throw. The solution: capture the `orderNo` in a variable outside the transaction block, and use it in the redirect.

Updated approach:
```ts
  let orderNo: number;

  try {
    await prisma.$transaction(async (tx) => {
      // ... (same as above)
      // After creating the order:
      orderNo = order.orderNo;
    });
  } catch (e) {
    log("checkout:placeOrder", e);
    return { error: t(locale, "common.error") };
  }

  // 5. Clear the cart cookie
  cookieStore.delete(CART_COOKIE);

  // 6. Redirect OUTSIDE the try
  redirect(`/${trimmedSlug}/order-confirmed/${orderNo}`);
```

This is the correct pattern. Let me write the full corrected version.

- [ ] **Step 2: Implement the checkout page**

Create `src/app/[shop]/checkout/page.tsx`:
```tsx
// Checkout page — read-only cart summary + checkout form.
// Dynamic render (reads cookies for cart). See Phase 2 spec §3.

import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { parseCartCookie, CART_COOKIE } from "@/lib/cart";
import { computeTotal } from "@/lib/order";
import { getLocale, t } from "@/lib/i18n";
import { CheckoutForm } from "@/components/checkout-form";
import Link from "next/link";

type Props = {
  params: Promise<{ shop: string }>;
};

export default async function CheckoutPage({ params }: Props) {
  const { shop } = await params;
  const slug = shop.toLowerCase().trim();
  const locale = getLocale((await cookies()).get("locale")?.value);

  const store = await prisma.store.findUnique({
    where: { slug },
    select: { id: true, name: true, primaryColor: true, qrImageUrl: true, paymentCod: true },
  });

  if (!store) notFound();

  const cookieStore = await cookies();
  const cart = parseCartCookie(cookieStore.get(CART_COOKIE)?.value ?? null);
  const productIds = Object.keys(cart);

  if (productIds.length === 0) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-zinc-900">
          {t(locale, "checkout.title")}
        </h1>
        <p className="mt-4 text-zinc-500">{t(locale, "checkout.cartEmpty")}</p>
        <Link
          href={`/${slug}`}
          className="mt-4 inline-block text-sm font-medium text-teal-700 hover:text-teal-800"
        >
          {t(locale, "store.backToShop")}
        </Link>
      </div>
    );
  }

  const dbProducts = await prisma.product.findMany({
    where: { id: { in: productIds }, storeId: store.id, available: true },
  });

  const lines = dbProducts
    .map((p) => ({
      product: p,
      qty: cart[p.id] ?? 1,
    }))
    .sort((a, b) => a.product.name.localeCompare(b.product.name));

  if (lines.length === 0) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-zinc-900">
          {t(locale, "checkout.title")}
        </h1>
        <p className="mt-4 text-zinc-500">{t(locale, "checkout.cartEmpty")}</p>
        <Link
          href={`/${slug}`}
          className="mt-4 inline-block text-sm font-medium text-teal-700 hover:text-teal-800"
        >
          {t(locale, "store.backToShop")}
        </Link>
      </div>
    );
  }

  const total = computeTotal(
    lines.map((l) => ({ priceNpr: l.product.priceNpr, qty: l.qty }))
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900">
        {t(locale, "checkout.title")}
      </h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        {/* Order summary */}
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">
            {t(locale, "checkout.orderSummary")}
          </h2>
          <ul className="mt-3 divide-y divide-zinc-200">
            {lines.map(({ product, qty }) => (
              <li key={product.id} className="flex items-center gap-3 py-3">
                {product.imageUrls[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.imageUrls[0]}
                    alt=""
                    className="h-12 w-12 rounded-md object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-md bg-zinc-100" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900">
                    {product.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {qty} × NPR {product.priceNpr.toLocaleString("en-IN")}
                  </p>
                </div>
                <p className="text-sm font-medium text-zinc-900">
                  NPR {(product.priceNpr * qty).toLocaleString("en-IN")}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-zinc-200 pt-4 text-right">
            <p className="text-lg font-semibold text-zinc-900">
              {t(locale, "cart.total")}: NPR {total.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        {/* Checkout form */}
        <CheckoutForm
          slug={slug}
          primaryColor={store.primaryColor}
          hasQr={!!store.qrImageUrl}
          labels={{
            name: t(locale, "checkout.name"),
            phone: t(locale, "checkout.phone"),
            phoneHint: t(locale, "checkout.phoneHint"),
            address: t(locale, "checkout.address"),
            addressHint: t(locale, "checkout.addressHint"),
            payment: t(locale, "checkout.payment"),
            cod: t(locale, "checkout.cod"),
            qr: t(locale, "checkout.qr"),
            qrHint: t(locale, "checkout.qrHint"),
            placeOrder: t(locale, "checkout.placeOrder"),
          }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Implement `checkout-form.tsx` client component**

Create `src/components/checkout-form.tsx`:
```tsx
"use client";

// Checkout form — useActionState with placeOrder bound to slug.
// See Phase 2 spec §10.

import { useActionState } from "react";
import { placeOrder, type CheckoutFormState } from "@/app/[shop]/checkout/actions";

type Labels = {
  name: string;
  phone: string;
  phoneHint: string;
  address: string;
  addressHint: string;
  payment: string;
  cod: string;
  qr: string;
  qrHint: string;
  placeOrder: string;
};

type Props = {
  slug: string;
  primaryColor: string;
  hasQr: boolean;
  labels: Labels;
};

export function CheckoutForm({
  slug,
  primaryColor,
  hasQr,
  labels,
}: Props) {
  const [state, action, pending] = useActionState(
    (prev: CheckoutFormState, fd: FormData) => placeOrder(prev, fd, slug),
    {} as CheckoutFormState,
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-700">
          {labels.name}
        </label>
        <input
          type="text"
          name="name"
          required
          maxLength={80}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700">
          {labels.phone}
        </label>
        <input
          type="tel"
          name="phone"
          required
          pattern="9[678][0-9]{8}"
          maxLength={10}
          placeholder="98XXXXXXXX"
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-zinc-500">{labels.phoneHint}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700">
          {labels.address}
        </label>
        <textarea
          name="address"
          required
          maxLength={200}
          rows={2}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-zinc-500">{labels.addressHint}</p>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-zinc-700">
          {labels.payment}
        </legend>
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="paymentType"
              value="cod"
              defaultChecked
              className="text-teal-600"
            />
            <span className="text-sm">{labels.cod}</span>
          </label>
          {hasQr ? (
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="paymentType"
                value="qr"
                className="text-teal-600"
              />
              <span className="text-sm">{labels.qr}</span>
            </label>
          ) : null}
        </div>
      </fieldset>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md px-4 py-3 text-sm font-medium text-white transition disabled:opacity-70"
        style={{ backgroundColor: primaryColor }}
      >
        {pending ? "..." : labels.placeOrder}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[shop]/checkout/actions.ts" "src/app/[shop]/checkout/page.tsx" src/components/checkout-form.tsx
git commit -m "feat(checkout): add placeOrder action, checkout page + form"
```

---

### Task 10: `src/app/[shop]/order-confirmed/[orderNo]/page.tsx`

**Files:**
- Create: `src/app/[shop]/order-confirmed/[orderNo]/page.tsx`

**Interfaces:**
- Consumes: `OrderModel` (via storeId + orderNo lookup)
- Produces: thank-you page showing order number, WhatsApp link (if store.whatsappNumber set)

- [ ] **Step 1: Implement the order-confirmed page**

Create `src/app/[shop]/order-confirmed/[orderNo]/page.tsx`:
```tsx
// Thank-you page — order number, "we'll call to confirm", WhatsApp link.
// Reads order by storeId + orderNo. Random access to another store's
// orderNo must 404. See Phase 2 spec §3.

import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getLocale, t } from "@/lib/i18n";

type Props = {
  params: Promise<{ shop: string; orderNo: string }>;
};

export default async function OrderConfirmedPage({ params }: Props) {
  const { shop, orderNo } = await params;
  const slug = shop.toLowerCase().trim();
  const locale = getLocale((await cookies()).get("locale")?.value);
  const orderNoNum = parseInt(orderNo, 10);

  if (!Number.isInteger(orderNoNum) || orderNoNum < 1) notFound();

  const store = await prisma.store.findUnique({
    where: { slug },
    select: { id: true, name: true, whatsappNumber: true },
  });

  if (!store) notFound();

  const order = await prisma.order.findFirst({
    where: { storeId: store.id, orderNo: orderNoNum },
    select: { id: true, orderNo: true, totalNpr: true, paymentType: true },
  });

  if (!order) notFound();

  const whatsappUrl = store.whatsappNumber
    ? `https://wa.me/${store.whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Order #${order.orderNo} placed on ${store.name}`
      )}`
    : null;

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
        ✓
      </div>

      <h1 className="text-2xl font-bold text-zinc-900">
        {t(locale, "order.confirmed")}
      </h1>

      <p className="mt-2 text-lg text-zinc-700">
        {t(locale, "order.number")}
        <span className="font-bold">{order.orderNo}</span>
      </p>

      <p className="mt-4 text-zinc-500">
        {t(locale, "order.thankYou")}
      </p>

      <p className="mt-2 text-sm text-zinc-500">
        {t(locale, "cart.total")}: NPR {order.totalNpr.toLocaleString("en-IN")} ·{" "}
        {order.paymentType === "cod" ? t(locale, "checkout.cod") : t(locale, "checkout.qr")}
      </p>

      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition"
        >
          {t(locale, "order.whatsapp")}
        </a>
      ) : null}

      <div className="mt-8">
        <Link
          href={`/${slug}`}
          className="text-sm text-zinc-500 hover:text-zinc-700"
        >
          {t(locale, "order.backToShop")}
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/[shop]/order-confirmed/[orderNo]/page.tsx"
git commit -m "feat(order): add order-confirmed thank-you page"
```

---

### Task 11: Full DoD — build, walkthrough, review pass, commit

**Files:**
- Modify: `PROGRESS.md` (mark Phase 2 in progress/done, add review log lines)

- [ ] **Step 1: Build + restart dev server**

Run: `npm run build` — must pass. Then start `npm run dev` fresh.

- [ ] **Step 2: Run the full vitest suite**

Run: `npm test`
Expected: all tests pass (cart, checkout schema, order helpers).

- [ ] **Step 3: Manual walkthrough (phone-width window)**

1. Open `http://localhost:3000/sitasfashion` → themed product grid with 3 demo products (Cotton Kurta, Daura Suruwal, Pashmina Shawl).
2. Click a product → product detail page with gallery, caption, NPR price, "Add to cart" button.
3. Click "Add to cart" → button swaps to "Added ✓", cart badge shows in header.
4. Open cart page → line items with qty steppers, totals, "Checkout" link.
5. Change qty with +/− steppers → total updates. Remove a line → line disappears.
6. Click "Checkout" → checkout form with order summary + name/phone/address + COD radio.
7. Fill in: `Ram Sharma`, `9800000000`, `Kathmandu, Bagmati`, COD → "Place order" → redirect to thank-you page showing Order #1.
8. **Tenant check:** open `http://localhost:3000/someotherstore` → 404.
9. **Cross-store cookie:** hand-craft a cookie with another store's product id → silently dropped, empty cart on checkout.
10. **QR flow:** upload a QR to the demo store via dashboard design page → re-do checkout with QR selected → QR image shows.
11. Flip to नेपाली — all storefront labels change (parity is compiled).
12. **Prisma Studio:** verify Customer (deduped by phone), Order (orderNo 1, correct totalNpr), OrderItem (snapshotted names+prices), Delivery (status "ready") rows present.

- [ ] **Step 4: §5.8 review pass**

Run (per `docs/PLAN.md` §5.8): `differential-review`, `clean-code`, `refactoring`, `supply-chain-risk-auditor`, `insecure-defaults`, `sharp-edges`, `static-analysis` (Semgrep). Fix every real finding before commit; log one line per review in `PROGRESS.md`.

- [ ] **Step 5: Update PROGRESS.md + commit the phase**

Mark Phase 2 done in `PROGRESS.md` (status table + "Done in Phase 2" bullets + review log). Then:
```bash
git add -A
git commit -m "Phase 2: storefront + checkout (reviewed)"
git tag phase-2
```
Push only if the user asks.

**Definition of Done — from the spec §15:** `npm run build` passes · routes `/[shop]`, `/[shop]/product/[id]`, `/[shop]/cart`, `/[shop]/checkout`, `/[shop]/order-confirmed/[orderNo]` exist · live walkthrough works (add to cart → checkout → order confirmed) · Prisma Studio rows present · unknown slug → 404 · cross-store cookie isolation · §5.8 review pass clean-and-logged. When all hold, Phase 2 is done.
