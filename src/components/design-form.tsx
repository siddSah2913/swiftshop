"use client";

import { useActionState, useState } from "react";
import { updateDesign } from "@/app/dashboard/design/actions";
import { TEMPLATES, COLOR_PRESETS } from "@/lib/design";

type Labels = {
  template: string;
  templateOptions: Record<string, string>;
  colorLabel: string;
  logo: string;
  logoHint: string;
  save: string;
};

export function DesignForm({
  labels,
  initial,
}: {
  labels: Labels;
  initial: { template: string; primaryColor: string; logoUrl: string | null };
}) {
  const [state, action, pending] = useActionState(updateDesign, {});
  const [color, setColor] = useState(initial.primaryColor);

  return (
    <form action={action} className="space-y-6">
      <div>
        <span className="text-sm font-medium text-zinc-700">{labels.template}</span>
        <div className="mt-2 grid grid-cols-1 gap-2">
          {TEMPLATES.map((tpl) => (
            <label
              key={tpl}
              className="flex cursor-pointer items-center gap-3 rounded-md border border-zinc-300 px-4 py-3 has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50"
            >
              <input
                type="radio"
                name="template"
                value={tpl}
                defaultChecked={initial.template === tpl}
                className="accent-teal-700"
              />
              <span className="text-sm text-zinc-800">{labels.templateOptions[tpl]}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <span className="text-sm font-medium text-zinc-700">{labels.colorLabel}</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-9 w-9 rounded-full border-2 ${color === c ? "border-zinc-900" : "border-zinc-200"}`}
              style={{ backgroundColor: c }}
              aria-label={c}
            />
          ))}
        </div>
        <input
          name="primaryColor"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-teal-600 focus:outline-none"
          placeholder="#0F766E"
          pattern="^#[0-9A-Fa-f]{6}$"
        />
        {state.error ? (
          <p role="alert" className="text-sm text-red-600">{state.error}</p>
        ) : null}
      </div>

      <label className="block">
        <span className="text-sm font-medium text-zinc-700">{labels.logo}</span>
        <input
          type="file"
          name="logo"
          accept="image/jpeg,image/png,image/webp"
          className="mt-1 block w-full text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-teal-700 file:px-3 file:py-2 file:text-white hover:file:bg-teal-800"
        />
        {initial.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={initial.logoUrl} alt="" className="mt-3 h-16 w-16 rounded-md object-cover" />
        ) : null}
        <span className="text-xs text-zinc-500">{labels.logoHint}</span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-teal-700 px-4 py-2.5 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {pending ? "…" : labels.save}
      </button>
    </form>
  );
}