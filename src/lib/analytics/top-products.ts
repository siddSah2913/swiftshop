// Folds OrderItem snapshots into a ranked list by revenue. Prisma groupBy can't
// multiply priceNpr × qty, so the analytics page fetches light rows and this
// pure helper does the folding. Sort is revenue desc, qty desc as a tiebreak.

export type ProductSalesRow = { name: string; priceNpr: number; qty: number };
export type ProductSales = { name: string; qtySold: number; revenueNpr: number };

export function aggregateTopProducts(
  rows: ProductSalesRow[],
  limit = 10,
): ProductSales[] {
  const map = new Map<string, ProductSales>();
  for (const row of rows) {
    const acc = map.get(row.name) ?? {
      name: row.name,
      qtySold: 0,
      revenueNpr: 0,
    };
    acc.qtySold += row.qty;
    acc.revenueNpr += row.priceNpr * row.qty;
    map.set(row.name, acc);
  }
  return [...map.values()]
    .sort((a, b) => b.revenueNpr - a.revenueNpr || b.qtySold - a.qtySold)
    .slice(0, limit);
}