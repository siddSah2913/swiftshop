"use server";

import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { log } from "@/lib/log";
import { getLocale, t } from "@/lib/i18n";

const signupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6),
});

export type SignupState = { error?: string };

/** Create a user (hashed password), then log them straight in (redirect to /dashboard). */
export async function signup(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const locale = getLocale((await cookies()).get("swiftshop_lang")?.value ?? null);

  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const tooShort = parsed.error.issues.some((i) => i.path[0] === "password" && i.code === "too_small");
    return { error: t(locale, tooShort ? "auth.passwordTooShort" : "common.error") };
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (existing) return { error: t(locale, "auth.emailTaken") };

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
      },
    });
  } catch (error) {
    log("auth:signup", error);
    return { error: t(locale, "common.error") };
  }

  // Outside the try so NextAuth's success redirect isn't swallowed by our catch.
  await signIn("credentials", {
    email: parsed.data.email,
    password: parsed.data.password,
    redirectTo: "/dashboard",
  });
  return {};
}