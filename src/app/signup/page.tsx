import Link from "next/link";
import { cookies } from "next/headers";
import { getLocale, t } from "@/lib/i18n";
import { SignupForm } from "@/components/signup-form";

export default async function SignupPage() {
  const locale = getLocale((await cookies()).get("swiftshop_lang")?.value ?? null);

  return (
    <main className="flex flex-1 items-start justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">{t(locale, "auth.signupTitle")}</h1>

        <SignupForm
          labels={{
            name: t(locale, "auth.name"),
            email: t(locale, "auth.email"),
            password: t(locale, "auth.password"),
            submit: t(locale, "auth.createAccount"),
          }}
        />

        <p className="mt-6 text-sm text-zinc-600">
          {t(locale, "auth.haveAccount")}{" "}
          <Link href="/login" className="font-medium text-teal-700 hover:underline">
            {t(locale, "auth.login")}
          </Link>
        </p>
      </div>
    </main>
  );
}