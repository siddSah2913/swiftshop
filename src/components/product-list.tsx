"use client";

import { useActionState } from "react";
import type { ProductModel } from "@/generated/prisma/models";
import {
  deleteProduct,
  type ProductsFormState,
} from "@/app/dashboard/products/actions";

function DeleteProductButton({
  productId,
  deleteLabel,
  deleteConfirm,
}: {
  productId: string;
  deleteLabel: string;
  deleteConfirm: string;
}) {
  const [state, action, pending] = useActionState(
    (prev: ProductsFormState, fd: FormData) => deleteProduct(prev, fd, productId),
    {} as ProductsFormState,
  );
  void state;

  return (
    <form action={action}>
      <button
        type="submit"
        disabled={pending}
        onClick={(e) => {
          if (!window.confirm(deleteConfirm)) e.preventDefault();
        }}
        className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
      >
        {deleteLabel}
      </button>
    </form>
  );
}

export function ProductList({
  products,
  labels,
}: {
  products: ProductModel[];
  labels: { priceNpr: string; edit: string; delete: string; deleteConfirm: string };
}) {
  return (
    <ul className="mt-6 space-y-3">
      {products.map((p) => {
        const main = p.imageUrls[0];
        return (
          <li
            key={p.id}
            className="flex items-center gap-4 rounded-lg border border-zinc-200 bg-white p-4"
          >
            {main ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={main} alt="" className="h-16 w-16 rounded-md object-cover" />
            ) : (
              <div className="h-16 w-16 rounded-md bg-zinc-100" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-zinc-900">{p.name}</p>
              <p className="text-sm text-zinc-500">
                {labels.priceNpr} {p.priceNpr.toLocaleString("en-IN")}
              </p>
            </div>
            <a
              href={`/dashboard/products/${p.id}/edit`}
              className="text-sm font-medium text-teal-700 hover:text-teal-800"
            >
              {labels.edit}
            </a>
            <DeleteProductButton
              productId={p.id}
              deleteLabel={labels.delete}
              deleteConfirm={labels.deleteConfirm}
            />
          </li>
        );
      })}
    </ul>
  );
}