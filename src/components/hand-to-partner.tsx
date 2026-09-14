"use client";

// "Hand to partner" panel for a confirmed order: pick a delivery partner, see
// the live pickup summary (regenerated client-side from the same pure
// generator the server action uses, so the preview always matches the copy
// that gets persisted), copy it, add an optional tracking ref, then submit to
// handToPartner. All labels arrive server-translated as props.

import { useActionState, useEffect, useRef, useState } from "react";
import { generateManifest, isDeliveryPartnerId } from "@/lib/delivery";
import type { DeliveryPartnerId, ManifestContext } from "@/lib/delivery";
import {
  handToPartner,
  type OrdersActionState,
} from "@/app/dashboard/orders/actions";

type Props = {
  orderId: string;
  /** The store's preferred partner (the select's initial value). */
  defaultPartner: DeliveryPartnerId;
  /** The pure context both the preview and the server copy are built from. */
  manifestCtx: ManifestContext;
  partnerOptions: { id: DeliveryPartnerId; label: string }[];
  labels: {
    title: string;
    partner: string;
    manifest: string;
    manifestHint: string;
    trackingRef: string;
    copy: string;
    copied: string;
    markHandedOver: string;
  };
};

const field =
  "mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm";

export function HandToPartnerForm({
  orderId,
  defaultPartner,
  manifestCtx,
  partnerOptions,
  labels,
}: Props) {
  const [partner, setPartner] = useState<DeliveryPartnerId>(
    isDeliveryPartnerId(defaultPartner) ? defaultPartner : "self",
  );
  const [copied, setCopied] = useState(false);
  // Reset timer for the "Copied ✓" label; cleared on reset and on unmount so a
  // stale timer never flips the label after a re-click or a submit.
  const copiedTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
    },
    [],
  );

  const [state, action, pending] = useActionState(
    (_prev: OrdersActionState, _fd: FormData) =>
      handToPartner(_prev, _fd, orderId),
    {} as OrdersActionState,
  );

  const manifest = generateManifest(partner, manifestCtx);

  const copyManifest = () => {
    // navigator.clipboard is undefined on insecure origins — reading it inside
    // the handler would throw synchronously before the .catch exists to absorb
    // it. The manifest text stays on screen either way.
    if (!navigator.clipboard) return;
    void navigator.clipboard
      .writeText(manifest)
      .then(() => {
        setCopied(true);
        if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
        copiedTimer.current = window.setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        /* clipboard unavailable (http/permissions) — the text is still on screen */
      });
  };

  return (
    <form
      action={action}
      className="mt-6 rounded-lg border border-zinc-200 bg-white p-4"
    >
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {labels.title}
      </h2>

      <label
        htmlFor="partner"
        className="mt-3 block text-sm font-medium text-zinc-700"
      >
        {labels.partner}
      </label>
      <select
        id="partner"
        name="partner"
        value={partner}
        onChange={(e) =>
          setPartner(
            isDeliveryPartnerId(e.target.value) ? e.target.value : "self",
          )
        }
        className={field}
      >
        {partnerOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>

      <div className="mt-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-zinc-700">
          {labels.manifest}
        </h3>
        <button
          type="button"
          onClick={copyManifest}
          className="shrink-0 rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:border-zinc-400"
        >
          {copied ? labels.copied : labels.copy}
        </button>
      </div>
      <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-zinc-50 p-3 font-mono text-xs leading-relaxed text-zinc-800">
        {manifest}
      </pre>
      <p className="mt-2 text-xs text-zinc-500">{labels.manifestHint}</p>

      <label
        htmlFor="trackingRef"
        className="mt-4 block text-sm font-medium text-zinc-700"
      >
        {labels.trackingRef}
      </label>
      <input
        id="trackingRef"
        name="trackingRef"
        type="text"
        maxLength={60}
        className={field}
      />

      {state.error ? (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 w-full rounded-md bg-purple-700 px-3 py-2 text-sm font-medium text-white hover:bg-purple-800 disabled:opacity-70"
      >
        {pending ? "..." : labels.markHandedOver}
      </button>
    </form>
  );
}