/**
 * Circular (vector) mean of compass bearings. Converts each degree to a
 * unit vector, sums, then returns atan2 of the resultant — the only
 * correct way to average wraparound values. 350° and 10° must average to
 * 0°, not 180°.
 *
 * Returns a degree in [0, 360). If the input vectors cancel out exactly
 * (e.g. 90° + 270°), the resultant has zero magnitude and the bearing is
 * undefined — we return 0 by convention; in practice the caller should
 * note the windDirection spread is large and treat the value with care.
 */
export function circularMean(degrees: readonly number[]): number {
  if (degrees.length === 0) {
    throw new Error("circularMean() requires at least one bearing");
  }
  let sumX = 0;
  let sumY = 0;
  for (const deg of degrees) {
    const rad = (deg * Math.PI) / 180;
    sumX += Math.cos(rad);
    sumY += Math.sin(rad);
  }
  // Sub-epsilon resultant magnitude → directions cancel, no meaningful mean.
  if (Math.hypot(sumX, sumY) < 1e-9) return 0;
  let deg = (Math.atan2(sumY, sumX) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

/**
 * Maximum wrap-aware separation between any two bearings — the "spread"
 * we surface as windDirection in the spread object. For a single bearing
 * returns 0.
 */
export function circularSpread(degrees: readonly number[]): number {
  if (degrees.length < 2) return 0;
  let maxSep = 0;
  for (let i = 0; i < degrees.length; i++) {
    for (let j = i + 1; j < degrees.length; j++) {
      const d = Math.abs(degrees[i]! - degrees[j]!);
      const sep = Math.min(d, 360 - d);
      if (sep > maxSep) maxSep = sep;
    }
  }
  return maxSep;
}
