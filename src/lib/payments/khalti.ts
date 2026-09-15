import type { PaymentAdapter } from "./types";

const KHALTI_INITIATE_URL = "https://a.khalti.com/api/v2/epayment/initiate/";
const KHALTI_LOOKUP_URL = "https://a.khalti.com/api/v2/epayment/lookup/";

export const khaltiAdapter: PaymentAdapter = {
  id: "khalti",
  label: "Khalti",
  isConfigured: () => !!process.env.KHALTI_SECRET_KEY,

  async createPayment({ orderId, orderNo, amountNpr, storeSlug }) {
    const key = process.env.KHALTI_SECRET_KEY;
    if (!key) return { ok: false, error: "KHALTI_SECRET_KEY not set" };

    const res = await fetch(KHALTI_INITIATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `key ${key}`,
      },
      body: JSON.stringify({
        amount: amountNpr * 100, // paisa
        // return_url = where Khalti redirects the customer after payment.
        // Khalti appends `pidx` AND `purchase_order_id` (= our orderId) to it.
        return_url: `${process.env.AUTH_URL ?? "http://localhost:3000"}/api/payments/khalti/callback?orderId=${orderId}`,
        website_url: process.env.AUTH_URL ?? "http://localhost:3000",
        purchase_order_id: orderId,
        purchase_order_name: `Order #${orderNo}`,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: body?.detail ?? "Khalti initiate failed" };
    }

    const body = await res.json();
    // ref = pidx — the checkout action pre-saves it to Order.paymentRef so the
    // callback route can look the order up by pidx when Khalti redirects back.
    return { ok: true, redirectUrl: body.payment_url, ref: body.pidx };
  },

  async verifyPayment({ pidx, amountNpr }) {
    const key = process.env.KHALTI_SECRET_KEY;
    if (!key) return { ok: false, reason: "invalid" };

    const res = await fetch(KHALTI_LOOKUP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `key ${key}`,
      },
      body: JSON.stringify({ pidx }),
    });

    if (!res.ok) return { ok: false, reason: "network-error" };

    const body = await res.json();
    if (body.state !== "Completed") return { ok: false, reason: "not-completed" };

    const expectedPaisa = amountNpr * 100;
    if (body.amount !== expectedPaisa) return { ok: false, reason: "amount-mismatch" };

    return { ok: true, amountNpr };
  },
};
