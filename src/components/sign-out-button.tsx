"use client";

import { signOut } from "next-auth/react";

/** Signs the user out and returns them to the landing page. */
export function SignOutButton({ label }: { label: string }) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="text-sm text-zinc-600 hover:text-zinc-900"
    >
      {label}
    </button>
  );
}