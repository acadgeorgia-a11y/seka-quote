import type {
  BoxSelection,
  CratingSelection,
  HeavyItemSelection,
  LineItem,
  RateTables,
  StorageSelection,
} from './types';

/** Two separate charges per box: packing labor + box sale. */
export function calculatePacking(
  boxes: BoxSelection[] | undefined,
  rates: RateTables,
  customerProvidesBoxes = false,
): { packingAmount: number; boxSaleAmount: number; items: LineItem[] } {
  const items: LineItem[] = [];
  let packingAmount = 0;
  let boxSaleAmount = 0;
  if (!boxes?.length) return { packingAmount, boxSaleAmount, items };

  for (const sel of boxes) {
    const rate = rates.boxes.find((b) => b.box_type === sel.box_type);
    if (!rate) continue;
    if (sel.packing_qty > 0) {
      const amount = sel.packing_qty * Number(rate.packing_cost);
      packingAmount += amount;
      items.push({
        label: `Packing — ${sel.box_type} ×${sel.packing_qty}`,
        amount,
        category: 'packing',
        detail: `${sel.packing_qty} × $${rate.packing_cost}`,
      });
    }
    if (!customerProvidesBoxes && sel.sale_qty > 0) {
      const amount = sel.sale_qty * Number(rate.sale_price);
      boxSaleAmount += amount;
      items.push({
        label: `Boxes — ${sel.box_type} ×${sel.sale_qty}`,
        amount,
        category: 'boxes',
        detail: `${sel.sale_qty} × $${rate.sale_price}`,
      });
    }
  }
  return { packingAmount, boxSaleAmount, items };
}

export function calculateUnpacking(
  qty: number | undefined,
  discounted: boolean | undefined,
  rates: RateTables,
): LineItem | null {
  if (!qty || qty <= 0) return null;
  const rate = discounted ? rates.discountedUnpackingRate : rates.defaultUnpackingRate;
  const amount = qty * rate;
  return {
    label: `Unpacking ×${qty}`,
    amount,
    category: 'unpacking',
    detail: `${qty} × $${rate}${discounted ? ' (discounted)' : ''}`,
  };
}

/** 0.15 × flights × CuFT — flights counts both origin + destination combined. */
export function calculateStairs(
  flights: number | undefined,
  totalCuft: number,
  rates: RateTables,
): LineItem | null {
  if (!flights || flights <= 0) return null;
  const multiplier = rates.misc.stairs_multiplier ?? 0.15;
  const amount = multiplier * flights * totalCuft;
  return {
    label: `Stairs — ${flights} flight${flights === 1 ? '' : 's'}`,
    amount,
    category: 'stairs',
    detail: `${multiplier} × ${flights} × ${totalCuft} CuFT`,
  };
}

export function calculateExtraStops(
  count: number | undefined,
  rates: RateTables,
): LineItem | null {
  if (!count || count <= 0) return null;
  const rate = rates.misc.extra_stop_rate ?? 125;
  const amount = count * rate;
  return {
    label: `Extra stop${count === 1 ? '' : 's'} ×${count}`,
    amount,
    category: 'extra_stop',
    detail: `${count} × $${rate}`,
  };
}

export function calculateHeavyItems(
  items: HeavyItemSelection[] | undefined,
  rates: RateTables,
): { amount: number; items: LineItem[]; flags: string[] } {
  const lines: LineItem[] = [];
  const flags: string[] = [];
  let amount = 0;
  if (!items?.length) return { amount, items: lines, flags };

  for (const sel of items) {
    if (sel.qty <= 0) continue;
    const rate = rates.heavyItems.find((h) => h.item_name === sel.item_name);
    if (!rate) continue;
    let charge: number | null = rate.charge;
    if (rate.is_custom) {
      if (sel.custom_amount == null) {
        flags.push(`Custom amount missing for ${rate.item_name}`);
        continue;
      }
      charge = sel.custom_amount;
    }
    if (charge == null) continue;
    const lineAmount = charge * sel.qty;
    amount += lineAmount;
    lines.push({
      label: `${rate.item_name}${sel.qty > 1 ? ` ×${sel.qty}` : ''}`,
      amount: lineAmount,
      category: 'heavy_item',
      detail: sel.note ?? undefined,
    });
  }
  return { amount, items: lines, flags };
}

export function calculateCrating(
  sel: CratingSelection | undefined,
  rates: RateTables,
): { amount: number; items: LineItem[]; flags: string[] } {
  const items: LineItem[] = [];
  const flags: string[] = [];
  let amount = 0;
  if (!sel) return { amount, items, flags };

  if (sel.soft_qty > 0) {
    const unit = rates.misc.soft_crate ?? 150;
    const lineAmount = sel.soft_qty * unit;
    amount += lineAmount;
    items.push({
      label: `Soft crate ×${sel.soft_qty}`,
      amount: lineAmount,
      category: 'crating',
      detail: `${sel.soft_qty} × $${unit}`,
    });
  }
  if (sel.wood_amount && sel.wood_amount > 0) {
    amount += sel.wood_amount;
    items.push({
      label: 'Wood crate (custom)',
      amount: sel.wood_amount,
      category: 'crating',
      detail: sel.wood_note ?? 'Pending owner approval',
    });
    flags.push('Wood crate added — pending owner approval');
  }
  return { amount, items, flags };
}

/**
 * Overnight peak rule: last day of month → 1st of next month.
 * Long-term storage is returned separately — never added to base total.
 */
export function calculateStorage(
  sel: StorageSelection | undefined,
  totalCuft: number,
  rates: RateTables,
): {
  overnight: LineItem | null;
  monthly_storage: { cuft: number; amount: number } | null;
} {
  let overnight: LineItem | null = null;
  let monthly_storage: { cuft: number; amount: number } | null = null;
  if (!sel) return { overnight, monthly_storage };

  if (sel.overnight) {
    const peak = detectPeakOvernight(sel.overnight_start, sel.overnight_end);
    const unit = peak
      ? rates.misc.overnight_peak ?? 500
      : rates.misc.overnight_offpeak ?? 250;
    overnight = {
      label: peak ? 'Overnight storage (peak)' : 'Overnight storage',
      amount: unit,
      category: 'storage',
      detail: peak ? 'End-of-month → next-month-1st' : undefined,
    };
  }

  if (sel.long_term_months && sel.long_term_months > 0) {
    const perCuft = rates.misc.storage_per_cuft ?? 0.6;
    const cuft = Math.max(totalCuft, rates.misc.min_cuft ?? 300);
    monthly_storage = { cuft, amount: perCuft * cuft };
  }
  return { overnight, monthly_storage };
}

function parseLocalDate(iso: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

function detectPeakOvernight(startIso?: string, endIso?: string): boolean {
  if (!startIso || !endIso) return false;
  const start = parseLocalDate(startIso);
  const end = parseLocalDate(endIso);
  if (!start || !end) return false;
  // Last day of start's month: day 0 of next month.
  const lastDayOfStartMonth = new Date(start.y, start.m, 0).getDate();
  const isStartLastDay = start.d === lastDayOfStartMonth;
  const isEndFirstDay = end.d === 1;
  const monthIncrements =
    end.y === start.y
      ? end.m === start.m + 1
      : end.y === start.y + 1 && start.m === 12 && end.m === 1;
  return isStartLastDay && isEndFirstDay && monthIncrements;
}
