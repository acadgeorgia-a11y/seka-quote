import { describe, expect, it } from 'vitest';
import { calculateQuote } from '..';
import type { QuoteInput } from '../types';
import { testRates } from './fixtures';
import { calculateStairs, calculateStorage } from '../addons';

describe('stairs — origin + destination combined', () => {
  it('3 total flights × 600 CuFT = $270', () => {
    const line = calculateStairs(3, 600, testRates);
    expect(line?.amount).toBeCloseTo(270, 2);
  });

  it('returns null when no flights', () => {
    expect(calculateStairs(0, 600, testRates)).toBeNull();
    expect(calculateStairs(undefined, 600, testRates)).toBeNull();
  });
});

describe('storage peak detection', () => {
  it('detects end-of-month → first-of-next-month as peak', () => {
    const out = calculateStorage(
      { overnight: true, overnight_start: '2026-04-30', overnight_end: '2026-05-01' },
      400,
      testRates,
    );
    expect(out.overnight?.amount).toBe(500);
  });

  it('mid-month overnight is off-peak $250', () => {
    const out = calculateStorage(
      { overnight: true, overnight_start: '2026-04-15', overnight_end: '2026-04-16' },
      400,
      testRates,
    );
    expect(out.overnight?.amount).toBe(250);
  });

  it('long-term storage minimum-floors to 300 CuFT', () => {
    const out = calculateStorage(
      { overnight: false, long_term_months: 1 },
      150,
      testRates,
    );
    expect(out.monthly_storage?.cuft).toBe(300);
    expect(out.monthly_storage?.amount).toBeCloseTo(180, 2);
  });

  it('long-term uses actual CuFT when above minimum', () => {
    const out = calculateStorage(
      { overnight: false, long_term_months: 1 },
      800,
      testRates,
    );
    expect(out.monthly_storage?.amount).toBeCloseTo(480, 2);
  });
});

describe('HRA doubles before discount', () => {
  it('HRA ×2 then 5% discount applied on doubled amount', () => {
    // Out-of-state 300 CuFT × 7.50 × 1.10 = 2,475
    // HRA doubles → 4,950; 5% discount on 4,950 = 247.50; final = 4,702.50
    const input: QuoteInput = {
      move_type: 'out_of_state',
      tier: 't1',
      jobs_on_calendar: 0,
      total_cuft: 300,
      round_trip_miles: 0,
      tolls: 0,
      is_hra: true,
      discount_pct: 5,
    };
    const out = calculateQuote(input, testRates);
    expect(out.hra_applied).toBe(true);
    expect(out.subtotal).toBeCloseTo(4950, 2);
    expect(out.final_total).toBeCloseTo(4702.5, 2);
  });
});

describe('discount cap enforcement', () => {
  it('6% discount on local flags over 5% cap', () => {
    const input: QuoteInput = {
      move_type: 'local',
      pricing_method: 'cuft',
      tier: 't1',
      jobs_on_calendar: 0,
      total_cuft: 600,
      time_slot: 'morning',
      round_trip_miles: 10,
      tolls: 0,
      discount_pct: 6,
    };
    const out = calculateQuote(input, testRates);
    expect(out.flags.some((f) => f.includes('6.0%') && f.includes('5%'))).toBe(true);
  });

  it('5% on local — no flag', () => {
    const input: QuoteInput = {
      move_type: 'local',
      pricing_method: 'cuft',
      tier: 't1',
      jobs_on_calendar: 0,
      total_cuft: 600,
      time_slot: 'morning',
      round_trip_miles: 10,
      tolls: 0,
      discount_pct: 5,
    };
    const out = calculateQuote(input, testRates);
    expect(out.flags.length).toBe(0);
  });
});

describe('long-term storage is NEVER in final_total', () => {
  it('returns monthly_storage as a separate field', () => {
    const input: QuoteInput = {
      move_type: 'out_of_state',
      tier: 't1',
      jobs_on_calendar: 0,
      total_cuft: 1000,
      round_trip_miles: 0,
      tolls: 0,
      storage: { overnight: false, long_term_months: 3 },
    };
    const out = calculateQuote(input, testRates);
    expect(out.final_total).toBeCloseTo(8250, 2); // same as without storage
    expect(out.monthly_storage?.amount).toBeCloseTo(600, 2);
  });
});
