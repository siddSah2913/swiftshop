import { createHmac } from "node:crypto";
import type { PaymentAdapter } from "./types";

const ESEWA_GATEWAY_URL = "https://epay.sandbox.nic.np/pay/process";
const ESEWA_STATUS_URL = "https://epay.sandbox.nic.np/api/epay/transaction/status";

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64");
}

function buildSignatureField(fields: Record<string, string>, secret: string): string {
  const payload = Object.values(fields).join(",");
  return sign(payload, secret);
}

export const esewaAdapter: PaymentAdapter = {
  id: "esewa",
  label: "eSewa",
  isConfigured: () => !!process.env.ESEWA_MERCHANT_CODE && !!process.env.ESEWA_SECRET_KEY,

  async createPayment({ orderId, orderNo, amountNpr, storeSlug }) {
    const merchantCode = process.env.ESEWA_MERCHANT_CODE;
    const secretKey = process.env.ESEWA_SECRET_KEY;
    if (!merchantCode || !secretKey) {
      return { ok: false, error: "eSewa credentials not set" };
    }

    const amt = amountNpr;
    const psc = 0;
    const pdc = 0;
    const txAmt = 0;
    const tAmt = amt + txAmt + psc + pdc;
    const productList = JSON.stringify([{ id: orderId, name: `Order #${orderNo}`, qty: 1, price: amt }]);

    const fields: Record<string, string> = {
      amt: String(amt),
      psc: String(psc),
      pdc: String(pdc),
      txAmt: String(txAmt),
      tAmt: String(tAmt),
      productCode: merchantCode,
      productList,
    };

    const signature = buildSignatureField(fields, secretKey);

    const formFields = { ...fields, signature };

    // Build an auto-submitting HTML form as a data URI — the browser
    // navigates to this URL, which POSTs to eSewa's gateway.
    const formData = Object.entries(formFields)
      .map(([k, v]) => `<input type="hidden" name="${k}" value="${String(v).replace(/"/g, "&quot;")}" />`)
      .join("\n    ");

    const html = `<!DOCTYPE html>
<html><head><title>Redirecting to eSewa...</title></head>
<body>
  <form id="esewaForm" method="POST" action="${ESEWA_GATEWAY_URL}">
    ${formData}
  </form>
  <script>document.getElementById("esewaForm").submit();</script>
</body></html>`;

    const redirectUrl = `data:text/html;base64,${Buffer.from(html).toString("base64")}`;
    return { ok: true, redirectUrl };
  },

  async verifyPayment({ pidx, amountNpr }) {
    // pidx format for eSewa: "oid:<oid>:refId:<refId>"
    const parts = pidx.split(":");
    if (parts.length !== 4 || parts[0] !== "oid" || parts[2] !== "refId") {
      return { ok: false, reason: "invalid" };
    }
    const oid = parts[1];
    const refId = parts[3];

    const url = `${ESEWA_STATUS_URL}?oid=${oid}&refId=${refId}`;
    const res = await fetch(url);

    if (!res.ok) return { ok: false, reason: "network-error" };

    const body = await res.json();
    if (body.status !== "COMPLETE") return { ok: false, reason: "not-completed" };
    if (body.total_amount !== amountNpr) return { ok: false, reason: "amount-mismatch" };

    return { ok: true, amountNpr };
  },
};
