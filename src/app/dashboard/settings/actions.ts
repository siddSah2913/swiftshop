"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { requireStore } from "@/lib/require-store";
import { getLocale, t, type TranslationKey } from "@/lib/i18n";
import { log } from "@/lib/log";
import { settingsSchema } from "./schema";

export type SettingsActionState = { ok?: boolean; error?: string };

export async function updateSettings(
  _prev: SettingsActionState,
  fd: FormData,
): Promise<SettingsActionState> {
  const locale = getLocale((await cookies()).get("swiftshop_lang")?.value ?? null);

  const raw = {
    paymentCod: fd.get("paymentCod") === "on",
    paymentEsewa: fd.get("paymentEsewa") === "on",
    paymentKhalti: fd.get("paymentKhalti") === "on",
    requirePayToDeliver: fd.get("requirePayToDeliver") === "on",
  };

  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: t(locale, "common.error") };
  }

  const { store } = await requireStore();

  try {
    await prisma.store.update({
      where: { id: store.id },
      data: {
        paymentCod: parsed.data.paymentCod,
        paymentEsewa: parsed.data.paymentEsewa,
        paymentKhalti: parsed.data.paymentKhalti,
        requirePayToDeliver: parsed.data.requirePayToDeliver,
      },
    });
  } catch (e) {
    log("settings:update", e);
    return { error: t(locale, "common.error") };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/more");
  return { ok: true };
}
