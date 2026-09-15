import type { PaymentGatewayId, PaymentAdapter } from "./types";
import { createDemoAdapter } from "./demo";

const ENV_KEY_MAP: Record<PaymentGatewayId, string> = {
  khalti: "KHALTI_SECRET_KEY",
  esewa: "ESEWA_SECRET_KEY",
};

/**
 * Check whether a gateway's env key(s) are set. Does NOT check
 * NODE_ENV — use `getPaymentAdapter()` for the full decision.
 */
export function isGatewayConfigured(gatewayId: PaymentGatewayId): boolean {
  return !!process.env[ENV_KEY_MAP[gatewayId]];
}

export async function getPaymentAdapter(
  gatewayId: PaymentGatewayId,
): Promise<PaymentAdapter | null> {
  // Real adapter when env key is present
  if (isGatewayConfigured(gatewayId)) {
    if (gatewayId === "khalti") {
      const { khaltiAdapter } = await import("./khalti");
      return khaltiAdapter;
    }
    if (gatewayId === "esewa") {
      const { esewaAdapter } = await import("./esewa");
      return esewaAdapter;
    }
  }

  // Dev fallback: per-gateway demo adapter. Skipped in production — no fake
  // payments in prod.
  if (process.env.NODE_ENV !== "production") {
    return createDemoAdapter(gatewayId);
  }

  // Production without keys: gateway unavailable
  return null;
}