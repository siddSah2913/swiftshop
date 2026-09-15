# Phase 6 Slice 1 — Analytics, CSV Export, Product Share

## Overview

Three features that turn SwiftShop from an order-taking tool into one the owner can read:

1. **Analytics page** (`/dashboard/analytics`) — five dimensions: revenue trend, orders by status, top products, payment split, customer growth. Reachable from the Home strip and the More tab; the dashboard tab bar stays at 4 items.
2. **CSV export** — one-click download of **orders** in the currently selected date range, UTF-8 BOM so Nepali script opens cleanly in Excel. No new dependencies (the CSV is hand-assembled with an RFC 4180 escaper).
3. **Product Share** on the storefront product page — native OS share sheet on mobile, a YouTube-style platform modal on desktop.

**Goal:** An owner can see how the shop is doing since yesterday or all time, hand a week's orders to their accountant as a CSV, and any customer can tell a friend about a product in one tap.

**No database changes.** All dimensions derive from existing `Order`, `OrderItem`, `Product`, `Customer` rows. No new dependencies.

---

## Architecture

### 1. Analytics page (`src/app/dashboard/analytics/page.tsx`)

A **server component** following the existing dashboard convention: `requireStore()` (tenant-boundary), then store-scoped Prisma queries, i18n via `getLocale`/`t` on the `swiftshop_lang` cookie. No client state — the two controls are `searchParams` driven.

```
GET /dashboard/analytics?range=30d&granularity=day
```

| searchParam | values | default |
|---|---|---|
| `range` | `7d` \| `30d` \| `all` | `30d` |
| `granularity` | `day` \| `week` \| `month` | `day` |

Both validated through guards (`isAnalyticsRange`, `isAnalyticsGranularity`) exactly like the existing `isOrderStatus` pattern — an unknown value falls back to the default, never crashes.

**Layout** (top to bottom):
- **Header** — title + an **Export CSV** link (styled as a button, points at the export route handler with the current range).
- **Range pills** (`7d / 30d / All time`) and **granularity pills** (`Day / Week / Month`) — rendered as `<Link>`s carrying the query params.
- **Revenue trend card** — hand-built Tailwind bar chart of `SUM(totalNpr)` per bucket. No charting library. Zero-value buckets render as a faint empty track; a "no data in this period" note shows when the period has no orders.
- **Orders by status card** — five counts (new/confirmed/handed/delivered/cancelled) as a horizontal stacked bar + legend/count labels, reusing `ORDER_STATUSES`, `ORDER_STATUS_BADGE`, and the existing status i18n keys.
- **Top products card** — table (top 10): product name, qty sold, revenue NPR. Rows sourced from `OrderItem` snapshots.
- **Payment split card** — COD / QR / eSewa / Khalti by **count and revenue**, zero-filled against `PAYMENT_TYPES`.
- **Customer growth card** — new `Customer` count per bucket, same granularity as the revenue trend.

**Data access** — all aggregation is store-scoped via `store.id`, all date filtering via `createdAt >= rangeStart`. Two pure helpers do the date bucketing (Prisma can't group by day/week/month), see §Pure analytics lib.

### 2. Pure analytics lib (`src/lib/analytics/`)

Mirrors the `src/lib/delivery/` / `src/lib/payments/` convention — pure modules with unit tests, no DB, no side effects. Every non-trivial aggregation lives here so it is covered by `npm test` (vitest, node env — never touches the database).

```
src/lib/analytics/
  types.ts         — AnalyticsRange, AnalyticsGranularity, guards, rangeStart()
  buckets.ts       — bucketStart(), buildBuckets(), bucketOrders()  (revenue/customer)
  top-products.ts  — aggregateTopProducts()                          (ItemRow → ranked list)
  csv.ts           — escapeCsvField(), toCsv(), withBom()
```

**`types.ts`**
```ts
export const ANALYTICS_RANGES = ["7d", "30d", "all"] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];
export const ANALYTICS_GRANULARITIES = ["day", "week", "month"] as const;
export type AnalyticsGranularity = (typeof ANALYTICS_GRANULARITIES)[number];

export function isAnalyticsRange(v: string): v is AnalyticsRange;
export function isAnalyticsGranularity(v: string): v is AnalyticsGranularity;

/** Prisma where clause for createdAt by range; {} for all. */
export function rangeWhere(range: AnalyticsRange): { gte: Date } | {};
```

**`buckets.ts`**
```ts
/** Local start-of-day / start-of-ISO-week / start-of-month (date-fns). */
export function bucketStart(date: Date, granularity: AnalyticsGranularity): Date;

/**
 * Contiguous zero-filled buckets between rangeStart and now.
 * Daily is capped at the most recent 30 days, weekly at 12 weeks, monthly at 12
 * months — a hand-built bar chart stops being legible past that.
 */
export function buildBuckets(start: Date, end: Date, granularity: AnalyticsGranularity): Date[];
```

**Legibility rule for odd range × granularity combos:** if the range is shorter than one granularity period (e.g. `7d` + Month), `buildBuckets` returns a single period — the chart renders as one full-width bar, which is still truthful. No special UI, no crash.

/**
 * Fold raw { createdAt, totalNpr } rows into { start, totalNpr } aligned to the
 * bucket grid (zero-fills empty buckets). Used by the revenue and customer cards.
 */
export function bucketOrders(rows, start, end, granularity): Bucket[];
export function bucketCounts(rows, start, end, granularity): Bucket[]; // count per bucket
```

**`top-products.ts`**
```ts
// OrderItem groupBy can't sum priceNpr×qty, so fetch the light rows and fold here.
export function aggregateTopProducts(
  rows: { name: string; priceNpr: number; qty: number }[],
  limit = 10,
): { name: string; qtySold: number; revenueNpr: number }[];
```

**`csv.ts`** — RFC 4180 with the exact-number escapes:
```ts
escapeCsvField(v: string | number): string;   // quote fields containing , " \n; double the quotes
toCsv(rows: (string | number)[][]): string;   // join with commas/lines, always LF
withBom(csv: string): string;                 // "﻿" + csv  (Excel opens Nepali correctly)
```

### 3. CSV export route (`src/app/api/dashboard/export/route.ts`)

A **GET route handler** — the session cookie authenticates the request, so the analytics-header button is a plain `<Link>`. No client fetch, no Blob juggling.

1. `auth()` from `@/lib/auth`; no session → `401`.
2. Load the session owner's store (same tenant boundary as `requireStore`).
3. Validate the `range` searchParam (default `30d`), build `rangeWhere`.
4. Query orders (store-scoped, `createdAt >= start`, include `customer.name/phone` and `items`).
5. Build the CSV via `toCsv` + `withBom`, with `Content-Type: text/csv; charset=utf-8` and `Content-Disposition: attachment; filename="orders-<slug>-<date>.csv"`.

**Columns:** `orderNo, createdAt, status, paymentType, paymentStatus, totalNpr, customerName, customerPhone, itemsSummary` where `itemsSummary` is `"T-Shirt ×2; Jeans ×1"`. This is the money dataset — one export carries the customer + items too.

### 4. Product share (`src/components/product-share.tsx`)

A **client component** (`"use client"`), placed on `src/app/[shop]/product/[id]/page.tsx` in the right column between the price and the Add-to-Cart CTA, as a secondary (outlined) button so the CTA stays dominant. Translated labels are passed in as props (server reads the `locale` cookie), matching the existing `AddToCartButton` pattern.

**Platform strategy (locked decisions):**

| Platform | Behavior |
|---|---|
| Mobile (touch, any) | **Native OS share sheet** via `navigator.share({ title, text, url })` — includes every installed app. One tap, no modal. |
| WhatsApp | Desktop: opens `https://wa.me/?text=<title + url>` in a new tab (real share window). |
| Facebook | Desktop: opens `https://www.facebook.com/sharer/sharer.php?u=<url>` in a new tab. |
| Viber | Desktop: opens `viber://forward?text=<title + url>` (works when Viber desktop is installed; no-op silently otherwise — the Copy link row above it always works). |
| Messenger | **No desktop web intent** → copies the link and shows a toast "Link copied — paste it in Messenger". |
| Instagram | **No desktop web intent** → copies the link with a "paste it in Instagram" toast. |
| TikTok | **No desktop web intent** → copies the link with a "paste it in TikTok" toast. |

**Detection** — desktop vs mobile is decided by UA, not by `navigator.share` presence alone (macOS Safari and desktop Chrome also expose `navigator.share`; the user wants them on the YouTube-style modal):

```ts
function isMobileShareTarget(): boolean {
  return (
    typeof navigator !== "undefined" &&
    (navigator.userAgentData?.mobile ||
      /ANDROID|IPHONE|IPAD|IPOD|MOBI/i.test(navigator.userAgent))
  );
}

async function handleShare() {
  if (isMobileShareTarget() && typeof navigator.share === "function") {
    await navigator.share({ title, text, url }).catch(() => {}); // user-cancel → no-op
    return;
  }
  setOpen(true); // desktop (or mobile without Web Share) → modal
}
```

**Modal** — hand-built with Tailwind (the app has **no** dialog/sheet component and no component library; the share modal is the first). Structure:
- Fixed `inset-0` overlay, `bg-black/50`, click-to-close; centered panel with `role="dialog"` / `aria-modal="true"`, Esc to close.
- **Copy link row** — a readonly input prefilled with the share URL + a Copy button → clipboard + "Copied ✓" flash (same micro-pattern as `hand-to-partner.tsx` already uses).
- **Platform grid** — 7 tiles (WhatsApp, Facebook, Messenger, Viber, Instagram, TikTok) of inline SVG brand icons + labels. Icons are hand-drawn SVGs in the component, no icon library.
- Toast state is a single piece of client state that auto-clears after ~1.6 s.

**Share URL** built at click time from browser state so it always points at the customer's host:
```
`${window.location.origin}/${slug}/product/${productId}`
```

---

## i18n keys (en + ne, parity = compile error)

| Key | en | ne |
|---|---|---|
| `dashboard.analytics` | Analytics | एनालिटिक्स |
| `dashboard.analyticsHint` | Revenue, top products, and more | बिक्री, लोकप्रिय उत्पादन र थप |
| `more.analytics` | Analytics | एनालिटिक्स |
| `analytics.title` | Analytics | एनालिटिक्स |
| `analytics.range7d` | Last 7 days | पछिल्लो ७ दिन |
| `analytics.range30d` | Last 30 days | पछिल्लो ३० दिन |
| `analytics.rangeAll` | All time | सबै समय |
| `analytics.granularityDay` | Day | दिन |
| `analytics.granularityWeek` | Week | हप्ता |
| `analytics.granularityMonth` | Month | महिना |
| `analytics.revenue` | Revenue | कुल बिक्री |
| `analytics.ordersByStatus` | Orders by status | अर्डर स्टेटस |
| `analytics.topProducts` | Top products | लोकप्रिय उत्पादनहरू |
| `analytics.paymentSplit` | Payment methods | भुक्तानी विधिहरू |
| `analytics.customerGrowth` | New customers | नयाँ ग्राहक |
| `analytics.product` | Product | उत्पादन |
| `analytics.qtySold` | Qty sold | बिक्री भएको संख्या |
| `analytics.revenueNpr` | Revenue (NPR) | बिक्री (NPR) |
| `analytics.export` | Export CSV | CSV डाउनलोड |
| `analytics.empty` | No data in this period. | यो अवधिमा कुनै डाटा छैन। |
| `share.button` | Share | सेयर गर्नुहोस् |
| `share.title` | Share this product | यो उत्पादन सेयर गर्नुहोस् |
| `share.copyLink` | Copy link | लिंक कपी गर्नुहोस् |
| `share.copied` | Copied ✓ | कपी भयो ✓ |
| `share.pasteIn` | Link copied — paste it in {platform} | लिंक कपी भयो — {platform} मा पेस्ट गर्नुहोस् |
| `share.whatsapp` | WhatsApp | WhatsApp |
| `share.facebook` | Facebook | Facebook |
| `share.messenger` | Messenger | Messenger |
| `share.viber` | Viber | Viber |
| `share.instagram` | Instagram | Instagram |
| `share.tiktok` | TikTok | TikTok |

---

## Implementation tasks (TDD-first)

Every task below starts with tests, then one commit per task, then review (subagent-driven, same discipline as Phases 1–5). The pure lib is unit-tested; pages and the modal are covered by `npm run build` + the live walkthrough (repo has no component-test harness — that's the established convention).

### T1 — Analytics types + buckets lib (tests-first)
**Files:** `src/lib/analytics/types.ts`, `buckets.ts`, `types.test.ts`, `buckets.test.ts`
- Guards reject unknown ranges/granularities; `rangeWhere` builds `{ gte }`/`{}`; `bucketStart` returns local day/ISO-week/month starts.
- `buildBuckets` zero-fills a contiguous grid and caps daily≤30, weekly≤12, monthly≤12.
- `bucketOrders`/`bucketCounts` fold rows onto the grid, zero-filling gaps.

### T2 — Top-products + CSV lib (tests-first)
**Files:** `src/lib/analytics/top-products.ts`, `top-products.test.ts`, `analytics/csv.ts`, `csv.test.ts`
- `aggregateTopProducts` sums `priceNpr × qty` per name, sorts by revenue desc, truncates to limit.
- `escapeCsvField` quotes `, " \n` and doubles embedded quotes; `toCsv` joins rows with LF; `withBom` prepends `﻿`.

### T3 — Analytics page (server component)
**Files:** `src/app/dashboard/analytics/page.tsx`
- `requireStore()`; `searchParams.range/granularity` through the guards.
- Store-scoped queries (revenue/customer rows, `groupBy` status + paymentType, `OrderItem` rows), composed through the pure lib.
- Five cards render; zero-data states use `analytics.empty`; status/payment labels reuse existing i18n keys.
- No client component; range/granularity are links.

### T4 — CSV export route handler
**Files:** `src/app/api/dashboard/export/route.ts`
- `auth()` session check (401), store lookup, `range` param, orders query with customer + items.
- Responses: `200` CSV (BOM, `Content-Disposition: attachment`) or `401`.
- Manual check only — no route-handler test harness exists (matches repo convention).

### T5 — Product share component
**Files:** `src/components/product-share.tsx`, edit `src/app/[shop]/product/[id]/page.tsx`
- Mobile → `navigator.share`; desktop → modal (overlay, copy-link row, 7-platform grid, toasts).
- Real intents (WhatsApp/Facebook/Viber) open via `window.open(..., "_blank", "noopener")`; Messenger/Instagram/TikTok copy + "paste it in X" toast.
- Wire into product page right column with translated props.

### T6 — Navigation + i18n
**Files:** `src/app/dashboard/page.tsx`, `src/app/dashboard/more/page.tsx`, `src/locales/en.ts`, `src/locales/ne.ts`
- Home strip gains an Analytics card linking `/dashboard/analytics` (label + hint).
- More tab gains an Analytics row above Settings.
- All §i18n keys added to **both** locale files (missing Nepali = compile error, the parity gate).

### T7 — DoD gate
1. `npm run build` — compiles (types + en↔ne parity).
2. `npm test` — all suites green including the new analytics lib tests.
3. Live walkthrough (`npm run dev`):
   - Analytics: range/granularity pills re-render the charts; all five cards show correct numbers against seeded data; a `?range=bogus` URL falls back silently.
   - Export: CSV downloads, opens in Excel with `₹`-free numbers and correct Nepali text, respects the selected range.
   - Share: mobile UA (devtools) → OS share sheet; desktop → modal; WhatsApp/Facebook/Viber open real windows; Instagram/TikTok/Messenger copy + toast; copy-link row flashes "Copied ✓".
4. Review of the full slice on `HEAD~N..HEAD` per task.
5. **PROGRESS.md** update + `git tag phase-6` + push **only on the user's word**.

---

## Security notes

- Every analytics query and the export route are **store-scoped** — analytics reads only `store.id`'s rows; the export route's tenant boundary mirrors `requireStore` (session → owner's own store).
- The export route is a plain GET with session-cookie auth, same as every dashboard page — no token in the URL, no CORS surface.
- No secrets in the client bundle: the share modal constructs public share URLs only (`wa.me`, `facebook.com/sharer`, `viber://forward`) and the product URL itself — nothing store-internal is exposed.
- `navigator.share` failures (user cancel = `AbortError`) are swallowed; native-share absence falls back to the modal, never a dead button.
- CSV escaping is RFC 4180 — a product name containing `,`, `"`, or a newline is quoted correctly rather than corrupting the column layout. The export target is an authenticated owner-only route, so CSV formula-injection is not in scope (no untrusted admin shares this exact CSV through a spreadsheet that auto-evaluates cells against the owner's own data).