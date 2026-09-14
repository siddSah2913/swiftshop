// Tests for manifest-context mapping — the ONE place an order becomes a
// ManifestContext, shared by the client preview and the server's persisted copy.

import { describe, expect, it } from "vitest";
import { manifestContext } from "./manifest-ctx";

const order = {
  orderNo: 12,
  totalNpr: 3850,
  paymentType: "cod",
  items: [
    { name: "Red Kurta", qty: 2, priceNpr: 1500 },
    { name: "White Lungi", qty: 1, priceNpr: 850 },
  ],
  customer: {
    name: "Ramesh Sharma",
    phone: "9812345678",
    address: "Kapan, Kathmandu",
  },
};
const store = { name: "Sita's Fashion", slug: "sitasfashion" };

describe("manifestContext", () => {
  it("maps an order + store into the manifest context", () => {
    const ctx = manifestContext(order, store);
    expect(ctx.order.orderNo).toBe(12);
    expect(ctx.order.totalNpr).toBe(3850);
    expect(ctx.order.paymentType).toBe("cod");
    expect(ctx.order.items).toEqual([
      { name: "Red Kurta", qty: 2, priceNpr: 1500 },
      { name: "White Lungi", qty: 1, priceNpr: 850 },
    ]);
    expect(ctx.customer).toEqual(order.customer);
    expect(ctx.store).toEqual(store);
  });

  it("passes a null customer address through", () => {
    const ctx = manifestContext(
      { ...order, customer: { ...order.customer, address: null } },
      store,
    );
    expect(ctx.customer.address).toBeNull();
  });

  it("copies items so callers can't mutate the source order", () => {
    const ctx = manifestContext(order, store);
    ctx.order.items[0].qty = 99;
    expect(order.items[0].qty).toBe(2);
  });
});