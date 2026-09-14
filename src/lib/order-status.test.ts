// Tests for the order status machine (Phase 3 v1).
// v1 allowed map: new→confirmed→delivered, handed→delivered; the full machine
// (handed/cancelled transitions) ships in Phase 4.

import { describe, expect, it } from "vitest";
import {
  ORDER_STATUS_BADGE,
  ORDER_STATUSES,
  PAYMENT_LABEL_KEYS,
  STATUS_LABEL_KEYS,
  canTransition,
  deliveredPaymentUpdate,
  isOrderStatus,
} from "./order-status";

describe("order status machine", () => {
  it("defines the five statuses in order", () => {
    expect(ORDER_STATUSES).toEqual([
      "new",
      "confirmed",
      "handed",
      "delivered",
      "cancelled",
    ]);
  });

  it("recognises valid statuses", () => {
    for (const s of ORDER_STATUSES) expect(isOrderStatus(s)).toBe(true);
    expect(isOrderStatus("shipped")).toBe(false);
    expect(isOrderStatus("")).toBe(false);
  });

  it("allows new → confirmed only", () => {
    expect(canTransition("new", "confirmed")).toBe(true);
    expect(canTransition("new", "delivered")).toBe(false);
    expect(canTransition("new", "handed")).toBe(false);
    expect(canTransition("new", "cancelled")).toBe(false);
  });

  it("allows confirmed → delivered, blocks cancel in the v1 machine", () => {
    expect(canTransition("confirmed", "delivered")).toBe(true);
    expect(canTransition("confirmed", "cancelled")).toBe(false);
  });

  it("allows handed → delivered", () => {
    expect(canTransition("handed", "delivered")).toBe(true);
  });

  it("treats delivered and cancelled as terminal", () => {
    for (const s of ORDER_STATUSES) {
      expect(canTransition("delivered", s)).toBe(false);
      expect(canTransition("cancelled", s)).toBe(false);
    }
  });

  it("rejects a transition to the same status", () => {
    expect(canTransition("new", "new")).toBe(false);
  });

  it("maps every status to an orders.* label key", () => {
    expect(STATUS_LABEL_KEYS.new).toBe("orders.new");
    expect(STATUS_LABEL_KEYS.confirmed).toBe("orders.confirmed");
    expect(STATUS_LABEL_KEYS.handed).toBe("orders.handed");
    expect(STATUS_LABEL_KEYS.delivered).toBe("orders.delivered");
    expect(STATUS_LABEL_KEYS.cancelled).toBe("orders.cancelled");
  });

  it("maps payment statuses to orders.* label keys", () => {
    expect(PAYMENT_LABEL_KEYS.unpaid).toBe("orders.unpaid");
    expect(PAYMENT_LABEL_KEYS.paid).toBe("orders.paid");
  });

  it("gives every status a badge styling class", () => {
    for (const s of ORDER_STATUSES) {
      expect(ORDER_STATUS_BADGE[s]).toBeTruthy();
    }
  });

  it("settles COD payment to paid on delivery", () => {
    expect(deliveredPaymentUpdate("cod", "unpaid")).toBe("paid");
    expect(deliveredPaymentUpdate("cod", "paid")).toBe("paid");
  });

  it("keeps a non-COD payment status unchanged on delivery", () => {
    expect(deliveredPaymentUpdate("qr", "unpaid")).toBe("unpaid");
    expect(deliveredPaymentUpdate("qr", "paid")).toBe("paid");
  });
});