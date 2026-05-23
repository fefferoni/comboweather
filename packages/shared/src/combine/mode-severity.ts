import { symbolSeverity } from "../icon-mapping/met-symbol.js";

/**
 * Pick the dominant symbol from a list (mode), breaking ties by picking
 * the more "severe" weather code — the user-authored rule "rain > clouds
 * > clear". Severity ordering lives in icon-mapping/met-symbol.ts.
 *
 * Example: ["clearsky_day", "rain", "fair_day"] all appear once → tie →
 * rain wins because severity(rain) > severity(fair_day) > severity(clearsky_day).
 */
export function modeSeverity(symbols: readonly string[]): string {
  if (symbols.length === 0) {
    throw new Error("modeSeverity() requires at least one symbol");
  }
  const counts = new Map<string, number>();
  for (const s of symbols) counts.set(s, (counts.get(s) ?? 0) + 1);

  let best: string | undefined;
  let bestCount = -1;
  for (const [sym, c] of counts) {
    if (
      c > bestCount ||
      (c === bestCount && best !== undefined && symbolSeverity(sym) > symbolSeverity(best))
    ) {
      best = sym;
      bestCount = c;
    }
  }
  return best!;
}
