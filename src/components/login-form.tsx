"use client";

import { useActionState } from "react";
import { login } from "@/app/login/actions";

type Labels = { email: string; password: string; submit: string };

/** Login form. The action translates errors server-side, so this stays dumb. */
export function LoginForm({ labels }: { labels: Labels }) {
  const [state, action, pending] = useActionState(login, {});

  return (
    <form action={action} className="mt-8 space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-zinc-700">{labels.email}</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-teal-600 focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-zinc-700">{labels.password}</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={6}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-teal-600 focus:outline-none"
        />
      </label>

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
        {pending ? "…" : labels.submit}
      </button>
    </form>
  );
}