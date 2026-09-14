"use client";

// Add-to-cart button — fires the addToCartItem Server Action, swaps the label
// to "Added ✓" when it returns. productId rides in a hidden field (the
// standard Server Action pattern). See Phase 2 spec §10.

import { useActionState } from "react";
import {
  addToCartItem,
  type CartActionState,
} from "@/app/[shop]/cart/actions";

type Props = {
  productId: string;
  label: string;
  addedLabel: string;
  primaryColor: string;
};

export function AddToCartButton({
  productId,
  label,
  addedLabel,
  primaryColor,
}: Props) {
  const [state, action, pending] = useActionState(
    addToCartItem,
    {} as CartActionState,
  );

  return (
    <form action={action} className="mt-2">
      <input type="hidden" name="productId" value={productId} />
      <button
        type="submit"
        disabled={pending || state.ok}
        className="w-full rounded-md px-3 py-2 text-sm font-medium text-white transition disabled:opacity-70"
        style={{ backgroundColor: state.ok ? "#16a34a" : primaryColor }}
      >
        {state.ok ? addedLabel : pending ? "..." : label}
      </button>
    </form>
  );
}