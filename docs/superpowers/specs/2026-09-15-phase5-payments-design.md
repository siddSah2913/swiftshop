# Phase 5 — Real Online Payments (eSewa + Khalti)

## Overview

Add real payment gateway support: eSewa (Intent flow) and Khalti (ePayment API), with per-store gateway toggles, server-side payment verification, sandbox-mode demo flow, and a `requirePayToDeliver` gate.

**Goal:** A customer can checkout with eSewa/Khalti, get redirected to the gateway's sandbox payment page, complete payment, return to the store, and the order is marked paid after server-side verification. Unpaid non-COD orders cannot be marked delivered when the shop owner enables `requirePayToDeliver`.

---

## Architecture

### Payment adapter system (`src/lib/payments/`)

Mirrors the existing `src/lib/delivery/` adapter pattern — pure modules, one file per gateway, a registry in `index.ts`.

```
src/lib/payments/
  types.ts          — PaymentGatewayId, PaymentAdapter interface, shared types
  khalti.ts         — Khalti ePayment adapter
  esewa.ts          — eSewa Epay adapter  
  demo.ts           — Demo adapter (sandbox stand-in for local dev)
  index.ts          — getPaymentAdapter(), isGatewayConfigured(), registry
  callback-verify.ts — shared CAS-based payment verification helpers
```

**`types.ts`**
```ts
export const PAYMENT_GATEWAY_IDS = ["esewa", "khalti"] as const;
export type PaymentGatewayId = (typeof PAYMENT_GATEWAY_IDS)[number];

export type PaymentInitResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; error: string };

export type PaymentVerifyResult =
  | { ok: true; amountNpr: number }
  | { ok: false; reason: "invalid" | "amount-mismatch" | "not-completed" | "network-error" };

export interface PaymentAdapter {
  id: PaymentGatewayId;
  label: string;
  isConfigured(): boolean;
  /** Build the redirect URL for the customer to complete payment. */
  createPayment(params: {
    orderId: string;
    orderNo: number;
    amountNpr: number;
    storeSlug: string;
  }): Promise<PaymentInitResult>;
  /** Server-side verify: confirm payment was completed and amount matches. */
  verifyPayment(params: {
    pidx: string;
    amountNpr: number;
  }): Promise<PaymentVerifyResult>;
}
```

**`index.ts`** — `getPaymentAdapter(gatewayId): PaymentAdapter | null`
- When `NODE_ENV !== "production"` and env keys are missing: return demo adapter.
- When env keys are present: return real adapter.
- When `NODE_ENV === "production"` and keys are missing: return null (gateway unavailable).

---

## Database changes (one migration)

**Store — per-store gateway toggles:**
```
Store.paymentCod      Boolean @default(true)   // already exists
Store.paymentEsewa    Boolean @default(false)   // NEW — owner opts in per store
Store.paymentKhalti   Boolean @default(false)   // NEW — owner opts in per store
```

**Order — payment tracking:**
```
Order.paymentRef      String?                   // NEW — gateway transaction ID (pidx for Khalti)
Order.paidAt          DateTime?                 // NEW — timestamp of successful payment
```

**Store — delivery gate:**
```
Store.requirePayToDeliver Boolean @default(false) // NEW — gate unpaid non-COD delivery
```

---

## Checkout flow changes

**`src/app/[shop]/checkout/schema.ts`** — expand accepted payment types:
```ts
const PAYMENT_TYPES = ["cod", "qr", "esewa", "khalti"] as const;
```

**Server-side: available gateways are computed from the store record.**
- The checkout page loads `store.paymentCod`, `store.paymentEsewa`, `store.paymentKhalti`, `store.qrImageUrl`.
- The payment radio options rendered are derived from these flags — never from a client-side constant.
- `placeOrder` rejects any `paymentType` not in the expanded `PAYMENT_TYPES` via `checkoutSchema` superRefine.

**`placeOrder` redirect logic change:**
```
if paymentType is "esewa" or "khalti":
  getPaymentAdapter(paymentType)
  createPayment({ orderId, orderNo, totalNpr, storeSlug })
  on success: return { ok: true, redirectUrl } (NOT redirect())
  on failure: return { error: locale string }
else:
  redirect(/<slug>/order-confirmed/<orderNo>)   // existing behavior
```

The client handles the gateway redirect:
```ts
const result = await placeOrder(prev, fd, slug);
if (result.redirectUrl) {
  window.location.href = result.redirectUrl;  // navigate away to gateway
} else if (result.ok) {
  router.push(`/${slug}/order-confirmed/...`);
}
```

---

## Callback route

**`GET /api/payments/[gateway]/callback`** (Next.js App Router route handler)

Query params vary by gateway — Khalti sends `pidx`, eSewa sends `oid` + `refId`.

1. Parse and validate the gateway param + query string.
2. Load the Order by matching the transaction reference (or orderId encoded in the state param).
3. Call `getPaymentAdapter(gateway).verifyPayment(...)`.
4. CAS update: `prisma.order.update({ where: { id, paymentStatus: "unpaid" }, data: { paymentStatus: "paid", paymentRef: pidx, paidAt: new Date() } })`.
   - P2025 on the compound-where = already paid → safe (idempotent callback).
5. Redirect to `/<slug>/order-confirmed/<orderNo>`.

---

## Delivery gate (`requirePayToDeliver`)

When `Store.requirePayToDeliver === true`, `markDelivered` (in `src/app/dashboard/orders/actions.ts`) refuses delivery for orders that are:
- `paymentStatus === "unpaid"` AND
- `paymentType !== "cod"` (COD is excluded — cash is collected at the door)

Returns `"orders.paymentRequired"` error key when blocked.

---

## Khalti adapter detail

- **Initiate:** `POST https://a.khalti.com/api/v2/epayment/initiate/`
  - Auth: `key <KHALTI_SECRET_KEY>`
  - Body: `{ amount, product_identity, product_name, product_url, event_handler, amount_breakdown, customer }`
  - Response: `{ pidx, payment_url }`
- **Lookup/verify:** `POST https://a.khalti.com/api/v2/epayment/lookup/`
  - Body: `{ pidx }`
  - Accept only when `state === "Completed"` AND `amount` matches DB total (NPR in paisa: `totalNpr * 100`)
- **Return URL:** `/api/payments/khalti/callback?pidx=<pidx>`

---

## eSewa adapter detail

- **Initiate:** Form POST to `https://epay.sandbox.nic.np/pay/process`
  - Fields: `tAmt, amt, psc, pdc, txAmt, productCode, productList, taxAmount`
  - HMAC-SHA256 signature in `signature` field (using `ESEWA_SECRET_KEY`)
  - The form auto-submits — the customer sees the eSewa sandbox payment page
- **Verify (sandbox):** `GET https://epay.sandbox.nic.np/api/epay/transaction/status?oid=<oid>&refId=<refId>`
  - Accept when `status === "COMPLETE"` and amount matches
- **Return URL:** `/api/payments/esewa/callback?oid=<oid>&refId=<refId>`

---

## Per-store gateway toggle UI

A minimal settings section added to the dashboard layout — a single page at `src/app/dashboard/settings/page.tsx` with:

1. **Payment Methods** section: checkboxes for `paymentCod`, `paymentEsewa`, `paymentKhalti`, plus the existing QR image upload.
2. **Delivery** section: the `requirePayToDeliver` toggle and existing `deliveryPartner` select.

This is a Phase 5 "MVP settings page" — not a full settings dashboard, just the payment/delivery controls the new gateways need.

---

## i18n keys (en + ne, parity = compile error)

| Key | en | ne |
|---|---|---|
| `checkout.payWith` | Pay with | भुक्तानी गर्नुहोस् |
| `checkout.payEsewa` | eSewa | eSewa |
| `checkout.payKhalti` | Khalti | Khalti |
| `checkout.paymentRedirect` | Redirecting to payment gateway… | भुक्तानी गेटवेमा पुर्‍याइँदैछ… |
| `checkout.paymentFailed` | Payment initiation failed. Please try again. | भुक्तानी सुरु हुन सकेन। फेरि प्रयास गर्नुहोस्। |
| `settings.title` | Settings | सेटिङ्स |
| `settings.paymentMethods` | Payment Methods | भुक्तानी विधिहरू |
| `settings.enableCod` | Cash on Delivery | डेलिभरीमा नगद भुक्तानी |
| `settings.enableQr` | QR Payment | QR भुक्तानी |
| `settings.enableEsewa` | eSewa | eSewa |
| `settings.enableKhalti` | Khalti | Khalti |
| `settings.requirePayToDeliver` | Require payment before delivery | डेलिभरी अघि भुक्तानी आवश्यक |
| `settings.requirePayToDeliverHint` | Non-COD orders must be paid before marking delivered | गैर-COD अर्डरहरू डेलिभरी चिन्ह लगाउनुअघि भुक्तानी भएको हुनुपर्छ |
| `orders.paymentRequired` | This order must be paid before delivery | यो अर्डर डेलिभरी अघि भुक्तानी भएको हुनुपर्छ |
| `payment.verified` | Payment verified | भुक्तानी प्रमाणित भयो |
| `payment.failed` | Payment verification failed | भुक्तानी प्रमाणीकरण असफल भयो |
| `payment.amountMismatch` | Payment amount does not match order total | भुक्तानी रकम अर्डर कुलसँग मेल खाँदैन |

---

## Implementation tasks (TDD-first)

### T1 — Payment adapter types + registry + demo adapter (tests-first)
**Files:** `src/lib/payments/types.ts`, `demo.ts`, `index.ts`, `payments.test.ts`
- Define `PaymentGatewayId`, `PaymentAdapter` interface, `PaymentInitResult`, `PaymentVerifyResult`.
- Implement demo adapter that returns fake redirect URL and always verifies OK.
- `getPaymentAdapter()`: returns demo in dev (no keys), real when keys present, null in prod without keys.
- **Tests-first:** demo adapter `createPayment` returns ok with URL; `verifyPayment` returns ok; `getPaymentAdapter("khalti")` returns adapter when key env var set, null when missing; unknown id throws.

### T2 — Khalti adapter (tests-first)
**Files:** `src/lib/payments/khalti.ts`, `khalti.test.ts`
- `isConfigured()`: checks `KHALTI_SECRET_KEY` env var.
- `createPayment()`: POST to Khalti initiate API, return `payment_url`.
- `verifyPayment()`: POST to Khalti lookup API, check `state === "Completed"` + amount match (NPR → paisa).
- **Tests (mocked fetch):** initiate success/failure; verify completed/incomplete/amount-mismatch; auth header format.

### T3 — eSewa adapter (tests-first)
**Files:** `src/lib/payments/esewa.ts`, `esewa.test.ts`
- `isConfigured()`: checks `ESEWA_MERCHANT_CODE` + `ESEWA_SECRET_KEY`.
- `createPayment()`: build form POST with HMAC-SHA256 signature.
- `verifyPayment()`: GET transaction status API, check `COMPLETE` + amount match.
- **Tests:** HMAC signature correctness (known input → known output); form field construction; verify success/failure paths.

### T4 — DB migration
**Files:** `prisma/schema.prisma` (update), migration file
- Add `Store.paymentEsewa Boolean @default(false)`, `Store.paymentKhalti Boolean @default(false)`, `Store.requirePayToDeliver Boolean @default(false)`.
- Add `Order.paymentRef String?`, `Order.paidAt DateTime?`.
- `npx prisma migrate dev --name phase5_payments`

### T5 — Checkout flow update
**Files:** `src/app/[shop]/checkout/schema.ts`, `actions.ts`, `page.tsx`, `form.tsx`
- Expand `PAYMENT_TYPES` to include `"esewa"`, `"khalti"`.
- Checkout page loads store's payment flags, passes available gateways to the form.
- `placeOrder`: for esewa/khalti, call `getPaymentAdapter().createPayment()` and return `{ ok: true, redirectUrl }`.
- Client form: when result has `redirectUrl`, navigate via `window.location.href`.

### T6 — Callback route + CAS verification
**Files:** `src/app/api/payments/[gateway]/callback/route.ts`, `src/lib/payments/callback-verify.ts`
- `GET` handler parses gateway + query params.
- Loads Order, calls adapter's `verifyPayment()`.
- CAS update: `where: { id, paymentStatus: "unpaid" }` → `paymentStatus: "paid"`, `paymentRef`, `paidAt`.
- Redirects to order-confirmed page.

### T7 — markDelivered gate + i18n
**Files:** `src/app/dashboard/orders/actions.ts`, `src/locales/en.ts`, `src/locales/ne.ts`
- `markDelivered`: when `store.requirePayToDeliver === true` and order is non-COD unpaid → `"orders.paymentRequired"`.
- Load store setting inside `runAction` (or pass as param).
- Add all Phase 5 i18n keys to both locale files (compile-error parity check).

### T8 — Settings page (payment toggles + delivery gate)
**Files:** `src/app/dashboard/settings/page.tsx`, `actions.ts`, `schema.ts`
- Minimal page with: payment method checkboxes (COD, QR, eSewa, Khalti), requirePayToDeliver toggle.
- Server action to save settings.
- Protect behind `requireStore()` (owner only).

### T9 — DoD gate
1. `npm run build` — compiles (types + en↔ne parity).
2. `npm test` — all suites green (Phase 1–4 + Phase 5 payments tests).
3. Live walkthrough (`npm run dev`): checkout with Khalti sandbox → payment page → complete → redirect → order shows "paid". Repeat for eSewa sandbox. Toggle `requirePayToDeliver` on → unpaid order can't be marked delivered. Per-store toggles: disable Khalti for a store → Khalti option disappears from checkout.
4. **§5.8 review** on `phase-4..HEAD`.
5. **PROGRESS.md** update + `git tag phase-5`.

---

## Security notes

- Browser never claims "paid" — all verification is server-side.
- CAS on `paymentStatus: "unpaid"` → `"paid"` is idempotent: duplicate callbacks return P2025 (already paid) → safe.
- Gateway secrets live in env vars only, never in the DB or client bundle.
- HMAC signatures are verified server-side before trusting any form POST data.
- Sandbox keys are explicit: the adapter `isConfigured()` check is env-var-based; in production without keys, the gateway is simply unavailable (returns null, checkout hides the option).

---

## Demo mode behavior

When `NODE_ENV !== "production"` and no gateway keys are set:
- `getPaymentAdapter()` returns the demo adapter for both gateways.
- Demo `createPayment()` returns a URL pointing to `/order-confirmed/<orderNo>` (skips real gateway entirely).
- Demo `verifyPayment()` always returns `{ ok: true, amountNpr }`.
- This allows full local walkthrough of the payment flow without sandbox accounts.
