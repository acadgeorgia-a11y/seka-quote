/**
 * Crew sizing from CuFT, per /docs/pricing-logic-local.md.
 *   300–500 → 2 men
 *   501–1000 → 3 men
 *   1001+ → 4 men
 */
export function crewSizeFromCuft(cuft: number): 2 | 3 | 4 {
  if (cuft <= 500) return 2;
  if (cuft <= 1000) return 3;
  return 4;
}

/**
 * Resolves the final crew size: caller-provided override takes precedence,
 * else auto from CuFT.
 */
export function resolveCrew(cuft: number, override?: 2 | 3 | 4): 2 | 3 | 4 {
  return override ?? crewSizeFromCuft(cuft);
}
