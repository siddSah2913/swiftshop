import { NextRequest, NextResponse } from "next/server";
import { isPaymentGatewayId } from "@/lib/payments/types";
import { verifyAndMarkPaid } from "@/lib/payments/callback-verify";
import { log } from "@/lib/log";

/**
 * GET /api/payments/[gateway]/callback
 *
 * Khalti redirects with: ?pidx=<pidx>&purchase_order_id=<orderId>
 * eSewa redirects with:  ?oid=<oid>&refId=<refId>&amt=<amt>
 *
 * Khalti: prefer `purchase_order_id` (Khalti appends it to our return_url)
 * → orderId lookup; fall back to `pidx` → paymentRef lookup (covers the demo
 * adapter, whose redirect is only `?pidx=demo-N` and relies on the pre-saved
 * paymentRef from the T6 checkout action).
 *
 * eSewa: `oid` IS our orderId (we pass it during createPayment); `refId` is the
 * gateway's transfer ref. We compose the 4-segment pidx `oid:<oid>:refId:<refId>`
 * that the eSewa adapter's verifyPayment expects.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gateway: string }> },
) {
  const { gateway } = await params;
  const searchParams = request.nextUrl.searchParams;

  if (!isPaymentGatewayId(gateway)) {
    return NextResponse.redirect(new URL("/?error=unknown-gateway", request.url));
  }

  let lookupBy: { orderId: string } | { pidx: string };
  let pidx: string;

  if (gateway === "khalti") {
    const khaltiPidx = searchParams.get("pidx");
    if (!khaltiPidx) {
      log("payments:callback:khalti-missing-pidx", Object.fromEntries(searchParams));
      return NextResponse.redirect(new URL("/?error=missing-pidx", request.url));
    }
    pidx = khaltiPidx;
    const purchaseOrderId = searchParams.get("purchase_order_id");
    if (purchaseOrderId) {
      lookupBy = { orderId: purchaseOrderId };
    } else {
      lookupBy = { pidx: khaltiPidx };
    }
  } else if (gateway === "esewa") {
    const oid = searchParams.get("oid");
    const refId = searchParams.get("refId");
    if (!oid || !refId) {
      log("payments:callback:esewa-missing-params", Object.fromEntries(searchParams));
      return NextResponse.redirect(new URL("/?error=missing-oid-refId", request.url));
    }
    pidx = `oid:${oid}:refId:${refId}`;
    lookupBy = { orderId: oid };
  } else {
    return NextResponse.redirect(new URL("/?error=unsupported-gateway", request.url));
  }

  const result = await verifyAndMarkPaid({ lookupBy, pidx, gatewayId: gateway });

  if (!result) {
    return NextResponse.redirect(new URL("/?error=payment-failed", request.url));
  }

  return NextResponse.redirect(
    new URL(`/${result.storeSlug}/order-confirmed/${result.orderNo}`, request.url),
  );
}
