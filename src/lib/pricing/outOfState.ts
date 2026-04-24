import type { LineItem, PriceBreakdown, QuoteInput, RateTables } from './types';
import { PricingError } from './types';
import { resolveCrew } from './crew';
import { buildAddons, finalize } from './assemble';

/**
 * Type 2: out-of-state → out-of-state (3rd-party carrier).
 * Formula: base = cuft × 7.50 × 1.10  (values come from rates_out_of_state).
 * Add-ons same as local. Max discount 5%.
 */
export function calculateOutOfState(input: QuoteInput, rates: RateTables): PriceBreakdown {
  const minCuft = rates.misc.min_cuft ?? 300;
  if (input.total_cuft < minCuft) {
    throw new PricingError('below_min', `Minimum ${minCuft} CuFT for out-of-state moves.`);
  }

  const perCuft = Number(rates.outOfState.rate_per_cuft);
  const markupPct = Number(rates.outOfState.markup_pct);
  const markup = 1 + markupPct / 100;
  const baseAmount = input.total_cuft * perCuft * markup;
  const base: LineItem = {
    label: `Out-of-state base — ${input.total_cuft} CuFT`,
    amount: baseAmount,
    category: 'base',
    detail: `${input.total_cuft} × $${perCuft.toFixed(2)} × ${markup.toFixed(2)}`,
  };

  const crew = resolveCrew(input.total_cuft, input.crew_override);
  const addons = buildAddons(input, rates);
  const cap = Number(rates.outOfState.max_discount_pct);

  return finalize({
    move_type: 'out_of_state',
    baseLines: [base],
    baseAmount,
    travelLines: [],
    travelAmount: 0,
    addons,
    input,
    rates,
    crew,
    tier: input.tier,
    discountCap: cap,
  });
}
