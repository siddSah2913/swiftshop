import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { getPaymentAdapter, isGatewayConfigured } from "./index";

describe("demo adapter", () => {
  it("khalti demo createPayment returns a callback URL with pidx", async () => {
    const { createDemoAdapter } = await import("./demo");
    const adapter = createDemoAdapter("khalti");
    const result = await adapter.createPayment({
      orderId: "ord_123",
      orderNo: 1,
      amountNpr: 500,
      storeSlug: "test-shop",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.redirectUrl).toBe(
        "/api/payments/khalti/callback?pidx=demo-1",
      );
      expect(result.ref).toBe("demo-1");
    }
  });

  it("esewa demo createPayment returns a callback URL with oid + refId", async () => {
    const { createDemoAdapter } = await import("./demo");
    const adapter = createDemoAdapter("esewa");
    const result = await adapter.createPayment({
      orderId: "ord_123",
      orderNo: 1,
      amountNpr: 500,
      storeSlug: "test-shop",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.redirectUrl).toBe(
        "/api/payments/esewa/callback?oid=ord_123&refId=demo-1",
      );
    }
  });

  it("verifyPayment always returns ok with the amount", async () => {
    const { createDemoAdapter } = await import("./demo");
    const adapter = createDemoAdapter("khalti");
    const result = await adapter.verifyPayment({
      pidx: "fake-pidx",
      amountNpr: 500,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amountNpr).toBe(500);
    }
  });
});

describe("getPaymentAdapter", () => {
  const origEnv = process.env;

  beforeEach(() => {
    process.env = { ...origEnv };
  });

  afterEach(() => {
    process.env = origEnv;
  });

  it("returns demo adapter when NODE_ENV is not production and no keys set", async () => {
    process.env.NODE_ENV = "test";
    delete process.env.KHALTI_SECRET_KEY;
    delete process.env.ESEWA_MERCHANT_CODE;
    delete process.env.ESEWA_SECRET_KEY;
    const adapter = await getPaymentAdapter("khalti");
    expect(adapter).not.toBeNull();
    expect(adapter?.id).toBe("khalti");
  });

  it("returns null in production without a configured key", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.KHALTI_SECRET_KEY;
    const adapter = await getPaymentAdapter("khalti");
    expect(adapter).toBeNull();
  });
});

describe("isGatewayConfigured", () => {
  const origEnv = process.env;

  beforeEach(() => {
    process.env = { ...origEnv };
  });

  afterEach(() => {
    process.env = origEnv;
  });

  it("returns false when env keys are missing in non-production", () => {
    process.env.NODE_ENV = "test";
    delete process.env.KHALTI_SECRET_KEY;
    delete process.env.ESEWA_MERCHANT_CODE;
    expect(isGatewayConfigured("khalti")).toBe(false);
  });

  it("returns true when env key is present", () => {
    process.env.NODE_ENV = "test";
    process.env.KHALTI_SECRET_KEY = "test-key";
    expect(isGatewayConfigured("khalti")).toBe(true);
  });
});
