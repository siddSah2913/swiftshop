// Tests for the wa.me link helpers used by the order/customer WhatsApp buttons.

import { describe, expect, it } from "vitest";
import { buildWaUrl, normalizeDevicePhone } from "./whatsapp";

describe("normalizeDevicePhone", () => {
  it("prefixes a 10-digit Nepali mobile with 977", () => {
    expect(normalizeDevicePhone("9812345678")).toBe("9779812345678");
  });

  it("ignores formatting characters in the stored phone", () => {
    expect(normalizeDevicePhone("98 12 34 56 78")).toBe("9779812345678");
  });

  it("never double-prefixes an already-977 number", () => {
    expect(normalizeDevicePhone("+977-98-1234-5678")).toBe("9779812345678");
  });

  it("leaves non-Nepali digits untouched", () => {
    expect(normalizeDevicePhone("1234567890")).toBe("1234567890");
  });

  it("leaves short numbers untouched", () => {
    expect(normalizeDevicePhone("982123")).toBe("982123");
    expect(normalizeDevicePhone("")).toBe("");
  });
});

describe("buildWaUrl", () => {
  it("builds a wa.me link with the 977 prefixed number", () => {
    expect(buildWaUrl("9812345678", "Hi")).toBe(
      "https://wa.me/9779812345678?text=Hi",
    );
  });

  it("URL-encodes the body text", () => {
    expect(buildWaUrl("9812345678", "Order #3, yes?")).toBe(
      "https://wa.me/9779812345678?text=Order%20%233%2C%20yes%3F",
    );
  });

  it("handles an empty body", () => {
    expect(buildWaUrl("9812345678", "")).toBe(
      "https://wa.me/9779812345678?text=",
    );
  });
});