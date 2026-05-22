import type {
  CurrentConditions,
  DayPoint,
  HourPoint,
  Precipitation,
  ProviderForecast,
  Wind,
} from "@combo/shared";
import { roundCoord } from "../lib/geo.js";

const SMHI_BASE =
  "https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2/geotype/point";

const SMHI_ATTRIBUTION = "https://www.smhi.se/data/oppna-data/villkor-for-anvandning";

interface SmhiParameter {
  name: string;
  levelType: string;
  level: number;
  unit: string;
  values: number[];
}

interface SmhiTimeSeries {
  validTime: string;
  parameters: SmhiParameter[];
}

export interface SmhiPointResponse {
  approvedTime: string;
  referenceTime: string;
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
    headers: { "User-Agent": "ComboWeather/0.1 (+https://github.com/spfeffer/comboweather)" },
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

function paramValue(entry: SmhiTimeSeries, name: string): number | undefined {
  const p = entry.parameters.find((x) => x.name === name);
  return p?.values[0];
}

function requireParam(entry: SmhiTimeSeries, name: string): number {
  const v = paramValue(entry, name);
  if (v === undefined) {
    throw new Error(`SMHI timeSeries entry missing parameter "${name}"`);
  }
  return v;
}

function toWind(entry: SmhiTimeSeries): Wind {
  return {
    speed: requireParam(entry, "ws"),
    direction: requireParam(entry, "wd"),
  };
}

function toPrecip(entry: SmhiTimeSeries): Precipitation {
  // SMHI provides mean precip in mm/h (kg/m²/h). Probability is not exposed
  // on the point forecast endpoint — only via the analysis forecast endpoint.
  return { amount: requireParam(entry, "pmean") };
}

function toCurrentConditions(entry: SmhiTimeSeries): CurrentConditions {
  const conditions: CurrentConditions = {
    time: entry.validTime,
    temperature: requireParam(entry, "t"),
    precipitation: toPrecip(entry),
    wind: toWind(entry),
    symbol: wsymbToSymbol(requireParam(entry, "Wsymb2")),
  };
  const tcc = paramValue(entry, "tcc_mean");
  if (tcc !== undefined) conditions.cloudCover = tcc / 8;
  const pres = paramValue(entry, "msl");
  if (pres !== undefined) conditions.pressure = pres;
  const rh = paramValue(entry, "r");
  if (rh !== undefined) conditions.humidity = rh / 100;
  return conditions;
}

function toHourPoint(entry: SmhiTimeSeries): HourPoint {
  return {
    time: entry.validTime,
    temperature: requireParam(entry, "t"),
    precipitation: toPrecip(entry),
    wind: toWind(entry),
    symbol: wsymbToSymbol(requireParam(entry, "Wsymb2")),
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
 * Placeholder Wsymb2 → canonical key mapping. The real SMHI Wsymb2 → MET
 * `symbol_code` mapping lands in v0.2 with packages/shared/icon-mapping.
 */
function wsymbToSymbol(code: number): string {
  return `wsymb2_${code}`;
}
