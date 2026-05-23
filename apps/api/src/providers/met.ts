import type {
  CurrentConditions,
  DayPoint,
  HourPoint,
  Precipitation,
  ProviderForecast,
  Wind,
} from "@combo/shared";
import { symbolSeverity } from "@combo/shared";
import { roundCoord } from "../lib/geo.js";

// MET Norway `locationforecast/2.0/compact` — the lean per-hour variant of
// the full LocationForecast. Symbols come straight in MET's canonical
// `symbol_code` vocabulary, so no mapping step is needed.
//
// Docs: https://api.met.no/weatherapi/locationforecast/2.0/documentation
const MET_BASE = "https://api.met.no/weatherapi/locationforecast/2.0/compact";

const MET_ATTRIBUTION = "https://api.met.no/doc/TermsOfService";

interface MetInstantDetails {
  air_temperature?: number;
  air_pressure_at_sea_level?: number;
  cloud_area_fraction?: number;
  relative_humidity?: number;
  wind_from_direction?: number;
  wind_speed?: number;
}

interface MetIntervalDetails {
  precipitation_amount?: number;
  probability_of_precipitation?: number;
  air_temperature_max?: number;
  air_temperature_min?: number;
}

interface MetIntervalBlock {
  summary?: { symbol_code?: string };
  details?: MetIntervalDetails;
}

interface MetTimeseriesData {
  instant: { details: MetInstantDetails };
  next_1_hours?: MetIntervalBlock;
  next_6_hours?: MetIntervalBlock;
  next_12_hours?: MetIntervalBlock;
}

export interface MetTimeseriesEntry {
  time: string;
  data: MetTimeseriesData;
}

export interface MetLocationForecast {
  type: "Feature";
  /** [lon, lat, elevation_m] per GeoJSON convention. Parser never reads this. */
  geometry: { type: "Point"; coordinates: number[] };
  properties: {
    meta: { updated_at: string; units: Record<string, string> };
    timeseries: MetTimeseriesEntry[];
  };
}

/** Fetch MET Norway's compact location forecast. */
export async function fetchMet(
  lat: number,
  lon: number,
  init?: { fetch?: typeof fetch },
): Promise<MetLocationForecast> {
  const url = `${MET_BASE}?lat=${roundCoord(lat).toFixed(2)}&lon=${roundCoord(lon).toFixed(2)}`;
  const fetchImpl = init?.fetch ?? fetch;
  // MET requires a descriptive UA with a contact URL — anonymous requests
  // are throttled. https://api.met.no/doc/TermsOfService
  const res = await fetchImpl(url, {
    headers: {
      "User-Agent": "ComboWeather/0.2 (+https://github.com/fefferoni/comboweather)",
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`MET fetch failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as MetLocationForecast;
}

/** Convert a MET LocationForecast into the canonical ProviderForecast. */
export function parseMet(raw: MetLocationForecast, fetchedAt: string): ProviderForecast {
  const series = raw.properties.timeseries;
  if (series.length === 0) {
    throw new Error("MET response has no timeseries entries");
  }

  const hourly: HourPoint[] = series.map(toHourPoint);
  const current = toCurrentConditions(series[0]!);
  const daily = aggregateDaily(hourly);

  return {
    current,
    hourly,
    daily,
    fetchedAt,
    attributionUrl: MET_ATTRIBUTION,
  };
}

function requireInstant<K extends keyof MetInstantDetails>(
  d: MetInstantDetails,
  name: K,
): NonNullable<MetInstantDetails[K]> {
  const v = d[name];
  if (v === undefined) {
    throw new Error(`MET timeseries entry missing instant.details.${String(name)}`);
  }
  return v as NonNullable<MetInstantDetails[K]>;
}

function toWind(d: MetInstantDetails): Wind {
  return {
    speed: requireInstant(d, "wind_speed"),
    direction: requireInstant(d, "wind_from_direction"),
  };
}

/**
 * Symbol/precipitation interval block to use. MET only carries `next_1_hours`
 * for entries within ~48 h of `now`; further out the schema drops to
 * `next_6_hours` only. We prefer the finest granularity available.
 */
function pickInterval(data: MetTimeseriesData): MetIntervalBlock | undefined {
  return data.next_1_hours ?? data.next_6_hours ?? data.next_12_hours;
}

function toPrecip(interval: MetIntervalBlock | undefined): Precipitation {
  const amount = interval?.details?.precipitation_amount ?? 0;
  const out: Precipitation = { amount };
  // MET's probability_of_precipitation is already 0..100; normalize to 0..1.
  const prob = interval?.details?.probability_of_precipitation;
  if (prob !== undefined) out.probability = prob / 100;
  return out;
}

function toCurrentConditions(entry: MetTimeseriesEntry): CurrentConditions {
  const d = entry.data.instant.details;
  const interval = pickInterval(entry.data);
  const conditions: CurrentConditions = {
    time: entry.time,
    temperature: requireInstant(d, "air_temperature"),
    precipitation: toPrecip(interval),
    wind: toWind(d),
    symbol: interval?.summary?.symbol_code ?? "cloudy",
  };
  if (d.cloud_area_fraction !== undefined) conditions.cloudCover = d.cloud_area_fraction / 100;
  if (d.air_pressure_at_sea_level !== undefined) conditions.pressure = d.air_pressure_at_sea_level;
  if (d.relative_humidity !== undefined) conditions.humidity = d.relative_humidity / 100;
  return conditions;
}

function toHourPoint(entry: MetTimeseriesEntry): HourPoint {
  const d = entry.data.instant.details;
  const interval = pickInterval(entry.data);
  return {
    time: entry.time,
    temperature: requireInstant(d, "air_temperature"),
    precipitation: toPrecip(interval),
    wind: toWind(d),
    symbol: interval?.summary?.symbol_code ?? "cloudy",
  };
}

/** Mirrors the SMHI daily aggregation — see providers/smhi.ts for the pattern. */
function aggregateDaily(hours: HourPoint[]): DayPoint[] {
  const buckets = new Map<string, HourPoint[]>();
  for (const h of hours) {
    const date = h.time.slice(0, 10);
    const arr = buckets.get(date);
    if (arr) arr.push(h);
    else buckets.set(date, [h]);
  }

  const days: DayPoint[] = [];
  for (const [date, pts] of buckets) {
    let tempMin = Infinity;
    let tempMax = -Infinity;
    let precipSum = 0;
    const symbolCounts = new Map<string, number>();
    for (const p of pts) {
      if (p.temperature < tempMin) tempMin = p.temperature;
      if (p.temperature > tempMax) tempMax = p.temperature;
      precipSum += p.precipitation.amount;
      symbolCounts.set(p.symbol, (symbolCounts.get(p.symbol) ?? 0) + 1);
    }
    days.push({
      date,
      tempMin,
      tempMax,
      precipitation: { amount: precipSum },
      symbol: dominantSymbol(symbolCounts),
    });
  }
  return days;
}

function dominantSymbol(counts: Map<string, number>): string {
  let best: string | undefined;
  let bestCount = -1;
  for (const [sym, c] of counts) {
    if (c > bestCount || (c === bestCount && best !== undefined && symbolSeverity(sym) > symbolSeverity(best))) {
      best = sym;
      bestCount = c;
    }
  }
  return best!;
}
