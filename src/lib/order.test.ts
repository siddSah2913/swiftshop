import { describe, expect, it } from "vitest";
import { computeTotal } from "./order";

describe("computeTotal", () => {
  it("sums integer prices × qty", () => {
    expect(
      computeTotal([
        { priceNpr: 1200, qty: 2 },
        { priceNpr: 500, qty: 1 },
      ])
    ).toBe(2900);
  });

  it("returns 0 for no lines", () => {
    expect(computeTotal([])).toBe(0);
  });

  it("returns 0 for zero-price lines", () => {
    expect(computeTotal([{ priceNpr: 0, qty: 3 }])).toBe(0);
  });

  it("throws on a negative price", () => {
    expect(() => computeTotal([{ priceNpr: -5, qty: 1 }])).toThrow();
  });

  it("throws on a non-integer price (paisa)", () => {
    expect(() => computeTotal([{ priceNpr: 12.5, qty: 1 }])).toThrow();
  });

  it("throws on qty 0", () => {
    expect(() => computeTotal([{ priceNpr: 100, qty: 0 }])).toThrow();
  });

  it("throws on qty above the 9 cap", () => {
    expect(() => computeTotal([{ priceNpr: 100, qty: 10 }])).toThrow();
  });

  it("throws on a non-integer qty", () => {
    expect(() => computeTotal([{ priceNpr: 100, qty: 1.5 }])).toThrow();
  });

  it("handles large carts without float drift", () => {
    const cart = Array.from({ length: 20 }, () => ({
      priceNpr: 9800,
      qty: 9,
    }));
    expect(computeTotal(cart)).toBe(20 * 9 * 9800);
  });
});