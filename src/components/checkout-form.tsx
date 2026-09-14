"use client";

// Checkout form — useActionState with placeOrder bound to slug.
// See Phase 2 spec §10.

import { useActionState } from "react";
import {
  placeOrder,
  type CheckoutFormState,
} from "@/app/[shop]/checkout/actions";

type Labels = {
  name: string;
  phone: string;
  phoneHint: string;
  address: string;
  addressHint: string;
  payment: string;
  cod: string;
  qr: string;
  qrHint: string;
  placeOrder: string;
};

type Props = {
  slug: string;
  primaryColor: string;
  hasQr: boolean;
  labels: Labels;
};

export function CheckoutForm({ slug, primaryColor, hasQr, labels }: Props) {
  const [state, action, pending] = useActionState(
    (prev: CheckoutFormState, fd: FormData) => placeOrder(prev, fd, slug),
    {} as CheckoutFormState,
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-700">
          {labels.name}
        </label>
        <input
          type="text"
          name="name"
          required
          maxLength={80}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700">
          {labels.phone}
        </label>
        <input
          type="tel"
          name="phone"
          required
          pattern="9[678][0-9]{8}"
          maxLength={10}
          placeholder="98XXXXXXXX"
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-zinc-500">{labels.phoneHint}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700">
          {labels.address}
        </label>
        <textarea
          name="address"
          required
          maxLength={200}
          rows={2}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-zinc-500">{labels.addressHint}</p>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-zinc-700">
          {labels.payment}
        </legend>
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="paymentType"
              value="cod"
              defaultChecked
              className="text-teal-600"
            />
            <span className="text-sm">{labels.cod}</span>
          </label>
          {hasQr ? (
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="paymentType"
                value="qr"
                className="text-teal-600"
              />
              <span className="text-sm">{labels.qr}</span>
            </label>
          ) : null}
        </div>
      </fieldset>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md px-4 py-3 text-sm font-medium text-white transition disabled:opacity-70"
        style={{ backgroundColor: primaryColor }}
      >
        {pending ? "..." : labels.placeOrder}
      </button>
    </form>
  );
}