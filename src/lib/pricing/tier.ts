import type { Tier } from './types';

/**
 * Jobs booked → tier mapping per /docs/pricing-logic-local.md.
 *   0–1 → t1 (Up to 1)
 *   2–3 → t2 (1–3)   — 2 jobs falls here
 *   3–5 → t3 (3–5)   — 4–5 jobs
 *   5–7 → t4 (5–7)   — 6–7 jobs
 *   7+  → t5 (7+)    — 8+ jobs
 *
 * Doc ranges overlap (2–3 and 3–5 both mention 3); we resolve using the
 * first matching lower bound, so 3 jobs → t2. This matches the
 * example-quote calculation (2 jobs → t2).
 */
export function jobsBookedToTier(jobs: number): Tier {
  if (jobs <= 1) return 't1';
  if (jobs <= 3) return 't2';
  if (jobs <= 5) return 't3';
  if (jobs <= 7) return 't4';
  return 't5';
}

export const TIER_LABELS: Record<Tier, string> = {
  t1: 'Up to 1',
  t2: '1–3',
  t3: '3–5',
  t4: '5–7',
  t5: '7+',
};
