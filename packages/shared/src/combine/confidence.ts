import type { Confidence } from "../types/forecast.js";

/** Temperature spread (°C) above which trust hits zero. */
const TEMP_SATURATION_C = 5;

/**
 * Map (provider count, temperature spread) → high/medium/low.
 *
 * Per the user-authored spec: `score = providers × (1 − normalized spread)`.
 * Temperature is the proxy variable — it's the most user-visible signal
 * and any provider disagreement on temperature usually correlates with
 * disagreement elsewhere.
 *
 * Thresholds:
 *   ≥ 2.5  high   (≥2 providers in tight agreement, or 3 providers in
 *                  moderate agreement)
 *   ≥ 1.5  medium (2 providers with some spread, or 3 with larger spread)
 *   else   low    (always for a single provider — no cross-check available)
 */
export function confidenceFromTempSpread(
  providerCount: number,
  tempSpreadC: number,
): Confidence {
  if (providerCount <= 0) return "low";
  const normalized = Math.min(Math.max(tempSpreadC, 0) / TEMP_SATURATION_C, 1);
  const score = providerCount * (1 - normalized);
  if (score >= 2.5) return "high";
  if (score >= 1.5) return "medium";
  return "low";
}
