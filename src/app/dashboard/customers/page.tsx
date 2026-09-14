import { cookies } from "next/headers";
import { requireStore } from "@/lib/require-store";
import { prisma } from "@/lib/db";
import { getLocale, t } from "@/lib/i18n";
import { buildWaUrl } from "@/lib/whatsapp";

// Customers list — every customer who has ordered from THIS store, newest
// first, each with their order count and a WhatsApp-me button. The message
// pre-fill is the store introducing itself; the owner can edit before sending.
export default async function CustomersPage() {
  const { store } = await requireStore();
  const locale = getLocale(
    (await cookies()).get("swiftshop_lang")?.value ?? null,
  );

  const customers = await prisma.customer.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      phone: true,
      address: true,
      _count: { select: { orders: true } },
    },
    take: 100,
  });

  const waMessage = t(locale, "customers.waMessage").replace(
    "{store}",
    store.name,
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900">
        {t(locale, "nav.customers")}
      </h1>

      {customers.length === 0 ? (
        <p className="mt-10 text-center text-sm text-zinc-500">
          {t(locale, "customers.empty")}
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {customers.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border border-zinc-200 bg-white p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-900">{c.name}</p>
                  <a
                    href={`tel:${c.phone}`}
                    className="mt-0.5 block text-sm text-teal-700 hover:underline"
                  >
                    {c.phone}
                  </a>
                  {c.address ? (
                    <p className="mt-0.5 truncate text-sm text-zinc-500">
                      {c.address}
                    </p>
                  ) : null}
                  <p className="mt-1 text-sm text-zinc-500">
                    {c._count.orders} {t(locale, "customers.orders")}
                  </p>
                </div>
                <a
                  href={buildWaUrl(c.phone, waMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-md bg-[#25D366] px-3 py-2 text-sm font-medium text-white hover:bg-[#1ebe5b]"
                >
                  {t(locale, "customers.whatsapp")}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}