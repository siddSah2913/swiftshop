import { describe, expect, it } from "vitest";
import { PROVINCES } from "./nepal";

describe("nepal.ts", () => {
  it("has all 7 provinces", () => {
    expect(PROVINCES).toHaveLength(7);
  });

  it("has exactly 77 districts, each in exactly one province", () => {
    const seen = new Set<string>();
    for (const p of PROVINCES) {
      expect(p.districts.length).toBeGreaterThan(0);
      for (const d of p.districts) {
        expect(seen.has(d)).toBe(false); // duplicate = two provinces claiming one district
        seen.add(d);
      }
    }
    expect(seen.size).toBe(77);
  });

  it("keeps province ids distinct", () => {
    const ids = PROVINCES.map((p) => p.id);
    expect(new Set(ids).size).toBe(7);
  });

  it("sorts districts alphabetically for stable dropdown order", () => {
    for (const p of PROVINCES) {
      expect([...p.districts].sort()).toEqual(p.districts);
    }
  });
});