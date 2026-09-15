"use client";

// Cart line items with qty steppers and remove — client component
// calling Server Actions with productId/qty in hidden fields. See Phase 2 spec §10.

import Link from "next/link";
import { useActionState } from "react";
import {
  setCartQty,
  type CartActionState,
} from "@/app/[shop]/cart/actions";

type Line = {
  lineKey: string;
  lineName: string;
  priceNpr: number;
  imageUrl?: string;
  qty: number;
};

type Props = {
  lines: Line[];
  storeSlug: string;
  total: number;
  totalLabel: string;
  checkoutLabel: string;
  removeLabel: string;
  qtyLabel: string;
  continueLabel: string;
  primaryColor: string;
};

export function CartLines({
  lines,
  storeSlug,
  total,
  totalLabel,
  checkoutLabel,
  removeLabel,
  qtyLabel,
  continueLabel,
  primaryColor,
}: Props) {
  return (
    <div className="mt-6">
      <ul className="divide-y divide-zinc-200">
        {lines.map((line) => (
          <li key={line.lineKey} className="flex items-center gap-4 py-4">
            {line.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={line.imageUrl}
                alt=""
                className="h-16 w-16 rounded-md object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded-md bg-zinc-100" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-zinc-900">
                {line.lineName}
              </p>
              <p className="text-sm text-zinc-500">
                NPR {line.priceNpr.toLocaleString("en-IN")}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">{qtyLabel}</span>
              <QtyStepper
                productId={line.lineKey}
                qty={line.qty}
                removeLabel={removeLabel}
                primaryColor={primaryColor}
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between border-t border-zinc-200 pt-4">
        <p className="text-lg font-semibold text-zinc-900">
          {totalLabel}: NPR {total.toLocaleString("en-IN")}
        </p>
        <Link
          href={`/${storeSlug}/checkout`}
          className="rounded-md px-4 py-2 text-sm font-medium text-white transition"
          style={{ backgroundColor: primaryColor }}
        >
          {checkoutLabel}
        </Link>
      </div>

      <div className="mt-4 text-center">
        <Link
          href={`/${storeSlug}`}
          className="text-sm text-zinc-500 hover:text-zinc-700"
        >
          {continueLabel}
        </Link>
      </div>
    </div>
  );
}

function QtyStepper({
  productId,
  qty,
  removeLabel,
  primaryColor,
}: {
  productId: string;
  qty: number;
  removeLabel: string;
  primaryColor: string;
}) {
  const [state, action, pending] = useActionState(
    setCartQty,
    {} as CartActionState,
  );

  return (
    <div className="flex items-center gap-1">
      <form action={action}>
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="qty" value={Math.max(0, qty - 1)} />
        <button
          type="submit"
          disabled={pending}
          className="h-7 w-7 rounded border border-zinc-300 text-sm hover:bg-zinc-100"
        >
          −
        </button>
      </form>
      <span className="w-6 text-center text-sm font-medium">{qty}</span>
      <form action={action}>
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="qty" value={Math.min(9, qty + 1)} />
        <button
          type="submit"
          disabled={pending || qty >= 9}
          className="h-7 w-7 rounded border border-zinc-300 text-sm hover:bg-zinc-100"
        >
          +
        </button>
      </form>
      {qty <= 1 ? (
        <form action={action}>
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="qty" value={0} />
          <button
            type="submit"
            disabled={pending}
            className="ml-1 text-xs text-red-600 hover:text-red-700"
          >
            {removeLabel}
          </button>
        </form>
      ) : null}
    </div>
  );
}