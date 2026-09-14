// Delivery adapters — each partner produces a copy-paste pickup summary
// (order no, shop, customer, address, phone, items, total, payment type).
// v1 is manual-first: every adapter is isApiConnected:false.

import { describe, expect, it } from "vitest";
import {
  DELIVERY_PARTNER_IDS,
  DELIVERY_ADAPTERS,
  generateManifest,
  getDeliveryAdapter,
  isDeliveryPartnerId,
} from "./index";
import type { ManifestContext } from "./types";

const ctx: ManifestContext = {
  order: {
    orderNo: 12,
    totalNpr: 3850,
    paymentType: "cod",
    items: [
      { name: "Red Kurta", qty: 2, priceNpr: 1500 },
      { name: "White Lungi", qty: 1, priceNpr: 850 },
    ],
  },
  customer: {
    name: "Ramesh Sharma",
    phone: "9812345678",
    address: "Kapan, Kathmandu",
  },
  store: { name: "Sita's Fashion", slug: "sitasfashion" },
};

describe("delivery partner registry", () => {
  it("lists the four v1 partners", () => {
    expect(DELIVERY_PARTNER_IDS).toEqual(["self", "ncm", "pathao", "indrive"]);
  });

  it("registers all four adapters with matching ids", () => {
    for (const id of DELIVERY_PARTNER_IDS) {
      expect(DELIVERY_ADAPTERS[id].id).toBe(id);
    }
    expect(Object.keys(DELIVERY_ADAPTERS)).toHaveLength(4);
  });

  it("is manual-first: every adapter is api-disconnected", () => {
    for (const id of DELIVERY_PARTNER_IDS) {
      expect(DELIVERY_ADAPTERS[id].isApiConnected).toBe(false);
    }
  });

  it("resolves an adapter by id", () => {
    expect(getDeliveryAdapter("ncm")).toBe(DELIVERY_ADAPTERS.ncm);
    expect(getDeliveryAdapter("self")).toBe(DELIVERY_ADAPTERS.self);
    expect(getDeliveryAdapter("pathao")).toBe(DELIVERY_ADAPTERS.pathao);
    expect(getDeliveryAdapter("indrive")).toBe(DELIVERY_ADAPTERS.indrive);
  });

  it("throws on an unknown partner id", () => {
    expect(() => getDeliveryAdapter("bogus" as never)).toThrow();
  });

  it("narrows strings to a partner id", () => {
    for (const id of DELIVERY_PARTNER_IDS) expect(isDeliveryPartnerId(id)).toBe(true);
    expect(isDeliveryPartnerId("fedex")).toBe(false);
    expect(isDeliveryPartnerId("")).toBe(false);
  });

  it("dispatch matches the adapter's own generator", () => {
    for (const id of DELIVERY_PARTNER_IDS) {
      expect(generateManifest(id, ctx)).toBe(DELIVERY_ADAPTERS[id].generateManifest(ctx));
    }
  });
});

describe("manifest generator", () => {
  it("brands the header with the partner name + pickup summary", () => {
    expect(DELIVERY_ADAPTERS.ncm.generateManifest(ctx)).toContain(
      "NEPAL CAN MOVE — PICKUP SUMMARY",
    );
    expect(DELIVERY_ADAPTERS.pathao.generateManifest(ctx)).toContain(
      "PATHAO — PICKUP SUMMARY",
    );
    expect(DELIVERY_ADAPTERS.indrive.generateManifest(ctx)).toContain(
      "INDRIVE — PICKUP SUMMARY",
    );
    expect(DELIVERY_ADAPTERS.self.generateManifest(ctx)).toContain(
      "SHOP DELIVERY (SELF) — PICKUP SUMMARY",
    );
  });

  it("covers order no, shop, customer, phone, address, total and payment", () => {
    for (const id of DELIVERY_PARTNER_IDS) {
      const m = DELIVERY_ADAPTERS[id].generateManifest(ctx);
      expect(m).toContain("Order: #12");
      expect(m).toContain("Shop: Sita's Fashion");
      expect(m).toContain("Customer: Ramesh Sharma");
      expect(m).toContain("Phone: 9812345678");
      expect(m).toContain("Address: Kapan, Kathmandu");
      expect(m).toContain("Total: NPR 3,850");
      expect(m).toContain("Payment: Cash on delivery");
    }
  });

  it("lists every item with name, qty and line total", () => {
    const m = DELIVERY_ADAPTERS.ncm.generateManifest(ctx);
    expect(m).toContain("1. Red Kurta × 2 — NPR 3,000");
    expect(m).toContain("2. White Lungi × 1 — NPR 850");
  });

  it("omits the address line when the customer has none", () => {
    const noAddress = { ...ctx, customer: { ...ctx.customer, address: null } };
    for (const id of DELIVERY_PARTNER_IDS) {
      const m = DELIVERY_ADAPTERS[id].generateManifest(noAddress);
      expect(m).not.toContain("Address:");
    }
  });

  it("maps payment types to readable labels", () => {
    const m = DELIVERY_ADAPTERS.ncm.generateManifest({
      ...ctx,
      order: { ...ctx.order, paymentType: "qr" },
    });
    expect(m).toContain("Payment: QR payment");
  });

  it("shows the raw payment type when it is not cod or qr", () => {
    const m = DELIVERY_ADAPTERS.ncm.generateManifest({
      ...ctx,
      order: { ...ctx.order, paymentType: "esewa" },
    });
    expect(m).toContain("Payment: esewa");
  });

  it("never contains an unformatted raw total", () => {
    const m = DELIVERY_ADAPTERS.ncm.generateManifest(ctx);
    expect(m).not.toContain("NPR 3850");
  });
});