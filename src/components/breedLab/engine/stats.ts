/**
 * Statistics primitives used by the genetic engine.
 * Deliberately dependency-free so the engine can run in any Node/TS project.
 */

/** Deterministic, seedable PRNG (mulberry32) so simulations are reproducible for QA. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller transform: one standard-normal sample from a uniform RNG. */
export function sampleStandardNormal(rng: () => number): number {
  let u = 0;
  let v = 0;
  // avoid log(0)
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function sampleNormal(mean: number, sd: number, rng: () => number): number {
  if (sd < 0) throw new Error(`sampleNormal: sd must be >= 0, got ${sd}`);
  if (sd === 0) return mean;
  return mean + sd * sampleStandardNormal(rng);
}

export function mean(values: number[]): number {
  if (values.length === 0) return NaN;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Sample variance (n-1 denominator). Returns 0 for a single observation. */
export function sampleVariance(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const sumSq = values.reduce((a, b) => a + (b - m) * (b - m), 0);
  return sumSq / (values.length - 1);
}

export function stddev(values: number[]): number {
  return Math.sqrt(sampleVariance(values));
}

/** Linear-interpolated percentile, p in [0,100]. */
export function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return NaN;
  if (p <= 0) return sortedValues[0];
  if (p >= 100) return sortedValues[sortedValues.length - 1];
  const rank = (p / 100) * (sortedValues.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sortedValues[lo];
  const frac = rank - lo;
  return sortedValues[lo] * (1 - frac) + sortedValues[hi] * frac;
}

export function fractionAbove(values: number[], threshold: number): number {
  if (values.length === 0) return NaN;
  const count = values.reduce((acc, v) => acc + (v > threshold ? 1 : 0), 0);
  return count / values.length;
}

export function fractionBelow(values: number[], threshold: number): number {
  if (values.length === 0) return NaN;
  const count = values.reduce((acc, v) => acc + (v < threshold ? 1 : 0), 0);
  return count / values.length;
}
