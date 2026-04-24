import type { PriceBreakdown, QuoteInput, RateTables } from './types';
import { calculateLocal } from './local';
import { calculateLongDistance } from './longDistance';
import { calculateOutOfState } from './outOfState';

export * from './types';
export { jobsBookedToTier, TIER_LABELS } from './tier';
export { crewSizeFromCuft, resolveCrew } from './crew';
export { calculateLocal } from './local';
export { calculateLongDistance } from './longDistance';
export { calculateOutOfState } from './outOfState';

/**
 * Entry point — picks the right calculator based on `move_type`.
 *
 * Order of operations inside each calculator (per docs):
 *   base → travel → addons → sum → (×2 if HRA) → discount → final.
 * Long-term storage is returned separately and NEVER added to final_total.
 */
export function calculateQuote(input: QuoteInput, rates: RateTables): PriceBreakdown {
  switch (input.move_type) {
    case 'local':
      return calculateLocal(input, rates);
    case 'long_distance':
      return calculateLongDistance(input, rates);
    case 'out_of_state':
      return calculateOutOfState(input, rates);
  }
}
