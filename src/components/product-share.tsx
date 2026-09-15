"use client";

// Product share (Phase 6). Touch devices get the native OS share sheet; the
// browser builds a YouTube-style modal with a copy-link row and the platform
// grid. WhatsApp/Facebook/Viber open real share windows; Messenger, Instagram
// and TikTok have no desktop web intent, so they copy the link and toast
// "paste it in X". Hand-built Tailwind UI — this app ships no dialog/library.

import { useCallback, useEffect, useState } from "react";
import { isMobileShareTarget } from "@/lib/mobile-share";

export type ShareLabels = {
  button: string;
  title: string;
  copyLink: string;
  copied: string;
  pasteIn: string; // contains "{platform}"
  whatsapp: string;
  facebook: string;
  messenger: string;
  viber: string;
  instagram: string;
  tiktok: string;
};

type Props = {
  slug: string;
  productId: string;
  productName: string;
  labels: ShareLabels;
};

/** Inline brand glyphs — circular tiles, one color each, no icon library. */
const GLYPHS: Record<string, React.ReactNode> = {
  whatsapp: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path d="M17.5 14.4c-.3-.2-1.8-.9-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.6c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.2-.7-1.8-.9-2.4-.2-.6-.4-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.4zM12 22a10 10 0 01-5.2-1.4l.4-.2-3.7 1 1-3.6-.2-.4A9.9 9.9 0 112 12C2 6.5 6.5 2 12 2s10 4.5 10 10-4.5 10-10 10z"/></svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path d="M24 12.1C24 5.4 18.6 0 12 0S0 5.4 0 12.1C0 18.1 4.4 23.1 10.1 24v-8.4H7.1v-3.5h3.1V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-1.9.9-1.9 1.9v2.2h3.3l-.5 3.5h-2.8V24C19.6 23.1 24 18.1 24 12.1z"/></svg>
  ),
  messenger: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path d="M12 0C5.4 0 0 4.9 0 11c0 3 1.3 5.6 3.4 7.5V24l3-1.7c1 .3 2 .4 3.1.4h.5c6.6 0 12-4.9 12-11S18.6 0 12 0zm.6 14.8l-3-3.2-5.9 3.2 6.5-6.9 3.1 3.2 5.8-3.2-6.5 6.9z"/></svg>
  ),
  viber: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path d="M11.4 0C6.2.4 2 4.3 1.6 8.7c-.3 4 1 7.6 3.5 10.3.3.3.5.7.3 1.1l-.6 2.1c-.1.4.3.7.7.6l2.1-1c.3-.2.7-.1 1 .1 1.1.6 2.3.9 3.5.9 1 0 2-.2 3-.4.6-.2.9-.9.7-1.5-.9-2.8-2.4-7.3-2.4-7.6 0-1.3-1-2.4-2.2-2.5-.6 0-1.1.2-1.5.6-.2-.7-.1-1.5.2-2.2 1.3-2.7 3.7-4.5 4.3-4.2 1 .4.5 3.9.5 4 1.3-.2 2.4-.5 3.3-.9.9-.4 1.6-.9 1.8-1 .5.4 2.4 1.6 3 2.4.6.8.3 1.9.1 2.5-1 3-4.4 4.7-6.2 5.2-.3.1-.6.4-.5.7l.3 1.3c.1.4-.2.8-.6.8-.5 0-2-.4-3-.8-.2-.1-.4-.1-.5 0-.9.5-2 .8-3.1.9l-.2.7c-.1.6.3 1.2.9 1.3 1.2.2 2.4.5 3.6.8.5.1.9.4 1 .9.2.7 3.9-.2 7.8-3.8 2.4-2.2 3.9-4.9 3.9-6.9 0-1.7-.8-3.4-2.5-4.6C20.4 3.6 17.7.2 11.4 0zM7.3 6.3c.2-.2.4-.4.7-.6-.2.1-.4.3-.6.5l-.1.1z"/></svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6"><rect x="2.5" y="2.5" width="19" height="19" rx="5.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="17.6" cy="6.4" r="1.3" fill="currentColor" stroke="none"/></svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path d="M19.6 6.7a4.7 4.7 0 01-3.5-1.6 4.8 4.8 0 01-1.1-3V2h-3.9v13.9c0 1-.3 1.9-.9 2.6a3.5 3.5 0 01-5.2-1 3.5 3.5 0 011.4-4.7c.4-.3.9-.4 1.4-.4V8.3c-3.7.1-6.7 3.1-6.7 6.9 0 2.2 1 4.2 2.6 5.5A6.7 6.7 0 009.4 18a6.9 6.9 0 006.8-6.8V7.6c1 .7 2.2 1.1 3.4 1.1z"/></svg>
  ),
};

export function ProductShare({ slug, productId, productName, labels }: Props) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/${slug}/product/${productId}`
      : "";

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1600);
  }, []);

  const copyLink = useCallback(
    async (platformName?: string) => {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // clipboard may be blocked in a non-secure context — still show feedback
      }
      flash(
        platformName
          ? labels.pasteIn.replace("{platform}", platformName)
          : labels.copied,
      );
    },
    [url, flash, labels],
  );

  const handleShare = async () => {
    if (isMobileShareTarget() && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: productName, text: productName, url });
      } catch {
        // AbortError = user closed the sheet; do nothing
      }
      return;
    }
    setOpen(true);
  };

  const openExternal = (shareUrl: string) =>
    window.open(shareUrl, "_blank", "noopener,noreferrer");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const platforms = [
    {
      id: "whatsapp",
      name: labels.whatsapp,
      color: "#25D366",
      onClick: () => openExternal(`https://wa.me/?text=${encodeURIComponent(`${productName}\n${url}`)}`),
    },
    {
      id: "facebook",
      name: labels.facebook,
      color: "#1877F2",
      onClick: () => openExternal(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`),
    },
    {
      id: "messenger",
      name: labels.messenger,
      color: "#0084FF",
      onClick: () => copyLink(labels.messenger),
    },
    {
      id: "viber",
      name: labels.viber,
      color: "#7360F2",
      onClick: () => openExternal(`viber://forward?text=${encodeURIComponent(`${productName} — ${url}`)}`),
    },
    {
      id: "instagram",
      name: labels.instagram,
      color: "#E1306C",
      onClick: () => copyLink(labels.instagram),
    },
    {
      id: "tiktok",
      name: labels.tiktok,
      color: "#111111",
      onClick: () => copyLink(labels.tiktok),
    },
  ];

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <path d="M8.6 13.5l6.8 3.9M15.4 6.6L8.6 10.5" />
        </svg>
        {labels.button}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={labels.title}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-zinc-900">
              {labels.title}
            </h2>

            <div className="mt-3 flex gap-2">
              <input
                readOnly
                value={url}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-600"
              />
              <button
                type="button"
                onClick={() => copyLink()}
                className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
              >
                {labels.copyLink}
              </button>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              {platforms.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={p.onClick}
                  className="flex flex-col items-center gap-1.5 rounded-lg p-2 transition hover:bg-zinc-50"
                >
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: p.color }}
                  >
                    {GLYPHS[p.id]}
                  </span>
                  <span className="text-xs text-zinc-600">{p.name}</span>
                </button>
              ))}
            </div>

            {toast ? (
              <p className="mt-4 rounded-md bg-zinc-900 px-3 py-2 text-center text-xs text-white">
                {toast}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}