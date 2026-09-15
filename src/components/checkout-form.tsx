"use client";

// Checkout form — calls placeOrder via startTransition so the redirectUrl
// return path works reliably.  See Phase 2 spec §10.

import { useState, useTransition } from "react";
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
  payEsewa: string;
  payKhalti: string;
  paymentRedirect: string;
  placeOrder: string;
};

type Props = {
  slug: string;
  primaryColor: string;
  availableMethods: Array<"cod" | "qr" | "esewa" | "khalti">;
  labels: Labels;
};

function labelFor(
  method: "cod" | "qr" | "esewa" | "khalti",
  labels: Labels,
): string {
  switch (method) {
    case "cod":
      return labels.cod;
    case "qr":
      return labels.qr;
    case "esewa":
      return labels.payEsewa;
    case "khalti":
      return labels.payKhalti;
  }
}

export function CheckoutForm({
  slug,
  primaryColor,
  availableMethods,
  labels,
}: Props) {
  const [state, setState] = useState<CheckoutFormState>({});
  const [pending, startTransition] = useTransition();

  const redirecting = !!state.redirectUrl;

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await placeOrder({} as CheckoutFormState, formData, slug);
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
      } else {
        setState(result);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
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
          {availableMethods.map((pt) => (
            <div key={pt}>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="paymentType"
                  value={pt}
                  defaultChecked={pt === "cod"}
                  className="text-teal-600"
                />
                <span className="text-sm">{labelFor(pt, labels)}</span>
              </label>
              {pt === "qr" ? (
                <p className="ml-5 mt-0.5 text-xs text-zinc-400">
                  {labels.qrHint}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </fieldset>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      {redirecting ? (
        <p className="text-sm text-zinc-500">{labels.paymentRedirect}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending || redirecting}
        className="w-full rounded-md px-4 py-3 text-sm font-medium text-white transition disabled:opacity-70"
        style={{ backgroundColor: primaryColor }}
      >
        {pending || redirecting ? "..." : labels.placeOrder}
      </button>
    </form>
  );
}