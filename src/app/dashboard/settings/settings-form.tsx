"use client";

import { useActionState, useEffect, useState } from "react";
import { updateSettings, type SettingsActionState } from "./actions";

type SettingsFormProps = {
  currentValues: {
    paymentCod: boolean;
    paymentEsewa: boolean;
    paymentKhalti: boolean;
    requirePayToDeliver: boolean;
    hasQrImage: boolean;
  };
  labels: {
    paymentMethods: string;
    enableCod: string;
    enableEsewa: string;
    enableKhalti: string;
    enableQr: string;
    requirePayToDeliver: string;
    requirePayToDeliverHint: string;
    qrHint: string;
    save: string;
    saved: string;
  };
};

const toggleBase = "h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500";

export function SettingsForm({ currentValues, labels }: SettingsFormProps) {
  const [state, formAction, isPending] = useActionState<SettingsActionState, FormData>(
    updateSettings,
    {},
  );
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (state.ok) {
      setShowSaved(true);
      const t = setTimeout(() => setShowSaved(false), 3000);
      return () => clearTimeout(t);
    }
  }, [state.ok]);

  return (
    <form action={formAction} className="mt-6 space-y-6">
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <h2 className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-700">
          {labels.paymentMethods}
        </h2>

        <label className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          <span className="text-sm text-zinc-700">{labels.enableCod}</span>
          <input
            type="checkbox"
            name="paymentCod"
            defaultChecked={currentValues.paymentCod}
            className={toggleBase}
          />
        </label>

        <label className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          <div>
            <span className="text-sm text-zinc-700">{labels.enableQr}</span>
            {!currentValues.hasQrImage && (
              <p className="mt-0.5 text-xs text-zinc-400">{labels.qrHint}</p>
            )}
          </div>
          <input
            type="checkbox"
            name="paymentQr"
            defaultChecked={currentValues.hasQrImage}
            disabled
            className={toggleBase}
          />
        </label>

        <label className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          <span className="text-sm text-zinc-700">{labels.enableEsewa}</span>
          <input
            type="checkbox"
            name="paymentEsewa"
            defaultChecked={currentValues.paymentEsewa}
            className={toggleBase}
          />
        </label>

        <label className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-zinc-700">{labels.enableKhalti}</span>
          <input
            type="checkbox"
            name="paymentKhalti"
            defaultChecked={currentValues.paymentKhalti}
            className={toggleBase}
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <label className="flex items-center justify-between px-4 py-3">
          <div>
            <span className="text-sm font-medium text-zinc-700">{labels.requirePayToDeliver}</span>
            <p className="mt-0.5 text-xs text-zinc-400">{labels.requirePayToDeliverHint}</p>
          </div>
          <input
            type="checkbox"
            name="requirePayToDeliver"
            defaultChecked={currentValues.requirePayToDeliver}
            className={toggleBase}
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
      >
        {isPending ? "…" : labels.save}
      </button>

      {showSaved && (
        <p className="text-sm text-emerald-600">{labels.saved}</p>
      )}

      {state.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
    </form>
  );
}
