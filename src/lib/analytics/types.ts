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