import { describe, expect, it } from "vitest";
import { validateSelection, type StoredOptionGroup } from "./validate";

const tee: StoredOptionGroup[] = [
  {
    id: "g1",
    name: "Size",
    options: [
      { id: "m", name: "M", stock: 5 },
      { id: "l", name: "L", stock: 0 },
    ],
  },
  {
    id: "g2",
    name: "Color",
    options: [
      { id: "red", name: "Red", stock: 3 },
      { id: "blu", name: "Blue", stock: 2 },
    ],
  },
];

describe("validateSelection", () => {
  it("accepts a full selection and returns option names in order", () => {
    const out = validateSelection(tee, ["m", "red"]);
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.optionNames).toEqual(["M", "Red"]);
  });

  it("accepts a selection for a single-group product", () => {
    const one = [tee[0]];
    const out = validateSelection(one, ["m"]);
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.optionNames).toEqual(["M"]);
  });

  it("product without groups + empty selection is valid", () => {
    expect(validateSelection([], []).ok).toBe(true);
  });

  it("incomplete selection is rejected", () => {
    const out = validateSelection(tee, ["m"]);
    expect(out).toEqual({ ok: false, reason: "incomplete" });
  });

  it("empty selection on a group-having product is incomplete", () => {
    expect(validateSelection(tee, [])).toEqual({
      ok: false,
      reason: "incomplete",
    });
  });

  it("unknown option id is rejected", () => {
    const out = validateSelection(tee, ["m", "nope"]);
    expect(out).toEqual({ ok: false, reason: "unknown-option" });
  });

  it("two options from the same group are rejected", () => {
    const out = validateSelection(tee, ["m", "l"]);
    expect(out).toEqual({ ok: false, reason: "duplicate-group" });
  });

  it("sold-out option is rejected", () => {
    const out = validateSelection(tee, ["l", "red"]);
    expect(out).toEqual({ ok: false, reason: "sold-out" });
  });
});