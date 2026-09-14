"use client";

import { useActionState, useMemo, useState } from "react";
import {
  createProduct,
  createProducts,
  updateProduct,
  type ProductsFormState,
} from "@/app/dashboard/products/actions";
import { MAX_PHOTOS_PER_SUBMISSION } from "@/lib/upload-limits";

type Labels = {
  name: string;
  caption: string;
  priceNpr: string;
  photo: string;
  addPhoto: string;
  remove: string;
  save: string;
  saveAll: string;
  bulkMode: string;
  singleMode: string;
  bulkHint: string;
};

type ProductFormAction = (
  prev: ProductsFormState,
  formData: FormData,
) => Promise<ProductsFormState>;

export function ProductForm({
  labels,
  mode: initialMode,
  product,
  productId,
}: {
  labels: Labels;
  mode: "single" | "bulk";
  product?: { name: string; caption: string; priceNpr: number; imageUrls: string[] };
  productId?: string;
}) {
  const [mode, setMode] = useState<"single" | "bulk">(initialMode);
  const [removePhotos, setRemovePhotos] = useState<string[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);

  // updateProduct needs its 3rd arg; useActionState wants a 2-arg action, so wrap.
  const run: ProductFormAction = useMemo(() => {
    if (productId) return (prev, fd) => updateProduct(prev, fd, productId);
    return mode === "bulk" ? createProducts : createProduct;
  }, [productId, mode]);

  const [state, action, pending] = useActionState(run, {} as ProductsFormState);

  return (
    <form action={action} className="space-y-6">
      {!productId ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("single")}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              mode === "single" ? "bg-teal-700 text-white" : "bg-zinc-100 text-zinc-700"
            }`}
          >
            {labels.singleMode}
          </button>
          <button
            type="button"
            onClick={() => setMode("bulk")}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              mode === "bulk" ? "bg-teal-700 text-white" : "bg-zinc-100 text-zinc-700"
            }`}
          >
            {labels.bulkMode}
          </button>
        </div>
      ) : null}

      <input type="hidden" name="removePhotos" value={removePhotos.join(",")} />

      {mode === "single" ? (
        <SingleFields labels={labels} product={product} />
      ) : (
        <BulkEditor labels={labels} />
      )}

      <label className="block">
        <span className="text-sm font-medium text-zinc-700">{labels.photo}</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {product?.imageUrls
            .filter((url) => !removePhotos.includes(url))
            .map((url) => (
              <div key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-20 w-20 rounded-md object-cover" />
                <button
                  type="button"
                  onClick={() => setRemovePhotos((r) => [...r, url])}
                  className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-xs text-white"
                  aria-label={labels.remove}
                >
                  ×
                </button>
              </div>
            ))}
          <div className="relative">
            <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-md border border-dashed border-zinc-300 text-sm text-zinc-400 hover:border-teal-600 hover:text-teal-700">
              {labels.addPhoto}
              <input
                type="file"
                name="photo"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(e) => {
                  const list = e.target.files ? Array.from(e.target.files) : [];
                  setNewPreviews(list.map((f) => URL.createObjectURL(f)));
                }}
              />
            </label>
          </div>
          {newPreviews.map((src) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img key={src} src={src} alt="" className="h-20 w-20 rounded-md object-cover" />
          ))}
        </div>
      </label>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-teal-700 px-4 py-2.5 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {pending ? "…" : mode === "bulk" ? labels.saveAll : labels.save}
      </button>
    </form>
  );
}

/** Single + edit modes: name, caption, price. */
function SingleFields({
  labels,
  product,
}: {
  labels: Labels;
  product?: { name: string; caption: string; priceNpr: number; imageUrls: string[] };
}) {
  return (
    <>
      <label className="block">
        <span className="text-sm font-medium text-zinc-700">{labels.name}</span>
        <input
          name="name"
          defaultValue={product?.name}
          required
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-teal-600 focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-zinc-700">{labels.caption}</span>
        <textarea
          name="caption"
          defaultValue={product?.caption}
          rows={2}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-teal-600 focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-zinc-700">{labels.priceNpr}</span>
        <input
          name="priceNpr"
          type="number"
          inputMode="numeric"
          min="0"
          defaultValue={product?.priceNpr ?? ""}
          required
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-teal-600 focus:outline-none"
        />
      </label>
    </>
  );
}

/** Bulk mode: N slots, each slot = photo + name + price (one product each). */
function BulkEditor({ labels }: { labels: Labels }) {
  const [slots, setSlots] = useState(3);
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">{labels.bulkHint}</p>
      {Array.from({ length: slots }).map((_, i) => (
        <fieldset key={i} className="rounded-lg border border-zinc-200 p-4">
          <legend className="sr-only">
            {labels.photo} {i + 1}
          </legend>
          <input
            type="file"
            name={`item${i}photo`}
            accept="image/jpeg,image/png,image/webp"
            required
            className="block w-full text-sm text-zinc-600"
          />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <input
              name={`item${i}name`}
              required
              placeholder={labels.name}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-teal-600 focus:outline-none"
            />
            <input
              name={`item${i}price`}
              type="number"
              inputMode="numeric"
              min="0"
              required
              placeholder={labels.priceNpr}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-teal-600 focus:outline-none"
            />
          </div>
        </fieldset>
      ))}
      <button
        type="button"
        disabled={slots >= MAX_PHOTOS_PER_SUBMISSION}
        onClick={() => setSlots((n) => n + 1)}
        className="text-sm font-medium text-teal-700 hover:text-teal-800 disabled:opacity-50"
      >
        {labels.addPhoto}
      </button>
    </div>
  );
}