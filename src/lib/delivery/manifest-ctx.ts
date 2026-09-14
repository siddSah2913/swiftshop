// The ONE place an order becomes the ManifestContext for the copies. The
// client hand-to-partner panel and the server action both call this, so the
// on-screen preview and the persisted Delivery.manifest can never drift.

import type { ManifestContext } from "./types";

type OrderLike = {
  orderNo: number;
  totalNpr: number;
  paymentType: string;
  items: { name: string; qty: number; priceNpr: number }[];
  customer: { name: string; phone: string; address: string | null };
};

type StoreLike = { name: string; slug: string };

export function manifestContext(
  order: OrderLike,
  store: StoreLike,
): ManifestContext {
  return {
    order: {
      orderNo: order.orderNo,
      totalNpr: order.totalNpr,
      paymentType: order.paymentType,
      items: order.items.map((i) => ({
        name: i.name,
        qty: i.qty,
        priceNpr: i.priceNpr,
      })),
    },
    customer: order.customer,
    store,
  };
}