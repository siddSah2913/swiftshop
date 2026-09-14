import { describe, expect, it } from "vitest";
import { parseCartCookie, serializeCart, CART_COOKIE } from "./cart";

describe("CART_COOKIE", () => {
  it("is the expected cookie name", () => {
    expect(CART_COOKIE).toBe("swiftshop_cart");
  });
});

describe("parseCartCookie", () => {
  it("parses a valid cart", () => {
    const cart = parseCartCookie(
      encodeURIComponent(JSON.stringify({ abc123: 2, def456: 1 }))
    );
    expect(cart).toEqual({ abc123: 2, def456: 1 });
  });

  it("returns empty cart for null", () => {
    expect(parseCartCookie(null)).toEqual({});
  });

  it("returns empty cart for empty string", () => {
    expect(parseCartCookie("")).toEqual({});
  });

  it("returns empty cart for garbage", () => {
    expect(parseCartCookie("not-json")).toEqual({});
  });

  it("drops invalid product ids (special chars)", () => {
    const raw = { "valid-id": 1, "has spaces": 2, "has@sym": 3 };
    const cart = parseCartCookie(encodeURIComponent(JSON.stringify(raw)));
    expect(cart).toEqual({ "valid-id": 1 });
  });

  it("drops qty 0 and clamps qty to 1..9", () => {
    const raw = { a: 0, b: 15, c: 5 };
    const cart = parseCartCookie(encodeURIComponent(JSON.stringify(raw)));
    expect(cart).toEqual({ b: 9, c: 5 });
  });

  it("caps at 20 distinct products", () => {
    const raw: Record<string, number> = {};
    for (let i = 0; i < 25; i++) raw[`p${i}`] = 1;
    const cart = parseCartCookie(encodeURIComponent(JSON.stringify(raw)));
    expect(Object.keys(cart)).toHaveLength(20);
  });

  it("drops non-integer qty values", () => {
    const raw = { a: 1.5, b: NaN, c: 1 };
    const cart = parseCartCookie(encodeURIComponent(JSON.stringify(raw)));
    expect(cart).toEqual({ c: 1 });
  });

  it("drops product ids longer than 64 chars", () => {
    const longId = "a".repeat(65);
    const raw = { [longId]: 1, short: 2 };
    const cart = parseCartCookie(encodeURIComponent(JSON.stringify(raw)));
    expect(cart).toEqual({ short: 2 });
  });
});

describe("serializeCart", () => {
  it("round-trips through parseCartCookie", () => {
    const original = { "abc-123": 3, "xyz789": 1 };
    const serialized = serializeCart(original);
    const parsed = parseCartCookie(serialized);
    expect(parsed).toEqual(original);
  });

  it("produces a URL-encoded string", () => {
    const result = serializeCart({ a: 1 });
    expect(decodeURIComponent(result)).toBe('{"a":1}');
  });
});
