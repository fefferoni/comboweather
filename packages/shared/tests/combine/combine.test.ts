import { describe, expect, it } from "vitest";
import { combine } from "../../src/combine/index.js";
import { ALGO_VERSION } from "../../src/combine/version.js";
import type { ProviderForecast } from "../../src/types/forecast.js";

const HOUR_A = "2026-05-22T17:00:00Z";
const HOUR_B = "2026-05-22T20:00:00Z";
const DAY_A = "2026-05-22";

function provider(overrides: Partial<ProviderForecast> = {}): ProviderForecast {
  return {
    current: {
      time: HOUR_A,
      temperature: 12,
      precipitation: { amount: 0, probability: 0.1 },
      wind: { speed: 3, direction: 200 },
      symbol: "partlycloudy_day",
      humidity: 0.5,
      pressure: 1015,
      cloudCover: 0.4,
      feelsLike: 11,
    },
    hourly: [
      {
        time: HOUR_A,
        temperature: 12,
        precipitation: { amount: 0, probability: 0.1 },
        wind: { speed: 3, direction: 200 },
        symbol: "partlycloudy_day",
      },
      {
        time: HOUR_B,
        temperature: 9,
        precipitation: { amount: 0, probability: 0.1 },
        wind: { speed: 3, direction: 200 },
        symbol: "partlycloudy_night",
      },
    ],
    daily: [
      {
        date: DAY_A,
        tempMin: 9,
        tempMax: 14,
        precipitation: { amount: 0 },
        symbol: "partlycloudy_day",
      },
    ],
    fetchedAt: "2026-05-22T17:05:00Z",
    attributionUrl: "https://example/",
    ...overrides,
  };
}

describe("combine (v0.2)", () => {
  it("passes a single provider through with confidence: low", () => {
    const p = provider();
    const combo = combine([p]);
    expect(combo.current.temperature).toBe(12);
    expect(combo.current.confidence).toBe("low");
    expect(combo.hourly[0]?.confidence).toBe("low");
    expect(combo.daily[0]?.confidence).toBe("low");
    expect(combo.spread.current).toEqual({});
    expect(combo.spread.hourly).toEqual([{}, {}]);
    expect(combo.spread.daily).toEqual([{}]);
    expect(combo.providerCount).toBe(1);
    expect(combo.algoVersion).toBe(ALGO_VERSION);
  });

  it("means temperatures across three providers and surfaces the spread", () => {
    const smhi = provider({
      current: {
        ...provider().current,
        temperature: 12,
        wind: { speed: 4, direction: 270 },
      },
    });
    const met = provider({
      current: {
        ...provider().current,
        temperature: 8,
        wind: { speed: 4, direction: 274 },
      },
    });
    const dmi = provider({
      current: {
        ...provider().current,
        temperature: 10,
        wind: { speed: 4, direction: 266 },
      },
    });
    const combo = combine([smhi, met, dmi]);
    expect(combo.current.temperature).toBeCloseTo(10, 5);
    expect(combo.spread.current.temperature).toBe(4);
    // 4°C spread × 3 providers → score 3 × (1 − 4/5) = 0.6 → low.
    expect(combo.current.confidence).toBe("low");
    expect(combo.spread.current.windDirection).toBe(8);
  });

  it("uses circular mean for wind direction (350° + 10° = ~0°)", () => {
    const a = provider({
      current: {
        ...provider().current,
        wind: { speed: 3, direction: 350 },
      },
    });
    const b = provider({
      current: {
        ...provider().current,
        wind: { speed: 3, direction: 10 },
      },
    });
    const combo = combine([a, b]);
    const dir = combo.current.wind.direction;
    expect(Math.min(dir, 360 - dir)).toBeCloseTo(0, 5);
    expect(combo.spread.current.windDirection).toBe(20);
  });

  it("picks the more severe symbol when providers tie 1-1-1", () => {
    const a = provider({ current: { ...provider().current, symbol: "clearsky_day" } });
    const b = provider({ current: { ...provider().current, symbol: "rain" } });
    const c = provider({ current: { ...provider().current, symbol: "fair_day" } });
    const combo = combine([a, b, c]);
    expect(combo.current.symbol).toBe("rain");
  });

  it("uses SMHI's grid as canonical (first provider) and combines only matching hours", () => {
    const smhi = provider();
    const met = provider({
      hourly: [
        // MET has an extra hour SMHI doesn't; it's dropped from the combo.
        {
          time: "2026-05-22T18:00:00Z",
          temperature: 11,
          precipitation: { amount: 0 },
          wind: { speed: 3, direction: 200 },
          symbol: "partlycloudy_day",
        },
        // Same time as SMHI's HOUR_A — combines with SMHI.
        {
          time: HOUR_A,
          temperature: 10,
          precipitation: { amount: 0 },
          wind: { speed: 3, direction: 200 },
          symbol: "partlycloudy_day",
        },
      ],
    });
    const combo = combine([smhi, met]);
    expect(combo.hourly).toHaveLength(2);
    expect(combo.hourly[0]?.time).toBe(HOUR_A);
    expect(combo.hourly[0]?.temperature).toBe(11);
    // HOUR_B has no MET match → single-provider bin → low confidence.
    expect(combo.hourly[1]?.time).toBe(HOUR_B);
    expect(combo.hourly[1]?.confidence).toBe("low");
    expect(combo.spread.hourly[1]).toEqual({});
  });

  it("means daily tempMin/tempMax independently and surfaces the spread", () => {
    const smhi = provider();
    const met = provider({
      daily: [
        {
          date: DAY_A,
          tempMin: 7,
          tempMax: 12,
          precipitation: { amount: 0.5 },
          symbol: "rain",
        },
      ],
    });
    const combo = combine([smhi, met]);
    expect(combo.daily[0]?.tempMin).toBe(8); // mean(9, 7)
    expect(combo.daily[0]?.tempMax).toBe(13); // mean(14, 12)
    expect(combo.daily[0]?.precipitation.amount).toBe(0.25);
    expect(combo.spread.daily[0]?.tempMin).toBe(2);
    expect(combo.spread.daily[0]?.tempMax).toBe(2);
    expect(combo.spread.daily[0]?.precipAmount).toBe(0.5);
    expect(combo.daily[0]?.symbol).toBe("rain"); // severity tiebreak picks rain
  });

  it("drops optional fields when no provider supplies them", () => {
    const noOptionals = provider({
      current: {
        time: HOUR_A,
        temperature: 12,
        precipitation: { amount: 0 },
        wind: { speed: 3, direction: 200 },
        symbol: "partlycloudy_day",
      },
    });
    const combo = combine([noOptionals]);
    expect(combo.current.humidity).toBeUndefined();
    expect(combo.current.pressure).toBeUndefined();
    expect(combo.current.cloudCover).toBeUndefined();
    expect(combo.current.feelsLike).toBeUndefined();
    expect(combo.current.precipitation.probability).toBeUndefined();
  });

  it("means optional fields when any provider supplies them", () => {
    const a = provider();
    const b = provider({
      current: {
        ...provider().current,
        humidity: 0.7,
        pressure: 1010,
        cloudCover: 0.6,
        feelsLike: 13,
      },
    });
    const combo = combine([a, b]);
    expect(combo.current.humidity).toBeCloseTo(0.6, 5);
    expect(combo.current.pressure).toBe(1012.5);
    expect(combo.current.cloudCover).toBeCloseTo(0.5, 5);
    expect(combo.current.feelsLike).toBe(12);
    expect(combo.spread.current.humidity).toBeCloseTo(0.2, 5);
    expect(combo.spread.current.pressure).toBe(5);
    expect(combo.spread.current.cloudCover).toBeCloseTo(0.2, 5);
  });

  it("means precipitation probability across providers", () => {
    const a = provider();
    const b = provider({
      current: {
        ...provider().current,
        precipitation: { amount: 0.2, probability: 0.5 },
      },
    });
    const combo = combine([a, b]);
    expect(combo.current.precipitation.amount).toBeCloseTo(0.1, 5);
    expect(combo.current.precipitation.probability).toBeCloseTo(0.3, 5);
    expect(combo.spread.current.precipAmount).toBeCloseTo(0.2, 5);
    expect(combo.spread.current.precipProbability).toBeCloseTo(0.4, 5);
  });

  it("throws on empty input", () => {
    expect(() => combine([])).toThrow(/at least one provider/);
  });
});
