import type { TollRoute, CrzRate } from './supabase/types';

export interface TollCalculationResult {
  baseToll: number;
  crzCharge: number;
  total: number;
  breakdown: string;
  notes: string;
}

function isCRZPeakTime(date: Date): boolean {
  const hour = date.getHours();
  const day = date.getDay();
  const isWeekend = day === 0 || day === 6;
  return isWeekend ? hour >= 9 && hour < 21 : hour >= 5 && hour < 21;
}

/**
 * Pure client-side toll calculation. Pass all routes and CRZ rates in
 * (pre-fetched once on mount) so we don't hit the DB on every keystroke.
 *
 * zones: ordered array [origin, ...extra stops, destination]
 * Consecutive zone pairs are summed. Same zone = $0.
 * CRZ charge is added once if ANY leg has crz_applies.
 */
export function calculateTollFromZones(
  zones: string[],
  moveDate: string | null,
  routes: TollRoute[],
  crzRates: CrzRate[],
): TollCalculationResult {
  if (zones.length < 2 || zones.some((z) => !z)) {
    return { baseToll: 0, crzCharge: 0, total: 0, breakdown: '', notes: '' };
  }

  let baseToll = 0;
  let crzApplies = false;
  const legBreakdowns: string[] = [];

  for (let i = 0; i < zones.length - 1; i++) {
    const from = zones[i];
    const to = zones[i + 1];
    if (from === to) continue;

    const route = routes.find(
      (r) =>
        (r.from_zone === from && r.to_zone === to) ||
        (r.from_zone === to && r.to_zone === from),
    );

    if (route) {
      baseToll += Number(route.round_trip_toll);
      if (route.crz_applies) crzApplies = true;
      if (Number(route.round_trip_toll) > 0) {
        legBreakdowns.push(`$${route.round_trip_toll}`);
      }
    } else {
      legBreakdowns.push(`${from}→${to}: unknown`);
    }
  }

  let crzCharge = 0;
  if (crzApplies) {
    // Default to peak if no date; most moves are during peak hours anyway
    let isPeak = true;
    if (moveDate) {
      const d = new Date(`${moveDate}T09:00:00`);
      isPeak = isCRZPeakTime(d);
    }
    const rate = crzRates.find((r) => r.rate_type === (isPeak ? 'peak' : 'off_peak'));
    crzCharge = rate ? Number(rate.amount) : 0;
  }

  const total = baseToll + crzCharge;
  const parts = legBreakdowns.length ? legBreakdowns.join(' + ') : '$0';
  const breakdown = crzCharge > 0
    ? `${parts} + CRZ $${crzCharge.toFixed(2)}`
    : parts;

  return {
    baseToll,
    crzCharge,
    total,
    breakdown,
    notes: crzApplies ? 'Congestion Relief Zone applies' : '',
  };
}
