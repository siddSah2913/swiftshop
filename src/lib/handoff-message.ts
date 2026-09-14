// The auto-generated WhatsApp message sent to a customer once their order is
// handed to a delivery partner (or delivered). Server components only (the order
// detail page) — never the client bundle. Function replacements keep a $ in
// user-entered text (tracking ref, names) literal, never a String.replace
// replacement pattern.

import { t, type Locale } from "@/lib/i18n";

export type HandoffMessageParams = {
  locale: Locale;
  customerName: string;
  storeName: string;
  orderNo: number;
  partnerLabel: string;
  /** Appended after the base message when present. */
  trackingRef?: string | null;
};

export function buildHandoffMessage(p: HandoffMessageParams): string {
  const base = t(p.locale, "delivery.customerHandedMsg")
    .replace("{customer}", () => p.customerName)
    .replace("{orderNo}", () => String(p.orderNo))
    .replace("{store}", () => p.storeName)
    .replace("{partner}", () => p.partnerLabel);
  if (!p.trackingRef) return base;
  const ref = p.trackingRef;
  return (
    base +
    t(p.locale, "delivery.customerTrackingMsg").replace("{ref}", () => ref)
  );
}