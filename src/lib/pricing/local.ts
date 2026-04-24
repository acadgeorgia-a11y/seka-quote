import type { LineItem, PriceBreakdown, QuoteInput, RateTables, Tier } from './types';
import { PricingError } from './types';
import { resolveCrew } from './crew';
import { calculateTravel, calculateTravelFlat } from './travel';
import { buildAddons, finalize } from './assemble';

const MORNING_MAX_ONLY = 500; // CuFT > 500 → morning only

/**
 * Build the BASE + TRAVEL lines for the CuFT-flat method, for a given
 * time slot. Used twice when dual-display is required.
 */
function cuftBase(
  input: QuoteInput,
  rates: RateTables,
  slot: 'morning' | 'afternoon',
  _crew: 2 | 3 | 4,
  tier: Tier,
): { base: LineItem; travelItems: LineItem[]; travelAmount: number } {
  const cuftRate = rates.localCuft.find((r) => r.tier === tier);
  if (!cuftRate) throw new PricingError('rates_missing', `No CuFT rate for tier ${tier}`);
  const perCuft = slot === 'morning' ? Number(cuftRate.morning) : Number(cuftRate.afternoon);
  const amount = input.total_cuft * perCuft;
  const base: LineItem = {
    label: `${slot === 'morning' ? 'Morning' : 'Afternoon'} base — ${input.total_cuft} CuFT`,
    amount,
    category: 'base',
    detail: `${input.total_cuft} × $${perCuft.toFixed(2)}/CuFT`,
  };

  // Flat-rate travel: straight mileage formula + tolls, no hourly comparison.
  const travel = calculateTravelFlat({
    roundTripMiles: input.round_trip_miles,
    tolls: input.tolls,
  });
  return { base, travelItems: travel.items, travelAmount: travel.amount };
}

function hourlyBase(
  input: QuoteInput,
  rates: RateTables,
  crew: 2 | 3 | 4,
  tier: Tier,
): { base: LineItem; travelItems: LineItem[]; travelAmount: number } {
  if (input.hours == null) throw new PricingError('hours_required', 'Hours are required for hourly method.');
  const hours = Math.max(3, Math.round(input.hours * 2) / 2);
  const crewForRate: 2 | 3 = crew === 2 ? 2 : 3;
  const hourlyRow = rates.localHourly.find((r) => r.crew_size === crewForRate && r.tier === tier);
  if (!hourlyRow) throw new PricingError('rates_missing', `No hourly rate for crew ${crew}/${tier}`);
  const baseRate = Number(hourlyRow.rate) + (input.fourth_man ? rates.fourthManRate : 0);
  const amount = baseRate * hours;
  const base: LineItem = {
    label: `Hourly labor — ${hours} hrs × ${crew} men`,
    amount,
    category: 'base',
    detail: `${hours} × $${baseRate.toFixed(0)}/hr${input.fourth_man ? ' (incl. 4th man)' : ''}`,
  };
  const travel = calculateTravel({
    roundTripMiles: input.round_trip_miles,
    tolls: input.tolls,
    crewRate: baseRate,
  });
  return { base, travelItems: travel.items, travelAmount: travel.amount };
}

export function calculateLocal(input: QuoteInput, rates: RateTables): PriceBreakdown {
  const minCuft = rates.misc.min_cuft ?? 300;
  if (input.total_cuft < minCuft) {
    throw new PricingError('below_min', `Minimum ${minCuft} CuFT for local moves.`);
  }

  const crew = resolveCrew(input.total_cuft, input.crew_override);
  const tier = input.tier;
  const method = input.pricing_method ?? 'cuft';

  if (method === 'hourly') {
    const { base, travelItems, travelAmount } = hourlyBase(input, rates, crew, tier);
    const addons = buildAddons(input, rates);
    return finalize({
      move_type: 'local',
      baseLines: [base],
      baseAmount: base.amount,
      travelLines: travelItems,
      travelAmount,
      addons,
      input,
      rates,
      crew,
      tier,
      discountCap: 5,
    });
  }

  // CuFT-flat
  const morning = cuftBase(input, rates, 'morning', crew, tier);
  const addons = buildAddons(input, rates);

  // Default single-slot price uses whichever time_slot the agent picked.
  const slot: 'morning' | 'afternoon' = input.time_slot ?? 'morning';
  const chosen = slot === 'afternoon' ? cuftBase(input, rates, 'afternoon', crew, tier) : morning;

  const breakdown = finalize({
    move_type: 'local',
    baseLines: [chosen.base],
    baseAmount: chosen.base.amount,
    travelLines: chosen.travelItems,
    travelAmount: chosen.travelAmount,
    addons,
    input,
    rates,
    crew,
    tier,
    discountCap: 5,
  });

  // Dual pricing when ≤ 400 CuFT. Also store morning_total even for small jobs
  // that picked afternoon by default.
  const showAfternoon = input.total_cuft <= 400;
  if (input.total_cuft > MORNING_MAX_ONLY) {
    // morning-only — no afternoon total
    return breakdown;
  }

  if (showAfternoon) {
    const afternoon = cuftBase(input, rates, 'afternoon', crew, tier);
    const mBreak = finalize({
      move_type: 'local',
      baseLines: [morning.base],
      baseAmount: morning.base.amount,
      travelLines: morning.travelItems,
      travelAmount: morning.travelAmount,
      addons,
      input,
      rates,
      crew,
      tier,
      discountCap: 5,
    });
    const aBreak = finalize({
      move_type: 'local',
      baseLines: [afternoon.base],
      baseAmount: afternoon.base.amount,
      travelLines: afternoon.travelItems,
      travelAmount: afternoon.travelAmount,
      addons,
      input,
      rates,
      crew,
      tier,
      discountCap: 5,
    });
    breakdown.morning_total = mBreak.final_total;
    breakdown.afternoon_total = aBreak.final_total;
  }
  return breakdown;
}
