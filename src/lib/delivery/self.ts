import { buildManifest } from "./shared";
import type { DeliveryAdapter } from "./types";

/** The shop's own delivery — no external courier. The manifest is an internal
 * self-delivery note; the owner marks the order handed after their visit. */
export const selfAdapter: DeliveryAdapter = {
  id: "self",
  label: "Shop delivery (self)",
  isApiConnected: false,
  generateManifest: (ctx) => buildManifest(ctx, selfAdapter.label),
};