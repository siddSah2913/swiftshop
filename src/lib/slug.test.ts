import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("lowercases and kebab-cases plain text", () => {
    expect(slugify("Sita's Fashion")).toBe("sitas-fashion");
  });
  it("strips diacritics", () => {
    expect(slugify("Göras café")).toBe("goras-cafe");
  });
  it("collapses runs of separators", () => {
    expect(slugify("A  B -- C")).toBe("a-b-c");
  });
  it("trims leading/trailing separators", () => {
    expect(slugify("_Pokhara_")).toBe("pokhara");
  });
  it("caps at 48 chars", () => {
    expect(slugify("a".repeat(60))).toHaveLength(48);
  });
  it("falls back to 'shop' when empty", () => {
    expect(slugify("   ")).toBe("shop");
    expect(slugify("!!!")).toBe("shop");
  });
});
