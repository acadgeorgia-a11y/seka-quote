import { describe, expect, it } from 'vitest';
import { calculateTravel } from '../travel';

describe('travel formula (MAX, not MIN)', () => {
  it('picks mileage × 3 when higher', () => {
    // 100 mi × 3 = 300 vs 1 × $149 = 149 → pick 300 + 20 = 320
    const out = calculateTravel({ roundTripMiles: 100, tolls: 20, crewRate: 149 });
    expect(out.amount).toBe(320);
    expect(out.items[0]?.detail).toMatch(/100\.0 mi × \$3/);
  });

  it('picks 1hr × rate when higher', () => {
    // 20 × 3 = 60 vs $169 → pick 169 + 10 = 179
    const out = calculateTravel({ roundTripMiles: 20, tolls: 10, crewRate: 169 });
    expect(out.amount).toBe(179);
    expect(out.items[0]?.detail).toMatch(/1 hr at \$169\/hr/);
  });

  it('adds tolls as a separate line only when > 0', () => {
    const noTolls = calculateTravel({ roundTripMiles: 20, tolls: 0, crewRate: 169 });
    expect(noTolls.items.length).toBe(1);
    const withTolls = calculateTravel({ roundTripMiles: 20, tolls: 5, crewRate: 169 });
    expect(withTolls.items.length).toBe(2);
    expect(withTolls.items[1]?.label).toBe('Tolls');
  });
});
