// Order math — pure, unit-tested. Money is integer NPR only (no paisa/float).
// totalNpr = Σ priceNpr × qty, computed from DB-read rows at order time so the
// cookie can never steer pricing.

/** One order line: DB-snapshot price × qty. */
export interface OrderLine {
  priceNpr: number;
  qty: number;
}

/**
 * Integer sum of `priceNpr × qty` across lines.
 * - Requires every line to have a non-negative integer price and a qty in
 *   1..9; anything else throws so a corrupted cart never silently under-prices.
 * - Empty lines → 0.
 */
export function computeTotal(lines: OrderLine[]): number {
  let total = 0;

  for (const line of lines) {
    if (
      !Number.isInteger(line.priceNpr) ||
      line.priceNpr < 0 ||
      !Number.isInteger(line.qty) ||
      line.qty < 1 ||
      line.qty > 9
    ) {
      throw new Error("computeTotal: invalid order line");
    }
    total += line.priceNpr * line.qty;
  }

  return total;
}