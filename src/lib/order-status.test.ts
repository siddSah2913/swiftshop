// Tests for the order status machine (Phase 4 — full machine).
// Legal map: new→confirmed→handed→delivered, with cancel from new/confirmed.
// delivered and cancelled are terminal. transitionOrder() is the single
// enforcement point; canTransition is derived from it.

import { describe, expect, it } from "vitest";
import {
  ORDER_STATUS_BADGE,
  ORDER_STATUSES,
  PAYMENT_LABEL_KEYS,
  STATUS_LABEL_KEYS,
  canTransition,
  deliveredPaymentUpdate,
  isOrderStatus,
  transitionOrder,
  type OrderStatus,
  type TransitionResult,
} from "./order-status";

const ALL = ORDER_STATUSES as readonly string[];

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

  it("lets new move forward to confirmed", () => {
    expect(canTransition("new", "confirmed")).toBe(true);
  });

  it("lets confirmed reach handed", () => {
    expect(canTransition("confirmed", "handed")).toBe(true);
  });

  it("lets handed reach delivered", () => {
    expect(canTransition("handed", "delivered")).toBe(true);
  });

  it("lets new and confirmed cancel", () => {
    expect(canTransition("new", "cancelled")).toBe(true);
    expect(canTransition("confirmed", "cancelled")).toBe(true);
  });

  it("never lets an order skip states", () => {
    expect(canTransition("new", "handed")).toBe(false);
    expect(canTransition("new", "delivered")).toBe(false);
    expect(canTransition("confirmed", "delivered")).toBe(false);
    expect(canTransition("handed", "confirmed")).toBe(false);
  });

  it("never moves backwards", () => {
    expect(canTransition("handed", "confirmed")).toBe(false);
    expect(canTransition("delivered", "handed")).toBe(false);
    expect(canTransition("cancelled", "new")).toBe(false);
  });

  it("blocks cancelling once handed, delivered, or cancelled", () => {
    expect(canTransition("handed", "cancelled")).toBe(false);
    expect(canTransition("delivered", "cancelled")).toBe(false);
    expect(canTransition("cancelled", "cancelled")).toBe(false);
  });

  it("treats delivered and cancelled as terminal", () => {
    for (const s of ALL) {
      expect(canTransition("delivered", s as OrderStatus)).toBe(false);
      expect(canTransition("cancelled", s as OrderStatus)).toBe(false);
    }
  });

  it("rejects a transition to the same status", () => {
    expect(canTransition("new", "new")).toBe(false);
    expect(canTransition("confirmed", "confirmed")).toBe(false);
    expect(canTransition("handed", "handed")).toBe(false);
  });
});

describe("transitionOrder", () => {
  const ok = (from: OrderStatus, to: OrderStatus) =>
    expect(transitionOrder(from, to)).toEqual({ ok: true });

  const blocked = (
    from: string,
    to: string,
    reason: Extract<TransitionResult, { ok: false }>["reason"],
  ) => expect(transitionOrder(from as OrderStatus, to as OrderStatus)).toEqual(
    { ok: false, reason },
  );

  it("approves the happy path new→confirmed→handed→delivered", () => {
    ok("new", "confirmed");
    ok("confirmed", "handed");
    ok("handed", "delivered");
  });

  it("approves cancelling from new and confirmed", () => {
    ok("new", "cancelled");
    ok("confirmed", "cancelled");
  });

  it("rejects illegal jumps with reason not-allowed", () => {
    blocked("new", "delivered", "not-allowed");
    blocked("new", "handed", "not-allowed");
    blocked("confirmed", "delivered", "not-allowed");
    blocked("handed", "confirmed", "not-allowed");
    blocked("handed", "cancelled", "not-allowed");
    blocked("delivered", "confirmed", "not-allowed");
    blocked("cancelled", "new", "not-allowed");
  });

  it("names an unknown source or target status", () => {
    blocked("shipped", "delivered", "from-unknown");
    blocked("new", "shipped", "to-unknown");
  });

  it("agrees with canTransition on every pair in both directions", () => {
    for (const from of ALL) {
      for (const to of ALL) {
        const t = transitionOrder(from as OrderStatus, to as OrderStatus);
        expect(canTransition(from as OrderStatus, to as OrderStatus)).toBe(
          t.ok,
        );
      }
    }
  });
});

describe("order status maps", () => {
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