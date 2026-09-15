import { describe, expect, it } from "vitest";
import { escapeCsvField, toCsv, withBom } from "./csv";

describe("escapeCsvField", () => {
  it("passes plain values through", () => {
    expect(escapeCsvField("T-Shirt")).toBe("T-Shirt");
    expect(escapeCsvField(3850)).toBe("3850");
  });

  it("quotes fields containing a comma", () => {
    expect(escapeCsvField("Kapan, Kathmandu")).toBe('"Kapan, Kathmandu"');
  });

  it("doubles embedded quotes", () => {
    expect(escapeCsvField('Say "hi"')).toBe('"Say ""hi"""');
  });

  it("quotes fields containing a newline", () => {
    expect(escapeCsvField("line1\nline2")).toBe('"line1\nline2"');
  });
});

describe("toCsv", () => {
  it("joins rows with LF and fields with commas", () => {
    const csv = toCsv([
      ["orderNo", "name"],
      [12, "Red Kurta"],
    ]);
    expect(csv).toBe("orderNo,name\n12,Red Kurta");
  });

  it("returns empty string for no rows", () => {
    expect(toCsv([])).toBe("");
  });
});

describe("withBom", () => {
  it("prepends the UTF-8 BOM", () => {
    expect(withBom("a,b\n1,2")).toBe("﻿a,b\n1,2");
  });
});