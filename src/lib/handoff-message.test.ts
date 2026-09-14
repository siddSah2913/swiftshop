// buildHandoffMessage — the customer-facing WhatsApp message after an order is
// handed to a partner (or delivered). Tested here for the two things that break
// in practice: the right greeting direction (customer, not store) and that a $
// in user-entered text (tracking ref, names) is never interpreted as a
// String.replace replacement pattern.

import { describe, expect, it } from "vitest";
import { buildHandoffMessage } from "./handoff-message";

const base = {
  customerName: "Asmita Shrestha",
  storeName: "Sita's Fashion",
  orderNo: 42,
  partnerLabel: "Nepal Can Move",
};

describe("buildHandoffMessage", () => {
  it("greets the customer and includes store, order no, partner, and tracking ref", () => {
    const msg = buildHandoffMessage({
      ...base,
      locale: "en",
      trackingRef: "NCM-2026-88241",
    });
    expect(msg).toContain("Hi Asmita Shrestha!");
    expect(msg).toContain("order #42");
    expect(msg).toContain("Sita's Fashion");
    expect(msg).toContain("Nepal Can Move");
    expect(msg).toContain("Tracking: NCM-2026-88241");
  });

  it("keeps a $ in the tracking ref literal instead of applying replace patterns", () => {
    const msg = buildHandoffMessage({
      ...base,
      locale: "en",
      trackingRef: "NCM-$&-12$1-$'",
    });
    expect(msg).toContain("Tracking: NCM-$&-12$1-$'");
  });

  it("keeps $ in the store and customer names literal too", () => {
    const msg = buildHandoffMessage({
      ...base,
      locale: "en",
      customerName: "MC $mith",
      storeName: "$hop $&",
      orderNo: 7,
      partnerLabel: "in$tra",
    });
    expect(msg).toContain("MC $mith");
    expect(msg).toContain("$hop $&");
    expect(msg).toContain("in$tra");
  });

  it("omits the tracking suffix when there is no ref", () => {
    const msg = buildHandoffMessage({ ...base, locale: "en", trackingRef: null });
    expect(msg).toContain("Hi Asmita Shrestha!");
    expect(msg).not.toContain("Tracking");
  });

  it("switches to Nepali wording when the locale is ne", () => {
    const msg = buildHandoffMessage({ ...base, locale: "ne", trackingRef: "88A" });
    expect(msg).toContain("नमस्ते Asmita Shrestha!");
    expect(msg).toContain("ट्र्याकिङ: 88A");
  });
});