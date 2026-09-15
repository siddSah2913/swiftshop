# Phase 6 Slice 1 — Analytics, CSV Export, Product Share Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a five-dimension analytics page, a range-aware orders CSV export, and a product share control (native OS sheet on mobile, YouTube-style platform modal on desktop).

**Architecture:** Pure, unit-tested aggregation in `src/lib/analytics/` mirroring the existing `delivery`/`payments` lib conventions. The analytics page uses store-scoped Prisma grouped by `status` and `paymentType` plus JS date-bucketing. Export is a GET route handler authenticated by the session cookie. The share control is a client component using `navigator.share` on touch devices and a hand-built Tailwind modal on desktop (no component library exists in this app).

**Tech Stack:** Next 16 App Router, Prisma 7, date-fns, Tailwind v4, vitest, React 19.

**Spec:** `docs/superpowers/specs/2026-09-15-phase6-slice1-analytics-export-share-design.md`

## Global Constraints

- Next 16: `params`/`searchParams` are Promises — `await` them. Read `node_modules/next/dist/docs/` before writing any Next code.
- Prisma 7: use the generated client via `prisma` from `@/lib/db`.
- i18n: every new key must exist in **both** `src/locales/en.ts` and `src/locales/ne.ts` — parity is enforced at compile time (`ne` is typed as `Record<keyof typeof en, string>`). Keys are dotted: `"analytics.revenue"`.
- Money = integer NPR. Display via `.toLocaleString("en-IN")`. Currency label comes from the existing `product.priceNpr` i18n key ("NPR").
- vitest: `src/**/*.test.ts`; `npm test` = `vitest run`, node environment, never touches the DB. Current suite: 156 tests across 17 files.
- All dashboard/analytics data is store-scoped via `requireStore()` (multi-tenant boundary). The export route replicates that boundary manually with `auth()`. Any route handler writing a body uses `export const dynamic = "force-dynamic"`.
- Ingredients for the platform-knowledge constraint: WhatsApp and Facebook have desktop web share-intent URLs; Viber uses a `viber://` deep link; Messenger, Instagram, and TikTok have **no** desktop web intent — they copy the link + show a toast.
- Locale cookie is `swiftshop_lang` everywhere (fixed in `ac125fc`) — do not introduce `"locale"`.

---

## File Structure

### New files (created)

| File | Responsibility |
|------|---------------|
| `src/lib/analytics/types.ts` | `AnalyticsRange`, `AnalyticsGranularity`, guards, `rangeStart()`, `rangeWhere()` |
| `src/lib/analytics/buckets.ts` | `bucketStart()`, `buildBuckets()`, `foldRows()`, `bucketOrders()`, `bucketCounts()` |
| `src/lib/analytics/top-products.ts` | `aggregateTopProducts()` — folds OrderItem rows into a ranked list |
| `src/lib/analytics/csv.ts` | `escapeCsvField()`, `toCsv()`, `withBom()` — RFC 4180, no dependency |
| `src/lib/analytics/types.test.ts` | Tests for ranges/guards |
| `src/lib/analytics/buckets.test.ts` | Tests for bucketing |
| `src/lib/analytics/top-products.test.ts` | Tests for top-products aggregation |
| `src/lib/analytics/csv.test.ts` | Tests for CSV escaping |
| `src/app/dashboard/analytics/page.tsx` | Server component — five analytics cards, range/granularity pills |
| `src/app/api/dashboard/export/route.ts` | GET — orders CSV download, session-authenticated |
| `src/components/product-share.tsx` | Client component — share button + YouTube-style modal |

### Modified files

| File | Change |
|------|--------|
| `src/app/dashboard/page.tsx` | Add Analytics card linking `/dashboard/analytics` |
| `src/app/dashboard/more/page.tsx` | Add Analytics row above Settings |
| `src/app/[shop]/product/[id]/page.tsx` | Render `<ProductShare>` in right column with translated label props |
| `src/locales/en.ts` | Add Phase 6 slice 1 keys (analytics + share) |
| `src/locales/ne.ts` | Add Phase 6 slice 1 keys (parity) |

---

## Task 1: Analytics types + buckets lib (tests-first)

**Files:**
- Create: `src/lib/analytics/types.ts`, `src/lib/analytics/types.test.ts`
- Create: `src/lib/analytics/buckets.ts`, `src/lib/analytics/buckets.test.ts`

**Interfaces:**
- Produces (consumed by Tasks 3 & 4):
  - `ANALYTICS_RANGES = ["7d","30d","all"] as const`; `type AnalyticsRange`
  - `ANALYTICS_GRANULARITIES = ["day","week","month"] as const`; `type AnalyticsGranularity`
  - `isAnalyticsRange(v: string): v is AnalyticsRange`
  - `isAnalyticsGranularity(v: string): v is AnalyticsGranularity`
  - `rangeStart(range: AnalyticsRange): Date | null` (local midnight, `7d`→−6 days, `30d`→−29 days, `all`→null)
  - `rangeWhere(range: AnalyticsRange): { createdAt: { gte: Date } } | {}`
  - `BUCKET_CAPS: Record<AnalyticsGranularity, number>` = `{ day: 30, week: 12, month: 12 }`
  - `bucketStart(date: Date, granularity: AnalyticsGranularity): Date` (local day / ISO-Monday week / month start)
  - `buildBuckets(start: Date, end: Date, granularity: AnalyticsGranularity): Date[]` (contiguous, capped)
  - `type Bucket = { start: Date; value: number }`
  - `foldRows(rows: { createdAt: Date; value: number }[], granularity, buckets): Bucket[]`
  - `bucketOrders(orders: { createdAt: Date; totalNpr: number }[], start, end, granularity): Bucket[]`
  - `bucketCounts(rows: { createdAt: Date }[], start, end, granularity): Bucket[]`

- [ ] **Step 1: Write the failing tests — `types.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import {
  ANALYTICS_GRANULARITIES,
  ANALYTICS_RANGES,
  isAnalyticsGranularity,
  isAnalyticsRange,
  rangeStart,
  rangeWhere,
} from "./types";

describe("analytics range types", () => {
  it("lists the three ranges and granularities", () => {
    expect(ANALYTICS_RANGES).toEqual(["7d", "30d", "all"]);
    expect(ANALYTICS_GRANULARITIES).toEqual(["day", "week", "month"]);
  });

  it("narrows raw strings", () => {
    for (const r of ANALYTICS_RANGES) expect(isAnalyticsRange(r)).toBe(true);
    expect(isAnalyticsRange("90d")).toBe(false);
    expect(isAnalyticsRange("")).toBe(false);
    for (const g of ANALYTICS_GRANULARITIES) expect(isAnalyticsGranularity(g)).toBe(true);
    expect(isAnalyticsGranularity("year")).toBe(false);
    expect(isAnalyticsGranularity("")).toBe(false);
  });

  it("rangeStart('7d') is six days ago at local midnight", () => {
    const now = new Date();
    const expected = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    const start = rangeStart("7d");
    expect(start?.getFullYear()).toBe(expected.getFullYear());
    expect(start?.getMonth()).toBe(expected.getMonth());
    expect(start?.getDate()).toBe(expected.getDate());
    expect(start?.getHours()).toBe(0);
    expect(start?.getMinutes()).toBe(0);
  });

  it("rangeStart('30d') is twenty-nine days ago at local midnight", () => {
    const now = new Date();
    const expected = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
    const start = rangeStart("30d");
    expect(start?.getFullYear()).toBe(expected.getFullYear());
    expect(start?.getMonth()).toBe(expected.getMonth());
    expect(start?.getDate()).toBe(expected.getDate());
  });

  it("rangeStart('all') is null", () => {
    expect(rangeStart("all")).toBeNull();
  });

  it("rangeWhere builds a gte filter or an empty constraint", () => {
    expect(rangeWhere("all")).toEqual({});
    const w = rangeWhere("7d") as { createdAt: { gte: Date } };
    expect(w.createdAt.gte).toBeInstanceOf(Date);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/analytics/types.test.ts`
Expected: FAIL — module `./types` not found / exports do not exist.

- [ ] **Step 3: Write minimal implementation — `types.ts`**

```ts
// Analytics range + granularity types, guards, and date-range helpers.
// Pure module — no DB, no Next imports (mirrors src/lib/delivery/).

export const ANALYTICS_RANGES = ["7d", "30d", "all"] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export const ANALYTICS_GRANULARITIES = ["day", "week", "month"] as const;
export type AnalyticsGranularity = (typeof ANALYTICS_GRANULARITIES)[number];

export function isAnalyticsRange(v: string): v is AnalyticsRange {
  return (ANALYTICS_RANGES as readonly string[]).includes(v);
}

export function isAnalyticsGranularity(v: string): v is AnalyticsGranularity {
  return (ANALYTICS_GRANULARITIES as readonly string[]).includes(v);
}

/**
 * First day of the range (local midnight). "7d" covers today + the previous 6
 * days, "30d" covers today + the previous 29 days, "all" returns null.
 */
export function rangeStart(range: AnalyticsRange): Date | null {
  if (range === "all") return null;
  const days = range === "7d" ? 6 : 29;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}

/** Prisma createdAt filter for a range; {} means "all". Spread into `where`. */
export function rangeWhere(
  range: AnalyticsRange,
): { createdAt: { gte: Date } } | {} {
  const start = rangeStart(range);
  return start ? { createdAt: { gte: start } } : {};
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/analytics/types.test.ts`
Expected: PASS (6).

- [ ] **Step 5: Write the failing tests — `buckets.test.ts`**

Use fixed local dates via the numeric constructor so `startOfWeek`/`startOfMonth` are deterministic. Jan 5 2026 is a Monday.

```ts
import { describe, expect, it } from "vitest";
import {
  bucketCounts,
  bucketOrders,
  bucketStart,
  buildBuckets,
  foldRows,
} from "./buckets";

const MON = new Date(2026, 0, 5);   // Mon Jan 5 2026
const THU = new Date(2026, 0, 8);   // Thu Jan 8 2026
const NEXT_MON = new Date(2026, 0, 12); // Mon Jan 12 2026

describe("bucketStart", () => {
  it("day starts at local midnight", () => {
    const s = bucketStart(THU, "day");
    expect(s.getHours()).toBe(0);
    expect(s.getMinutes()).toBe(0);
    expect(s.getDate()).toBe(8);
  });

  it("week starts at the ISO Monday", () => {
    expect(bucketStart(THU, "week").getDate()).toBe(5);
    expect(bucketStart(NEXT_MON, "week").getDate()).toBe(12);
  });

  it("month starts at the 1st", () => {
    expect(bucketStart(THU, "month").getDate()).toBe(1);
    expect(bucketStart(THU, "month").getMonth()).toBe(0);
    expect(bucketStart(new Date(2026, 1, 14), "month").getMonth()).toBe(1);
  });
});

describe("buildBuckets", () => {
  it("returns contiguous day buckets", () => {
    const b = buildBuckets(MON, new Date(2026, 0, 9), "day");
    expect(b).toHaveLength(5);
    expect(b[0]).toEqual(MON);
    expect(b[4]).toEqual(new Date(2026, 0, 9));
  });

  it("advances weekly buckets in whole weeks", () => {
    const b = buildBuckets(MON, new Date(2026, 1, 2), "week");
    expect(b).toHaveLength(5);
    expect(b[1]).toEqual(new Date(2026, 0, 12));
  });

  it("caps daily at 30 buckets even for a long span", () => {
    const b = buildBuckets(new Date(2020, 0, 1), new Date(2026, 0, 5), "day");
    expect(b).toHaveLength(30);
  });

  it("returns a single period when the range is shorter than one period", () => {
    const b = buildBuckets(THU, THU, "month");
    expect(b).toHaveLength(1);
  });
});

describe("foldRows", () => {
  it("zero-fills every bucket in the grid", () => {
    const buckets = buildBuckets(MON, NEXT_MON, "day");
    const rows = [{ createdAt: THU, value: 100 }];
    const out = foldRows(rows, buckets, "day");
    expect(out).toHaveLength(buckets.length);
    expect(out.every((b) => b.start.getTime() === buckets[0].getTime() || b.value === 0)).toBe(true);
    expect(out.find((b) => b.start.getTime() === THU.getTime())?.value).toBe(100);
  });
});

describe("bucketOrders / bucketCounts", () => {
  it("sums totalNpr per bucket", () => {
    const orders = [
      { createdAt: THU, totalNpr: 500 },
      { createdAt: new Date(2026, 0, 8, 14, 30), totalNpr: 700 },
      { createdAt: NEXT_MON, totalNpr: 200 },
    ];
    const out = bucketOrders(orders, MON, NEXT_MON, "day");
    expect(out.find((b) => b.start.getTime() === THU.getTime())?.value).toBe(1200);
    expect(out.find((b) => b.start.getTime() === NEXT_MON.getTime())?.value).toBe(200);
  });

  it("counts rows per bucket", () => {
    const rows = [
      { createdAt: THU },
      { createdAt: new Date(2026, 0, 8, 9), },
      { createdAt: NEXT_MON },
    ];
    const out = bucketCounts(rows, MON, NEXT_MON, "day");
    expect(out.find((b) => b.start.getTime() === THU.getTime())?.value).toBe(2);
    expect(out.find((b) => b.start.getTime() === NEXT_MON.getTime())?.value).toBe(1);
  });
});
```

- [ ] **Step 6: Run the tests to verify they fail**

Run: `npx vitest run src/lib/analytics/buckets.test.ts`
Expected: FAIL — module `./buckets` does not exist.

- [ ] **Step 7: Write minimal implementation — `buckets.ts`**

```ts
// Date bucketing for the analytics bar charts. Folds raw rows onto a
// contiguous, zero-filled grid of local-time bucket starts. Pure module.

import {
  addDays,
  addMonths,
  addWeeks,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { AnalyticsGranularity } from "./types";

/** Cap on bucket count per granularity — a hand-built bar chart stops being
 * legible past these. */
export const BUCKET_CAPS: Record<AnalyticsGranularity, number> = {
  day: 30,
  week: 12,
  month: 12,
};

export type Bucket = { start: Date; value: number };

/** Local start-of-day / start-of-ISO-week (Monday) / start-of-month. */
export function bucketStart(
  date: Date,
  granularity: AnalyticsGranularity,
): Date {
  if (granularity === "day") return startOfDay(date);
  if (granularity === "week") return startOfWeek(date, { weekStartsOn: 1 });
  return startOfMonth(date);
}

function advance(date: Date, granularity: AnalyticsGranularity): Date {
  if (granularity === "day") return addDays(date, 1);
  if (granularity === "week") return addWeeks(date, 1);
  return addMonths(date, 1);
}

/** Contiguous bucket starts from `start` through `end`, capped per granularity.
 * Range shorter than one period yields a single bucket (one full-width bar). */
export function buildBuckets(
  start: Date,
  end: Date,
  granularity: AnalyticsGranularity,
): Date[] {
  const buckets: Date[] = [];
  const cap = BUCKET_CAPS[granularity];
  const last = bucketStart(end, granularity);
  for (
    let cursor = bucketStart(start, granularity);
    cursor <= last && buckets.length < cap;
    cursor = advance(cursor, granularity)
  ) {
    buckets.push(cursor);
  }
  return buckets;
}

/** Fold rows onto an existing bucket grid, summing values. Rows mapping outside
 * the grid (older than the window) are ignored. */
export function foldRows(
  rows: { createdAt: Date; value: number }[],
  buckets: Date[],
  granularity: AnalyticsGranularity,
): Bucket[] {
  const index = new Map(buckets.map((b, i) => [b.getTime(), i]));
  const out: Bucket[] = buckets.map((start) => ({ start, value: 0 }));
  for (const row of rows) {
    const i = index.get(bucketStart(row.createdAt, granularity).getTime());
    if (i !== undefined) out[i].value += row.value;
  }
  return out;
}

/** Sum totalNpr per bucket inside [start, end]. */
export function bucketOrders(
  orders: { createdAt: Date; totalNpr: number }[],
  start: Date,
  end: Date,
  granularity: AnalyticsGranularity,
): Bucket[] {
  return foldRows(
    orders.map((o) => ({ createdAt: o.createdAt, value: o.totalNpr })),
    buildBuckets(start, end, granularity),
    granularity,
  );
}

/** Count rows per bucket inside [start, end]. */
export function bucketCounts(
  rows: { createdAt: Date }[],
  start: Date,
  end: Date,
  granularity: AnalyticsGranularity,
): Bucket[] {
  return foldRows(
    rows.map((r) => ({ createdAt: r.createdAt, value: 1 })),
    buildBuckets(start, end, granularity),
    granularity,
  );
}
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx vitest run src/lib/analytics/types.test.ts src/lib/analytics/buckets.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/analytics
git commit -m "feat(analytics): range/granularity types + date-bucket folding lib"
```

---

## Task 2: Top-products + CSV lib (tests-first)

**Files:**
- Create: `src/lib/analytics/top-products.ts`, `src/lib/analytics/top-products.test.ts`
- Create: `src/lib/analytics/csv.ts`, `src/lib/analytics/csv.test.ts`

**Interfaces:**
- Produces (consumed by Tasks 3 & 4):
  - `type ProductSalesRow = { name: string; priceNpr: number; qty: number }`
  - `type ProductSales = { name: string; qtySold: number; revenueNpr: number }`
  - `aggregateTopProducts(rows: ProductSalesRow[], limit?): ProductSales[]`
  - `escapeCsvField(value: string | number): string`
  - `toCsv(rows: (string | number)[][]): string`
  - `withBom(csv: string): string` (prepends `﻿`)

- [ ] **Step 1: Write the failing tests — `top-products.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { aggregateTopProducts } from "./top-products";

describe("aggregateTopProducts", () => {
  it("returns an empty list for no rows", () => {
    expect(aggregateTopProducts([])).toEqual([]);
  });

  it("merges repeated product names and sums qty + revenue", () => {
    const out = aggregateTopProducts([
      { name: "Red Kurta", priceNpr: 1500, qty: 2 },
      { name: "Red Kurta", priceNpr: 1500, qty: 1 },
    ]);
    expect(out).toEqual([
      { name: "Red Kurta", qtySold: 3, revenueNpr: 4500 },
    ]);
  });

  it("ranks by revenue descending", () => {
    const out = aggregateTopProducts([
      { name: "Cheap", priceNpr: 100, qty: 2 },
      { name: "Costly", priceNpr: 9000, qty: 1 },
    ]);
    expect(out[0].name).toBe("Costly");
    expect(out[1].name).toBe("Cheap");
  });

  it("truncates to the limit", () => {
    const out = aggregateTopProducts(
      [1, 2, 3, 4].map((n) => ({ name: `P${n}`, priceNpr: n * 100, qty: 1 })),
      2,
    );
    expect(out).toHaveLength(2);
    expect(out[0].name).toBe("P4");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/analytics/top-products.test.ts`
Expected: FAIL — module `./top-products` does not exist.

- [ ] **Step 3: Write minimal implementation — `top-products.ts`**

```ts
// Folds OrderItem snapshots into a ranked list by revenue. Prisma groupBy can't
// multiply priceNpr × qty, so the analytics page fetches light rows and this
// pure helper does the folding. Sort is revenue desc, qty desc as a tiebreak.

export type ProductSalesRow = { name: string; priceNpr: number; qty: number };
export type ProductSales = { name: string; qtySold: number; revenueNpr: number };

export function aggregateTopProducts(
  rows: ProductSalesRow[],
  limit = 10,
): ProductSales[] {
  const map = new Map<string, ProductSales>();
  for (const row of rows) {
    const acc = map.get(row.name) ?? {
      name: row.name,
      qtySold: 0,
      revenueNpr: 0,
    };
    acc.qtySold += row.qty;
    acc.revenueNpr += row.priceNpr * row.qty;
    map.set(row.name, acc);
  }
  return [...map.values()]
    .sort((a, b) => b.revenueNpr - a.revenueNpr || b.qtySold - a.qtySold)
    .slice(0, limit);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/analytics/top-products.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing tests — `csv.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { escapeCsvField, toCsv, withBom } from "./csv";

describe("escapeCsvField", () => {
  it("passes plain values through", () => {
    expect(escapeCsvField("T-Shirt")).toBe("T-Shirt");
    expect(escapeCsvField(3850)).toBe("3850");
  });

  it("quotes fields containing a comma", () => {
    expect(escapeCsvField("Kapan, Kathmandu")).toBe('"Kapan, Kathmandu"');
  });

  it("doubles embedded quotes", () => {
    expect(escapeCsvField('Say "hi"')).toBe('"Say ""hi"""');
  });

  it("quotes fields containing a newline", () => {
    expect(escapeCsvField("line1\nline2")).toBe('"line1\nline2"');
  });
});

describe("toCsv", () => {
  it("joins rows with LF and fields with commas", () => {
    const csv = toCsv([
      ["orderNo", "name"],
      [12, "Red Kurta"],
    ]);
    expect(csv).toBe("orderNo,name\n12,Red Kurta");
  });

  it("returns empty string for no rows", () => {
    expect(toCsv([])).toBe("");
  });
});

describe("withBom", () => {
  it("prepends the UTF-8 BOM", () => {
    expect(withBom("a,b\n1,2")).toBe("﻿a,b\n1,2");
  });
});
```

- [ ] **Step 6: Run the tests to verify they fail**

Run: `npx vitest run src/lib/analytics/csv.test.ts`
Expected: FAIL — module `./csv` does not exist.

- [ ] **Step 7: Write minimal implementation — `csv.ts`**

```ts
// Minimal RFC 4180 CSV writer + UTF-8 BOM. Hand-assembled — no dependency.
// The BOM ("﻿") makes Excel detect UTF-8 and render Nepali script.

export function escapeCsvField(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map(escapeCsvField).join(",")).join("\n");
}

export function withBom(csv: string): string {
  return `﻿${csv}`;
}
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx vitest run src/lib/analytics/csv.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/analytics/top-products.ts src/lib/analytics/top-products.test.ts src/lib/analytics/csv.ts src/lib/analytics/csv.test.ts
git commit -m "feat(analytics): top-products folding + hand-built CSV writer lib"
```

---

## Task 3: Analytics page (server component)

**Files:**
- Create: `src/app/dashboard/analytics/page.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1–2 + existing `requireStore`, `prisma`, `getLocale`/`t`, `ORDER_STATUSES`/`STATUS_LABEL_KEYS`/`ORDER_STATUS_BADGE` (from `@/lib/order-status`), `PAYMENT_TYPES`/`PAYMENT_TYPE_I18N_KEY` (from `@/lib/payments/types`).
- Produces: the URL contract for Task 4 export — `<Link href={/api/dashboard/export?range=${range}}>`.

- [ ] **Step 1: Write the page**

Create `src/app/dashboard/analytics/page.tsx`:

```tsx
// Analytics page (Phase 6) — five store-scoped dimensions: revenue trend,
// orders by status, top products, payment split, customer growth. Range and
// granularity are searchParams (links), so this stays a server component with
// no client state. All aggregation comes from the pure lib in src/lib/analytics.

import { cookies } from "next/headers";
import Link from "next/link";
import { requireStore } from "@/lib/require-store";
import { prisma } from "@/lib/db";
import type { TranslationKey } from "@/lib/i18n";
import { getLocale, t } from "@/lib/i18n";
import {
  ORDER_STATUSES,
  ORDER_STATUS_BADGE,
  STATUS_LABEL_KEYS,
  type OrderStatus,
} from "@/lib/order-status";
import {
  PAYMENT_TYPES,
  PAYMENT_TYPE_I18N_KEY,
  type PaymentType,
} from "@/lib/payments/types";
import {
  ANALYTICS_GRANULARITIES,
  ANALYTICS_RANGES,
  isAnalyticsGranularity,
  isAnalyticsRange,
  rangeStart,
  rangeWhere,
  type AnalyticsGranularity,
  type AnalyticsRange,
} from "@/lib/analytics/types";
import {
  bucketCounts,
  bucketOrders,
  type Bucket,
} from "@/lib/analytics/buckets";
import { aggregateTopProducts } from "@/lib/analytics/top-products";

const RANGE_LABEL_KEYS: Record<AnalyticsRange, TranslationKey> = {
  "7d": "analytics.range7d",
  "30d": "analytics.range30d",
  all: "analytics.rangeAll",
};

const GRANULARITY_LABEL_KEYS: Record<AnalyticsGranularity, TranslationKey> = {
  day: "analytics.granularityDay",
  week: "analytics.granularityWeek",
  month: "analytics.granularityMonth",
};

type Props = {
  searchParams: Promise<{ range?: string; granularity?: string }>;
};

/** Hand-built bar strip — zero-dependency, scales bars against the max. */
function Bars({ buckets, max }: { buckets: Bucket[]; max: number }) {
  if (buckets.every((b) => b.value === 0)) return null;
  return (
    <div className="flex h-40 items-end gap-1">
      {buckets.map((b) => (
        <div key={b.start.toISOString()} className="flex h-full flex-1 items-end">
          <div
            className={`w-full rounded-t ${b.value > 0 ? "bg-teal-600" : "bg-zinc-100"}`}
            style={{
              height: `${Math.max(b.value > 0 ? 4 : 2, (b.value / max) * 100)}%`,
            }}
            title={`${b.start.toDateString()} — ${b.value.toLocaleString("en-IN")}`}
          />
        </div>
      ))}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function AnalyticsPage({ searchParams }: Props) {
  const { store } = await requireStore();
  const locale = getLocale(
    (await cookies()).get("swiftshop_lang")?.value ?? null,
  );
  const sp = await searchParams;

  const range: AnalyticsRange = isAnalyticsRange(sp.range ?? "")
    ? sp.range
    : "30d";
  const granularity: AnalyticsGranularity = isAnalyticsGranularity(
    sp.granularity ?? "",
  )
    ? sp.granularity
    : "day";

  const start = rangeStart(range);
  const chartStart = start ?? new Date(0); // "all": chart shows most-recent 12 caps
  const end = new Date();

  const [orders, statusGroups, paymentGroups, itemRows, customerRows] =
    await Promise.all([
      prisma.order.findMany({
        where: { storeId: store.id, ...rangeWhere(range) },
        select: { createdAt: true, totalNpr: true },
      }),
      prisma.order.groupBy({
        by: ["status"],
        where: { storeId: store.id, ...rangeWhere(range) },
        _count: { _all: true },
      }),
      prisma.order.groupBy({
        by: ["paymentType"],
        where: { storeId: store.id, ...rangeWhere(range) },
        _count: { _all: true },
        _sum: { totalNpr: true },
      }),
      prisma.orderItem.findMany({
        where: { order: { storeId: store.id, ...rangeWhere(range) } },
        select: { name: true, priceNpr: true, qty: true },
      }),
      prisma.customer.findMany({
        where: { storeId: store.id, ...rangeWhere(range) },
        select: { createdAt: true },
      }),
    ]);

  const revenueBuckets = bucketOrders(orders, chartStart, end, granularity);
  const maxRevenue = Math.max(...revenueBuckets.map((b) => b.value), 1);
  const totalRevenue = revenueBuckets.reduce((s, b) => s + b.value, 0);

  const customerBuckets = bucketCounts(customerRows, chartStart, end, granularity);
  const maxCustomers = Math.max(...customerBuckets.map((b) => b.value), 1);
  const totalCustomers = customerBuckets.reduce((s, b) => s + b.value, 0);

  const topProducts = aggregateTopProducts(itemRows, 10);

  const statusCounts = new Map(
    statusGroups.map((g) => [g.status as OrderStatus, g._count._all]),
  );
  const statusRows = ORDER_STATUSES.map((s) => ({
    status: s,
    count: statusCounts.get(s) ?? 0,
  }));
  const statusTotal = Math.max(
    statusRows.reduce((s, r) => s + r.count, 0),
    1,
  );

  const paymentMap = new Map(
    paymentGroups.map((g) => [
      g.paymentType as PaymentType,
      { count: g._count._all, revenue: g._sum.totalNpr ?? 0 },
    ]),
  );
  const paymentRows = PAYMENT_TYPES.map((p) => ({
    type: p,
    ...(paymentMap.get(p) ?? { count: 0, revenue: 0 }),
  }));

  const rangePills = ANALYTICS_RANGES.map((r) => {
    const active = range === r;
    return (
      <Link
        key={r}
        href={`/dashboard/analytics?range=${r}&granularity=${granularity}`}
        className={`rounded-full px-3 py-1 text-sm transition ${
          active
            ? "bg-zinc-900 text-white"
            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
        }`}
      >
        {t(locale, RANGE_LABEL_KEYS[r])}
      </Link>
    );
  });

  const granularityPills = ANALYTICS_GRANULARITIES.map((g) => {
    const active = granularity === g;
    return (
      <Link
        key={g}
        href={`/dashboard/analytics?range=${range}&granularity=${g}`}
        className={`rounded-full px-3 py-1 text-sm transition ${
          active
            ? "bg-zinc-900 text-white"
            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
        }`}
      >
        {t(locale, GRANULARITY_LABEL_KEYS[g])}
      </Link>
    );
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-zinc-900">
          {t(locale, "analytics.title")}
        </h1>
        <Link
          href={`/api/dashboard/export?range=${range}`}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800"
        >
          {t(locale, "analytics.export")}
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex gap-2">{rangePills}</div>
        <span className="text-zinc-300">·</span>
        <div className="flex gap-2">{granularityPills}</div>
      </div>

      <div className="mt-6 grid gap-4">
        <Card title={t(locale, "analytics.revenue")}>
          <p className="mb-4 text-2xl font-semibold text-zinc-900">
            {t(locale, "product.priceNpr")} {totalRevenue.toLocaleString("en-IN")}
          </p>
          {orders.length === 0 ? (
            <p className="text-sm text-zinc-500">{t(locale, "analytics.empty")}</p>
          ) : (
            <Bars buckets={revenueBuckets} max={maxRevenue} />
          )}
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card title={t(locale, "analytics.ordersByStatus")}>
            <div className="flex h-4 w-full overflow-hidden rounded-full bg-zinc-100">
              {statusRows.map((r) =>
                r.count > 0 ? (
                  <div
                    key={r.status}
                    className={ORDER_STATUS_BADGE[r.status]}
                    style={{ width: `${(r.count / statusTotal) * 100}%` }}
                  />
                ) : null,
              )}
            </div>
            <ul className="mt-4 space-y-1.5">
              {statusRows.map((r) => (
                <li
                  key={r.status}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="flex items-center gap-2 text-zinc-600">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${ORDER_STATUS_BADGE[r.status]}`}
                    />
                    {t(locale, STATUS_LABEL_KEYS[r.status])}
                  </span>
                  <span className="font-medium text-zinc-800">{r.count}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title={t(locale, "analytics.paymentSplit")}>
            <ul className="divide-y divide-zinc-100">
              {paymentRows.map((r) => (
                <li
                  key={r.type}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="text-zinc-700">
                    {t(locale, PAYMENT_TYPE_I18N_KEY[r.type])}
                  </span>
                  <span className="text-zinc-500">
                    {r.count}{" "}
                    <span className="text-zinc-300">·</span>{" "}
                    {t(locale, "product.priceNpr")}{" "}
                    {r.revenue.toLocaleString("en-IN")}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card title={t(locale, "analytics.topProducts")}>
            {topProducts.length === 0 ? (
              <p className="text-sm text-zinc-500">{t(locale, "analytics.empty")}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-zinc-400">
                    <th className="pb-2 font-medium">
                      {t(locale, "analytics.product")}
                    </th>
                    <th className="pb-2 text-right font-medium">
                      {t(locale, "analytics.qtySold")}
                    </th>
                    <th className="pb-2 text-right font-medium">
                      {t(locale, "analytics.revenueNpr")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p) => (
                    <tr key={p.name} className="border-t border-zinc-100">
                      <td className="py-2 pr-2">{p.name}</td>
                      <td className="py-2 text-right text-zinc-600">{p.qtySold}</td>
                      <td className="py-2 text-right font-medium">
                        {p.revenueNpr.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card title={t(locale, "analytics.customerGrowth")}>
            <p className="mb-4 text-2xl font-semibold text-zinc-900">
              {totalCustomers}
            </p>
            {customerRows.length === 0 ? (
              <p className="text-sm text-zinc-500">{t(locale, "analytics.empty")}</p>
            ) : (
              <Bars buckets={customerBuckets} max={maxCustomers} />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check the page compiles**

Run: `npx tsc --noEmit`
Expected: PASS — no type errors. (The page references i18n keys that don't exist yet; add them in Task 6 **before** this check by completing Task 6's locale edits now, or expect this check to fail until Task 6. Recommendation: implement Task 6's `en.ts`/`ne.ts` additions in this step so `npm run build` passes here.)

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/analytics/page.tsx
git commit -m "feat(analytics): five-card analytics page with range/granularity links"
```

---

## Task 4: CSV export route handler

**Files:**
- Create: `src/app/api/dashboard/export/route.ts`

**Interfaces:**
- Consumes: `auth` (`@/lib/auth`), `prisma`, `isAnalyticsRange`/`rangeWhere`/`rangeStart` (Task 1), `toCsv`/`withBom` (Task 2).
- Produces: `GET /api/dashboard/export?range=7d|30d|all` → `200` CSV attachment or `401`.

- [ ] **Step 1: Write the route handler**

Create `src/app/api/dashboard/export/route.ts`:

```ts
// Orders CSV export (Phase 6). Same tenant boundary as requireStore, but a
// route handler — so replicate it manually: auth() → the session owner's own
// store. The session cookie authenticates the request, so the analytics header
// button is a plain <Link>; no token in the URL.

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toCsv, withBom } from "@/lib/analytics/csv";
import { isAnalyticsRange, rangeWhere } from "@/lib/analytics/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const store = await prisma.store.findUnique({
    where: { ownerId: session.user.id },
    select: { id: true, slug: true },
  });
  if (!store) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const raw = url.searchParams.get("range") ?? "30d";
  const range = isAnalyticsRange(raw) ? raw : "30d";

  const orders = await prisma.order.findMany({
    where: { storeId: store.id, ...rangeWhere(range) },
    orderBy: { createdAt: "asc" },
    include: {
      customer: { select: { name: true, phone: true } },
      items: true,
    },
  });

  const rows: (string | number)[][] = [
    [
      "orderNo",
      "createdAt",
      "status",
      "paymentType",
      "paymentStatus",
      "totalNpr",
      "customerName",
      "customerPhone",
      "itemsSummary",
    ],
    ...orders.map((o) => [
      o.orderNo,
      o.createdAt.toISOString(),
      o.status,
      o.paymentType,
      o.paymentStatus,
      o.totalNpr,
      o.customer.name,
      o.customer.phone,
      o.items.map((i) => `${i.name} ×${i.qty}`).join("; "),
    ]),
  ];

  const csv = withBom(toCsv(rows));
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${store.slug}-${date}.csv"`,
    },
  });
}
```

- [ ] **Step 2: Verify the export link contract**

The analytics page (Task 3) already links `/api/dashboard/export?range=${range}`. Confirm the page's `range` value (one of `7d|30d|all`) survives the trip: the route validates with `isAnalyticsRange` and falls back to `30d` on garbage. No test needed — the range guard is already covered in Task 1.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/dashboard/export/route.ts
git commit -m "feat(analytics): orders CSV export route (session-authenticated)"
```

---

## Task 5: Product share component + wire into product page

**Files:**
- Create: `src/components/product-share.tsx`
- Modify: `src/app/[shop]/product/[id]/page.tsx` (render `<ProductShare>` between price and CTA)

**Interfaces:**
- Consumes: no lib — props only: `ShareLabels` + `slug`/`productId`/`productName`.
- Produces: `ProductShare({ slug, productId, productName, labels })` — exported client component.

- [ ] **Step 1: Write the failing test note**

The repo has no component test harness (vitest is node-env only, tests are pure libs). Skip a component test; the behavior-critical logic is `isMobileShareTarget()` gating. Extract it as a tiny pure helper so it can be tested — create `src/lib/mobile-share.ts`:

```ts
// Decides whether the native OS share sheet should be used. The user wants
// native share on touch devices but the YouTube-style modal on desktop — so
// gate on the device, not on navigator.share presence (macOS Safari and desktop
// Chrome also expose navigator.share).

export function isMobileShareTarget(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent ?? "";
  return (
    (navigator as { userAgentData?: { mobile?: boolean } }).userAgentData
      ?.mobile ??
    /ANDROID|IPHONE|IPAD|IPOD|MOBI/i.test(ua)
  );
}
```

- [ ] **Step 2: Write the failing tests — `src/lib/mobile-share.test.ts`**

```ts
import { describe, expect, it, vi } from "vitest";
import { isMobileShareTarget } from "./mobile-share";

function stubUserAgent(ua: string, mobile?: boolean) {
  (globalThis as Record<string, unknown>).navigator = {
    userAgent: ua,
    userAgentData: mobile === undefined ? undefined : { mobile },
  } as Navigator;
}

describe("isMobileShareTarget", () => {
  it("returns false when navigator is undefined", () => {
    vi.stubGlobal("navigator", undefined);
    expect(isMobileShareTarget()).toBe(false);
    vi.unstubAllGlobals();
  });

  it("detects Android user agents", () => {
    stubUserAgent("Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36");
    expect(isMobileShareTarget()).toBe(true);
  });

  it("detects iPhone user agents", () => {
    stubUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");
    expect(isMobileShareTarget()).toBe(true);
  });

  it("keeps desktop user agents on the modal", () => {
    stubUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
    expect(isMobileShareTarget()).toBe(false);
  });

  it("trusts userAgentData.mobile when present", () => {
    stubUserAgent("", true);
    expect(isMobileShareTarget()).toBe(true);
    stubUserAgent("", false);
    expect(isMobileShareTarget()).toBe(false);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/lib/mobile-share.test.ts`
Expected: FAIL — module `./mobile-share` does not exist.

- [ ] **Step 4: Run the tests to verify they pass**

The `mobile-share.ts` from Step 1 should make all five pass. Run `npx vitest run src/lib/mobile-share.test.ts`. If the `navigator` stub assignment mangles type-checking in the test, cast via `as unknown as Navigator` — the runtime behavior is what matters.

Expected: PASS.

- [ ] **Step 5: Write the share component**

Create `src/components/product-share.tsx`:

```tsx
"use client";

// Product share (Phase 6). Touch devices get the native OS share sheet; the
// browser builds a YouTube-style modal with a copy-link row and the platform
// grid. WhatsApp/Facebook/Viber open real share windows; Messenger, Instagram
// and TikTok have no desktop web intent, so they copy the link and toast
// "paste it in X". Hand-built Tailwind UI — this app ships no dialog/library.

import { useCallback, useEffect, useState } from "react";
import { isMobileShareTarget } from "@/lib/mobile-share";

export type ShareLabels = {
  button: string;
  title: string;
  copyLink: string;
  copied: string;
  pasteIn: string; // contains "{platform}"
  whatsapp: string;
  facebook: string;
  messenger: string;
  viber: string;
  instagram: string;
  tiktok: string;
};

type Props = {
  slug: string;
  productId: string;
  productName: string;
  labels: ShareLabels;
};

/** Inline brand glyphs — circular tiles, one color each, no icon library. */
const GLYPHS: Record<string, React.ReactNode> = {
  whatsapp: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path d="M17.5 14.4c-.3-.2-1.8-.9-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.6c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.2-.7-1.8-.9-2.4-.2-.6-.4-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.4zM12 22a10 10 0 01-5.2-1.4l.4-.2-3.7 1 1-3.6-.2-.4A9.9 9.9 0 112 12C2 6.5 6.5 2 12 2s10 4.5 10 10-4.5 10-10 10z"/></svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path d="M24 12.1C24 5.4 18.6 0 12 0S0 5.4 0 12.1C0 18.1 4.4 23.1 10.1 24v-8.4H7.1v-3.5h3.1V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-1.9.9-1.9 1.9v2.2h3.3l-.5 3.5h-2.8V24C19.6 23.1 24 18.1 24 12.1z"/></svg>
  ),
  messenger: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path d="M12 0C5.4 0 0 4.9 0 11c0 3 1.3 5.6 3.4 7.5V24l3-1.7c1 .3 2 .4 3.1.4h.5c6.6 0 12-4.9 12-11S18.6 0 12 0zm.6 14.8l-3-3.2-5.9 3.2 6.5-6.9 3.1 3.2 5.8-3.2-6.5 6.9z"/></svg>
  ),
  viber: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path d="M11.4 0C6.2.4 2 4.3 1.6 8.7c-.3 4 1 7.6 3.5 10.3.3.3.5.7.3 1.1l-.6 2.1c-.1.4.3.7.7.6l2.1-1c.3-.2.7-.1 1 .1 1.1.6 2.3.9 3.5.9 1 0 2-.2 3-.4.6-.2.9-.9.7-1.5-.9-2.8-2.4-7.3-2.4-7.6 0-1.3-1-2.4-2.2-2.5-.6 0-1.1.2-1.5.6-.2-.7-.1-1.5.2-2.2 1.3-2.7 3.7-4.5 4.3-4.2 1 .4.5 3.9.5 4 1.3-.2 2.4-.5 3.3-.9.9-.4 1.6-.9 1.8-1 .5.4 2.4 1.6 3 2.4.6.8.3 1.9.1 2.5-1 3-4.4 4.7-6.2 5.2-.3.1-.6.4-.5.7l.3 1.3c.1.4-.2.8-.6.8-.5 0-2-.4-3-.8-.2-.1-.4-.1-.5 0-.9.5-2 .8-3.1.9l-.2.7c-.1.6.3 1.2.9 1.3 1.2.2 2.4.5 3.6.8.5.1.9.4 1 .9.2.7 3.9-.2 7.8-3.8 2.4-2.2 3.9-4.9 3.9-6.9 0-1.7-.8-3.4-2.5-4.6C20.4 3.6 17.7.2 11.4 0zM7.3 6.3c.2-.2.4-.4.7-.6-.2.1-.4.3-.6.5l-.1.1z"/></svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6"><rect x="2.5" y="2.5" width="19" height="19" rx="5.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="17.6" cy="6.4" r="1.3" fill="currentColor" stroke="none"/></svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path d="M19.6 6.7a4.7 4.7 0 01-3.5-1.6 4.8 4.8 0 01-1.1-3V2h-3.9v13.9c0 1-.3 1.9-.9 2.6a3.5 3.5 0 01-5.2-1 3.5 3.5 0 011.4-4.7c.4-.3.9-.4 1.4-.4V8.3c-3.7.1-6.7 3.1-6.7 6.9 0 2.2 1 4.2 2.6 5.5A6.7 6.7 0 009.4 18a6.9 6.9 0 006.8-6.8V7.6c1 .7 2.2 1.1 3.4 1.1z"/></svg>
  ),
};

export function ProductShare({ slug, productId, productName, labels }: Props) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/${slug}/product/${productId}`
      : "";

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1600);
  }, []);

  const copyLink = useCallback(
    async (platformName?: string) => {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // clipboard may be blocked in a non-secure context — still show feedback
      }
      flash(
        platformName
          ? labels.pasteIn.replace("{platform}", platformName)
          : labels.copied,
      );
    },
    [url, flash, labels],
  );

  const handleShare = async () => {
    if (isMobileShareTarget() && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: productName, text: productName, url });
      } catch {
        // AbortError = user closed the sheet; do nothing
      }
      return;
    }
    setOpen(true);
  };

  const openExternal = (shareUrl: string) =>
    window.open(shareUrl, "_blank", "noopener,noreferrer");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const platforms = [
    {
      id: "whatsapp",
      name: labels.whatsapp,
      color: "#25D366",
      onClick: () => openExternal(`https://wa.me/?text=${encodeURIComponent(`${productName}\n${url}`)}`),
    },
    {
      id: "facebook",
      name: labels.facebook,
      color: "#1877F2",
      onClick: () => openExternal(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`),
    },
    {
      id: "messenger",
      name: labels.messenger,
      color: "#0084FF",
      onClick: () => copyLink(labels.messenger),
    },
    {
      id: "viber",
      name: labels.viber,
      color: "#7360F2",
      onClick: () => openExternal(`viber://forward?text=${encodeURIComponent(`${productName} — ${url}`)}`),
    },
    {
      id: "instagram",
      name: labels.instagram,
      color: "#E1306C",
      onClick: () => copyLink(labels.instagram),
    },
    {
      id: "tiktok",
      name: labels.tiktok,
      color: "#111111",
      onClick: () => copyLink(labels.tiktok),
    },
  ];

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <path d="M8.6 13.5l6.8 3.9M15.4 6.6L8.6 10.5" />
        </svg>
        {labels.button}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={labels.title}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-zinc-900">
              {labels.title}
            </h2>

            <div className="mt-3 flex gap-2">
              <input
                readOnly
                value={url}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-600"
              />
              <button
                type="button"
                onClick={() => copyLink()}
                className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
              >
                {labels.copyLink}
              </button>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              {platforms.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={p.onClick}
                  className="flex flex-col items-center gap-1.5 rounded-lg p-2 transition hover:bg-zinc-50"
                >
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: p.color }}
                  >
                    {GLYPHS[p.id]}
                  </span>
                  <span className="text-xs text-zinc-600">{p.name}</span>
                </button>
              ))}
            </div>

            {toast ? (
              <p className="mt-4 rounded-md bg-zinc-900 px-3 py-2 text-center text-xs text-white">
                {toast}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
```

- [ ] **Step 6: Wire into the product page**

Modify `src/app/[shop]/product/[id]/page.tsx`:

1. Import `ProductShare` and `type ShareLabels`:
```tsx
import { ProductShare, type ShareLabels } from "@/components/product-share";
```
2. After the price `<p>` and before the `<AddToCartButton>`/out-of-stock block, render:
```tsx
<ProductShare
  slug={slug}
  productId={product.id}
  productName={product.name}
  labels={
    {
      button: t(locale, "share.button"),
      title: t(locale, "share.title"),
      copyLink: t(locale, "share.copyLink"),
      copied: t(locale, "share.copied"),
      pasteIn: t(locale, "share.pasteIn"),
      whatsapp: t(locale, "share.whatsapp"),
      facebook: t(locale, "share.facebook"),
      messenger: t(locale, "share.messenger"),
      viber: t(locale, "share.viber"),
      instagram: t(locale, "share.instagram"),
      tiktok: t(locale, "share.tiktok"),
    } satisfies ShareLabels
  }
/>
```

- [ ] **Step 7: Type-check + build, then commit**

Run: `npx tsc --noEmit` — PASS requires the Task 6 i18n keys in `en.ts`/`ne.ts`; add them now (Task 6 Step 1) if you haven't already.

Run: `npm run build` — PASS.

```bash
git add src/components/product-share.tsx src/lib/mobile-share.ts src/lib/mobile-share.test.ts 'src/app/[shop]/product/[id]/page.tsx'
git commit -m "feat(share): product share button with native-sheet/modal UX"
```

---

## Task 6: Navigation + i18n

**Files:**
- Modify: `src/app/dashboard/page.tsx`, `src/app/dashboard/more/page.tsx`
- Modify: `src/locales/en.ts`, `src/locales/ne.ts`

**Interfaces:**
- Produces: the i18n keys Tasks 3 and 5 reference. **Add these before running build in Tasks 3/5.**

- [ ] **Step 1: Add the analytics + share keys to `src/locales/en.ts`**

Insert before the closing `} as const;`:

```ts
  // Analytics page (Phase 6 slice 1)
  "analytics.title": "Analytics",
  "analytics.range7d": "Last 7 days",
  "analytics.range30d": "Last 30 days",
  "analytics.rangeAll": "All time",
  "analytics.granularityDay": "Day",
  "analytics.granularityWeek": "Week",
  "analytics.granularityMonth": "Month",
  "analytics.revenue": "Revenue",
  "analytics.ordersByStatus": "Orders by status",
  "analytics.topProducts": "Top products",
  "analytics.paymentSplit": "Payment methods",
  "analytics.customerGrowth": "New customers",
  "analytics.product": "Product",
  "analytics.qtySold": "Qty sold",
  "analytics.revenueNpr": "Revenue (NPR)",
  "analytics.export": "Export CSV",
  "analytics.empty": "No data in this period.",

  // Product share (Phase 6 slice 1)
  "share.button": "Share",
  "share.title": "Share this product",
  "share.copyLink": "Copy link",
  "share.copied": "Copied ✓",
  "share.pasteIn": "Link copied — paste it in {platform}",
  "share.whatsapp": "WhatsApp",
  "share.facebook": "Facebook",
  "share.messenger": "Messenger",
  "share.viber": "Viber",
  "share.instagram": "Instagram",
  "share.tiktok": "TikTok",
```

- [ ] **Step 2: Add the matching keys to `src/locales/ne.ts` (parity)**

Insert the equivalent block at the same structural position (near the end of the dictionary, before its closing):

```ts
  "analytics.title": "एनालिटिक्स",
  "analytics.range7d": "पछिल्लो ७ दिन",
  "analytics.range30d": "पछिल्लो ३० दिन",
  "analytics.rangeAll": "सबै समय",
  "analytics.granularityDay": "दिन",
  "analytics.granularityWeek": "हप्ता",
  "analytics.granularityMonth": "महिना",
  "analytics.revenue": "कुल बिक्री",
  "analytics.ordersByStatus": "अर्डर स्टेटस",
  "analytics.topProducts": "लोकप्रिय उत्पादनहरू",
  "analytics.paymentSplit": "भुक्तानी विधिहरू",
  "analytics.customerGrowth": "नयाँ ग्राहक",
  "analytics.product": "उत्पादन",
  "analytics.qtySold": "बिक्री भएको संख्या",
  "analytics.revenueNpr": "बिक्री (NPR)",
  "analytics.export": "CSV डाउनलोड",
  "analytics.empty": "यो अवधिमा कुनै डाटा छैन।",
  "share.button": "सेयर गर्नुहोस्",
  "share.title": "यो उत्पादन सेयर गर्नुहोस्",
  "share.copyLink": "लिंक कपी गर्नुहोस्",
  "share.copied": "कपी भयो ✓",
  "share.pasteIn": "लिंक कपी भयो — {platform} मा पेस्ट गर्नुहोस्",
  "share.whatsapp": "WhatsApp",
  "share.facebook": "Facebook",
  "share.messenger": "Messenger",
  "share.viber": "Viber",
  "share.instagram": "Instagram",
  "share.tiktok": "TikTok",
```

- [ ] **Step 3: Add the Home strip Analytics card**

In `src/app/dashboard/page.tsx`, inside the `<div className="mt-6 grid ...">` (after the two stat `<Link>`s), add a third card. Use `col-span-full` so it spans the row on both breakpoints:

```tsx
<Link
  href="/dashboard/analytics"
  className="col-span-full rounded-lg border border-zinc-200 bg-white p-5 transition hover:border-teal-300 hover:shadow-sm"
>
  <p className="text-sm text-zinc-500">{t(locale, "dashboard.analytics")}</p>
  <p className="mt-1 text-sm text-zinc-400">
    {t(locale, "dashboard.analyticsHint")}
  </p>
</Link>
```

- [ ] **Step 4: Add the More tab Analytics row**

In `src/app/dashboard/more/page.tsx`, before the Settings `<Link>`, add:

```tsx
<Link
  href="/dashboard/analytics"
  className="block border-b border-zinc-100 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
>
  {t(locale, "more.analytics")}
</Link>
```

- [ ] **Step 5: Add the dashboard → analytics home labels to `en.ts`/`ne.ts`**

In the "Dashboard home" group of `en.ts` (after `"dashboard.salesToday"`), add:
```ts
  "dashboard.analytics": "Analytics",
  "dashboard.analyticsHint": "Revenue, top products, and more",
```
And below `"more.subtitle"`:
```ts
  "more.analytics": "Analytics",
```
Mirror in `ne.ts` after `"dashboard.salesToday"`:
```ts
  "dashboard.analytics": "एनालिटिक्स",
  "dashboard.analyticsHint": "बिक्री, लोकप्रिय उत्पादन र थप",
```
And after `"more.subtitle"`:
```ts
  "more.analytics": "एनालिटिक्स",
```

- [ ] **Step 6: Verify parity + build**

Run: `npx tsc --noEmit` then `npm run build`
Expected: PASS — `ne` is typed as `Record<keyof typeof en, string>`, so a missing Nepali key is a compile error.

- [ ] **Step 7: Commit**

```bash
git add src/locales/en.ts src/locales/ne.ts src/app/dashboard/page.tsx src/app/dashboard/more/page.tsx
git commit -m "feat(analytics): Home + More entry points and en/ne i18n keys"
```

---

## Task 7: DoD gate

- [ ] **Step 1: Full suite**

Run: `npm test` — all suites green, including the new `src/lib/analytics/*` and `src/lib/mobile-share.test.ts`.

- [ ] **Step 2: Production build**

Run: `npm run build` — compiles with no type errors (the en↔ne parity gate included).

- [ ] **Step 3: Live walkthrough (`npm run dev`)**

1. **Analytics:** sign in → brand logo → the Home strip shows the Analytics card; More also lists Analytics. Open `/dashboard/analytics`. Range pills (`7d/30d/All`) and granularity pills (`Day/Week/Month`) re-render the page via links. Revenue chart bars scale against the max; the status stacked bar, top-products table, payment split, and customer growth all show numbers consistent with seeded orders. Visit `/dashboard/analytics?range=bogus` — falls back to `30d` silently, no crash.
2. **Export:** click **Export CSV** → `orders-<slug>-<date>.csv` downloads. Open in Excel: Nepali text (if any) renders correctly (BOM); `itemsSummary` column shows `Name ×qty; …`; a `,` in a product name is quoted and stays in one column. Changing the range pill changes which orders land in the file.
3. **Share:** on the product page, the outline Share button sits under the price. DevTools mobile-emulation (Android UA) → tapping Share opens the OS share sheet. Back on desktop UA → tapping opens the modal. WhatsApp/Facebook/Viber open real share tabs. Instagram/TikTok/Messenger copy the link and show the paste-in toast. The copy-link row flashes "Copied ✓". Esc and overlay-click close the modal.
4. **Per-task review:** review each task commit (`git log --oneline -8`) before the tag.

- [ ] **Step 4: PROGRESS.md + tag**

Update `PROGRESS.md` with the slice-1 entry, then:
```bash
git tag phase-6
```

- [ ] **Step 5: Push only on the user's word**

Do **not** push. Present the summary and wait for the user to say to push.

---

## Self-review notes

**Spec coverage:**
- Analytics page with five dimensions → Task 3 (revenue via `bucketOrders`, status via `groupBy`, top products via `aggregateTopProducts`, payment split via `groupBy`, customer growth via `bucketCounts`). ✓
- Range-aware export → Task 4, shared `rangeWhere`. ✓
- Mobile native share + desktop modal with the 7-platform strategy → Task 5. ✓
- Navigation from Home + More, tab bar unchanged → Task 6. ✓
- i18n parity in both locales → Task 6. ✓
- No DB changes, no new dependencies → nothing in the plan touches `schema.prisma` or `package.json`. ✓

**Type consistency:** `rangeWhere(range)` is spread into every `where` in Tasks 3–4; `bucketOrders`/`bucketCounts` signatures match Task 1's definitions; `aggregateTopProducts(rows, 10)` matches Task 2. `AnalyticsRange`/`AnalyticsGranularity` types flow through `RANGE_LABEL_KEYS`/`GRANULARITY_LABEL_KEYS`. ✓

**No placeholders:** every task carries full code for libs, page, route, and component; navigation diffs; both locale dictionaries. The only non-code step is Task 7's manual walkthrough, which is intentional (the repo's established DoD pattern).