import { describe, expect, it } from "vitest";
import { combine } from "../../src/combine/index.js";
import { ALGO_VERSION } from "../../src/combine/version.js";
import type { ProviderForecast } from "../../src/types/forecast.js";

function makeProvider(overrides: Partial<ProviderForecast> = {}): ProviderForecast {
  return {
    current: {
      time: "2026-05-22T10:00:00Z",
      temperature: 12.4,
      precipitation: { amount: 0 },
      wind: { speed: 3.2, direction: 200 },
      symbol: "partlycloudy_day",
    },
    hourly: [
      {
        time: "2026-05-22T11:00:00Z",
        temperature: 12.8,
        precipitation: { amount: 0 },
        wind: { speed: 3.0, direction: 195 },
        symbol: "partlycloudy_day",
      },
    ],
    daily: [
      {
        date: "2026-05-22",
        tempMin: 9.0,
        tempMax: 14.5,
        precipitation: { amount: 0 },
        symbol: "partlycloudy_day",
      },
    ],
    fetchedAt: "2026-05-22T10:30:00Z",
    attributionUrl: "https://www.smhi.se/data/oppna-data/villkor-for-anvandning",
    ...overrides,
  };
}

describe("combine (v0.1 skeleton)", () => {
  it("passes a single provider through with confidence=low", () => {
    const provider = makeProvider();
    const combo = combine([provider]);

    expect(combo.current).toEqual({ ...provider.current, confidence: "low" });
    expect(combo.hourly).toBe(provider.hourly);
    expect(combo.daily).toBe(provider.daily);
    expect(combo.spread).toEqual({});
    expect(combo.providerCount).toBe(1);
    expect(combo.algoVersion).toBe(ALGO_VERSION);
  });

  it("throws when given no providers", () => {
    expect(() => combine([])).toThrow(/at least one provider/);
  });

  it("throws when given multiple providers (v0.2)", () => {
    expect(() => combine([makeProvider(), makeProvider()])).toThrow(
      /not implemented yet/,
    );
  });
});
