"use client";

// Storefront add-to-cart for variant products. Renders one pill row per
// option group; the customer must select one option per group (0-stock options
// are disabled) before the submit enables. Posts selected option ids as
// `option` hidden inputs; addToCartItem builds the composite line key.

import { useState } from "react";
import { useActionState } from "react";
import {
  addToCartItem,
  type CartActionState,
} from "@/app/[shop]/cart/actions";

export type PickerGroup = {
  id: string;
  name: string;
  options: { id: string; name: string; stock: number }[];
};

export type PickerLabels = {
  add: string;
  added: string;
  choose: string;
  soldOut: string;
};

export function VariantPicker({
  productId,
  groups,
  primaryColor,
  labels,
}: {
  productId: string;
  groups: PickerGroup[];
  primaryColor: string;
  labels: PickerLabels;
}) {
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [state, action, pending] = useActionState(
    addToCartItem,
    {} as CartActionState,
  );

  const stockOf = (groupId: string, optionId: string) =>
    groups
      .find((g) => g.id === groupId)
      ?.options.find((o) => o.id === optionId)?.stock ?? 0;

  const complete =
    groups.length > 0 &&
    groups.every((g) => {
      const id = selected[g.id];
      return !!id && stockOf(g.id, id) > 0;
    });

  return (
    <form action={action} className="mt-2">
      <input type="hidden" name="productId" value={productId} />

      {groups.map((g) => (
        <div key={g.id} className="mt-3">
          <p className="text-sm font-medium text-zinc-700">{g.name}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {g.options.map((o) => {
              const isSel = selected[g.id] === o.id;
              const soldOut = o.stock <= 0;
              return (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={isSel}
                  disabled={soldOut}
                  onClick={() =>
                    setSelected((s) => ({ ...s, [g.id]: o.id }))
                  }
                  className={`rounded-full border px-3 py-1 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    isSel
                      ? "border-teal-600 bg-teal-600 text-white"
                      : "border-zinc-300 bg-white text-zinc-700 hover:border-teal-600"
                  }`}
                >
                  {o.name}
                  {soldOut ? ` · ${labels.soldOut}` : ""}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* one hidden input per selected group, in group order */}
      {groups.map(
        (g) =>
          selected[g.id]
            ? (
              <input
                key={`opt-${g.id}`}
                type="hidden"
                name="option"
                value={selected[g.id]}
              />
            )
            : null,
      )}

      <button
        type="submit"
        disabled={pending || !complete}
        className="mt-4 w-full rounded-md px-3 py-2 text-sm font-medium text-white transition disabled:opacity-70"
        style={{ backgroundColor: state.ok ? "#16a34a" : primaryColor }}
      >
        {state.ok
          ? labels.added
          : pending
            ? "..."
            : complete
              ? labels.add
              : labels.choose}
      </button>
    </form>
  );
}