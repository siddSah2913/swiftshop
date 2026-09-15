import type { PaymentAdapter, PaymentGatewayId } from "./types";

/**
 * Demo adapter — factory that builds a stand-in for a real gateway.
 * Only used by `getPaymentAdapter()` when NODE_ENV !== "production" and no
 * real gateway keys are set. Lets developers walk through the FULL payment
 * flow locally: the redirect URL points at the real callback route, which
 * runs verifyAndMarkPaid → demo.verifyPayment (always ok) → CAS marks the
 * order paid. No sandbox accounts needed.
 */
export function createDemoAdapter(gatewayId: PaymentGatewayId): PaymentAdapter {
  return {
    id: gatewayId,
    label: "Demo",
    isConfigured: () => true,
    async createPayment({ orderId, orderNo }) {
      const ref = `demo-${orderNo}`;
      if (gatewayId === "khalti") {
        // Khalti callback reads `pidx` and looks the order up by paymentRef
        // (which the checkout action pre-saved from `ref`).
        return {
          ok: true,
          redirectUrl: `/api/payments/khalti/callback?pidx=${ref}`,
          ref,
        };
      }
      // eSewa callback reads `oid` (→ orderId) + `refId` (→ the ref).
      return {
        ok: true,
        redirectUrl: `/api/payments/esewa/callback?oid=${orderId}&refId=${ref}`,
        ref,
      };
    },
    async verifyPayment({ amountNpr }) {
      return { ok: true, amountNpr };
    },
  };
}