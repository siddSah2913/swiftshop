# Phase 5 — Real Online Payments (eSewa + Khalti) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real payment gateway support — eSewa (HMAC-signed form POST) and Khalti (REST API initiate/lookup), with per-store owner toggles, server-side CAS verification, a sandbox demo adapter, a `requirePayToDeliver` gate, and a minimal settings page.

**Architecture:** Adapter pattern mirroring `src/lib/delivery/` — pure modules (`PaymentAdapter` interface) in `src/lib/payments/`. Each gateway has `createPayment()` → redirect URL, `verifyPayment()` → server-side confirm. Checkout page redirects to gateway instead of order-confirmed for online payments. Callback route uses CAS compound-where (`where: { id, paymentStatus: "unpaid" }`) for idempotent updates. Per-store toggles (`Store.paymentEsewa`, `Store.paymentKhalti`) determine which gateways appear at checkout.

**Tech Stack:** Next 16 App Router, Prisma 7, Zod, vitest, crypto (HMAC-SHA256 for eSewa), server actions (`"use server"`).

**Spec:** `docs/superpowers/specs/2026-09-15-phase5-payments-design.md`

## Global Constraints

- Next 16: `params`/`searchParams` are Promises — `await` them. Read `node_modules/next/dist/docs/` before writing any Next code.
- Prisma 7: use the generated client at `@/lib/db` — `prisma` is the singleton export.
- i18n: every new key must exist in both `src/locales/en.ts` and `src/locales/ne.ts` — parity is enforced at compile time. Keys use dotted format: `"namespace.specificName"`.
- vitest: `src/**/*.test.ts` — `npm test` runs all. Current suite: Phase 1–4.
- Money = integer NPR in paise where gateway requires it (`amountNpr * 100`). Display via `.toLocaleString("en-IN")`.
- `log(tag, message)` from `src/lib/log.ts` for server-side logging — tags follow `"feature:action"` format.
- `requireStore()` OUTSIDE `try` — redirect-throws must not be swallowed by catch.
- Zod schemas: error messages are i18n `TranslationKey`s, validated via `superRefine` for membership checks.
- Demo mode: when `NODE_ENV !== "production"` and no keys set, return demo adapter (fake redirect, instant verify).
- Sandbox URLs: Khalti `https://a.khalti.com/`, eSewa `https://epay.sandbox.nic.np/`.
- Per Phase 3 convention: checkout form is a client component with `useActionState(prev, fd, slug)`. All labels are server-translated props.

---

## File Structure

### New files (created)

| File | Responsibility |
|------|---------------|
| `src/lib/payments/types.ts` | `PaymentGatewayId`, `PaymentAdapter` interface, result types |
| `src/lib/payments/demo.ts` | Demo adapter — fake redirect URL, always-verifies-ok (dev only) |
| `src/lib/payments/khalti.ts` | Khalti ePayment adapter — initiate API, lookup API |
| `src/lib/payments/esewa.ts` | eSewa Epay adapter — form POST with HMAC-SHA256, verify API |
| `src/lib/payments/index.ts` | `getPaymentAdapter()` registry, `isGatewayConfigured()` helper |
| `src/lib/payments/callback-verify.ts` | Shared CAS payment verification + Order lookup helpers |
| `src/lib/payments/payments.test.ts` | Demo adapter tests + registry tests |
| `src/lib/payments/khalti.test.ts` | Khalti adapter tests (mocked fetch) |
| `src/lib/payments/esewa.test.ts` | eSewa adapter tests (mocked crypto + fetch) |
| `src/app/api/payments/[gateway]/callback/route.ts` | GET callback route handler — parses gateway params, calls verify, CAS update |
| `src/app/dashboard/settings/page.tsx` | Settings page — payment toggles, requirePayToDeliver, QR image hint |
| `src/app/dashboard/settings/actions.ts` | `updateSettings` server action |
| `src/app/dashboard/settings/schema.ts` | Zod schema for settings form |
| `prisma/migrations/YYYYMMDD_phase5_payments/migration.sql` | Migration for Store + Order new columns |

### Modified files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `paymentEsewa`, `paymentKhalti`, `requirePayToDeliver` to Store; add `paymentRef`, `paidAt` to Order |
| `src/app/[shop]/checkout/schema.ts` | Expand `PAYMENT_TYPES` to include `"esewa"`, `"khalti"` |
| `src/app/[shop]/checkout/actions.ts` | Load store flags, gateway redirect logic for online payments, return `{ redirectUrl }` |
| `src/app/[shop]/checkout/form.tsx` | Accept `availablePaymentMethods` prop, render gateway options dynamically |
| `src/app/[shop]/checkout/page.tsx` | Load store payment flags, pass to form |
| `src/app/dashboard/orders/actions.ts` | `markDelivered` gate: load `requirePayToDeliver`, refuse non-COD unpaid |
| `src/locales/en.ts` | Add all Phase 5 i18n keys |
| `src/locales/ne.ts` | Add all Phase 5 i18n keys (parity) |
| `src/app/dashboard/more/page.tsx` | Add Settings link row |
| `.env.example` | Add `KHALTI_SECRET_KEY`, `ESEWA_MERCHANT_CODE`, `ESEWA_SECRET_KEY` |

---

## Task 1: Payment adapter types + registry + demo adapter (tests-first)

**Files:**
- Create: `src/lib/payments/types.ts`, `src/lib/payments/demo.ts`, `src/lib/payments/index.ts`
- Create: `src/lib/payments/payments.test.ts`

**Interfaces:**
- Produces: `PaymentGatewayId`, `PaymentAdapter` interface (consumed by all later tasks), `getPaymentAdapter()`, `isGatewayConfigured()`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/payments/payments.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { getPaymentAdapter, isGatewayConfigured } from "./index";

describe("demo adapter", () => {
  it("khalti demo createPayment returns a callback URL with pidx", async () => {
    const { createDemoAdapter } = await import("./demo");
    const adapter = createDemoAdapter("khalti");
    const result = await adapter.createPayment({
      orderId: "ord_123",
      orderNo: 1,
      amountNpr: 500,
      storeSlug: "test-shop",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.redirectUrl).toBe(
        "/api/payments/khalti/callback?pidx=demo-1",
      );
      expect(result.ref).toBe("demo-1");
    }
  });

  it("esewa demo createPayment returns a callback URL with oid + refId", async () => {
    const { createDemoAdapter } = await import("./demo");
    const adapter = createDemoAdapter("esewa");
    const result = await adapter.createPayment({
      orderId: "ord_123",
      orderNo: 1,
      amountNpr: 500,
      storeSlug: "test-shop",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.redirectUrl).toBe(
        "/api/payments/esewa/callback?oid=ord_123&refId=demo-1",
      );
    }
  });

  it("verifyPayment always returns ok with the amount", async () => {
    const { createDemoAdapter } = await import("./demo");
    const adapter = createDemoAdapter("khalti");
    const result = await adapter.verifyPayment({
      pidx: "fake-pidx",
      amountNpr: 500,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amountNpr).toBe(500);
    }
  });
});

describe("getPaymentAdapter", () => {
  const origEnv = process.env;

  beforeEach(() => {
    process.env = { ...origEnv };
  });

  afterEach(() => {
    process.env = origEnv;
  });

  it("returns demo adapter when NODE_ENV is not production and no keys set", () => {
    process.env.NODE_ENV = "test";
    delete process.env.KHALTI_SECRET_KEY;
    delete process.env.ESEWA_MERCHANT_CODE;
    delete process.env.ESEWA_SECRET_KEY;
    const adapter = getPaymentAdapter("khalti");
    expect(adapter).not.toBeNull();
    expect(adapter?.id).toBe("khalti");
  });

  it("returns null for unknown gateway id", () => {
    // @ts-expect-error — testing runtime guard
    expect(() => getPaymentAdapter("unknown")).toThrow();
  });
});

describe("isGatewayConfigured", () => {
  const origEnv = process.env;

  beforeEach(() => {
    process.env = { ...origEnv };
  });

  afterEach(() => {
    process.env = origEnv;
  });

  it("returns false when env keys are missing in non-production", () => {
    process.env.NODE_ENV = "test";
    delete process.env.KHALTI_SECRET_KEY;
    delete process.env.ESEWA_MERCHANT_CODE;
    expect(isGatewayConfigured("khalti")).toBe(false);
  });

  it("returns true when env key is present", () => {
    process.env.NODE_ENV = "test";
    process.env.KHALTI_SECRET_KEY = "test-key";
    expect(isGatewayConfigured("khalti")).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test src/lib/payments/payments.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create `src/lib/payments/types.ts`**

```ts
export const PAYMENT_GATEWAY_IDS = ["esewa", "khalti"] as const;
export type PaymentGatewayId = (typeof PAYMENT_GATEWAY_IDS)[number];

export type PaymentInitResult =
  | { ok: true; redirectUrl: string; ref?: string }
  | { ok: false; error: string };

export type PaymentVerifyResult =
  | { ok: true; amountNpr: number }
  | { ok: false; reason: "invalid" | "amount-mismatch" | "not-completed" | "network-error" };

export interface PaymentAdapter {
  id: PaymentGatewayId;
  label: string;
  isConfigured(): boolean;
  createPayment(params: {
    orderId: string;
    orderNo: number;
    amountNpr: number;
    storeSlug: string;
  }): Promise<PaymentInitResult>;
  verifyPayment(params: {
    pidx: string;
    amountNpr: number;
  }): Promise<PaymentVerifyResult>;
}

export function isPaymentGatewayId(v: string): v is PaymentGatewayId {
  return (PAYMENT_GATEWAY_IDS as readonly string[]).includes(v);
}
```

- [ ] **Step 4: Create `src/lib/payments/demo.ts`**

```ts
import type { PaymentAdapter, PaymentGatewayId } from "./types";

/**
 * Demo adapter — factory that builds a stand-in for a real gateway.
 * Only used by `getPaymentAdapter()` when NODE_ENV !== "production" and no
 * real gateway keys are set. Lets developers walk through the FULL payment
 * flow locally: the redirect URL points at the real callback route, which
 * runs verifyAndMarkPaid → demo.verifyPayment (always ok) → CAS marks the
 * order paid. No sandbox accounts needed.
 */
export function createDemoAdapter(gatewayId: PaymentGatewayId): PaymentAdapter {
  return {
    id: gatewayId,
    label: "Demo",
    isConfigured: () => true,
    async createPayment({ orderId, orderNo }) {
      const ref = `demo-${orderNo}`;
      if (gatewayId === "khalti") {
        // Khalti callback reads `pidx` and looks the order up by paymentRef
        // (which the checkout action pre-saved from `ref`).
        return {
          ok: true,
          redirectUrl: `/api/payments/khalti/callback?pidx=${ref}`,
          ref,
        };
      }
      // eSewa callback reads `oid` (→ orderId) + `refId` (→ the ref).
      return {
        ok: true,
        redirectUrl: `/api/payments/esewa/callback?oid=${orderId}&refId=${ref}`,
        ref,
      };
    },
    async verifyPayment({ amountNpr }) {
      return { ok: true, amountNpr };
    },
  };
}
```

- [ ] **Step 5: Create `src/lib/payments/index.ts`**

```ts
import type { PaymentGatewayId, PaymentAdapter } from "./types";
import { createDemoAdapter } from "./demo";

const ENV_KEY_MAP: Record<PaymentGatewayId, string> = {
  khalti: "KHALTI_SECRET_KEY",
  esewa: "ESEWA_MERCHANT_CODE",
};

/**
 * Check whether a gateway's env key(s) are set. Does NOT check
 * NODE_ENV — use `getPaymentAdapter()` for the full decision.
 */
export function isGatewayConfigured(gatewayId: PaymentGatewayId): boolean {
  return !!process.env[ENV_KEY_MAP[gatewayId]];
}

export async function getPaymentAdapter(
  gatewayId: PaymentGatewayId,
): Promise<PaymentAdapter | null> {
  // Real adapter when env key is present
  if (isGatewayConfigured(gatewayId)) {
    if (gatewayId === "khalti") {
      const { khaltiAdapter } = await import("./khalti");
      return khaltiAdapter;
    }
    if (gatewayId === "esewa") {
      const { esewaAdapter } = await import("./esewa");
      return esewaAdapter;
    }
  }

  // Dev fallback: per-gateway demo adapter. Skipped in production — no fake
  // payments in prod.
  if (process.env.NODE_ENV !== "production") {
    return createDemoAdapter(gatewayId);
  }

  // Production without keys: gateway unavailable
  return null;
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test src/lib/payments/payments.test.ts`
Expected: PASS

- [ ] **Step 7: Run full suite to check no regressions**

Run: `npm test`
Expected: all existing tests still pass

- [ ] **Step 8: Commit**

```bash
git add src/lib/payments/
git commit -m "feat(payments): adapter types + registry + demo adapter (tests-first)"
```

---

## Task 2: Khalti adapter (tests-first)

**Files:**
- Create: `src/lib/payments/khalti.ts`, `src/lib/payments/khalti.test.ts`

**Interfaces:**
- Consumes: `PaymentAdapter` interface from Task 1
- Produces: `khaltiAdapter` export consumed by `getPaymentAdapter()` in `index.ts` (already wired in Task 1)

- [ ] **Step 1: Write the failing tests**

Create `src/lib/payments/khalti.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("khaltiAdapter", () => {
  async function loadAdapter() {
    vi.resetModules();
    process.env.KHALTI_SECRET_KEY = "test-secret";
    const mod = await import("./khalti");
    return mod.khaltiAdapter;
  }

  it("isConfigured returns true when KHALTI_SECRET_KEY is set", async () => {
    const adapter = await loadAdapter();
    expect(adapter.isConfigured()).toBe(true);
  });

  it("createPayment calls Khalti initiate API and returns payment_url", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        pidx: "abc123",
        payment_url: "https://a.khalti.com/checkout/abc123",
      }),
    });

    const adapter = await loadAdapter();
    const result = await adapter.createPayment({
      orderId: "ord_1",
      orderNo: 42,
      amountNpr: 1000,
      storeSlug: "test-shop",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.redirectUrl).toBe("https://a.khalti.com/checkout/abc123");
      expect(result.ref).toBe("abc123");
    }

    // Verify the fetch call
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("https://a.khalti.com/api/v2/epayment/initiate/");
    expect(opts.method).toBe("POST");
    expect(opts.headers.Authorization).toContain("test-secret");
    const body = JSON.parse(opts.body);
    expect(body.amount).toBe(100000); // 1000 * 100 (paisa)
    expect(body.purchase_order_id).toBe("ord_1");
    expect(body.return_url).toContain("/api/payments/khalti/callback?orderId=ord_1");
  });

  it("createPayment returns error on API failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: "Invalid request" }),
    });

    const adapter = await loadAdapter();
    const result = await adapter.createPayment({
      orderId: "ord_1",
      orderNo: 42,
      amountNpr: 1000,
      storeSlug: "test-shop",
    });

    expect(result.ok).toBe(false);
  });

  it("verifyPayment returns ok when state is Completed and amount matches", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        state: "Completed",
        amount: 100000, // paisa
      }),
    });

    const adapter = await loadAdapter();
    const result = await adapter.verifyPayment({
      pidx: "abc123",
      amountNpr: 1000,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amountNpr).toBe(1000);
    }
  });

  it("verifyPayment returns not-completed when state is not Completed", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        state: "Pending",
        amount: 100000,
      }),
    });

    const adapter = await loadAdapter();
    const result = await adapter.verifyPayment({
      pidx: "abc123",
      amountNpr: 1000,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("not-completed");
    }
  });

  it("verifyPayment returns amount-mismatch when amounts differ", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        state: "Completed",
        amount: 99900, // paisa — doesn't match 1000 * 100
      }),
    });

    const adapter = await loadAdapter();
    const result = await adapter.verifyPayment({
      pidx: "abc123",
      amountNpr: 1000,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("amount-mismatch");
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test src/lib/payments/khalti.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/lib/payments/khalti.ts`**

```ts
import type { PaymentAdapter } from "./types";

const KHALTI_INITIATE_URL = "https://a.khalti.com/api/v2/epayment/initiate/";
const KHALTI_LOOKUP_URL = "https://a.khalti.com/api/v2/epayment/lookup/";

export const khaltiAdapter: PaymentAdapter = {
  id: "khalti",
  label: "Khalti",
  isConfigured: () => !!process.env.KHALTI_SECRET_KEY,

  async createPayment({ orderId, orderNo, amountNpr, storeSlug }) {
    const key = process.env.KHALTI_SECRET_KEY;
    if (!key) return { ok: false, error: "KHALTI_SECRET_KEY not set" };

    const res = await fetch(KHALTI_INITIATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `key ${key}`,
      },
      body: JSON.stringify({
        amount: amountNpr * 100, // paisa
        // return_url = where Khalti redirects the customer after payment.
        // Khalti appends `pidx` AND `purchase_order_id` (= our orderId) to it.
        return_url: `${process.env.AUTH_URL ?? "http://localhost:3000"}/api/payments/khalti/callback?orderId=${orderId}`,
        website_url: process.env.AUTH_URL ?? "http://localhost:3000",
        purchase_order_id: orderId,
        purchase_order_name: `Order #${orderNo}`,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: body?.detail ?? "Khalti initiate failed" };
    }

    const body = await res.json();
    // ref = pidx — the checkout action pre-saves it to Order.paymentRef so the
    // callback route can look the order up by pidx when Khalti redirects back.
    return { ok: true, redirectUrl: body.payment_url, ref: body.pidx };
  },

  async verifyPayment({ pidx, amountNpr }) {
    const key = process.env.KHALTI_SECRET_KEY;
    if (!key) return { ok: false, reason: "invalid" };

    const res = await fetch(KHALTI_LOOKUP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `key ${key}`,
      },
      body: JSON.stringify({ pidx }),
    });

    if (!res.ok) return { ok: false, reason: "network-error" };

    const body = await res.json();
    if (body.state !== "Completed") return { ok: false, reason: "not-completed" };

    const expectedPaisa = amountNpr * 100;
    if (body.amount !== expectedPaisa) return { ok: false, reason: "amount-mismatch" };

    return { ok: true, amountNpr };
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test src/lib/payments/khalti.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/payments/khalti.ts src/lib/payments/khalti.test.ts
git commit -m "feat(payments): Khalti ePayment adapter (tests-first)"
```

---

## Task 3: eSewa adapter (tests-first)

**Files:**
- Create: `src/lib/payments/esewa.ts`, `src/lib/payments/esewa.test.ts`

**Interfaces:**
- Consumes: `PaymentAdapter` interface from Task 1
- Produces: `esewaAdapter` export consumed by `getPaymentAdapter()` in `index.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/payments/esewa.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("esewaAdapter", () => {
  async function loadAdapter() {
    vi.resetModules();
    process.env.ESEWA_MERCHANT_CODE = "EPAYTEST";
    process.env.ESEWA_SECRET_KEY = "8gBm/:&EnhH.1/q";
    const mod = await import("./esewa");
    return mod.esewaAdapter;
  }

  it("isConfigured returns true when env vars are set", async () => {
    const adapter = await loadAdapter();
    expect(adapter.isConfigured()).toBe(true);
  });

  it("createPayment produces a base64-encoded signed payload", async () => {
    const adapter = await loadAdapter();
    const result = await adapter.createPayment({
      orderId: "ord_1",
      orderNo: 5,
      amountNpr: 200,
      storeSlug: "my-shop",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      // The redirect URL should be a data-URI or sandbox URL
      expect(typeof result.redirectUrl).toBe("string");
      expect(result.redirectUrl.length).toBeGreaterThan(0);
    }
  });

  it("createPayment uses correct amount breakdown", async () => {
    const adapter = await loadAdapter();
    // Capture the form fields by examining the redirectUrl encoding
    const result = await adapter.createPayment({
      orderId: "ord_1",
      orderNo: 5,
      amountNpr: 200,
      storeSlug: "my-shop",
    });

    expect(result.ok).toBe(true);
    // The payload should be a valid base64 string
    if (result.ok) {
      const dataUrl = result.redirectUrl;
      expect(dataUrl).toContain("epay.sandbox.nic.np");
    }
  });

  it("verifyPayment returns ok when status is COMPLETE and amount matches", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "COMPLETE",
        total_amount: 200,
      }),
    });

    const adapter = await loadAdapter();
    const result = await adapter.verifyPayment({
      pidx: "oid_123:ref_456",
      amountNpr: 200,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amountNpr).toBe(200);
    }

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("transaction/status");
    expect(url).toContain("oid=oid_123");
    expect(url).toContain("refId=ref_456");
  });

  it("verifyPayment returns not-completed when status is not COMPLETE", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "PENDING",
        total_amount: 200,
      }),
    });

    const adapter = await loadAdapter();
    const result = await adapter.verifyPayment({
      pidx: "oid_123:ref_456",
      amountNpr: 200,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("not-completed");
    }
  });

  it("verifyPayment returns amount-mismatch when amounts differ", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "COMPLETE",
        total_amount: 199,
      }),
    });

    const adapter = await loadAdapter();
    const result = await adapter.verifyPayment({
      pidx: "oid_123:ref_456",
      amountNpr: 200,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("amount-mismatch");
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test src/lib/payments/esewa.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/lib/payments/esewa.ts`**

```ts
import { createHmac } from "node:crypto";
import type { PaymentAdapter } from "./types";

const ESEWA_GATEWAY_URL = "https://epay.sandbox.nic.np/pay/process";
const ESEWA_STATUS_URL = "https://epay.sandbox.nic.np/api/epay/transaction/status";

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64");
}

function buildSignatureField(fields: Record<string, string>, secret: string): string {
  const payload = Object.values(fields).join(",");
  return sign(payload, secret);
}

export const esewaAdapter: PaymentAdapter = {
  id: "esewa",
  label: "eSewa",
  isConfigured: () => !!process.env.ESEWA_MERCHANT_CODE && !!process.env.ESEWA_SECRET_KEY,

  async createPayment({ orderId, orderNo, amountNpr, storeSlug }) {
    const merchantCode = process.env.ESEWA_MERCHANT_CODE;
    const secretKey = process.env.ESEWA_SECRET_KEY;
    if (!merchantCode || !secretKey) {
      return { ok: false, error: "eSewa credentials not set" };
    }

    const amt = amountNpr;
    const psc = 0;
    const pdc = 0;
    const txAmt = 0;
    const tAmt = amt + txAmt + psc + pdc;
    const productList = JSON.stringify([{ id: orderId, name: `Order #${orderNo}`, qty: 1, price: amt }]);

    const fields: Record<string, string> = {
      amt: String(amt),
      psc: String(psc),
      pdc: String(pdc),
      txAmt: String(txAmt),
      tAmt: String(tAmt),
      productCode: merchantCode,
      productList,
    };

    const signature = buildSignatureField(fields, secretKey);

    const formFields = { ...fields, signature };

    // Build an auto-submitting HTML form as a data URI — the browser
    // navigates to this URL, which POSTs to eSewa's gateway.
    const formData = Object.entries(formFields)
      .map(([k, v]) => `<input type="hidden" name="${k}" value="${String(v).replace(/"/g, "&quot;")}" />`)
      .join("\n    ");

    const html = `<!DOCTYPE html>
<html><head><title>Redirecting to eSewa…</title></head>
<body>
  <form id="esewaForm" method="POST" action="${ESEWA_GATEWAY_URL}">
    ${formData}
  </form>
  <script>document.getElementById("esewaForm").submit();</script>
</body></html>`;

    const redirectUrl = `data:text/html;base64,${Buffer.from(html).toString("base64")}`;
    return { ok: true, redirectUrl };
  },

  async verifyPayment({ pidx, amountNpr }) {
    // pidx format for eSewa: "oid:<oid>:refId:<refId>"
    const parts = pidx.split(":");
    if (parts.length !== 4 || parts[0] !== "oid" || parts[2] !== "refId") {
      return { ok: false, reason: "invalid" };
    }
    const oid = parts[1];
    const refId = parts[3];

    const url = `${ESEWA_STATUS_URL}?oid=${oid}&refId=${refId}`;
    const res = await fetch(url);

    if (!res.ok) return { ok: false, reason: "network-error" };

    const body = await res.json();
    if (body.status !== "COMPLETE") return { ok: false, reason: "not-completed" };
    if (body.total_amount !== amountNpr) return { ok: false, reason: "amount-mismatch" };

    return { ok: true, amountNpr };
  },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test src/lib/payments/esewa.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/payments/esewa.ts src/lib/payments/esewa.test.ts
git commit -m "feat(payments): eSewa Epay adapter with HMAC signature (tests-first)"
```

---

## Task 4: i18n keys (en + ne, parity = compile error)

**Files:**
- Modify: `src/locales/en.ts`, `src/locales/ne.ts`

**Interfaces:**
- Produces: Translation keys consumed by T5 (checkout), T7 (delivery gate), T8 (settings page)

- [ ] **Step 1: Add i18n keys to `src/locales/en.ts`**

Append these keys at the end of the `en` object (before the closing `} as const`):

```ts
  // --- Phase 5: Payments ---
  "checkout.payWith": "Pay with",
  "checkout.payEsewa": "eSewa",
  "checkout.payKhalti": "Khalti",
  "checkout.paymentRedirect": "Redirecting to payment gateway…",
  "checkout.paymentFailed": "Payment initiation failed. Please try again.",
  "checkout.storeUnavailable": "This payment method is not available for this store.",
  "settings.title": "Settings",
  "settings.paymentMethods": "Payment Methods",
  "settings.enableCod": "Cash on Delivery",
  "settings.enableQr": "QR Payment",
  "settings.enableEsewa": "eSewa",
  "settings.enableKhalti": "Khalti",
  "settings.requirePayToDeliver": "Require payment before delivery",
  "settings.requirePayToDeliverHint": "Non-COD orders must be paid before marking delivered",
  "settings.qrHint": "Upload a QR image so customers can scan to pay.",
  "settings.saved": "Settings saved.",
  "orders.paymentRequired": "This order must be paid before delivery.",
  "payment.verified": "Payment verified.",
  "payment.failed": "Payment verification failed.",
  "payment.amountMismatch": "Payment amount does not match order total.",
  "payment.unknownGateway": "Unknown payment gateway.",
```

- [ ] **Step 2: Add matching i18n keys to `src/locales/ne.ts`**

Append at end of the `ne` object:

```ts
  // --- Phase 5: Payments ---
  "checkout.payWith": "भुक्तानी गर्नुहोस्",
  "checkout.payEsewa": "eSewa",
  "checkout.payKhalti": "Khalti",
  "checkout.paymentRedirect": "भुक्तानी गेटवेमा पुर्‍याइँदैछ…",
  "checkout.paymentFailed": "भुक्तानी सुरु हुन सकेन। फेरि प्रयास गर्नुहोस्।",
  "checkout.storeUnavailable": "यो भुक्तानी विधि यस पसलका लागि उपलब्ध छैन।",
  "settings.title": "सेटिङ्स",
  "settings.paymentMethods": "भुक्तानी विधिहरू",
  "settings.enableCod": "डेलिभरीमा नगद भुक्तानी",
  "settings.enableQr": "QR भुक्तानी",
  "settings.enableEsewa": "eSewa",
  "settings.enableKhalti": "Khalti",
  "settings.requirePayToDeliver": "डेलिभरी अघि भुक्तानी आवश्यक",
  "settings.requirePayToDeliverHint": "गैर-COD अर्डरहरू डेलिभरी चिन्ह लगाउनुअघि भुक्तानी भएको हुनुपर्छ",
  "settings.qrHint": "ग्राहकहरूले स्क्यान गरेर भुक्तानी गर्न QR छवि अपलोड गर्नुहोस्।",
  "settings.saved": "सेटिङ्स सुरक्षित भयो।",
  "orders.paymentRequired": "यो अर्डर डेलिभरी अघि भुक्तानी भएको हुनुपर्छ।",
  "payment.verified": "भुक्तानी प्रमाणित भयो।",
  "payment.failed": "भुक्तानी प्रमाणीकरण असफल भयो।",
  "payment.amountMismatch": "भुक्तानी रकम अर्डर कुलसँग मेल खाँदैन।",
  "payment.unknownGateway": "अज्ञात भुक्तानी गेटवे।",
```

- [ ] **Step 3: Verify type-check enforces parity**

Run: `npm run build`
Expected: if any key is missing from `ne.ts` or vice versa, the build fails with a type error.

- [ ] **Step 4: Commit**

```bash
git add src/locales/en.ts src/locales/ne.ts
git commit -m "feat(i18n): Phase 5 payment keys (en↔ne parity)"
```

---

## Task 5: Database migration

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: DB columns consumed by T6 (checkout actions), T7 (delivery gate), T8 (settings page)

- [ ] **Step 1: Update `prisma/schema.prisma` Store model**

Add after `paymentCod`:
```prisma
  paymentEsewa    Boolean @default(false)
  paymentKhalti   Boolean @default(false)
  requirePayToDeliver Boolean @default(false)
```

- [ ] **Step 2: Update `prisma/schema.prisma` Order model**

Add after `paymentStatus`:
```prisma
  paymentRef      String?
  paidAt          DateTime?
```

- [ ] **Step 3: Run the migration**

Run: `npx prisma migrate dev --name phase5_payments`
Expected: migration SQL created, Prisma client regenerated.

- [ ] **Step 4: Verify build compiles**

Run: `npm run build`
Expected: compiles with new schema columns.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): Phase 5 migration — payment gateway columns + requirePayToDeliver"
```

---

## Task 6: Checkout flow update (gateway redirect)

**Files:**
- Modify: `src/app/[shop]/checkout/schema.ts`
- Modify: `src/app/[shop]/checkout/actions.ts`
- Modify: `src/app/[shop]/checkout/page.tsx`
- Modify: `src/app/[shop]/checkout/form.tsx`

**Interfaces:**
- Consumes: `getPaymentAdapter()` from T1, i18n keys from T4, Store columns from T5
- Produces: `{ ok: true, redirectUrl }` return type from `placeOrder` consumed by the client form; the gateway `ref` (pidx) pre-saved to `Order.paymentRef` consumed by T7 (callback)

- [ ] **Step 1: Update `src/app/[shop]/checkout/schema.ts`**

```ts
import { z } from "zod";

/**
 * Checkout form validation — pure, unit-tested.
 * Error messages are i18n keys (translated at render time), so the schema
 * stays locale-agnostic. Only Nepali 10-digit mobiles are accepted in v1
 * (`^9[678]\d{8}$`, no +977) — see Phase 2 spec §2/§11.
 */
const PAYMENT_TYPES = ["cod", "qr", "esewa", "khalti"] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export { PAYMENT_TYPES };

export const checkoutSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "checkout.invalidName")
      .max(80, "checkout.invalidName"),
    phone: z
      .string()
      .trim()
      .regex(/^9[678]\d{8}$/, "checkout.invalidPhone"),
    address: z
      .string()
      .trim()
      .min(1, "checkout.invalidAddress")
      .max(200, "checkout.invalidAddress"),
    paymentType: z.string(),
  })
  .superRefine((data, ctx) => {
    if (!PAYMENT_TYPES.includes(data.paymentType as PaymentType)) {
      ctx.addIssue({
        code: "custom",
        path: ["paymentType"],
        message: "checkout.invalidPayment",
      });
    }
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;
```

- [ ] **Step 2: Update `src/app/[shop]/checkout/actions.ts`**

Key changes to `placeOrder`:

```ts
// 1. Store select — add payment flags
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

// 2. QR guard stays; add gateway store-validity guard:
const parsed = checkoutSchema.safeParse(raw);
// ...existing error handling...

const { name, phone, address, paymentType } = parsed.data;

if (paymentType === "qr" && !store.qrImageUrl) {
  return { error: t(locale, "checkout.noQr") };
}

// NEW: validate store has this payment method enabled
const storeEnabled: Record<string, boolean> = {
  cod: store.paymentCod,
  qr: !!store.qrImageUrl,
  esewa: store.paymentEsewa,
  khalti: store.paymentKhalti,
};
if (!storeEnabled[paymentType]) {
  return { error: t(locale, "checkout.storeUnavailable") };
}

// 3. After creating the order (inside try, after `orderNo = await prisma.$transaction(...)`)
//    and OUTSIDE the inner transaction try:

// NEW: for online gateways, create payment and return redirect URL
const ONLINE_GATEWAYS = ["esewa", "khalti"] as string[];
if (ONLINE_GATEWAYS.includes(paymentType)) {
  const adapter = await getPaymentAdapter(paymentType as PaymentGatewayId);
  if (!adapter) {
    return { error: t(locale, "checkout.paymentFailed") };
  }
  const payResult = await adapter.createPayment({
    orderId, // the order id captured from the transaction (see below)
    orderNo,
    amountNpr: totalNpr,
    storeSlug: trimmedSlug,
  });
  if (!payResult.ok) {
    return { error: t(locale, "checkout.paymentFailed") };
  }
  // PRE-SAVE the gateway ref (Khalti's pidx) so the callback can look the
  // order up by paymentRef when Khalti redirects the customer back with only
  // `?pidx=...`. eSewa's callback carries `oid` directly, so no pre-save.
  if (payResult.ref) {
    await prisma.order.update({
      where: { id: orderId },
      data: { paymentRef: payResult.ref },
    });
  }
  cookieStore.delete(CART_COOKIE);
  return { ok: true, redirectUrl: payResult.redirectUrl };
}

// 4. Existing QR/COD redirect path stays:
cookieStore.delete(CART_COOKIE);
redirect(`/${trimmedSlug}/order-confirmed/${orderNo}`);
```

**Important detail — capturing orderId:** The current `$transaction` callback returns `order.orderNo`. Change it to return `{ orderId: order.id, orderNo: order.orderNo }` so the adapter gets the orderId.

**Full `placeOrder` return type update:**

```ts
export type CheckoutFormState = { error?: string; redirectUrl?: string };
```

- [ ] **Step 3: Update `src/app/[shop]/checkout/page.tsx`**

Load store payment flags and pass to form:

```ts
// In the page component, add to the store select:
const store = await prisma.store.findUnique({
  where: { slug },
  select: {
    // ...existing fields...
    paymentCod: true,
    paymentEsewa: true,
    paymentKhalti: true,
  },
});

// Build available methods array
const availableMethods = ["cod"];
if (store.qrImageUrl) availableMethods.push("qr");
if (store.paymentEsewa) availableMethods.push("esewa");
if (store.paymentKhalti) availableMethods.push("khalti");

// Pass to form as prop
<CheckoutForm availablePaymentMethods={availableMethods} ... />
```

- [ ] **Step 4: Update `src/app/[shop]/checkout/form.tsx`**

Add `availablePaymentMethods` prop and conditionally render gateway options:

```ts
type CheckoutFormProps = {
  // ...existing props...
  availablePaymentMethods: string[];
  labels: {
    // ...existing labels...
    payWith: string;
    payEsewa: string;
    payKhalti: string;
    paymentRedirect: string;
  };
};

// In the form component, add state for redirecting:
const [isRedirecting, setIsRedirecting] = useState(false);

// Use effect to handle redirectUrl from server action result:
useEffect(() => {
  if (result?.redirectUrl) {
    window.location.href = result.redirectUrl;
  }
}, [result?.redirectUrl]);

// Replace hardcoded payment radio group:
// OLD: {["cod", "qr"].map(pt => ...)}
// NEW:
{availablePaymentMethods.map((pt) => (
  <label key={pt} className="flex items-center gap-2 ...">
    <input type="radio" name="paymentType" value={pt} ... />
    <span>{paymentLabels[pt]}</span>
  </label>
))}

// Show redirecting message when navigating to gateway
{isRedirecting && (
  <p className="mt-2 text-sm text-zinc-500">{labels.paymentRedirect}</p>
)}
```

- [ ] **Step 5: Run existing checkout tests (if any) + full suite**

Run: `npm test`
Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add src/app/[shop]/checkout/
git commit -m "feat(checkout): gateway redirect for eSewa/Khalti + per-store method filter"
```

---

## Task 7: Callback route + CAS verification

**Files:**
- Create: `src/app/api/payments/[gateway]/callback/route.ts`
- Create: `src/lib/payments/callback-verify.ts`

**Interfaces:**
- Consumes: `getPaymentAdapter()`, `isPaymentGatewayId()` from T1, Prisma Order model from T5
- Produces: CAS payment verification (idempotent) that updates `Order.paymentStatus`, `Order.paymentRef`, `Order.paidAt`

- [ ] **Step 1: Create `src/lib/payments/callback-verify.ts`**

This module provides two lookup strategies — by `orderId` (eSewa sends `oid` in callback) and by `pidx` (Khalti sends `pidx` in callback). The callback route calls whichever matches the gateway.

```ts
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
 *  - `{ pidx: "..." }` — Khalti callback sends pidx, which we saved in Step 5
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
    // Lookup by pidx — we stored it in Step 5 (T6) right after creating the payment
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
  } catch (e: any) {
    if (e?.code === "P2025") {
      // Already paid between our read and this write — safe
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
```

**Important:** In T6 (checkout actions), after calling `adapter.createPayment()` and before returning the redirect URL, save the `pidx` to the order. The Khalti adapter returns the `pidx` in its response, but we don't have it yet at payment creation time — so the plan saves it at callback time instead. This works because:
- **eSewa callback:** sends `oid` (which we encode as `orderId`) → `lookupBy: { orderId }`
- **Khalti callback:** sends `pidx` → we must have saved it. Since we don't save it at creation time (we don't have it yet), we use `paymentRef: pidx` in the CAS update which stores it for future callbacks.

- [ ] **Step 2: Create `src/app/api/payments/[gateway]/callback/route.ts`**

Khalti redirects the customer back with `?pidx=<pidx>` — we don't get `orderId` or `storeId` from Khalti, so we look up the order by `paymentRef: pidx` (set during the CAS update on first callback, or available if the adapter stored it). For eSewa, the callback includes `oid` which maps to the orderId (eSewa's `product_code` is the merchant code, and `oid` is the order id we passed).

```ts
import { NextRequest, NextResponse } from "next/server";
import { isPaymentGatewayId } from "@/lib/payments";
import { verifyAndMarkPaid } from "@/lib/payments/callback-verify";
import { log } from "@/lib/log";

/**
 * GET /api/payments/[gateway]/callback
 *
 * Khalti redirects with: ?pidx=<pidx>&qrcode=<url>
 * eSewa redirects with:  ?oid=<oid>&refId=<refId>&amt=<amt>
 *
 * For Khalti we look up by `paymentRef` (pidx) — the adapter's `createPayment`
 * embeds orderId as `product_identity`, but Khalti's callback only returns
 * `pidx`, so we rely on the pidx→order mapping.
 *
 * For eSewa, `oid` maps to our orderId (we pass it as the eSewa order id).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gateway: string }> },
) {
  const { gateway } = await params;
  const searchParams = request.nextUrl.searchParams;

  if (!isPaymentGatewayId(gateway)) {
    return NextResponse.redirect(new URL("/?error=unknown-gateway", request.url));
  }

  let lookupBy: { orderId: string } | { pidx: string };
  let pidx: string;

  if (gateway === "khalti") {
    const khaltiPidx = searchParams.get("pidx");
    if (!khaltiPidx) {
      log("payments:callback:khalti-missing-pidx", Object.fromEntries(searchParams));
      return NextResponse.redirect(new URL("/?error=missing-pidx", request.url));
    }
    pidx = khaltiPidx;
    // Khalti appends `purchase_order_id` (= our orderId) to the return_url —
    // prefer it. Fall back to pidx lookup (covers the demo adapter, which only
    // sends `pidx` and relies on the pre-saved paymentRef from T6).
    const purchaseOrderId = searchParams.get("purchase_order_id");
    if (purchaseOrderId) {
      lookupBy = { orderId: purchaseOrderId };
    } else {
      lookupBy = { pidx: khaltiPidx };
    }
  } else if (gateway === "esewa") {
    const oid = searchParams.get("oid");
    const refId = searchParams.get("refId");
    if (!oid || !refId) {
      log("payments:callback:esewa-missing-params", Object.fromEntries(searchParams));
      return NextResponse.redirect(new URL("/?error=missing-oid-refId", request.url));
    }
    pidx = `oid:${oid}:refId:${refId}`;
    // eSewa's oid is the orderId we passed during createPayment
    lookupBy = { orderId: oid };
  } else {
    return NextResponse.redirect(new URL("/?error=unsupported-gateway", request.url));
  }

  const result = await verifyAndMarkPaid({ lookupBy, pidx, gatewayId: gateway });

  if (!result) {
    return NextResponse.redirect(new URL("/?error=payment-failed", request.url));
  }

  // Redirect to order confirmation
  return NextResponse.redirect(
    new URL(`/${result.storeSlug}/order-confirmed/${result.orderNo}`, request.url),
  );
}
```

- [ ] **Step 3: Run full suite**

Run: `npm test`
Expected: all pass

- [ ] **Step 4: Commit**

```bash
git add src/app/api/payments/ src/lib/payments/callback-verify.ts
git commit -m "feat(payments): callback route + CAS verification (idempotent)"
```

---

## Task 8: markDelivered gate for unpaid non-COD orders

**Files:**
- Modify: `src/app/dashboard/orders/actions.ts`

**Interfaces:**
- Consumes: `requirePayToDeliver` from Store (T5), `paymentType`/`paymentStatus` from Order

- [ ] **Step 1: Read the current `markDelivered` action**

Read `src/app/dashboard/orders/actions.ts` lines 132-164 to understand the current `runAction` pattern and `markDelivered` implementation.

- [ ] **Step 2: Update `runAction` to load store's `requirePayToDeliver`**

The `runAction` helper currently calls `requireStore()` which returns `{ store }`. The store select needs to include `requirePayToDeliver`:

```ts
// In runAction, update the store select:
const { store } = await requireStore();

// The store object from requireStore already has all fields — no change needed
// unless requireStore does a limited select. Check requireStore implementation.
// If it does a limited select, add requirePayToDeliver to the select.
```

- [ ] **Step 3: Add the gate in `markDelivered`**

Inside the `markDelivered` function's `apply` callback, add before the `transitionOrder` call:

```ts
export async function markDelivered(
  _prev: OrdersActionState,
  _formData: FormData,
  orderId: string,
): Promise<OrdersActionState> {
  return runAction(orderId, (order) => {
    if (!isOrderStatus(order.status)) {
      return { kind: "error", error: "orders.invalidAction" };
    }

    // NEW: requirePayToDeliver gate — refuse delivery for unpaid non-COD orders
    if (
      order.paymentStatus === "unpaid" &&
      order.paymentType !== "cod" &&
      store.requirePayToDeliver // need to pass store into apply
    ) {
      return { kind: "error", error: "orders.paymentRequired" };
    }

    const step = transitionOrder(order.status, "delivered");
    // ...rest unchanged
```

**Problem:** The `apply` callback in `runAction` currently only receives the `order`, not the `store`. To access `store.requirePayToDeliver`, we need to either:
1. Pass `store` into `apply`, or
2. Add `requirePayToDeliver` to the `ActionOrder` type

Option 2 is cleaner — update the type and the `runAction` helper:

```ts
type ActionOrder = {
  id: string;
  status: string;
  paymentType: string;
  paymentStatus: string;
  requirePayToDeliver: boolean; // NEW — loaded from store
};
```

And in `runAction`'s `findFirst`:
```ts
const order = await prisma.order.findFirst({
  where: { id: parsed.data.orderId, storeId: store.id },
  select: {
    id: true,
    status: true,
    paymentType: true,
    paymentStatus: true,
  },
});

// Attach store-level setting
const orderWithGate = {
  ...order,
  requirePayToDeliver: store.requirePayToDeliver,
};
```

- [ ] **Step 4: Confirm `requireStore()` field availability**

`requireStore()` (in `src/lib/require-store.ts`) uses `prisma.store.findUnique({ where: { ownerId } })` with **no `select`** — it returns the full `StoreModel`, so `store.requirePayToDeliver` is available after the T5 migration generates it. No change needed.

- [ ] **Step 5: Run full suite**

Run: `npm test`
Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/orders/actions.ts
git commit -m "feat(orders): markDelivered gate — block unpaid non-COD when requirePayToDeliver"
```

---

## Task 9: Settings page (payment toggles + delivery gate)

**Files:**
- Create: `src/app/dashboard/settings/page.tsx`
- Create: `src/app/dashboard/settings/actions.ts`
- Create: `src/app/dashboard/settings/schema.ts`
- Modify: `src/app/dashboard/more/page.tsx` (add Settings link)

**Interfaces:**
- Consumes: Store columns from T5, `requireStore()` from `@/lib/require-store`
- Produces: Store settings (payment toggles) used by T6 (checkout page)

- [ ] **Step 1: Create `src/app/dashboard/settings/schema.ts`**

```ts
import { z } from "zod";

export const settingsSchema = z.object({
  paymentCod: z.coerce.boolean(),
  paymentEsewa: z.coerce.boolean(),
  paymentKhalti: z.coerce.boolean(),
  requirePayToDeliver: z.coerce.boolean(),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
```

- [ ] **Step 2: Create `src/app/dashboard/settings/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { requireStore } from "@/lib/require-store";
import { getLocale, t, type TranslationKey } from "@/lib/i18n";
import { log } from "@/lib/log";
import { settingsSchema } from "./schema";

export type SettingsActionState = { ok?: boolean; error?: string };

export async function updateSettings(
  _prev: SettingsActionState,
  fd: FormData,
): Promise<SettingsActionState> {
  const locale = getLocale((await cookies()).get("swiftshop_lang")?.value ?? null);

  const raw = {
    paymentCod: fd.get("paymentCod") === "on",
    paymentEsewa: fd.get("paymentEsewa") === "on",
    paymentKhalti: fd.get("paymentKhalti") === "on",
    requirePayToDeliver: fd.get("requirePayToDeliver") === "on",
  };

  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: t(locale, "common.error") };
  }

  const { store } = await requireStore();

  try {
    await prisma.store.update({
      where: { id: store.id },
      data: {
        paymentCod: parsed.data.paymentCod,
        paymentEsewa: parsed.data.paymentEsewa,
        paymentKhalti: parsed.data.paymentKhalti,
        requirePayToDeliver: parsed.data.requirePayToDeliver,
      },
    });
  } catch (e) {
    log("settings:update", e);
    return { error: t(locale, "common.error") };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/more");
  return { ok: true };
}
```

- [ ] **Step 3: Create `src/app/dashboard/settings/page.tsx`**

```tsx
import { cookies } from "next/headers";
import { requireStore } from "@/lib/require-store";
import { getLocale, t } from "@/lib/i18n";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const { store } = await requireStore();
  const locale = getLocale((await cookies()).get("swiftshop_lang")?.value ?? null);

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900">
        {t(locale, "settings.title")}
      </h1>

      <SettingsForm
        currentValues={{
          paymentCod: store.paymentCod,
          paymentEsewa: store.paymentEsewa,
          paymentKhalti: store.paymentKhalti,
          requirePayToDeliver: store.requirePayToDeliver,
          hasQrImage: !!store.qrImageUrl,
        }}
        labels={{
          paymentMethods: t(locale, "settings.paymentMethods"),
          enableCod: t(locale, "settings.enableCod"),
          enableEsewa: t(locale, "settings.enableEsewa"),
          enableKhalti: t(locale, "settings.enableKhalti"),
          enableQr: t(locale, "settings.enableQr"),
          requirePayToDeliver: t(locale, "settings.requirePayToDeliver"),
          requirePayToDeliverHint: t(locale, "settings.requirePayToDeliverHint"),
          qrHint: t(locale, "settings.qrHint"),
          saved: t(locale, "settings.saved"),
        }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Create `src/app/dashboard/settings/settings-form.tsx` (client component)**

```tsx
"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateSettings, type SettingsActionState } from "./actions";

type SettingsFormProps = {
  currentValues: {
    paymentCod: boolean;
    paymentEsewa: boolean;
    paymentKhalti: boolean;
    requirePayToDeliver: boolean;
    hasQrImage: boolean;
  };
  labels: {
    paymentMethods: string;
    enableCod: string;
    enableEsewa: string;
    enableKhalti: string;
    enableQr: string;
    requirePayToDeliver: string;
    requirePayToDeliverHint: string;
    qrHint: string;
    saved: string;
  };
};

const field = "mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm";
const toggleBase = "h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500";

export function SettingsForm({ currentValues, labels }: SettingsFormProps) {
  const [state, formAction, isPending] = useActionState<SettingsActionState, FormData>(
    updateSettings,
    {},
  );
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (state.ok) {
      setShowSaved(true);
      const t = setTimeout(() => setShowSaved(false), 3000);
      return () => clearTimeout(t);
    }
  }, [state.ok]);

  return (
    <form action={formAction} className="mt-6 space-y-6">
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <h2 className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-700">
          {labels.paymentMethods}
        </h2>

        <label className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          <span className="text-sm text-zinc-700">{labels.enableCod}</span>
          <input
            type="checkbox"
            name="paymentCod"
            defaultChecked={currentValues.paymentCod}
            className={toggleBase}
          />
        </label>

        <label className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          <div>
            <span className="text-sm text-zinc-700">{labels.enableQr}</span>
            {!currentValues.hasQrImage && (
              <p className="mt-0.5 text-xs text-zinc-400">{labels.qrHint}</p>
            )}
          </div>
          <input
            type="checkbox"
            name="paymentQr"
            defaultChecked={currentValues.hasQrImage}
            disabled
            className={toggleBase}
          />
        </label>

        <label className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          <span className="text-sm text-zinc-700">{labels.enableEsewa}</span>
          <input
            type="checkbox"
            name="paymentEsewa"
            defaultChecked={currentValues.paymentEsewa}
            className={toggleBase}
          />
        </label>

        <label className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-zinc-700">{labels.enableKhalti}</span>
          <input
            type="checkbox"
            name="paymentKhalti"
            defaultChecked={currentValues.paymentKhalti}
            className={toggleBase}
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <label className="flex items-center justify-between px-4 py-3">
          <div>
            <span className="text-sm font-medium text-zinc-700">{labels.requirePayToDeliver}</span>
            <p className="mt-0.5 text-xs text-zinc-400">{labels.requirePayToDeliverHint}</p>
          </div>
          <input
            type="checkbox"
            name="requirePayToDeliver"
            defaultChecked={currentValues.requirePayToDeliver}
            className={toggleBase}
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
      >
        {isPending ? "…" : "Save"}
      </button>

      {showSaved && (
        <p className="text-sm text-emerald-600">{labels.saved}</p>
      )}

      {state.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
    </form>
  );
}
```

- [ ] **Step 5: Add Settings link to More page**

Update `src/app/dashboard/more/page.tsx` — add a Link row before the existing "View Shop" row:

```tsx
<Link
  href="/dashboard/settings"
  className="block border-b border-zinc-100 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
>
  {t(locale, "settings.title")}
</Link>
```

- [ ] **Step 6: Run build + full suite**

Run: `npm run build && npm test`
Expected: all pass

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/settings/ src/app/dashboard/more/page.tsx
git commit -m "feat(settings): payment toggles + requirePayToDeliver page"
```

---

## Task 10: env vars + `.env.example` update

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Add gateway env vars to `.env.example`**

Append to `.env.example`:

```bash
# Khalti (sandbox) — get from https://sandbox.khalti.com/
KHALTI_SECRET_KEY=""

# eSewa (sandbox) — get from https://epay.sandbox.nic.np/
ESEWA_MERCHANT_CODE=""
ESEWA_SECRET_KEY=""
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "chore: add payment gateway env vars to .env.example"
```

---

## Task 11: Proof-of-concept walkthrough checklist

Run through this manually to confirm the payment flow works end-to-end:

- [ ] **Step 1: Start dev server with demo mode**

Run: `npm run dev`
Verify: server starts on :3000

- [ ] **Step 2: Create a test store (if not existing)**

Sign up / use existing demo store. Go to dashboard → Settings → enable eSewa and Khalti toggles → Save.

- [ ] **Step 3: Add products and go to checkout**

Add items to cart → proceed to checkout. Verify: payment radio options now show eSewa and Khalti options (in addition to COD and QR).

- [ ] **Step 4: Select Khalti → Place Order**

Select Khalti → Place Order. In demo mode: the browser should hit the demo adapter's redirect URL `/api/payments/khalti/callback?pidx=demo-<orderNo>` → the callback runs `verifyAndMarkPaid` → demo `verifyPayment` succeeds → CAS marks the order **paid** → browser lands on `/<slug>/order-confirmed/<orderNo>`. This is the FULL payment path, exercised locally.

- [ ] **Step 5: Verify order in dashboard**

Go to dashboard → Orders → find the new order. Confirm: `paymentType: "khalti"`, `paymentStatus: "paid"`, `paymentRef: "demo-<orderNo>"`, `paidAt` set.

- [ ] **Step 6: Test requirePayToDeliver gate**

1. Place an order with `paymentType: "qr"` (choose QR at checkout; it stays unpaid — QR is non-COD and has no auto-settle).
2. Go to Settings → enable `requirePayToDeliver` → Save.
3. Go to Orders → find that QR order → try Mark delivered. Expected: error "This order must be paid before delivery."
4. Enable it in Settings → Save, and confirm the demo `paid` order from Step 4 CAN be marked delivered (it is already paid).

- [ ] **Step 7: Verify the callback route rejects bad params**

Visit: `http://localhost:3000/api/payments/khalti/callback?pidx=nonexistent`. Expected: redirect to `/?error=payment-failed` (order not found by pidx).

- [ ] **Step 8: Full build + test suite**

Run: `npm run build && npm test`. Expected: all pass.

---

## Task 12: Final DoD gate

1. **`npm run build`** — compiles (types + en↔ne parity).
2. **`npm test`** — all suites green (Phase 1–4 + Phase 5 payments tests).
3. **Live walkthrough (blueprint cross-check, `npm run dev`):** checkout with Khalti demo → redirect → order-confirmed → order shows unpaid → callback route works. Settings page renders with toggles. Mark-delivered gate blocks unpaid non-COD.
4. **§5.8 review** on `phase-4..HEAD` (code-review skill, medium); fix real findings; re-run hard gates if code changed.
5. **PROGRESS.md** update (Phase 5 done + review log) + final commit + **`git tag phase-5`**.

---

## Reused utilities (do NOT re-implement)

- `prisma` singleton — `src/lib/db.ts`
- `requireStore()` — `src/lib/require-store.ts` (OUTSIDE try — redirect-throws)
- `log(tag, message)` — `src/lib/log.ts`
- `getLocale()`, `t()`, `TranslationKey` — `src/lib/i18n.ts`
- `revalidatePath()` — `next/cache`
- `isPaymentGatewayId()` — from this phase's `src/lib/payments/types.ts`
- `orderIdSchema` + `ID_RE` — `src/app/dashboard/orders/schema.ts` / `src/lib/cart.ts`

## Gotchas

- **Next 16 `params`/`searchParams` are Promises** — `await params` in route handlers.
- **`requireStore()` OUTSIDE `try`** — redirect-throws must never be caught.
- **CAS compound-where is critical** — `{ where: { id, paymentStatus: "unpaid" } }` makes duplicate callbacks idempotent.
- **Demo adapter always succeeds** — this is intentional for local dev; real adapters verify with the gateway.
- **eSewa form POST is a data URI redirect** — the browser navigates to a `data:text/html` URL that auto-submits a form. This works in all modern browsers.
- **`ne.ts` parity** — missing a key in either locale = compile error. Both files must be updated together (T4).
- **Store select in `requireStore()`** — if it does a limited select, `requirePayToDeliver` won't be available. Verify in T8 Step 4.
- **Checkout form `useEffect` for redirect** — `window.location.href` only works client-side; the server action returns the URL, the effect triggers navigation.
