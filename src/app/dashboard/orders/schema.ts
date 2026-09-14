// Zod schemas for the dashboard order actions — tenant-scoped updates keyed by
// the order id, which must match the shared id shape (ID_RE from lib/cart).

import { z } from "zod";
import { DELIVERY_PARTNER_IDS } from "@/lib/delivery";
import type { DeliveryPartnerId } from "@/lib/delivery";
import { ID_RE } from "@/lib/cart";

export const orderIdSchema = z.object({
  orderId: z.string().trim().regex(ID_RE, "orders.invalidOrderId"),
});

export type OrderIdInput = z.infer<typeof orderIdSchema>;

const TRACKING_REF_MAX = 60;

/**
 * Hand-off form validation — partner is required and must be a registered
 * delivery partner; tracking ref is optional, trimmed, ≤ 60 chars (an empty
 * value collapses to undefined so we never persist ""). Error messages are
 * i18n keys (translated at render time); the partner membership check lives in
 * superRefine so a blank partner falls through to the delivery.partnerRequired
 * key, mirroring checkout's paymentType rule.
 */
export const handToPartnerSchema = z
  .object({
    partner: z.string(), // blank → not in DELIVERY_PARTNER_IDS → partnerRequired
    trackingRef: z
      .string()
      .trim()
      .max(TRACKING_REF_MAX, "delivery.invalidTrackingRef")
      .transform((v) => (v ? v : undefined))
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (!DELIVERY_PARTNER_IDS.includes(data.partner as DeliveryPartnerId)) {
      ctx.addIssue({
        code: "custom",
        path: ["partner"],
        message: "delivery.partnerRequired",
      });
    }
  });

export type HandToPartnerInput = z.infer<typeof handToPartnerSchema>;