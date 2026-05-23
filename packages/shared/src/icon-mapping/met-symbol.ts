/**
 * Canonical MET Norway `symbol_code` vocabulary used across the app.
 * Source: https://api.met.no/weatherapi/weathericon/2.0/legends.json
 *
 * Every symbol the app surfaces is one of these strings. SMHI snow1g codes
 * and DMI codes are mapped into this vocabulary by the provider parsers so
 * the combine algorithm only has to think about one scheme.
 */

export type DayNightSuffix = "day" | "night" | "polartwilight";

/** The base symbols MET emits (suffix-stripped). */
export type MetSymbolBase =
  | "clearsky"
  | "fair"
  | "partlycloudy"
  | "cloudy"
  | "fog"
  | "lightrainshowers"
  | "rainshowers"
  | "heavyrainshowers"
  | "lightrainshowersandthunder"
  | "rainshowersandthunder"
  | "heavyrainshowersandthunder"
  | "lightsleetshowers"
  | "sleetshowers"
  | "heavysleetshowers"
  | "lightsnowshowers"
  | "snowshowers"
  | "heavysnowshowers"
  | "lightrain"
  | "rain"
  | "heavyrain"
  | "lightrainandthunder"
  | "rainandthunder"
  | "heavyrainandthunder"
  | "lightsleet"
  | "sleet"
  | "heavysleet"
  | "lightsnow"
  | "snow"
  | "heavysnow";

/** Some MET symbols have day/night/polartwilight variants; others don't. */
const SUFFIX_BEARING: ReadonlySet<MetSymbolBase> = new Set<MetSymbolBase>([
  "clearsky",
  "fair",
  "partlycloudy",
  "lightrainshowers",
  "rainshowers",
  "heavyrainshowers",
  "lightrainshowersandthunder",
  "rainshowersandthunder",
  "heavyrainshowersandthunder",
  "lightsleetshowers",
  "sleetshowers",
  "heavysleetshowers",
  "lightsnowshowers",
  "snowshowers",
  "heavysnowshowers",
]);

/**
 * Build a canonical symbol key. For bases that don't carry a day/night
 * variant (rain, cloudy, fog, …) the suffix is ignored and the bare base
 * is returned. v0.2 uses a UTC-hour heuristic to pick day vs night;
 * v0.4+ will swap that for proper solar-elevation logic.
 */
export function metSymbol(base: MetSymbolBase, suffix: DayNightSuffix): string {
  return SUFFIX_BEARING.has(base) ? `${base}_${suffix}` : base;
}

/**
 * Severity ordering used by combine() to break ties when providers vote
 * for different symbols. Higher = more "severe" / weather-relevant.
 * Matches the user-authored spec "rain > clouds > clear".
 */
const SEVERITY: Record<MetSymbolBase, number> = {
  clearsky: 0,
  fair: 1,
  partlycloudy: 2,
  cloudy: 3,
  fog: 3,
  lightrainshowers: 4,
  lightsleetshowers: 4,
  lightsnowshowers: 4,
  lightrain: 4,
  lightsleet: 4,
  lightsnow: 4,
  rainshowers: 5,
  sleetshowers: 5,
  snowshowers: 5,
  rain: 5,
  sleet: 5,
  snow: 5,
  heavyrainshowers: 6,
  heavysleetshowers: 6,
  heavysnowshowers: 6,
  heavyrain: 6,
  heavysleet: 6,
  heavysnow: 6,
  lightrainshowersandthunder: 7,
  lightrainandthunder: 7,
  rainshowersandthunder: 8,
  rainandthunder: 8,
  heavyrainshowersandthunder: 9,
  heavyrainandthunder: 9,
};

/**
 * Strip an optional `_day` / `_night` / `_polartwilight` suffix and return
 * the base. Unknown bases return `cloudy` (a safe middle severity).
 */
export function metSymbolBase(symbol: string): MetSymbolBase {
  const underscoreIdx = symbol.indexOf("_");
  const base = (underscoreIdx === -1 ? symbol : symbol.slice(0, underscoreIdx)) as MetSymbolBase;
  return base in SEVERITY ? base : "cloudy";
}

/** Severity score for tie-breaking in combine(). */
export function symbolSeverity(symbol: string): number {
  return SEVERITY[metSymbolBase(symbol)];
}

/** Simple UTC-hour heuristic for day vs night. v0.4+ replaces with solar elevation. */
export function dayNightForIsoTime(iso: string): DayNightSuffix {
  const hour = Number(iso.slice(11, 13));
  if (!Number.isFinite(hour)) return "day";
  return hour >= 6 && hour < 19 ? "day" : "night";
}
