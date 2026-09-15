import { z } from "zod";

export const settingsSchema = z.object({
  paymentCod: z.boolean(),
  paymentEsewa: z.boolean(),
  paymentKhalti: z.boolean(),
  requirePayToDeliver: z.boolean(),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
