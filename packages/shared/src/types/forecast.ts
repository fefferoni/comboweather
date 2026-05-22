export type ProviderId = "smhi" | "met" | "dmi";

export type Confidence = "high" | "medium" | "low";

export interface Precipitation {
  /** mm over the period (hour for hourly, day for daily) */
  amount: number;
  /** 0-1, may be absent if the provider does not expose probability */
  probability?: number;
}

export interface Wind {
  /** m/s */
  speed: number;
  /** Meteorological degrees (0 = N, 90 = E). */
  direction: number;
}

export interface CurrentConditions {
  /** ISO 8601 UTC */
  time: string;
  /** Celsius */
  temperature: number;
  feelsLike?: number;
  precipitation: Precipitation;
  wind: Wind;
  /** MET Norway `symbol_code` canonical key (e.g. "partlycloudy_day"). */
  symbol: string;
  humidity?: number;
  /** hPa */
  pressure?: number;
  /** 0-1 */
  cloudCover?: number;
}

export interface HourPoint {
  time: string;
  temperature: number;
  precipitation: Precipitation;
  wind: Wind;
  symbol: string;
}

export interface DayPoint {
  /** YYYY-MM-DD in the location's local civil date. */
  date: string;
  tempMin: number;
  tempMax: number;
  precipitation: Precipitation;
  symbol: string;
}

export interface ProviderForecast {
  current: CurrentConditions;
  hourly: HourPoint[];
  daily: DayPoint[];
  /** ISO 8601 UTC — when this provider's data was fetched from upstream. */
  fetchedAt: string;
  /** URL to provider's terms/attribution page. */
  attributionUrl: string;
}

/** Per-timestep, per-variable spread used by the UI for "providers disagree" hints. */
export interface ComboSpread {
  /** For now: empty when only one provider is present. Tightened in v0.2. */
  [key: string]: unknown;
}

export interface ComboForecast {
  current: CurrentConditions & { confidence: Confidence };
  hourly: HourPoint[];
  daily: DayPoint[];
  spread: ComboSpread;
  /** Number of providers fed into this combo. */
  providerCount: number;
  /** ALGO_VERSION the combo was computed with. */
  algoVersion: number;
}
