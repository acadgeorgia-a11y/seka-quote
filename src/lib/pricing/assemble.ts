import type { LineItem, MoveType, PriceBreakdown, QuoteInput, RateTables, Tier } from './types';
import {
  calculateCrating,
  calculateHeavyItems,
  calculatePacking,
  calculateStairs,
  calculateStorage,
  calculateUnpacking,
} from './addons';
import { applyHra } from './hra';
import { applyDiscount } from './discount';

export interface AddonBundle {
  lines: LineItem[];
  amount: number;
  flags: string[];
  monthly_storage: { cuft: number; amount: number } | null;
}

/** Build every add-on line and sum them into a single bundle. */
export function buildAddons(input: QuoteInput, rates: RateTables): AddonBundle {
  const lines: LineItem[] = [];
  const flags: string[] = [];
  let amount = 0;

  const pack = calculatePacking(input.boxes, rates, input.customer_provides_boxes);
  lines.push(...pack.items);
  amount += pack.packingAmount + pack.boxSaleAmount;

  const unp = calculateUnpacking(input.unpacking_qty, input.unpacking_discounted, rates);
  if (unp) {
    lines.push(unp);
    amount += unp.amount;
  }

  const stairs = calculateStairs(input.stairs_flights, input.total_cuft, rates);
  if (stairs) {
    lines.push(stairs);
    amount += stairs.amount;
  }

  const heavy = calculateHeavyItems(input.heavy_items, rates);
  lines.push(...heavy.items);
  amount += heavy.amount;
  flags.push(...heavy.flags);

  const crating = calculateCrating(input.crating, rates);
  lines.push(...crating.items);
  amount += crating.amount;
  flags.push(...crating.flags);

  const storage = calculateStorage(input.storage, input.total_cuft, rates);
  if (storage.overnight) {
    lines.push(storage.overnight);
    amount += storage.overnight.amount;
  }

  return { lines, amount, flags, monthly_storage: storage.monthly_storage };
}

export interface FinalizeInput {
  move_type: MoveType;
  baseLines: LineItem[];
  baseAmount: number;
  travelLines: LineItem[];
  travelAmount: number;
  addons: AddonBundle;
  input: QuoteInput;
  rates: RateTables;
  crew: 2 | 3 | 4;
  tier: Tier;
  discountCap: number;
  deliveryWindow?: string;
}

/**
 * Finalize a price breakdown following the canonical order:
 *   base → travel → addons → sum → HRA(×2) → discount → final.
 *
 * Long-term storage is excluded from `final_total` and returned as a
 * separate `monthly_storage` field.
 */
export function finalize(args: FinalizeInput): PriceBreakdown {
  const {
    move_type,
    baseLines,
    baseAmount,
    travelLines,
    travelAmount,
    addons,
    input,
    rates,
    crew,
    tier,
    discountCap,
    deliveryWindow,
  } = args;

  const lines: LineItem[] = [...baseLines, ...travelLines, ...addons.lines];
  let subtotal = baseAmount + travelAmount + addons.amount;
  const hraApplied = input.is_hra === true;

  if (hraApplied) {
    const { extra, line } = applyHra(subtotal);
    if (line) lines.push(line);
    subtotal += extra;
  }

  const disc = applyDiscount(subtotal, input.discount_pct, discountCap);
  if (disc.line) lines.push(disc.line);
  const final_total = subtotal - disc.amount;

  const flags = [...addons.flags];
  if (disc.flagged && disc.flagReason) flags.push(disc.flagReason);

  // Use rates to silence unused warning and allow future overrides.
  void rates;

  return {
    move_type,
    lines,
    subtotal,
    hra_applied: hraApplied,
    discount_pct: disc.pct,
    discount_amount: disc.amount,
    final_total,
    monthly_storage: addons.monthly_storage ?? undefined,
    delivery_window: deliveryWindow,
    flags,
    crew_size: crew,
    tier,
  };
}
