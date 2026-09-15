// Orders CSV export (Phase 6). Same tenant boundary as requireStore, but a
// route handler — so replicate it manually: auth() → the session owner's own
// store. The session cookie authenticates the request, so the analytics header
// button is a plain <Link>; no token in the URL.

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toCsv, withBom } from "@/lib/analytics/csv";
import { isAnalyticsRange, rangeWhere } from "@/lib/analytics/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const store = await prisma.store.findUnique({
    where: { ownerId: session.user.id },
    select: { id: true, slug: true },
  });
  if (!store) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const raw = url.searchParams.get("range") ?? "30d";
  const range = isAnalyticsRange(raw) ? raw : "30d";

  const orders = await prisma.order.findMany({
    where: { storeId: store.id, ...rangeWhere(range) },
    orderBy: { createdAt: "asc" },
    include: {
      customer: { select: { name: true, phone: true } },
      items: true,
    },
  });

  const rows: (string | number)[][] = [
    [
      "orderNo",
      "createdAt",
      "status",
      "paymentType",
      "paymentStatus",
      "totalNpr",
      "customerName",
      "customerPhone",
      "itemsSummary",
    ],
    ...orders.map((o) => [
      o.orderNo,
      o.createdAt.toISOString(),
      o.status,
      o.paymentType,
      o.paymentStatus,
      o.totalNpr,
      o.customer.name,
      o.customer.phone,
      o.items.map((i) => `${i.name} ×${i.qty}`).join("; "),
    ]),
  ];

  const csv = withBom(toCsv(rows));
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${store.slug}-${date}.csv"`,
    },
  });
}