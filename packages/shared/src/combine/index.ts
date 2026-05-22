import type { ComboForecast, ProviderForecast } from "../types/forecast.js";
import { ALGO_VERSION } from "./version.js";

/**
 * v0.1 skeleton: handles the single-provider case (used by the SMHI-only
 * walking skeleton) by passing the provider forecast through as the combo
 * with confidence: "low" (1 of 3 providers present).
 *
 * v0.2 will implement the full per-variable aggregation: arithmetic means
 * for most numerics, circular mean for wind direction, severity-tiebroken
 * mode for symbol, real spread object, and the proper confidence formula.
 */
export function combine(providers: ProviderForecast[]): ComboForecast {
  if (providers.length === 0) {
    throw new Error("combine() requires at least one provider forecast");
  }
  if (providers.length > 1) {
    throw new Error(
      "combine() multi-provider aggregation is not implemented yet (v0.2)",
    );
  }

  const only = providers[0]!;
  return {
    current: { ...only.current, confidence: "low" },
    hourly: only.hourly,
    daily: only.daily,
    spread: {},
    providerCount: 1,
    algoVersion: ALGO_VERSION,
  };
}
