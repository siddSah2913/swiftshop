"use server";

import { cookies } from "next/headers";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { log } from "@/lib/log";
import { getLocale, t } from "@/lib/i18n";

export type LoginState = { error?: string };

/** NextAuth v5 login form action. On success NextAuth issues its own redirect. */
export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const locale = getLocale((await cookies()).get("swiftshop_lang")?.value ?? null);

  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/dashboard",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      // Wrong email/password — show a friendly, translated message.
      return { error: t(locale, "auth.invalidCredentials") };
    }
    // Anything else (including NextAuth's own success redirect) flows through.
    log("auth:login", error);
    throw error;
  }
}