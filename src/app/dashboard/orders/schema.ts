// Zod schema for the dashboard order actions — tenant-scoped updates keyed by
// the order id, which must match the shared id shape (ID_RE from lib/cart).

import { z } from "zod";
import { ID_RE } from "@/lib/cart";

export const orderIdSchema = z.object({
  orderId: z.string().trim().regex(ID_RE, "orders.invalidOrderId"),
});

export type OrderIdInput = z.infer<typeof orderIdSchema>;