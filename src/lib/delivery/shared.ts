// Shared pieces of the pickup summary — the four adapters only differ by
// id/label/header, so share the body + formatting here. Pure string building:
// nothing here may import Node, Prisma, or i18n (this module is bundled into
// the client-side hand-to-partner panel as well as the server action).

import type { ManifestContext } from "./types";

/** Human-readable payment line. cod/qr are the v1 types; anything else passes
 * through raw so a future type never renders as a blank. */
export function paymentLabel(paymentType: string): string {
  if (paymentType === "cod") return "Cash on delivery";
  if (paymentType === "qr") return "QR payment";
  return paymentType;
}

/** The branded header line, derived from the adapter's label. */
export function manifestHeader(label: string): string {
  return `${label.toUpperCase()} — PICKUP SUMMARY`;
}

/** The common body: order no, shop, customer, address, phone, items, total,
 * payment type. No trailing newline — the header is prepended by the adapter. */
export function buildBody(ctx: ManifestContext): string {
  const { order, customer, store } = ctx;
  const fmt = (n: number) => n.toLocaleString("en-IN");

  const items = order.items
    .map(
      (item, i) =>
        `  ${i + 1}. ${item.name} × ${item.qty} — NPR ${fmt(item.priceNpr * item.qty)}`,
    )
    .join("\n");

  const lines = [
    `Order: #${order.orderNo}`,
    `Shop: ${store.name}`,
    `Customer: ${customer.name}`,
    `Phone: ${customer.phone}`,
  ];
  if (customer.address) lines.push(`Address: ${customer.address}`);
  lines.push("Items:", items);
  lines.push(`Total: NPR ${fmt(order.totalNpr)}`);
  lines.push(`Payment: ${paymentLabel(order.paymentType)}`);

  return lines.join("\n");
}

/** Manifest for an adapter: its header + the shared body. */
export function buildManifest(ctx: ManifestContext, label: string): string {
  return `${manifestHeader(label)}\n${buildBody(ctx)}`;
}