import { describe, expect, it } from "vitest";
import { onboardingSchema } from "./schema";

const valid = {
  name: "Sita's Fashion",
  category: "clothing",
  province: "bagmati",
  district: "Kathmandu",
  slug: "sitas-fashion",
};

describe("onboardingSchema", () => {
  it("accepts a valid payload", () => {
    expect(onboardingSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a blank name", () => {
    expect(onboardingSchema.safeParse({ ...valid, name: "  " }).success).toBe(false);
  });

  it("rejects a category outside the enum", () => {
    expect(onboardingSchema.safeParse({ ...valid, category: "cars" }).success).toBe(false);
  });

  it("rejects a province that is not one of the 7", () => {
    expect(onboardingSchema.safeParse({ ...valid, province: "narnia" }).success).toBe(false);
  });

  it("rejects a district that belongs to another province", () => {
    // Jhapa is in Koshi, not Bagmati.
    expect(onboardingSchema.safeParse({ ...valid, district: "Jhapa" }).success).toBe(false);
  });

  it("rejects an invalid slug", () => {
    expect(onboardingSchema.safeParse({ ...valid, slug: "Sita's Fashion!" }).success).toBe(false);
  });
});