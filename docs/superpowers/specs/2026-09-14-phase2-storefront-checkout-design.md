# Phase 2 Design — Customer storefront + checkout

Date: 2026-09-14. Status: approved in chat (brainstorming), written to disk.
Supersedes nothing. Extends `docs/PLAN.md` §14 Phase 2 with the decisions below.

## 1. Goal

A customer who opens an owner's public store link can browse the product grid,
open a product, add to cart, check out (name + phone + address), pay by **COD**
or **Scan QR**, and land on a thank-you page showing their order number. The
order (Customer + Order + OrderItem + Delivery) persists and appears in the
owner's dashboard in Phase 3. Tenant isolation holds: order data is only ever
visible to the store that owns it.

DoD (plan §14): *place a COD order and a QR order as a "customer"; both appear
in the owner dashboard; tenant rule verified* — plus the §5.8 review pass.

## 2. Decisions locked in brainstorming (2026-09-14)

| Question | Decision |
|---|---|
| Cart persistence | **Cookie-based.** Cart items live in an HTTP cookie (`swiftshop_cart`) so the server reads them in Server Components for SSR and in Server Actions for validation. No login, no localStorage-only. |
| Stock at checkout | **Validate only.** `Product.available === false` → cannot add/order. `store.stock === 0` is NOT treated as out-of-stock yet (the seed + product form don't manage stock); no decrement. Inventory UI lands in Phase 3. |
| Templates | **One themed look.** Storefront applies `primaryColor` + `logoUrl` + category accent over a single clean product-grid design. Distinct per-template skins are Phase 6 polish. |

## 3. Routes

All routes are public (no auth). A store slug is the URL segment, matching
`Store.slug`. Static top-level routes (`/`, `/login`, `/signup`, `/dashboard/*`)
win over `[shop]` (Next resolves static before dynamic), so no conflict.

Deviation from plan (`[shop]/product/[id]` → `[shop]/product/[id]` kept as-is —
the plan already uses `id`, and URLs never expose a store's slug conflict).

| Route | Purpose | Key security note |
|---|---|---|
| `/[shop]` (`page.tsx`) | Public store home: themed header (logo + name + slug), product grid, cart summary | 404 when slug unknown. `revalidatePath` after checkout? No — the store page is per-request dynamic (reads cookie + DB). |
| `/[shop]/product/[id]` | Product detail: gallery (first = main), caption, price NPR, Add to cart, quantity | Product must belong to `store` loaded by slug — prove ownership by `storeId`. |
| `/[shop]/cart` | Cart line items, quantities, totals, clear; "Checkout" link | Reads the cart cookie; revalidates item availability/prices against the DB. |
| `/[shop]/checkout` | Order form: name + phone + address + payment choice (COD | QR shows `qrImageUrl`) + order summary | Server Action `placeOrder` (below). |
| `/[shop]/order-confirmed/[orderNo]` | Thank-you page: order number, "we'll call to confirm", WhatsApp-me + store phone if set | Reads order by `storeId + orderNo` — random access to another store's order number must 404. |

The cart itself needs no URL — it lives in the cookie and is read by `/[shop]`
header, `/cart`, and `/checkout`. Cart badge count = number of distinct lines
(or summed qty — pick summed qty for a badge).

## 4. Cart cookie

- Name: `swiftshop_cart`. Single cookie set by a Server Action (see `addToCartItem`).
- Value: `encodeURIComponent(JSON.stringify({ [productId]: qty, ... }))` — a
  plain, tamperable-but-harmless JSON map `productId → qty`. The cookie is a
  *cart intent*, never a trust boundary: the server always re-prices and
  re-validates product IDs against the DB at read time and at order time.
- qty is an integer `1..9` (cap per line to keep the cookie bounded).
- Size cap: `Math.min` cart to 20 distinct products. Cookie ~ a few KB max.
- Read path: a `readCartCookie(cookieValue): CartMap` pure helper (unit-tested)
  that parses, validates `[a-zA-Z0-9-]{1,64}` product ids, clamps qty, and
  drops junk. Invalid/oversized cookies parse to an empty cart.
- Write path: dedicated `"use server"` action file `src/app/[shop]/cart/actions.ts`
  (below), because Server Actions live in files, and `[shop]` dynamic routes
  can't `"use server"` inline in a route segment consistently. Cart mutations
  (`add`, `setQty`, `clear`) set the cookie in the action response — Next
  re-renders the current route so the badge updates in the same roundtrip.
- Per-store scoping: the cookie is global to the browser but the store slug is
  part of the value? No — simpler: the cookie holds only `productId → qty`,
  and product ids are globally unique cuids. A cart carried across stores is
  harmless: every read/order path filters by the *current* store's products.
  (Decision: no per-store cart partition in v1.)

## 5. Order placement (server action) — the security core

`src/app/[shop]/checkout/actions.ts` → `placeOrder(prev, formData, slug)`.

The action must never trust the cart cookie's prices/ids on their own — it
re-reads every line from the DB, scoped to the store resolved from `slug`:

1. **Resolve store** by `slug` (lowercased/trimmed). Unknown → `notFound()`.
2. **Validate checkout form** with Zod (below). Fail → friendly translated error.
3. **Re-read cart from the DB:** for each `productId` in the cookie, load the
   product where `{ id, storeId: store.id }`. Drop ids that are missing, belong
   to another store, or have `available === false`. This is the tenant + stock
   boundary — a cookie line pointing at another store's product is silently
   dropped, never ordered.
4. **Empty after filtering** → `{ error: "checkout.cartEmpty" }`.
5. **Create Math globally:** total = Σ `priceNpr × qty` (integers only).
6. **DB write in ONE `prisma.$transaction`**: find-or-create `Customer`
   (match by `storeId + phone + name` to avoid duplicate customers; create when
   the phone is new), create `Order` with `orderNo` = `(max orderNo for store)+1`
   (compute inside the transaction so two customers can't race to the same
   number — the `@@unique([storeId, orderNo])` constraint backs it up), the
   snapshotted `totalNpr`, `paymentType`, default `paymentStatus: "unpaid"` for
   both COD and QR (owner marks paid in Phase 3), create `OrderItem[]` from the
   DB-read rows (snapshot name + price), create a `Delivery` row with
   `status: "ready"` (handoff actions are Phase 4).
7. **Clear the cart cookie** (delete) so the thank-you page shows an empty cart.
8. `redirect("/[slug]/order-confirmed/<orderNo>")` — OUTSIDE the try, per the
   never-redirect-in-try rule.

Zod checkout schema (`zod`) — lives in its own pure module
`src/app/[shop]/checkout/schema.ts` (Phase 1 convention; unit-testable):
- `name`: `z.string().trim().min(1).max(80)` → `checkout.invalidName`
- `phone`: Nepali mobile `^9[678]\d{8}$` (10 digits) → `checkout.invalidPhone`
  (decision: mobile only; +977 IS NOT accepted in v1 — keep strict, refine in
  polish if needed)
- `address`: `z.string().trim().min(1).max(200)` → `checkout.invalidAddress`
  (decision: always required — every order goes through delivery/self-Delivery
  in v1; the plan's "required when delivery" collapses to "always required")
- `paymentType`: `z.enum(["cod", "qr"])` → `checkout.invalidPayment`
- If `paymentType === "qr"` and `store.qrImageUrl` is null → `{ error:
  "checkout.noQr" }` (friendly: owner hasn't uploaded a QR yet; fall back to COD).

## 6. Data flow & revalidation

- **Add to cart** from product page → Server Action sets the cookie → Next
  re-renders the current route (header badge) in the same roundtrip.
- **Cart page** reads the cookie server-side, joins against the DB for
  name/price/availability, renders lines. Changing qty / removing a line is a
  Server Action that rewrites the cookie (same re-render). "Clear" deletes it.
- **Checkout** renders the same DB-joined cart read-only + the form.
- **Place order** redirects to the thank-you page; that page queries
  `Order` by `storeId + orderNo`, shows orderNo, and (if set) a WhatsApp-me
  `wa.me/<whatsappNumber>` link with a pre-filled "Order #N placed" message.
- No `revalidatePath` on the storefront in Phase 2: store/product pages are
  dynamic (they read `cookies()` for the cart + DB each request), so the freshest
  state shows automatically. This is the same dynamic-rendering posture the
  dashboard already uses.

## 7. i18n

All new strings added to `en.ts` and mirrored in `ne.ts` under new
`store.*`, `cart.*`, `checkout.*`, `order.*` key groups. Dict parity is a
compile error (existing rule).

## 8. Theming

The storefront header + product grid read `Store.primaryColor`, `logoUrl`,
`name`, `slug`, `category`. A single `StorefrontHeader` renders the logo (or
initial), name, and a cart badge. The color is applied via inline `style`
(`--brand: primaryColor`) on the header CTA/links so it reflects immediately,
and a small category accent (clothing/electronics/general) adjusts the product
card label tone. Plan §13's three distinct skins are out of scope (decision 3).

## 9. New/updated lib modules

- `src/lib/cart.ts` — pure, unit-tested:
  - `parseCartCookie(value: string | null): CartMap` (map `productId → qty`,
    validated ids, qty clamp 1..9, 20-line cap, junk dropped)
  - `serializeCart(cart: CartMap): string` (JSON, URL-encoded) — used by actions.
  - `CART_COOKIE = "swiftshop_cart"`
- `src/app/[shop]/cart/actions.ts` — `"use server"`; `addToCartItem(productId)`,
  `setCartQty(productId, qty)`, `clearCart()`; each validates the payload,
  merges into `parseCartCookie`, writes the cookie.
- `src/lib/order.ts` (pure helper) — `computeTotal(lines)` (Σ `priceNpr × qty`,
  integers) so the total math is unit-tested and reused by the cart page and
  the order action. The max+1 `orderNo` read stays inline in the action's
  transaction (it is inherently a DB query, not unit-testable pure math).

## 10. Components (client + server)

- `storefront-header.tsx` (server) — themed header, logo, name, cart badge.
- `product-card.tsx` (server-presentational) — photo, name, NPR price, "Add"
- `add-to-cart.tsx` (client) — small form firing `addToCartItem(productId)`;
  button label swaps to "Added ✓" optimistically.
- `cart-lines.tsx` (client) — qty steppers / remove firing `setCartQty`/line
  remove; totals row.
- `checkout-form.tsx` (client) — `useActionState(placeOrder bound to slug)`,
  name/phone/address inputs + COD/QR radio; QR expiry: when `qr` chosen and
  `qrImageUrl` present, the QR image is surfaced on the thank-you page too.
- `order-confirmed.tsx` (server) — big order number, WhatsApp link (if
  `whatsappNumber`), "Back to shop".

## 11. Zod phone decision

`^9[678]\d{8}$` accepts 98/97/96 + 8 digits = the NTC/Ncell 10-digit mobile
pattern from `docs/PLAN.md` §14 Phase 2. No landlines, no `+977` in v1. If the
walkthrough needs a number, use `9800000000`. (Friendly validation copy:
"Enter a valid 10-digit mobile number like 98XXXXXXXX.")

## 12. Money & data rules (unchanged invariants, restated)

- `totalNpr` = Σ snapshotted `priceNpr × qty`, integers only. Never floats.
- Every store-scoped read on the storefront (products, order lookup) resolves
  the store by slug first, then scopes by `store.id` — the same boundary
  `requireStore()` gives the dashboard, but for unauthenticated pages.
- `Customer` dedupe key: `storeId + phone` (name can vary; phone is the
  identity for WhatsApp delivery — matching the delivery partner workflow).
- Order number: per-store increment via `(max)+1` inside `$transaction`,
  hard-backed by `@@unique([storeId, orderNo])`.

## 13. Testing

Extend the vitest pure-logic suite (project convention — no DOM tests):
- `src/lib/cart.test.ts` — parse valid/invalid/oversized cookies; qty clamp;
  junk dropped; serialize round-trip; 20-line cap.
- `src/app/[shop]/checkout/schema.test.ts` — Zod: valid name/phone/address/type;
  bad phone (`"123"`, `9800`), empty address, bad payment type.
- `src/lib/order.test.ts` — `computeTotal` sums integers, clamps qty, rejects
  empty lines.

Actions/pages are exercised by the DoD walkthrough (below) and the Phase 3
tenant cross-check once the dashboard's orders list exists.

## 14. Out of scope (Phase 3/4/6)

Order list/detail in the dashboard, status transitions, stock decrement,
delivery handoff actions + manifest + WhatsApp notifications, per-template
skins, custom domains/subdomains, cart across stores with different currency,
email order receipts, `+977` landline parsing.

## 15. Definition of Done

1. `npm run build` passes; `npm run dev` boots; routes `/[shop]`,
   `/[shop]/product/[id]`, `/[shop]/cart`, `/[shop]/checkout`,
   `/[shop]/order-confirmed/[orderNo]` exist.
2. Live walkthrough (using the demo store `sitasfashion` which already has 3
   products): open `/sitasfashion` → themed product grid → add a product to
   cart → cart shows line + qty stepper → checkout with `9800000000` + address
   + **COD** → thank-you shows order number → repeat with **QR** (upload a QR
   to the demo store via the design page first) → QR image appears.
3. `npx prisma studio`: `Customer` (deduped by phone), `Order` (orderNo 1, 2…,
   correct `totalNpr`), `OrderItem` (snapshotted names+prices), `Delivery`
   (status `ready`) rows present.
4. Unknown slug `/nope` → 404 storefront not-found. Another store's product id
   added via a hand-crafted cookie → silently dropped, never ordered.
5. A second owner's demo store is isolated: order-confirmed for the first
   owner's orderNo under the second owner's slug → 404.
6. §5.8 review pass runs clean (or findings fixed + logged) before commit.