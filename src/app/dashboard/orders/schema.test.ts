// Tests for the order id schema used by the dashboard order actions.

import { describe, expect, it } from "vitest";
import { handToPartnerSchema, orderIdSchema } from "./schema";

describe("orderIdSchema", () => {
  it("accepts a short alphanumeric id", () => {
    expect(orderIdSchema.safeParse({ orderId: "abc123" }).success).toBe(true);
  });

  it("accepts a cuid-style id with dashes", () => {
    expect(orderIdSchema.safeParse({ orderId: "cm1x1abc-user-xyz" }).success).toBe(
      true,
    );
  });

  it("accepts an id at the 64-char limit", () => {
    expect(orderIdSchema.safeParse({ orderId: "a".repeat(64) }).success).toBe(
      true,
    );
  });

  it("rejects an id longer than 64 chars", () => {
    expect(orderIdSchema.safeParse({ orderId: "a".repeat(65) }).success).toBe(
      false,
    );
  });

  it("rejects a blank id", () => {
    expect(orderIdSchema.safeParse({ orderId: "   " }).success).toBe(false);
  });

  it("rejects ids with characters outside the allowed set", () => {
    expect(orderIdSchema.safeParse({ orderId: "abc!@#" }).success).toBe(false);
  });

  it("reports failure with the orders.invalidOrderId key", () => {
    const r = orderIdSchema.safeParse({ orderId: "abc!@#" });
    if (r.success) throw new Error("expected failure");
    expect(r.error.issues[0].message).toBe("orders.invalidOrderId");
  });
});

describe("handToPartnerSchema", () => {
  it("accepts each partner id without a tracking ref", () => {
    for (const partner of ["self", "ncm", "pathao", "indrive"]) {
      const r = handToPartnerSchema.safeParse({ partner });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.trackingRef).toBeUndefined();
    }
  });

  it("trims a tracking ref and keeps a meaningful one", () => {
    const r = handToPartnerSchema.safeParse({
      partner: "ncm",
      trackingRef: "  NCM-12345  ",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.trackingRef).toBe("NCM-12345");
  });

  it("turns an empty tracking ref into undefined", () => {
    const r = handToPartnerSchema.safeParse({ partner: "pathao", trackingRef: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.trackingRef).toBeUndefined();
  });

  it("accepts a tracking ref at the 60-char limit", () => {
    const r = handToPartnerSchema.safeParse({
      partner: "ncm",
      trackingRef: "a".repeat(60),
    });
    expect(r.success).toBe(true);
  });

  it("rejects a tracking ref over 60 chars with the i18n key", () => {
    const r = handToPartnerSchema.safeParse({
      partner: "ncm",
      trackingRef: "a".repeat(61),
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("delivery.invalidTrackingRef");
  });

  it("rejects a blank partner with the partnerRequired key", () => {
    const r = handToPartnerSchema.safeParse({ partner: "" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("delivery.partnerRequired");
  });

  it("rejects an unknown partner id with the partnerRequired key", () => {
    const r = handToPartnerSchema.safeParse({ partner: "fedex" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("delivery.partnerRequired");
  });
});