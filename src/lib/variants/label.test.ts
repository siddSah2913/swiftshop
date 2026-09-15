import { describe, expect, it } from "vitest";
import { VARIANT_NAME_SEPARATOR, formatVariantName } from "./label";

describe("formatVariantName", () => {
  it("appends option names separated by em dash + comma", () => {
    expect(formatVariantName("Tee", ["Size M", "Red"])).toBe(
      `Tee${VARIANT_NAME_SEPARATOR}Size M, Red`,
    );
  });

  it("returns the plain name when there are no options", () => {
    expect(formatVariantName("Tee", [])).toBe("Tee");
  });
});