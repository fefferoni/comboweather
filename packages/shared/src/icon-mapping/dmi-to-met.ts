import { dayNightForIsoTime, metSymbol, type MetSymbolBase } from "./met-symbol.js";

/**
 * DMI uses its own integer "symbol" scheme (1..103) where the 100-band
 * encodes night variants of day codes 1..3 (e.g. 101 = clearsky at night).
 * Reference: https://www.dmi.dk/fileadmin/Rapporter/TR/tr11-19.pdf
 *
 * Day-only base table — night variants are detected from the +100 offset
 * before this lookup.
 */
const DMI_BASE: Record<number, MetSymbolBase> = {
  1: "clearsky",
  2: "fair",
  3: "partlycloudy",
  4: "cloudy",
  5: "fog",
  38: "lightrainshowers",
  39: "rainshowers",
  40: "heavyrainshowers",
  41: "lightsnowshowers",
  42: "snowshowers",
  43: "heavysnowshowers",
  45: "fog",
  60: "lightrain",
  63: "rain",
  65: "heavyrain",
  68: "lightsleet",
  69: "sleet",
  70: "heavysleet",
  73: "lightsnow",
  75: "snow",
  78: "heavysnow",
  80: "lightrainshowers",
  81: "rainshowers",
  82: "heavyrainshowers",
  85: "lightsnowshowers",
  86: "snowshowers",
  95: "rainandthunder",
  101: "clearsky",
  102: "fair",
  103: "partlycloudy",
};

/**
 * Map a DMI symbol integer + ISO timestamp to a canonical MET symbol_code.
 * Codes in the 101..103 band force night regardless of the time-derived
 * suffix; everything else uses the time-of-day heuristic.
 */
export function dmiSymbolToMet(code: number, isoTime: string): string {
  const base = DMI_BASE[code] ?? "cloudy";
  const suffix = code >= 101 && code <= 103 ? "night" : dayNightForIsoTime(isoTime);
  return metSymbol(base, suffix);
}
