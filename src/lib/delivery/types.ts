// Delivery adapter types. Manual-first in v1 — no partner exposes a public API
// (2026-09), so every adapter is a pure generateManifest() that produces the
// copy-paste pickup summary the owner pastes into the partner's app. When a
// partner ships an API, createPickup()/track() get added to the interface.

/** The four v1 delivery partners (order matters — used to enumerate). */
export const DELIVERY_PARTNER_IDS = ["self", "ncm", "pathao", "indrive"] as const;

export type DeliveryPartnerId = (typeof DELIVERY_PARTNER_IDS)[number];

export type ManifestItem = {
  name: string;
  qty: number;
  priceNpr: number;
};

/** Everything a manifest needs to describe one order for a courier. */
export type ManifestContext = {
  order: {
    orderNo: number;
    totalNpr: number;
    paymentType: string; // cod | qr | (later) esewa | khalti
    items: ManifestItem[];
  };
  customer: {
    name: string;
    phone: string;
    address: string | null;
  };
  store: {
    name: string;
    slug: string;
  };
};

export interface DeliveryAdapter {
  id: DeliveryPartnerId;
  /** Canonical display name — English here, proper nouns for the couriers. */
  label: string;
  /** true once a partner's real API is wired in (always false in v1). */
  isApiConnected: boolean;
  /** v1: copy-paste pickup summary the owner pastes into the partner's app. */
  generateManifest(ctx: ManifestContext): string;
  // v2 (partner provides an API):
  // createPickup(order, manifest): Promise<DeliveryInitResult>;
  // track(ref): Promise<TrackingInfo | null>;
}