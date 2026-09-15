export const PAYMENT_GATEWAY_IDS = ["esewa", "khalti"] as const;
export type PaymentGatewayId = (typeof PAYMENT_GATEWAY_IDS)[number];

export type PaymentInitResult =
  | { ok: true; redirectUrl: string; ref?: string }
  | { ok: false; error: string };

export type PaymentVerifyResult =
  | { ok: true; amountNpr: number }
  | { ok: false; reason: "invalid" | "amount-mismatch" | "not-completed" | "network-error" };

export interface PaymentAdapter {
  id: PaymentGatewayId;
  label: string;
  isConfigured(): boolean;
  createPayment(params: {
    orderId: string;
    orderNo: number;
    amountNpr: number;
    storeSlug: string;
  }): Promise<PaymentInitResult>;
  verifyPayment(params: {
    pidx: string;
    amountNpr: number;
  }): Promise<PaymentVerifyResult>;
}

export function isPaymentGatewayId(v: string): v is PaymentGatewayId {
  return (PAYMENT_GATEWAY_IDS as readonly string[]).includes(v);
}