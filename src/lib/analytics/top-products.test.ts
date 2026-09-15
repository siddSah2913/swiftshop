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