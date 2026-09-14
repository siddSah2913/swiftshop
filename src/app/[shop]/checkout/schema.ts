import { z } from "zod";

/**
 * Checkout form validation — pure, unit-tested.
 * Error messages are i18n keys (translated at render time), so the schema
 * stays locale-agnostic. Only Nepali 10-digit mobiles are accepted in v1
 * (`^9[678]\d{8}$`, no +977) — see Phase 2 spec §2/§11.
 */
const PAYMENT_TYPES = ["cod", "qr"] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export const checkoutSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "checkout.invalidName")
      .max(80, "checkout.invalidName"),
    phone: z
      .string()
      .trim()
      .regex(/^9[678]\d{8}$/, "checkout.invalidPhone"),
    address: z
      .string()
      .trim()
      .min(1, "checkout.invalidAddress")
      .max(200, "checkout.invalidAddress"),
    // Kept a plain string: Zod 4.6's enum errorMap isn't applied to enum
    // issues, so membership + the i18n key live in superRefine below — the
    // same pattern onboarding's cross-field checks use.
    paymentType: z.string().min(1),
  })
  .superRefine((data, ctx) => {
    if (!PAYMENT_TYPES.includes(data.paymentType as PaymentType)) {
      ctx.addIssue({
        code: "custom",
        path: ["paymentType"],
        message: "checkout.invalidPayment",
      });
    }
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;