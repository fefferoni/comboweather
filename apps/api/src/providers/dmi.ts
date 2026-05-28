import type {
  CurrentConditions,
  DayPoint,
  HourPoint,
  ProviderForecast,
  Wind,
} from "@combo/shared";
import { dmiSymbolToMet, symbolSeverity } from "@combo/shared";
import { roundCoord } from "../lib/geo.js";

// DMI Open Data — OGC EDR API. Keyless on opendataapi.dmi.dk (the legacy
// dmigw.govcloud.dk host still requires a key; we don't use it). The
// `harmonie_dini_sf` collection covers DK/IS/NL/IE plus the surrounding
// Nordic surface area at hourly cadence.
//
// Docs: https://www.dmi.dk/friedata/dokumentation/basics
// Fair-use cap: 500 requests / 5s account-wide → returns HTTP 429.
const DMI_BASE =
  "https://opendataapi.dmi.dk/v1/forecastedr/collections/harmonie_dini_sf/position";

const DMI_ATTRIBUTION = "https://www.dmi.dk/frie-data";

/**
 * Parameters we ask DMI for. Names must match the harmonie_dini_sf
 * `parameter_names` exactly — the collection rejects the whole request
 * (HTTP 400) if any single name is unknown. Confirmed against the live
 * collection metadata 2026-05-23.
 *
 * Units returned by the EDR (which it doesn't declare in the response):
 *   - temperature-2m         → Kelvin           → convert to °C
 *   - wind-speed-10m         → m/s              → as-is
 *   - wind-dir-10m           → degrees true     → as-is
 *   - total-precipitation    → mm, accumulated  → diff to per-hour
 *   - fraction-of-cloud-cover → 0..1            → as-is
 *   - relative-humidity-2m   → 0..100           → /100
 *   - pressure-sealevel      → Pa               → /100 to hPa
 */
const DMI_PARAMETERS = [
  "temperature-2m",
  "relative-humidity-2m",
  "wind-speed-10m",
  "wind-dir-10m",
  "total-precipitation",
  "fraction-of-cloud-cover",
  "pressure-sealevel",
] as const;

type DmiParameter = (typeof DMI_PARAMETERS)[number];

interface DmiNdArray {
  type: "NdArray";
  dataType?: string;
  axisNames?: string[];
  shape?: number[];
  values: Array<number | null>;
}

export interface DmiCoverage {
  type: "Coverage";
  domain: {
    type: "Domain";
    domainType: string;
    axes: {
      x: { values: number[] };
      y: { values: number[] };
      t: { values: string[] };
    };
  };
  ranges: Partial<Record<DmiParameter, DmiNdArray>>;
}

// Delays between retry attempts for transient DMI failures. DMI's free
// API frequently returns 429 ("Server is busy") under load — single calls
// have ~80% success in practice, two retries lifts that to ~99%. Status
// 4xx (non-429) skips retries because those signal a bad request, not
// overload — retrying wouldn't change the outcome.
const RETRY_DELAYS_MS = [250, 500];

function isTransient(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fetch DMI's Harmonie point forecast. Keyless. Retries up to 2× on 429/5xx
 *  before giving up; throws on persistent failure or any 4xx (non-429). */
export async function fetchDmi(
  lat: number,
  lon: number,
  init?: { fetch?: typeof fetch; sleep?: (ms: number) => Promise<void> },
): Promise<DmiCoverage> {
  const coords = `POINT(${roundCoord(lon).toFixed(2)} ${roundCoord(lat).toFixed(2)})`;
  const params = new URLSearchParams({
    coords,
    "parameter-name": DMI_PARAMETERS.join(","),
    crs: "crs84",
    f: "CoverageJSON",
  });
  const url = `${DMI_BASE}?${params.toString()}`;
  const fetchImpl = init?.fetch ?? fetch;
  const sleep = init?.sleep ?? defaultSleep;

  let lastStatus = 0;
  let lastStatusText = "";
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    if (attempt > 0) {
      await sleep(RETRY_DELAYS_MS[attempt - 1]!);
    }
    const res = await fetchImpl(url, {
      headers: {
        "User-Agent": "ComboWeather/0.5 (+https://github.com/fefferoni/comboweather)",
        Accept: "application/json",
      },
    });
    if (res.ok) {
      return (await res.json()) as DmiCoverage;
    }
    lastStatus = res.status;
    lastStatusText = res.statusText;
    if (!isTransient(res.status)) {
      throw new Error(`DMI fetch failed: ${res.status} ${res.statusText}`);
    }
  }
  throw new Error(
    `DMI fetch failed after ${RETRY_DELAYS_MS.length + 1} attempts: ${lastStatus} ${lastStatusText}`,
  );
}

/** Convert a DMI Coverage into the canonical ProviderForecast. */
export function parseDmi(raw: DmiCoverage, fetchedAt: string): ProviderForecast {
  const times = raw.domain.axes.t.values;
  if (times.length === 0) {
    throw new Error("DMI coverage has no time axis values");
  }

  const get = (param: DmiParameter, idx: number): number | undefined => {
    const v = raw.ranges[param]?.values[idx];
    return typeof v === "number" ? v : undefined;
  };

  // Precompute per-hour precip from the accumulated series. DMI returns
  // total-precipitation as mm accumulated since forecast start, so the
  // amount for hour i is total[i] − total[i-1]. First hour just uses
  // total[0] (which is usually 0 anyway at model t=0).
  const totalPrecipAccum: number[] = times.map((_, i) =>
    requireValue(get, "total-precipitation", i),
  );
  const precipHourly: number[] = totalPrecipAccum.map((v, i) =>
    i === 0 ? Math.max(0, v) : Math.max(0, v - totalPrecipAccum[i - 1]!),
  );

  const hourly: HourPoint[] = times.map((time, i) =>
    toHourPoint(time, i, get, precipHourly[i]!),
  );
  const current = toCurrentConditions(times[0]!, 0, get, precipHourly[0]!);
  const daily = aggregateDaily(hourly);

  return {
    current,
    hourly,
    daily,
    fetchedAt,
    attributionUrl: DMI_ATTRIBUTION,
  };
}

type Getter = (param: DmiParameter, idx: number) => number | undefined;

function requireValue(get: Getter, param: DmiParameter, idx: number): number {
  const v = get(param, idx);
  if (v === undefined) {
    throw new Error(`DMI coverage missing required value for "${param}" at index ${idx}`);
  }
  return v;
}

/** Kelvin → Celsius. DMI returns temperature-2m in K. */
function kelvinToCelsius(k: number): number {
  return k - 273.15;
}

function toWind(get: Getter, idx: number): Wind {
  return {
    speed: requireValue(get, "wind-speed-10m", idx),
    direction: requireValue(get, "wind-dir-10m", idx),
  };
}

/**
 * DMI's EDR coverage doesn't carry a weather-symbol parameter, so we derive
 * a DMI-vocabulary code from precipitation + cloud cover. The DMI→MET
 * mapping then turns that into the canonical MET symbol_code. This keeps
 * the provider output type-compatible with SMHI and MET.
 */
function deriveDmiSymbolCode(precipMm: number, cloudFraction: number | undefined): number {
  if (precipMm >= 5) return 65; // heavy rain
  if (precipMm >= 1) return 63; // rain
  if (precipMm > 0) return 60; // light rain
  if (cloudFraction === undefined) return 3; // partly cloudy fallback
  if (cloudFraction > 0.85) return 4; // overcast
  if (cloudFraction > 0.5) return 3; // partly cloudy
  if (cloudFraction > 0.15) return 2; // fair
  return 1; // clear
}

function toCurrentConditions(
  time: string,
  idx: number,
  get: Getter,
  precipMm: number,
): CurrentConditions {
  const cloud = get("fraction-of-cloud-cover", idx);
  const conditions: CurrentConditions = {
    time,
    temperature: kelvinToCelsius(requireValue(get, "temperature-2m", idx)),
    precipitation: { amount: precipMm },
    wind: toWind(get, idx),
    symbol: dmiSymbolToMet(deriveDmiSymbolCode(precipMm, cloud), time),
  };
  if (cloud !== undefined) conditions.cloudCover = cloud;
  const pressurePa = get("pressure-sealevel", idx);
  if (pressurePa !== undefined) conditions.pressure = pressurePa / 100;
  const humidity = get("relative-humidity-2m", idx);
  if (humidity !== undefined) conditions.humidity = humidity / 100;
  return conditions;
}

function toHourPoint(
  time: string,
  idx: number,
  get: Getter,
  precipMm: number,
): HourPoint {
  const cloud = get("fraction-of-cloud-cover", idx);
  return {
    time,
    temperature: kelvinToCelsius(requireValue(get, "temperature-2m", idx)),
    precipitation: { amount: precipMm },
    wind: toWind(get, idx),
    symbol: dmiSymbolToMet(deriveDmiSymbolCode(precipMm, cloud), time),
  };
}

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
