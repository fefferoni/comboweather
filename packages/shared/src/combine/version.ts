/**
 * Bump whenever the combine() algorithm changes in a way that produces
 * different output for the same inputs. The Lambda recomputes any cached
 * combo row whose stored algoVersion is below this value.
 *
 * v2 (v0.2): real multi-provider aggregation — arithmetic means for
 * numerics, circular mean for wind direction, severity-tiebroken mode
 * for symbol, per-timestep confidence, per-variable spread.
 */
export const ALGO_VERSION = 2;
