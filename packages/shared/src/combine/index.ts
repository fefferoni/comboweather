import type {
  ComboCurrent,
  ComboDayPoint,
  ComboForecast,
  ComboHourPoint,
  ComboSpread,
  CurrentConditions,
  CurrentSpread,
  DailySpread,
  DayPoint,
  HourPoint,
  HourlySpread,
  Precipitation,
  ProviderForecast,
  Wind,
} from "../types/forecast.js";
import { circularMean, circularSpread } from "./circular-mean.js";
import { confidenceFromTempSpread } from "./confidence.js";
import { modeSeverity } from "./mode-severity.js";
import { mean, range } from "./util.js";
import { ALGO_VERSION } from "./version.js";

/**
 * Combine 1–3 normalized provider forecasts into the canonical combo.
 *
 * Algorithm — per the user-authored spec (combine algorithm in plan):
 *  - Temperature, humidity, pressure, cloud cover, wind speed, precip
 *    amount + probability: arithmetic mean.
 *  - Wind direction: circular (vector) mean — naive mean breaks at wrap.
 *  - Symbol: mode with severity tiebreaker (rain > clouds > clear).
 *  - Spread: max − min per variable, surfaced for the "providers disagree"
 *    UI hint.
 *  - Confidence: function of (providers present) × (1 − normalized temp
 *    spread); low always when only one provider contributes to a bin.
 *
 * Grid alignment: the first non-empty provider in the input array is the
 * canonical time grid — the orchestrator (forecast handler) puts SMHI
 * first when it's available so the output mirrors SMHI's hourly cadence.
 */
export function combine(providers: readonly ProviderForecast[]): ComboForecast {
  if (providers.length === 0) {
    throw new Error("combine() requires at least one provider forecast");
  }
  const canonical = providers[0]!;

  // Pre-index by lookup key so per-timestep combination is O(P) not O(P²).
  const hourlyIndex = providers.map((p) => indexBy(p.hourly, (h) => h.time));
  const dailyIndex = providers.map((p) => indexBy(p.daily, (d) => d.date));

  const currents = providers.map((p) => p.current);
  const { point: currentPoint, spread: currentSpread } = combineCurrent(currents);
  const currentConfidence = confidenceFromTempSpread(currents.length, currentSpread.temperature ?? 0);

  const hourlyOut: ComboHourPoint[] = [];
  const hourlySpread: HourlySpread[] = [];
  for (const ref of canonical.hourly) {
    const matches = collect(hourlyIndex, ref.time);
    const { point, spread } = combineHour(matches);
    const confidence = confidenceFromTempSpread(matches.length, spread.temperature ?? 0);
    hourlyOut.push({ ...point, confidence });
    hourlySpread.push(spread);
  }

  const dailyOut: ComboDayPoint[] = [];
  const dailySpread: DailySpread[] = [];
  for (const ref of canonical.daily) {
    const matches = collect(dailyIndex, ref.date);
    const { point, spread } = combineDay(matches);
    // tempMax spread is the temperature signal for daily.
    const confidence = confidenceFromTempSpread(matches.length, spread.tempMax ?? 0);
    dailyOut.push({ ...point, confidence });
    dailySpread.push(spread);
  }

  const spread: ComboSpread = {
    current: currentSpread,
    hourly: hourlySpread,
    daily: dailySpread,
  };

  const current: ComboCurrent = { ...currentPoint, confidence: currentConfidence };

  return {
    current,
    hourly: hourlyOut,
    daily: dailyOut,
    spread,
    providerCount: providers.length,
    algoVersion: ALGO_VERSION,
  };
}

function indexBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T> {
  const m = new Map<string, T>();
  for (const item of items) m.set(key(item), item);
  return m;
}

function collect<T>(indices: ReadonlyArray<Map<string, T>>, key: string): T[] {
  const out: T[] = [];
  for (const idx of indices) {
    const v = idx.get(key);
    if (v !== undefined) out.push(v);
  }
  return out;
}

function combineCurrent(currents: readonly CurrentConditions[]): {
  point: CurrentConditions;
  spread: CurrentSpread;
} {
  const temps = currents.map((c) => c.temperature);
  const winds = currents.map((c) => c.wind);
  const precips = currents.map((c) => c.precipitation);
  const symbols = currents.map((c) => c.symbol);

  const humidities = currents.map((c) => c.humidity).filter(isNumber);
  const pressures = currents.map((c) => c.pressure).filter(isNumber);
  const clouds = currents.map((c) => c.cloudCover).filter(isNumber);
  const feels = currents.map((c) => c.feelsLike).filter(isNumber);

  const point: CurrentConditions = {
    time: currents[0]!.time,
    temperature: mean(temps),
    precipitation: combinePrecip(precips),
    wind: combineWind(winds),
    symbol: modeSeverity(symbols),
  };
  if (humidities.length > 0) point.humidity = mean(humidities);
  if (pressures.length > 0) point.pressure = mean(pressures);
  if (clouds.length > 0) point.cloudCover = mean(clouds);
  if (feels.length > 0) point.feelsLike = mean(feels);

  const spread: CurrentSpread = {};
  if (temps.length > 1) spread.temperature = range(temps);
  if (winds.length > 1) spread.windSpeed = range(winds.map((w) => w.speed));
  if (winds.length > 1) spread.windDirection = circularSpread(winds.map((w) => w.direction));
  if (precips.length > 1) spread.precipAmount = range(precips.map((p) => p.amount));
  const probs = precips.map((p) => p.probability).filter(isNumber);
  if (probs.length > 1) spread.precipProbability = range(probs);
  if (humidities.length > 1) spread.humidity = range(humidities);
  if (pressures.length > 1) spread.pressure = range(pressures);
  if (clouds.length > 1) spread.cloudCover = range(clouds);
  return { point, spread };
}

function combineHour(matches: readonly HourPoint[]): {
  point: HourPoint;
  spread: HourlySpread;
} {
  const temps = matches.map((m) => m.temperature);
  const winds = matches.map((m) => m.wind);
  const precips = matches.map((m) => m.precipitation);
  const symbols = matches.map((m) => m.symbol);

  const point: HourPoint = {
    time: matches[0]!.time,
    temperature: mean(temps),
    precipitation: combinePrecip(precips),
    wind: combineWind(winds),
    symbol: modeSeverity(symbols),
  };
  const spread: HourlySpread = {};
  if (temps.length > 1) spread.temperature = range(temps);
  if (winds.length > 1) spread.windSpeed = range(winds.map((w) => w.speed));
  if (winds.length > 1) spread.windDirection = circularSpread(winds.map((w) => w.direction));
  if (precips.length > 1) spread.precipAmount = range(precips.map((p) => p.amount));
  const probs = precips.map((p) => p.probability).filter(isNumber);
  if (probs.length > 1) spread.precipProbability = range(probs);
  return { point, spread };
}

function combineDay(matches: readonly DayPoint[]): {
  point: DayPoint;
  spread: DailySpread;
} {
  const tempMins = matches.map((m) => m.tempMin);
  const tempMaxes = matches.map((m) => m.tempMax);
  const precips = matches.map((m) => m.precipitation);
  const symbols = matches.map((m) => m.symbol);

  const point: DayPoint = {
    date: matches[0]!.date,
    tempMin: mean(tempMins),
    tempMax: mean(tempMaxes),
    precipitation: combinePrecip(precips),
    symbol: modeSeverity(symbols),
  };
  const spread: DailySpread = {};
  if (tempMins.length > 1) spread.tempMin = range(tempMins);
  if (tempMaxes.length > 1) spread.tempMax = range(tempMaxes);
  if (precips.length > 1) spread.precipAmount = range(precips.map((p) => p.amount));
  return { point, spread };
}

function combineWind(winds: readonly Wind[]): Wind {
  return {
    speed: mean(winds.map((w) => w.speed)),
    direction: circularMean(winds.map((w) => w.direction)),
  };
}

function combinePrecip(precips: readonly Precipitation[]): Precipitation {
  const out: Precipitation = { amount: mean(precips.map((p) => p.amount)) };
  const probs = precips.map((p) => p.probability).filter(isNumber);
  if (probs.length > 0) out.probability = mean(probs);
  return out;
}

function isNumber(x: number | undefined): x is number {
  return x !== undefined;
}
