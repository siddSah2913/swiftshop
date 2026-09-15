import { cookies } from "next/headers";
import { requireStore } from "@/lib/require-store";
import { getLocale, t } from "@/lib/i18n";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const { store } = await requireStore();
  const locale = getLocale((await cookies()).get("swiftshop_lang")?.value ?? null);

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900">
        {t(locale, "settings.title")}
      </h1>

      <SettingsForm
        currentValues={{
          paymentCod: store.paymentCod,
          paymentEsewa: store.paymentEsewa,
          paymentKhalti: store.paymentKhalti,
          requirePayToDeliver: store.requirePayToDeliver,
          hasQrImage: !!store.qrImageUrl,
        }}
        labels={{
          paymentMethods: t(locale, "settings.paymentMethods"),
          enableCod: t(locale, "settings.enableCod"),
          enableEsewa: t(locale, "settings.enableEsewa"),
          enableKhalti: t(locale, "settings.enableKhalti"),
          enableQr: t(locale, "settings.enableQr"),
          requirePayToDeliver: t(locale, "settings.requirePayToDeliver"),
          requirePayToDeliverHint: t(locale, "settings.requirePayToDeliverHint"),
          qrHint: t(locale, "settings.qrHint"),
          save: t(locale, "settings.save"),
          saved: t(locale, "settings.saved"),
        }}
      />
    </div>
  );
}
