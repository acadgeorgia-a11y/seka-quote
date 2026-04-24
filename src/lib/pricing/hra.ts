import type { LineItem } from './types';

/**
 * HRA doubles the subtotal BEFORE discount. Returns the extra amount to
 * add as a line item.
 *
 * Order (from docs): base → travel → addons → sum → (×2 if HRA) → discount → final.
 */
export function applyHra(subtotal: number): { extra: number; line: LineItem | null } {
  const extra = subtotal;
  const line: LineItem = {
    label: 'HRA move (×2)',
    amount: extra,
    category: 'hra',
    detail: 'Subtotal doubled per HRA rules',
  };
  return { extra, line };
}
