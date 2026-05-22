import { describe, expect, it } from "vitest";
import fixture from "../fixtures/smhi/stockholm-2026-05-22.json";
import { parseSmhi, type SmhiPointResponse } from "../../src/providers/smhi.js";

const FETCHED_AT = "2026-05-22T17:05:00Z";

describe("parseSmhi (snow1g/v1)", () => {
  it("maps the first timeSeries entry to current conditions", () => {
    const out = parseSmhi(fixture as SmhiPointResponse, FETCHED_AT);
    expect(out.current).toEqual({
      time: "2026-05-22T17:00:00Z",
      temperature: 20.3,
      precipitation: { amount: 0, probability: 0.03 },
      wind: { speed: 4.3, direction: 267 },
      symbol: "smhi_1",
      cloudCover: 0.12,
      pressure: 1020.6,
      humidity: 0.52,
    });
  });

  it("emits one HourPoint per timeSeries entry", () => {
    const out = parseSmhi(fixture as SmhiPointResponse, FETCHED_AT);
    expect(out.hourly).toHaveLength(4);
    expect(out.hourly[2]).toEqual({
      time: "2026-05-22T23:00:00Z",
      temperature: 11.8,
      precipitation: { amount: 0.4, probability: 0.35 },
      wind: { speed: 2.4, direction: 210 },
      symbol: "smhi_9",
    });
  });

  it("aggregates hourly into daily buckets with min/max/sum and dominant symbol", () => {
    const out = parseSmhi(fixture as SmhiPointResponse, FETCHED_AT);
    expect(out.daily).toEqual([
      {
        date: "2026-05-22",
        tempMin: 11.8,
        tempMax: 20.3,
        // 0 + 0 + 0.4 — use closeTo to absorb floating-point noise.
        precipitation: { amount: expect.closeTo(0.4, 10) },
        symbol: "smhi_1",
      },
      {
        date: "2026-05-23",
        tempMin: 9.2,
        tempMax: 9.2,
        precipitation: { amount: 0 },
        symbol: "smhi_5",
      },
    ]);
  });

  it("records fetchedAt and SMHI attribution URL", () => {
    const out = parseSmhi(fixture as SmhiPointResponse, FETCHED_AT);
    expect(out.fetchedAt).toBe(FETCHED_AT);
    expect(out.attributionUrl).toMatch(/smhi\.se/);
  });

  it("throws when timeSeries is empty", () => {
    const empty: SmhiPointResponse = {
      createdTime: "x",
      referenceTime: "x",
      geometry: { type: "Point", coordinates: [0, 0] },
      timeSeries: [],
    };
    expect(() => parseSmhi(empty, FETCHED_AT)).toThrow(/no timeSeries/);
  });

  it("throws when a required parameter is missing", () => {
    const broken: SmhiPointResponse = {
      createdTime: "x",
      referenceTime: "x",
      geometry: { type: "Point", coordinates: [0, 0] },
      timeSeries: [{ time: "2026-05-22T17:00:00Z", data: {} }],
    };
    expect(() => parseSmhi(broken, FETCHED_AT)).toThrow(/missing parameter "air_temperature"/);
  });
});
