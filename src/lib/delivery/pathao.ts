import { buildManifest } from "./shared";
import type { DeliveryAdapter } from "./types";

/** Pathao — motorbike courier with COD support. */
export const pathaoAdapter: DeliveryAdapter = {
  id: "pathao",
  label: "Pathao",
  isApiConnected: false,
  generateManifest: (ctx) => buildManifest(ctx, pathaoAdapter.label),
};