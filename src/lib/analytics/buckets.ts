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