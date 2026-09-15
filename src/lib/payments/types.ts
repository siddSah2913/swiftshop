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

/** All payment method ids accepted by the checkout form. */
export const PAYMENT_TYPES = ["cod", "qr", "esewa", "khalti"] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

/** Maps a payment type to its i18n label key (dashboard + storefront). */
export const PAYMENT_TYPE_I18N_KEY: Record<
  PaymentType,
  "checkout.cod" | "checkout.qr" | "checkout.payEsewa" | "checkout.payKhalti"
> = {
  cod: "checkout.cod",
  qr: "checkout.qr",
  esewa: "checkout.payEsewa",
  khalti: "checkout.payKhalti",
};