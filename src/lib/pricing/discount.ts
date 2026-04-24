import type { LineItem } from './types';

export interface DiscountResult {
  /** The discount line item (negative amount), or null if no discount. */
  line: LineItem | null;
  /** Absolute dollar amount of the discount (positive). */
  amount: number;
  /** Effective percent applied. */
  pct: number;
  /** True when the requested pct exceeds the cap (still applied, but flagged). */
  flagged: boolean;
  flagReason?: string;
}

/**
 * Applies a discount percent with cap enforcement. Over-cap discounts
 * are still applied (we don't auto-block) but `flagged: true` tells the
 * UI to require an owner-override note.
 */
export function applyDiscount(subtotal: number, pct: number | undefined, cap: number): DiscountResult {
  const effective = pct ?? 0;
  if (effective <= 0) return { line: null, amount: 0, pct: 0, flagged: false };

  const amount = subtotal * (effective / 100);
  const flagged = effective > cap;
  const line: LineItem = {
    label: `Discount — ${effective.toFixed(1)}%`,
    amount: -amount,
    category: 'discount',
    detail: flagged ? `Exceeds ${cap}% cap — owner review required` : undefined,
  };
  return {
    line,
    amount,
    pct: effective,
    flagged,
    flagReason: flagged ? `Discount ${effective.toFixed(1)}% > ${cap}% cap` : undefined,
  };
}
