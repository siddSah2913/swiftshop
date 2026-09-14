// Delivery adapter registry. v1 is manual-first: the owner picks a partner,
// copies the generated manifest into the partner's app, and enters a tracking
// ref. Everything here is pure (client + server share it) — no Node/Prisma
// imports.

import { indriveAdapter } from "./indrive";
import { ncmAdapter } from "./ncm";
import { pathaoAdapter } from "./pathao";
import { selfAdapter } from "./self";
import { DELIVERY_PARTNER_IDS } from "./types";
import type {
  DeliveryAdapter,
  DeliveryPartnerId,
  ManifestContext,
} from "./types";

export { DELIVERY_PARTNER_IDS };
export type { DeliveryPartnerId, ManifestContext };
export type { DeliveryAdapter };

/** All four adapters, keyed by id. */
export const DELIVERY_ADAPTERS: Record<DeliveryPartnerId, DeliveryAdapter> = {
  self: selfAdapter,
  ncm: ncmAdapter,
  pathao: pathaoAdapter,
  indrive: indriveAdapter,
};

/** Narrow a raw string to a partner id (guards form/enum values). */
export function isDeliveryPartnerId(v: string): v is DeliveryPartnerId {
  return (DELIVERY_PARTNER_IDS as readonly string[]).includes(v);
}

/** Resolve an adapter by id; throws on anything not in the registry. */
export function getDeliveryAdapter(id: DeliveryPartnerId): DeliveryAdapter {
  const adapter = DELIVERY_ADAPTERS[id];
  if (!adapter) throw new Error(`Unknown delivery partner: ${id}`);
  return adapter;
}

/** Convenience: generate the pickup summary for a partner. */
export function generateManifest(
  id: DeliveryPartnerId,
  ctx: ManifestContext,
): string {
  return getDeliveryAdapter(id).generateManifest(ctx);
}