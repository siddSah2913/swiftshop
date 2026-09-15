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
    expect(out.every((b) => b.start.getTime() === THU.getTime() || b.value === 0)).toBe(true);
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