"use client";

// Order status actions for the detail page — three useActionState forms
// (confirm / mark delivered / mark paid) plus the WhatsApp-me link. Which
// buttons render is decided server-side by the order's current state via
// canTransition(); each form reports its own error inline (pre-translated).
// On success the action returns { ok: true } and revalidates both routes, so
// the pending button is the only live feedback — the page re-renders in place.

import { useActionState } from "react";
import {
  confirmOrder,
  markDelivered,
  markPaid,
  type OrdersActionState,
} from "@/app/dashboard/orders/actions";

type Props = {
  orderId: string;
  canConfirm: boolean;
  canDeliver: boolean;
  canMarkPaid: boolean;
  labels: {
    confirm: string;
    markDelivered: string;
    markPaid: string;
    whatsapp: string;
  };
  waUrl: string;
};

const actionBtn =
  "w-full rounded-md px-3 py-2 text-sm font-medium transition disabled:opacity-70";

export function OrderStatusButtons({
  orderId,
  canConfirm,
  canDeliver,
  canMarkPaid,
  labels,
  waUrl,
}: Props) {
  const [confirmState, confirmAction, confirmPending] = useActionState(
    (_prev: OrdersActionState, _fd: FormData) =>
      confirmOrder(_prev, _fd, orderId),
    {} as OrdersActionState,
  );
  const [deliverState, deliverAction, deliverPending] = useActionState(
    (_prev: OrdersActionState, _fd: FormData) =>
      markDelivered(_prev, _fd, orderId),
    {} as OrdersActionState,
  );
  const [paidState, paidAction, paidPending] = useActionState(
    (_prev: OrdersActionState, _fd: FormData) =>
      markPaid(_prev, _fd, orderId),
    {} as OrdersActionState,
  );

  const error = (message: string | undefined) =>
    message ? (
      <p role="alert" className="mb-2 text-sm text-red-600">
        {message}
      </p>
    ) : null;

  return (
    <div className="space-y-3">
      {canConfirm && (
        <form action={confirmAction}>
          {error(confirmState.error)}
          <button
            type="submit"
            disabled={confirmPending}
            className={`${actionBtn} bg-teal-700 text-white hover:bg-teal-800`}
          >
            {confirmPending ? "..." : labels.confirm}
          </button>
        </form>
      )}

      {canDeliver && (
        <form action={deliverAction}>
          {error(deliverState.error)}
          <button
            type="submit"
            disabled={deliverPending}
            className={`${actionBtn} bg-emerald-700 text-white hover:bg-emerald-800`}
          >
            {deliverPending ? "..." : labels.markDelivered}
          </button>
        </form>
      )}

      {canMarkPaid && (
        <form action={paidAction}>
          {error(paidState.error)}
          <button
            type="submit"
            disabled={paidPending}
            className={`${actionBtn} border border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400`}
          >
            {paidPending ? "..." : labels.markPaid}
          </button>
        </form>
      )}

      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${actionBtn} block bg-[#25D366] text-center text-white hover:bg-[#1ebe5b]`}
      >
        {labels.whatsapp}
      </a>
    </div>
  );
}