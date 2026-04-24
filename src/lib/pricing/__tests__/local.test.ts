import { describe, expect, it } from 'vitest';
import { calculateQuote, jobsBookedToTier, PricingError } from '..';
import type { QuoteInput } from '../types';
import { testRates } from './fixtures';

describe('local — CuFT flat, dual morning/afternoon', () => {
  it('matches doc example: 450 CuFT, t2, 40 mi / $24 tolls', () => {
    // From /docs/pricing-logic-local.md:
    //   base_morning = 450 × 1.35 = 607.50
    //   option_A = 40 × 3 = 120
    //   option_B = 1 × $149 (2-men t2) = 149  (doc uses 2-men rate here)
    //   NOTE: our implementation uses 3-men rate for travel basis on CuFT-flat
    //     (per docs line "use the 3-men hourly rate"), so option_B = $169.
    //   travel = max(120, 169) + 24 = 193
    //   total_morning = 607.50 + 193 = 800.50
    const input: QuoteInput = {
      move_type: 'local',
      pricing_method: 'cuft',
      tier: jobsBookedToTier(2),
      jobs_on_calendar: 2,
      total_cuft: 450,
      time_slot: 'morning',
      round_trip_miles: 40,
      tolls: 24,
    };
    const out = calculateQuote(input, testRates);
    expect(out.crew_size).toBe(2);
    expect(out.tier).toBe('t2');
    expect(out.final_total).toBeCloseTo(800.5, 2);

    // 450 CuFT is in the 401–500 band — morning only, no dual.
    expect(out.morning_total).toBeUndefined();
    expect(out.afternoon_total).toBeUndefined();
  });

  it('≤ 400 CuFT returns BOTH morning and afternoon totals', () => {
    // 300 CuFT, t2, 40mi, $0 tolls
    // morning: 300 × 1.35 = 405
    //   travel: max(40×3=120, 3-men t2 $169) + 0 = 169; total = 574
    // afternoon: 300 × 1.00 = 300; travel same = 169; total = 469
    const input: QuoteInput = {
      move_type: 'local',
      pricing_method: 'cuft',
      tier: 't2',
      jobs_on_calendar: 2,
      total_cuft: 300,
      time_slot: 'morning',
      round_trip_miles: 40,
      tolls: 0,
    };
    const out = calculateQuote(input, testRates);
    expect(out.morning_total).toBeCloseTo(574, 2);
    expect(out.afternoon_total).toBeCloseTo(469, 2);
  });

  it('does NOT return afternoon for CuFT > 500', () => {
    const input: QuoteInput = {
      move_type: 'local',
      pricing_method: 'cuft',
      tier: 't1',
      jobs_on_calendar: 1,
      total_cuft: 800,
      time_slot: 'morning',
      round_trip_miles: 30,
      tolls: 0,
    };
    const out = calculateQuote(input, testRates);
    expect(out.afternoon_total).toBeUndefined();
    expect(out.crew_size).toBe(3);
  });

  it('rejects below min CuFT', () => {
    const input: QuoteInput = {
      move_type: 'local',
      pricing_method: 'cuft',
      tier: 't1',
      jobs_on_calendar: 0,
      total_cuft: 250,
      round_trip_miles: 10,
      tolls: 0,
    };
    expect(() => calculateQuote(input, testRates)).toThrow(PricingError);
  });
});

describe('local — hourly', () => {
  it('clamps hours to 3-hour minimum', () => {
    // 2 hrs requested → clamps to 3.
    // 2-men t1 = $139/hr → labor = 3 × 139 = 417
    // Travel: 10 × 3 = 30 vs $139 → 139 + 0 tolls = 139
    // total = 417 + 139 = 556
    const input: QuoteInput = {
      move_type: 'local',
      pricing_method: 'hourly',
      tier: 't1',
      jobs_on_calendar: 0,
      total_cuft: 400,
      hours: 2,
      round_trip_miles: 10,
      tolls: 0,
    };
    const out = calculateQuote(input, testRates);
    expect(out.final_total).toBeCloseTo(556, 2);
  });

  it('3-men t5 + 4th man: rate = 220 + 40 = 260/hr; 4 hrs', () => {
    // Labor: 4 × 260 = 1040
    // Travel: 20 × 3 = 60 vs $260 → 260 + 0 = 260
    // total = 1040 + 260 = 1300
    const input: QuoteInput = {
      move_type: 'local',
      pricing_method: 'hourly',
      tier: 't5',
      jobs_on_calendar: 10,
      total_cuft: 900,
      hours: 4,
      fourth_man: true,
      round_trip_miles: 20,
      tolls: 0,
    };
    const out = calculateQuote(input, testRates);
    expect(out.crew_size).toBe(3);
    expect(out.final_total).toBeCloseTo(1300, 2);
  });
});

describe('tier mapping', () => {
  it('maps jobs-booked counts per doc', () => {
    expect(jobsBookedToTier(0)).toBe('t1');
    expect(jobsBookedToTier(1)).toBe('t1');
    expect(jobsBookedToTier(2)).toBe('t2');
    expect(jobsBookedToTier(3)).toBe('t2'); // overlap: doc says take lower bound
    expect(jobsBookedToTier(4)).toBe('t3');
    expect(jobsBookedToTier(5)).toBe('t3');
    expect(jobsBookedToTier(6)).toBe('t4');
    expect(jobsBookedToTier(7)).toBe('t4');
    expect(jobsBookedToTier(8)).toBe('t5');
  });
});
