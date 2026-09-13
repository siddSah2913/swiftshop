"use client";

import { useActionState, useMemo, useState } from "react";
import { createStore, type OnboardingState } from "@/app/dashboard/onboarding/actions";
import { PROVINCES } from "@/lib/nepal";
import { slugify } from "@/lib/slug";
import { SlugField } from "./slug-field";

type Labels = {
  shopName: string;
  shopNameHint: string;
  category: string;
  categoryClothing: string;
  categoryElectronics: string;
  categoryGeneral: string;
  city: string;
  selectProvince: string;
  selectDistrict: string;
  slug: string;
  slugHint: string;
  slugTaken: string;
  slugAvailable: string;
  createButton: string;
  provinceLabels: Record<string, string>;
};

export function OnboardingForm({ labels }: { labels: Labels }) {
  const [state, action, pending] = useActionState(createStore, {} as OnboardingState);
  const [category, setCategory] = useState("clothing");
  const [shopName, setShopName] = useState("");
  const [slug, setSlug] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const districts = useMemo(
    () => PROVINCES.find((p) => p.id === province)?.districts ?? [],
    [province],
  );

  // Auto-suggest the slug from the shop name until the owner edits it by hand.
  const suggestSlug = (name: string) => {
    setShopName(name);
    if (!slug) setSlug(slugify(name));
  };

  return (
    <form action={action} className="space-y-6">
      <label className="block">
        <span className="text-sm font-medium text-zinc-700">{labels.shopName}</span>
        <input
          name="name"
          value={shopName}
          onChange={(e) => suggestSlug(e.target.value)}
          maxLength={80}
          required
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-teal-600 focus:outline-none"
        />
        <span className="text-xs text-zinc-500">{labels.shopNameHint}</span>
      </label>

      <div>
        <span className="block text-sm font-medium text-zinc-700">{labels.category}</span>
        <div className="mt-2 grid grid-cols-1 gap-2">
          {(
            [
              ["clothing", labels.categoryClothing],
              ["electronics", labels.categoryElectronics],
              ["general", labels.categoryGeneral],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-3 rounded-md border border-zinc-300 px-4 py-3 has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50"
            >
              <input
                type="radio"
                name="category"
                value={value}
                checked={category === value}
                onChange={() => setCategory(value)}
                className="accent-teal-700"
              />
              <span className="text-sm text-zinc-800">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium text-zinc-700">{labels.city}</span>
          <select
            name="province"
            value={province}
            onChange={(e) => {
              setProvince(e.target.value);
              setDistrict("");
            }}
            required
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-teal-600 focus:outline-none"
          >
            <option value="">{labels.selectProvince}</option>
            {PROVINCES.map((p) => (
              <option key={p.id} value={p.id}>
                {labels.provinceLabels[p.id]}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="sr-only">{labels.selectDistrict}</span>
          <select
            name="district"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            required
            disabled={!province}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-teal-600 focus:outline-none disabled:opacity-50"
          >
            <option value="">{labels.selectDistrict}</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <span className="block text-sm font-medium text-zinc-700">{labels.slug}</span>
        <SlugField
          name="slug"
          value={slug}
          hint={labels.slugHint}
          takenLabel={labels.slugTaken}
          availableLabel={labels.slugAvailable}
          onChange={setSlug}
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-teal-700 px-4 py-2.5 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {pending ? "…" : labels.createButton}
      </button>
    </form>
  );
}