import { describe, expect, it } from "vitest";
import { parseBulkForm, parseSingleForm } from "./parse-payload";

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