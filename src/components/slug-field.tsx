"use client";

import { useEffect, useRef, useState } from "react";
import { checkSlug } from "@/app/dashboard/onboarding/actions";
import { slugify } from "@/lib/slug";

type Props = {
  name: string;
  value: string;
  hint: string;
  takenLabel: string;
  availableLabel: string;
  onChange: (value: string) => void;
};

/** Editable slug input with a debounced, server-side free-name check. */
export function SlugField({
  name,
  value,
  hint,
  takenLabel,
  availableLabel,
  onChange,
}: Props) {
  const [draft, setDraft] = useState(value);
  const [status, setStatus] = useState<"idle" | "checking" | "ok" | "taken">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const update = (raw: string) => {
    setDraft(raw);
    onChange(raw);
  };

  useEffect(() => {
    clearTimeout(timerRef.current);
    const clean = draft.trim().toLowerCase();
    if (!clean) {
      setStatus("idle");
      return;
    }
    setStatus("checking");
    timerRef.current = setTimeout(async () => {
      const { available } = await checkSlug(clean);
      setStatus(available ? "ok" : "taken");
    }, 400);
  }, [draft]);

  return (
    <div className="space-y-1">
      <input
        name={name}
        value={draft}
        onChange={(e) => update(e.target.value)}
        onBlur={() => update(slugify(draft))}
        autoCapitalize="none"
        spellCheck={false}
        maxLength={48}
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-teal-600 focus:outline-none"
      />
      <p
        className={
          status === "taken"
            ? "text-sm text-red-600"
            : status === "ok"
              ? "text-sm text-teal-600"
              : "text-sm text-zinc-500"
        }
      >
        {hint}
        {status === "taken" ? ` · ${takenLabel}` : status === "ok" ? ` · ${availableLabel}` : ""}
      </p>
    </div>
  );
}