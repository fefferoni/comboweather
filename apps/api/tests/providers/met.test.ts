import { describe, expect, it } from "vitest";
import fixture from "../fixtures/met/stockholm-2026-05-22.json";
import { parseMet, type MetLocationForecast } from "../../src/providers/met.js";

const FETCHED_AT = "2026-05-22T17:05:00Z";

describe("parseMet (locationforecast/2.0/compact)", () => {
  it("maps the first timeseries entry to current conditions", () => {
    const out = parseMet(fixture as MetLocationForecast, FETCHED_AT);
    expect(out.current).toEqual({
      time: "2026-05-22T17:00:00Z",
      temperature: 19.8,
      precipitation: { amount: 0, probability: 0.04 },
      wind: { speed: 4.1, direction: 272 },
      symbol: "fair_day",
      cloudCover: 0.18,
      pressure: 1019.4,
      humidity: 0.55,
    });
  });

  it("emits one HourPoint per timeseries entry", () => {
    const out = parseMet(fixture as MetLocationForecast, FETCHED_AT);
    expect(out.hourly).toHaveLength(4);
    expect(out.hourly[2]).toEqual({
      time: "2026-05-22T23:00:00Z",
      temperature: 11.4,
      precipitation: { amount: 0.6, probability: 0.4 },
      wind: { speed: 2.5, direction: 215 },
      symbol: "rainshowers_night",
    });
  });

  it("falls back to next_6_hours when next_1_hours is missing", () => {
    const out = parseMet(fixture as MetLocationForecast, FETCHED_AT);
    expect(out.hourly[3]).toEqual({
      time: "2026-05-23T05:00:00Z",
      temperature: 9.0,
      precipitation: { amount: 0.1, probability: 0.12 },
      wind: { speed: 2.1, direction: 198 },
      symbol: "cloudy",
    });
  });

  it("aggregates hourly into daily buckets with min/max/sum and dominant symbol", () => {
    const out = parseMet(fixture as MetLocationForecast, FETCHED_AT);
    expect(out.daily).toEqual([
      {
        date: "2026-05-22",
        tempMin: 11.4,
        tempMax: 19.8,
        precipitation: { amount: expect.closeTo(0.6, 10) },
        symbol: "rainshowers_night",
      },
      {
        date: "2026-05-23",
        tempMin: 9.0,
        tempMax: 9.0,
        precipitation: { amount: expect.closeTo(0.1, 10) },
        symbol: "cloudy",
      },
    ]);
  });

  it("records fetchedAt and MET attribution URL", () => {
    const out = parseMet(fixture as MetLocationForecast, FETCHED_AT);
    expect(out.fetchedAt).toBe(FETCHED_AT);
    expect(out.attributionUrl).toMatch(/api\.met\.no/);
  });

  it("throws when timeseries is empty", () => {
    const empty: MetLocationForecast = {
      type: "Feature",
      geometry: { type: "Point", coordinates: [0, 0, 0] satisfies number[] },
      properties: { meta: { updated_at: "x", units: {} }, timeseries: [] },
    };
    expect(() => parseMet(empty, FETCHED_AT)).toThrow(/no timeseries/);
  });

  it("throws when the first entry is missing air_temperature", () => {
    const broken: MetLocationForecast = {
      type: "Feature",
      geometry: { type: "Point", coordinates: [0, 0, 0] satisfies number[] },
      properties: {
        meta: { updated_at: "x", units: {} },
        timeseries: [
          {
            time: "2026-05-22T17:00:00Z",
            data: { instant: { details: { wind_speed: 1, wind_from_direction: 1 } } },
          },
        ],
      },
    };
    expect(() => parseMet(broken, FETCHED_AT)).toThrow(/missing instant\.details\.air_temperature/);
  });

  it("defaults precipitation to 0 and symbol to cloudy when no interval block is present", () => {
    const noInterval: MetLocationForecast = {
      type: "Feature",
      geometry: { type: "Point", coordinates: [0, 0, 0] satisfies number[] },
      properties: {
        meta: { updated_at: "x", units: {} },
        timeseries: [
          {
            time: "2026-05-22T17:00:00Z",
            data: {
              instant: {
                details: { air_temperature: 10, wind_speed: 1, wind_from_direction: 100 },
              },
            },
          },
        ],
      },
    };
    const out = parseMet(noInterval, FETCHED_AT);
    expect(out.current.precipitation).toEqual({ amount: 0 });
    expect(out.current.symbol).toBe("cloudy");
  });
});
