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