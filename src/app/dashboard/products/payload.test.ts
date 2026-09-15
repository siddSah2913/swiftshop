import { describe, expect, it } from "vitest";
import { parseBulkForm, parseOptionSets, parseSingleForm } from "./parse-payload";

function photo(): File {
  return new File([new Uint8Array(8)], "p.png", { type: "image/png" });
}

describe("parseSingleForm", () => {
  it("parses a valid single product with a gallery", () => {
    const fd = new FormData();
    fd.set("name", "Kurta");
    fd.set("caption", "black cotton");
    fd.set("priceNpr", "1500");
    fd.append("photo", photo());
    fd.append("photo", photo());
    expect(parseSingleForm(fd).ok).toBe(true);
  });

  it("rejects when no photo (photo required by default)", () => {
    const fd = new FormData();
    fd.set("name", "Kurta");
    fd.set("priceNpr", "1500");
    expect(parseSingleForm(fd).ok).toBe(false);
  });

  it("allows no photo when requirePhoto is false (edit path)", () => {
    const fd = new FormData();
    fd.set("name", "Kurta");
    fd.set("priceNpr", "1500");
    expect(parseSingleForm(fd, { requirePhoto: false }).ok).toBe(true);
  });

  it("rejects a bad price", () => {
    const fd = new FormData();
    fd.set("name", "Kurta");
    fd.set("priceNpr", "abc");
    fd.append("photo", photo());
    expect(parseSingleForm(fd).ok).toBe(false);
  });
});

describe("parseBulkForm", () => {
  it("parses N labelled groups", () => {
    const fd = new FormData();
    fd.append("item0photo", photo());
    fd.set("item0name", "A");
    fd.set("item0price", "100");
    fd.append("item1photo", photo());
    fd.set("item1name", "B");
    fd.set("item1price", "200");
    const r = parseBulkForm(fd);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.groups).toHaveLength(2);
  });

  it("stops cleanly when the index chain ends", () => {
    const fd = new FormData();
    fd.append("item0photo", photo());
    fd.set("item0name", "Only");
    fd.set("item0price", "100");
    const r = parseBulkForm(fd);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.groups).toHaveLength(1);
  });

  it("rejects a group that has a name but no photo", () => {
    const fd = new FormData();
    fd.append("item0photo", photo());
    fd.set("item0name", "A");
    fd.set("item0price", "100");
    fd.set("item1name", "garbage");
    expect(parseBulkForm(fd).ok).toBe(false);
  });

  it("rejects an empty submission", () => {
    expect(parseBulkForm(new FormData()).ok).toBe(false);
  });
});

describe("parseOptionSets", () => {
  it("parses two well-formed groups", () => {
    const raw = JSON.stringify([
      { name: "Size", options: [{ name: "M", stock: 5 }, { name: "L", stock: 0 }] },
      { name: "Color", options: [{ name: "Red", stock: 3 }] },
    ]);
    const out = parseOptionSets(raw);
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.optionSets).toEqual([
        { name: "Size", options: [{ name: "M", stock: 5 }, { name: "L", stock: 0 }] },
        { name: "Color", options: [{ name: "Red", stock: 3 }] },
      ]);
    }
  });

  it("empty / missing value means no options", () => {
    const empty = parseOptionSets("");
    expect(empty.ok).toBe(true);
    if (empty.ok) expect(empty.optionSets).toEqual([]);
    expect(parseOptionSets("[]").ok).toBe(true);
  });

  it("rejects invalid JSON", () => {
    expect(parseOptionSets("not json").ok).toBe(false);
  });

  it("rejects more than MAX_OPTION_GROUPS groups", () => {
    const raw = JSON.stringify([1, 2, 3].map((n) => ({ name: `G${n}`, options: [{ name: "x", stock: 1 }] })));
    const out = parseOptionSets(raw);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.errorKey).toBe("products.optionsInvalid");
  });

  it("rejects a group with empty name, no options, too many options, or duplicate option names", () => {
    expect(parseOptionSets(JSON.stringify([{ name: "", options: [{ name: "x", stock: 1 }] }])).ok).toBe(false);
    expect(parseOptionSets(JSON.stringify([{ name: "Size", options: [] }])).ok).toBe(false);
    const many = Array.from({ length: 11 }, (_, i) => ({ name: `o${i}`, stock: 1 }));
    expect(parseOptionSets(JSON.stringify([{ name: "Size", options: many }])).ok).toBe(false);
    expect(parseOptionSets(JSON.stringify([{ name: "Size", options: [{ name: "M", stock: 1 }, { name: "M", stock: 2 }] }])).ok).toBe(false);
  });

  it("rejects non-integer, negative, or oversized stock", () => {
    expect(parseOptionSets(JSON.stringify([{ name: "Size", options: [{ name: "M", stock: 1.5 }] }])).ok).toBe(false);
    expect(parseOptionSets(JSON.stringify([{ name: "Size", options: [{ name: "M", stock: -1 }] }])).ok).toBe(false);
    expect(parseOptionSets(JSON.stringify([{ name: "Size", options: [{ name: "M", stock: 1_000_001 }] }])).ok).toBe(false);
  });
});

describe("parseSingleForm with optionsJson", () => {
  it("carries optionSets through", () => {
    const fd = new FormData();
    fd.set("name", "Tee");
    fd.set("caption", "");
    fd.set("priceNpr", "1900");
    fd.set("photo", new File([new Uint8Array([137, 80, 78, 71])], "a.png", { type: "image/png" }));
    fd.set("optionsJson", JSON.stringify([{ name: "Size", options: [{ name: "M", stock: 5 }] }]));
    const out = parseSingleForm(fd);
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.data.optionSets).toEqual([{ name: "Size", options: [{ name: "M", stock: 5 }] }]);
  });

  it("missing optionsJson defaults to []", () => {
    const fd = new FormData();
    fd.set("name", "Tee");
    fd.set("priceNpr", "1900");
    fd.set("photo", new File([new Uint8Array([137, 80, 78, 71])], "a.png", { type: "image/png" }));
    const out = parseSingleForm(fd);
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.data.optionSets).toEqual([]);
  });
});
