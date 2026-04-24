import { describe, expect, it } from 'vitest';
import { calculateQuote } from '..';
import type { QuoteInput } from '../types';
import { testRates } from './fixtures';

describe('long-distance (NY/NJ origin → state)', () => {
  it('matches doc: 800 CuFT NY → FL = $5,280', () => {
    // base = 800 × 6.00 × 1.10 = 5,280
    const input: QuoteInput = {
      move_type: 'long_distance',
      tier: 't1',
      jobs_on_calendar: 0,
      total_cuft: 800,
      destination_state: 'FL',
      round_trip_miles: 0,
      tolls: 0,
    };
    const out = calculateQuote(input, testRates);
    expect(out.final_total).toBeCloseTo(5280, 2);
    expect(out.delivery_window).toBe('1–9 business days');
  });

  it('matches doc: 800 CuFT NY → CA + packing + stairs + piano = $7,135', () => {
    // base = 800 × 6.50 × 1.10 = 5,720
    // packing = 30×15 + 5×25 + 1×50 = 450 + 125 + 50 = 625
    // box sale = 30×5 + 5×20 + 1×50 = 150 + 100 + 50 = 300
    // stairs (2 flights at origin) = 0.15 × 2 × 800 = 240
    // upright piano = 250
    // total = 5,720 + 625 + 300 + 240 + 250 = 7,135
    const input: QuoteInput = {
      move_type: 'long_distance',
      tier: 't1',
      jobs_on_calendar: 0,
      total_cuft: 800,
      destination_state: 'CA',
      round_trip_miles: 0,
      tolls: 0,
      boxes: [
        { box_type: 'small', packing_qty: 30, sale_qty: 30 },
        { box_type: 'wardrobe', packing_qty: 5, sale_qty: 5 },
        { box_type: 'tv', packing_qty: 1, sale_qty: 1 },
      ],
      stairs_flights: 2,
      heavy_items: [{ item_name: 'Upright Piano', qty: 1 }],
    };
    const out = calculateQuote(input, testRates);
    expect(out.final_total).toBeCloseTo(7135, 2);
  });

  it('NW zone (OR) allows 10% discount cap — not flagged', () => {
    const input: QuoteInput = {
      move_type: 'long_distance',
      tier: 't1',
      jobs_on_calendar: 0,
      total_cuft: 500,
      destination_state: 'OR',
      round_trip_miles: 0,
      tolls: 0,
      discount_pct: 10,
    };
    const out = calculateQuote(input, testRates);
    expect(out.flags.length).toBe(0);
    expect(out.discount_pct).toBe(10);
  });

  it('non-NW state flags 10% discount as over cap', () => {
    const input: QuoteInput = {
      move_type: 'long_distance',
      tier: 't1',
      jobs_on_calendar: 0,
      total_cuft: 500,
      destination_state: 'FL',
      round_trip_miles: 0,
      tolls: 0,
      discount_pct: 10,
    };
    const out = calculateQuote(input, testRates);
    expect(out.flags.some((f) => f.includes('5%'))).toBe(true);
  });
});

describe('out-of-state (3rd party carrier)', () => {
  it('matches doc: 1,000 CuFT CA → FL = $8,250', () => {
    // base = 1000 × 7.50 × 1.10 = 8,250
    const input: QuoteInput = {
      move_type: 'out_of_state',
      tier: 't1',
      jobs_on_calendar: 0,
      total_cuft: 1000,
      round_trip_miles: 0,
      tolls: 0,
    };
    const out = calculateQuote(input, testRates);
    expect(out.final_total).toBeCloseTo(8250, 2);
  });
});
