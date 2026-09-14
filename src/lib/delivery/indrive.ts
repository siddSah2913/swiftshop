import { buildManifest } from "./shared";
import type { DeliveryAdapter } from "./types";

/** inDrive — same-day courier. */
export const indriveAdapter: DeliveryAdapter = {
  id: "indrive",
  label: "inDrive",
  isApiConnected: false,
  generateManifest: (ctx) => buildManifest(ctx, indriveAdapter.label),
};