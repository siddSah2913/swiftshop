import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("khaltiAdapter", () => {
  async function loadAdapter() {
    vi.resetModules();
    process.env.KHALTI_SECRET_KEY = "test-secret";
    const mod = await import("./khalti");
    return mod.khaltiAdapter;
  }

  it("isConfigured returns true when KHALTI_SECRET_KEY is set", async () => {
    const adapter = await loadAdapter();
    expect(adapter.isConfigured()).toBe(true);
  });

  it("createPayment calls Khalti initiate API and returns payment_url", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        pidx: "abc123",
        payment_url: "https://a.khalti.com/checkout/abc123",
      }),
    });

    const adapter = await loadAdapter();
    const result = await adapter.createPayment({
      orderId: "ord_1",
      orderNo: 42,
      amountNpr: 1000,
      storeSlug: "test-shop",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.redirectUrl).toBe("https://a.khalti.com/checkout/abc123");
      expect(result.ref).toBe("abc123");
    }

    // Verify the fetch call
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("https://a.khalti.com/api/v2/epayment/initiate/");
    expect(opts.method).toBe("POST");
    expect(opts.headers.Authorization).toContain("test-secret");
    const body = JSON.parse(opts.body);
    expect(body.amount).toBe(100000); // 1000 * 100 (paisa)
    expect(body.purchase_order_id).toBe("ord_1");
    expect(body.return_url).toContain("/api/payments/khalti/callback?orderId=ord_1");
  });

  it("createPayment returns error on API failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: "Invalid request" }),
    });

    const adapter = await loadAdapter();
    const result = await adapter.createPayment({
      orderId: "ord_1",
      orderNo: 42,
      amountNpr: 1000,
      storeSlug: "test-shop",
    });

    expect(result.ok).toBe(false);
  });

  it("verifyPayment returns ok when state is Completed and amount matches", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        state: "Completed",
        amount: 100000, // paisa
      }),
    });

    const adapter = await loadAdapter();
    const result = await adapter.verifyPayment({
      pidx: "abc123",
      amountNpr: 1000,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amountNpr).toBe(1000);
    }
  });

  it("verifyPayment returns not-completed when state is not Completed", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        state: "Pending",
        amount: 100000,
      }),
    });

    const adapter = await loadAdapter();
    const result = await adapter.verifyPayment({
      pidx: "abc123",
      amountNpr: 1000,
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
        state: "Completed",
        amount: 99900, // paisa — doesn't match 1000 * 100
      }),
    });

    const adapter = await loadAdapter();
    const result = await adapter.verifyPayment({
      pidx: "abc123",
      amountNpr: 1000,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("amount-mismatch");
    }
  });
});
