import { dayNightForIsoTime, metSymbol, type MetSymbolBase } from "./met-symbol.js";

/**
 * SMHI snow1g `symbol_code` is an integer in 1..27 that mirrors the
 * legacy Wsymb2 vocabulary one-for-one. Source:
 * https://opendata.smhi.se/apidocs/metfcst/parameters.html#parameter-wsymb
 */
const SMHI_BASE: Record<number, MetSymbolBase> = {
  1: "clearsky",
  2: "fair",
  3: "partlycloudy",
  4: "partlycloudy",
  5: "cloudy",
  6: "cloudy",
  7: "fog",
  8: "lightrainshowers",
  9: "rainshowers",
  10: "heavyrainshowers",
  11: "rainshowersandthunder",
  12: "lightsleetshowers",
  13: "sleetshowers",
  14: "heavysleetshowers",
  15: "lightsnowshowers",
  16: "snowshowers",
  17: "heavysnowshowers",
  18: "lightrain",
  19: "rain",
  20: "heavyrain",
  21: "rainandthunder",
  22: "lightsleet",
  23: "sleet",
  24: "heavysleet",
  25: "lightsnow",
  26: "snow",
  27: "heavysnow",
};

/**
 * Map an SMHI snow1g symbol_code + ISO timestamp to a canonical MET
 * symbol_code. Unknown SMHI codes fall back to "cloudy" so the combine
 * algorithm never crashes on a single bad upstream code.
 */
export function smhiSymbolToMet(code: number, isoTime: string): string {
  const base = SMHI_BASE[code] ?? "cloudy";
  return metSymbol(base, dayNightForIsoTime(isoTime));
}
