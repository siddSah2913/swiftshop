import { describe, expect, it } from "vitest";
import {
  LINE_KEY_RE,
  buildLineKey,
  isLineKey,
  parseLineKey,
} from "./line-key";

describe("line key grammar", () => {
  it("accepts plain product ids (legacy carts)", () => {
    const id = "clxproduct1234567890abcd";
    expect(LINE_KEY_RE.test(id)).toBe(true);
    expect(isLineKey(id)).toBe(true);
  });

  it("accepts composite keys up to two option ids", () => {
    const opt1 = "clxopt000000000000000001";
    const opt2 = "clxopt000000000000000002";
    const key = `${opt1}a:${opt1}:${opt2}`;
    expect(LINE_KEY_RE.test(key)).toBe(true);
  });

  it("rejects more than two option segments and stray symbols", () => {
    const a = "clxopt000000000000000001";
    expect(LINE_KEY_RE.test(`${a}:b:c:d`)).toBe(false);
    expect(LINE_KEY_RE.test("has space")).toBe(false);
    expect(LINE_KEY_RE.test(`${a}#b`)).toBe(false);
    expect(LINE_KEY_RE.test("")).toBe(false);
  });
});

describe("parseLineKey", () => {
  it("splits a composite key into productId + option ids", () => {
    const prod = "clxproduct1234567890abcd";
    const o1 = "clxopt000000000000000001";
    const o2 = "clxopt000000000000000002";
    expect(parseLineKey(`${prod}:${o1}:${o2}`)).toEqual({
      productId: prod,
      optionIds: [o1, o2],
    });
    expect(parseLineKey(prod)).toEqual({ productId: prod, optionIds: [] });
  });

  it("returns empty productId for malformed keys", () => {
    expect(parseLineKey("not a valid key")).toEqual({
      productId: "",
      optionIds: [],
    });
    expect(parseLineKey("")).toEqual({ productId: "", optionIds: [] });
  });
});

describe("buildLineKey", () => {
  it("joins option ids with colons, plain id when none", () => {
    const prod = "clxproduct1234567890abcd";
    const o1 = "clxopt000000000000000001";
    expect(buildLineKey(prod, [])).toBe(prod);
    expect(buildLineKey(prod, [o1])).toBe(`${prod}:${o1}`);
  });
});