// Tests for the order id schema used by the dashboard order actions.

import { describe, expect, it } from "vitest";
import { orderIdSchema } from "./schema";

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