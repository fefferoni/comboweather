import type {
  CurrentConditions,
  DayPoint,
  HourPoint,
  Precipitation,
  ProviderForecast,
  Wind,
} from "@combo/shared";
import { roundCoord } from "../lib/geo.js";

// SMHI deprecated the legacy pmp3g/v2 endpoint on 2026-03-31; current
// replacement is snow1g/v1. Parameter names are human-readable strings
// (e.g. `air_temperature` instead of `t`) and the per-hour bag lives under
// `data` rather than a flat `parameters[]` list.
//
// Docs: https://opendata.smhi.se/apidocs/metfcst/
const SMHI_BASE =
  "https://opendata-download-metfcst.smhi.se/api/category/snow1g/version/1/geotype/point";

const SMHI_ATTRIBUTION = "https://www.smhi.se/data/oppna-data/villkor-for-anvandning";

export interface SmhiPointData {
  air_temperature?: number;
  wind_speed?: number;
  wind_from_direction?: number;
  precipitation_amount_mean?: number;
  probability_of_precipitation?: number;
  relative_humidity?: number;
  air_pressure_at_mean_sea_level?: number;
  cloud_area_fraction?: number;
  symbol_code?: number;
  [key: string]: number | undefined;
}

export interface SmhiTimeSeries {
  time: string;
  intervalParametersStartTime?: string;
  data: SmhiPointData;
}

export interface SmhiPointResponse {
  createdTime: string;
  referenceTime: string;
  geometry: { type: "Point"; coordinates: [number, number] };
  timeSeries: SmhiTimeSeries[];
}

/** Fetch SMHI's point forecast. Throws on network error or non-2xx. */
export async function fetchSmhi(
  lat: number,
  lon: number,
  init?: { fetch?: typeof fetch },
): Promise<SmhiPointResponse> {
  const url = `${SMHI_BASE}/lon/${roundCoord(lon).toFixed(2)}/lat/${roundCoord(lat).toFixed(2)}/data.json`;
  const fetchImpl = init?.fetch ?? fetch;
  const res = await fetchImpl(url, {
    headers: { "User-Agent": "ComboWeather/0.1 (+https://github.com/fefferoni/comboweather)" },
  });
  if (!res.ok) {
    throw new Error(`SMHI fetch failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as SmhiPointResponse;
}

/** Convert a raw SMHI point forecast into the canonical ProviderForecast. */
export function parseSmhi(raw: SmhiPointResponse, fetchedAt: string): ProviderForecast {
  if (raw.timeSeries.length === 0) {
    throw new Error("SMHI response has no timeSeries entries");
  }

  const hourly: HourPoint[] = raw.timeSeries.map(toHourPoint);
  const current = toCurrentConditions(raw.timeSeries[0]!);
  const daily = aggregateDaily(hourly);

  return {
    current,
    hourly,
    daily,
    fetchedAt,
    attributionUrl: SMHI_ATTRIBUTION,
  };
}

function requireField(data: SmhiPointData, name: keyof SmhiPointData): number {
  const v = data[name];
  if (v === undefined) {
    throw new Error(`SMHI timeSeries entry missing parameter "${String(name)}"`);
  }
  return v;
}

function toWind(data: SmhiPointData): Wind {
  return {
    speed: requireField(data, "wind_speed"),
    direction: requireField(data, "wind_from_direction"),
  };
}

function toPrecip(data: SmhiPointData): Precipitation {
  const out: Precipitation = { amount: requireField(data, "precipitation_amount_mean") };
  // probability_of_precipitation is 0-100; normalize to 0-1.
  if (data.probability_of_precipitation !== undefined) {
    out.probability = data.probability_of_precipitation / 100;
  }
  return out;
}

function toCurrentConditions(entry: SmhiTimeSeries): CurrentConditions {
  const d = entry.data;
  const conditions: CurrentConditions = {
    time: entry.time,
    temperature: requireField(d, "air_temperature"),
    precipitation: toPrecip(d),
    wind: toWind(d),
    symbol: symbolCodeToCanonical(requireField(d, "symbol_code")),
  };
  if (d.cloud_area_fraction !== undefined) conditions.cloudCover = d.cloud_area_fraction / 100;
  if (d.air_pressure_at_mean_sea_level !== undefined) {
    conditions.pressure = d.air_pressure_at_mean_sea_level;
  }
  if (d.relative_humidity !== undefined) conditions.humidity = d.relative_humidity / 100;
  return conditions;
}

function toHourPoint(entry: SmhiTimeSeries): HourPoint {
  const d = entry.data;
  return {
    time: entry.time,
    temperature: requireField(d, "air_temperature"),
    precipitation: toPrecip(d),
    wind: toWind(d),
    symbol: symbolCodeToCanonical(requireField(d, "symbol_code")),
  };
}

/**
 * Group hourly points by UTC civil date and emit min/max/sum/dominant-symbol.
 * v0.1 uses UTC date keys. v0.4+ will switch to the location's local civil
 * date once the mobile shell ships timezone-aware day boundaries.
 */
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
    if (c > bestCount) {
      best = sym;
      bestCount = c;
    }
  }
  return best!;
}

/**
 * Placeholder SMHI symbol_code → canonical key mapping. SNOW1g's symbol_code
 * is its own integer scheme (distinct from the legacy Wsymb2). Real mapping
 * to MET Norway's `symbol_code` string vocabulary lands in v0.2 with
 * packages/shared/icon-mapping.
 */
function symbolCodeToCanonical(code: number): string {
  return `smhi_${code}`;
}
