import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("esewaAdapter", () => {
  async function loadAdapter() {
    vi.resetModules();
    process.env.ESEWA_MERCHANT_CODE = "EPAYTEST";
    process.env.ESEWA_SECRET_KEY = "8gBm/:&EnhH.1/q";
    const mod = await import("./esewa");
    return mod.esewaAdapter;
  }

  it("isConfigured returns true when env vars are set", async () => {
    const adapter = await loadAdapter();
    expect(adapter.isConfigured()).toBe(true);
  });

  it("createPayment produces a base64-encoded signed payload", async () => {
    const adapter = await loadAdapter();
    const result = await adapter.createPayment({
      orderId: "ord_1",
      orderNo: 5,
      amountNpr: 200,
      storeSlug: "my-shop",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      // The redirect URL should be a data-URI or sandbox URL
      expect(typeof result.redirectUrl).toBe("string");
      expect(result.redirectUrl.length).toBeGreaterThan(0);
    }
  });

  it("createPayment embeds the correct amount breakdown + merchant code + signature", async () => {
    const adapter = await loadAdapter();
    const result = await adapter.createPayment({
      orderId: "ord_1",
      orderNo: 5,
      amountNpr: 200,
      storeSlug: "my-shop",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      // redirectUrl is a base64 data-URI whose HTML auto-submits the eSewa
      // form POST. Decode and assert the signing-relevant hidden fields.
      const html = Buffer.from(result.redirectUrl.split(",")[1], "base64").toString();
      expect(html).toContain('action="https://epay.sandbox.nic.np/pay/process"');
      expect(html).toContain('name="tAmt" value="200"');
      expect(html).toContain('name="amt" value="200"');
      expect(html).toContain('name="productCode" value="EPAYTEST"');
      expect(html).toContain('name="signature"');
    }
  });

  it("verifyPayment returns ok when status is COMPLETE and amount matches", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "COMPLETE",
        total_amount: 200,
      }),
    });

    const adapter = await loadAdapter();
    const result = await adapter.verifyPayment({
      pidx: "oid:oid_123:refId:ref_456",
      amountNpr: 200,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amountNpr).toBe(200);
    }

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("transaction/status");
    expect(url).toContain("oid=oid_123");
    expect(url).toContain("refId=ref_456");
  });

  it("verifyPayment returns not-completed when status is not COMPLETE", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "PENDING",
        total_amount: 200,
      }),
    });

    const adapter = await loadAdapter();
    const result = await adapter.verifyPayment({
      pidx: "oid:oid_123:refId:ref_456",
      amountNpr: 200,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("not-completed");
    }
  });

  it("verifyPayment returns amount-mismatch when amounts differ", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "COMPLETE",
        total_amount: 199,
      }),
    });

    const adapter = await loadAdapter();
    const result = await adapter.verifyPayment({
      pidx: "oid:oid_123:refId:ref_456",
      amountNpr: 200,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("amount-mismatch");
    }
  });
});
