import type { LineItem, RateTables, Tier } from './types';

/**
 * Look up the hourly rate used as the "1-hour-on-clock" basis for the
 * travel formula. For CuFT-flat jobs, the doc says use 3-men hourly at
 * current tier. For hourly jobs, use the actual selected crew's rate.
 */
export function travelBasisRate(rates: RateTables, crew: 2 | 3, tier: Tier, fourthMan: boolean): number {
  const row = rates.localHourly.find((r) => r.crew_size === crew && r.tier === tier);
  const base = row?.rate ?? 0;
  return fourthMan ? base + rates.fourthManRate : base;
}

/**
 * Flat-rate travel: straight mileage formula + tolls.
 * Used for CuFT-flat local quotes — no hourly comparison.
 */
export function calculateTravelFlat({
  roundTripMiles,
  tolls,
}: {
  roundTripMiles: number;
  tolls: number;
}): { amount: number; items: LineItem[] } {
  const labor = roundTripMiles * 3;
  const amount = labor + tolls;
  const items: LineItem[] = [
    {
      label: 'Travel',
      amount: labor,
      category: 'travel',
      detail: `${roundTripMiles.toFixed(1)} mi × $3`,
    },
  ];
  if (tolls > 0) {
    items.push({ label: 'Tolls', amount: tolls, category: 'travel' });
  }
  return { amount, items };
}

/**
 * Hourly travel: MAX(1 hr × crew rate, miles × $3) + tolls.
 * Protects margin when the job is far — whichever is higher wins.
 */
export function calculateTravel({
  roundTripMiles,
  tolls,
  crewRate,
}: {
  roundTripMiles: number;
  tolls: number;
  crewRate: number;
}): { amount: number; items: LineItem[] } {
  const optionA = roundTripMiles * 3;
  const optionB = crewRate; // 1 hr
  const labor = Math.max(optionA, optionB);
  const amount = labor + tolls;

  const items: LineItem[] = [
    {
      label: 'Travel',
      amount: labor,
      category: 'travel',
      detail:
        optionA >= optionB
          ? `${roundTripMiles.toFixed(1)} mi × $3`
          : `1 hr at $${crewRate.toFixed(0)}/hr`,
    },
  ];
  if (tolls > 0) {
    items.push({ label: 'Tolls', amount: tolls, category: 'travel' });
  }
  return { amount, items };
}
