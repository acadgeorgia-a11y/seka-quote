import type { LineItem, PriceBreakdown, QuoteInput, RateTables } from './types';
import { PricingError } from './types'; // still used for state_required / state_rate_missing
import { resolveCrew } from './crew';
import { buildAddons, finalize } from './assemble';

/**
 * Type 1: NY/NJ → other state.
 * Formula: base = cuft × rate_per_cuft[state] × 1.10
 * Travel, tolls, truck are INCLUDED in the rate — not added separately.
 * Add-ons (packing, stairs, heavy, crate, storage) are charged.
 */
export function calculateLongDistance(input: QuoteInput, rates: RateTables): PriceBreakdown {
  const minCuft = rates.misc.min_cuft ?? 300;
  const billedCuft = Math.max(input.total_cuft, minCuft);

  if (!input.destination_state) {
    throw new PricingError('state_required', 'Destination state is required for long-distance moves.');
  }

  const rateRow = rates.longDistance.find(
    (r) => r.state_code.toUpperCase() === input.destination_state!.toUpperCase(),
  );
  if (!rateRow) {
    throw new PricingError('state_rate_missing', `No long-distance rate for ${input.destination_state}`);
  }

  const perCuft = Number(rateRow.rate_per_cuft);
  const markup = 1.1; // built-in 10%
  const baseAmount = billedCuft * perCuft * markup;
  const base: LineItem = {
    label: `Long-distance base — ${billedCuft} CuFT → ${rateRow.state_code}${billedCuft > input.total_cuft ? ' (min)' : ''}`,
    amount: baseAmount,
    category: 'base',
    detail: `${billedCuft} × $${perCuft.toFixed(2)} × 1.10 (incl. travel/tolls/truck)`,
  };

  const crew = resolveCrew(input.total_cuft, input.crew_override);
  const cap = Number(rateRow.max_discount_pct);
  const addons = buildAddons(input, rates);

  return finalize({
    move_type: 'long_distance',
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
    deliveryWindow: rateRow.delivery_window,
  });
}
