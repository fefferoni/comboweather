import { describe, expect, it } from "vitest";
import fixture from "../fixtures/smhi/stockholm-2026-05-22.json";
import { parseSmhi, type SmhiPointResponse } from "../../src/providers/smhi.js";

const FETCHED_AT = "2026-05-22T10:30:00Z";

describe("parseSmhi", () => {
  it("maps the first timeSeries entry to current conditions", () => {
    const out = parseSmhi(fixture as SmhiPointResponse, FETCHED_AT);
    expect(out.current).toEqual({
      time: "2026-05-22T11:00:00Z",
      temperature: 12.4,
      precipitation: { amount: 0 },
      wind: { speed: 3.2, direction: 200 },
      symbol: "wsymb2_3",
      cloudCover: 0.5,
      pressure: 1013.2,
      humidity: 0.62,
    });
  });

  it("emits one HourPoint per timeSeries entry", () => {
    const out = parseSmhi(fixture as SmhiPointResponse, FETCHED_AT);
    expect(out.hourly).toHaveLength(4);
    expect(out.hourly[1]).toEqual({
      time: "2026-05-22T14:00:00Z",
      temperature: 15.1,
      precipitation: { amount: 0 },
      wind: { speed: 4.0, direction: 210 },
      symbol: "wsymb2_3",
    });
  });

  it("aggregates hourly into daily buckets with min/max/sum and dominant symbol", () => {
    const out = parseSmhi(fixture as SmhiPointResponse, FETCHED_AT);
    expect(out.daily).toEqual([
      {
        date: "2026-05-22",
        tempMin: 10.6,
        tempMax: 15.1,
        precipitation: { amount: 0.3 },
        symbol: "wsymb2_3",
      },
      {
        date: "2026-05-23",
        tempMin: 7.2,
        tempMax: 7.2,
        precipitation: { amount: 0 },
        symbol: "wsymb2_5",
      },
    ]);
  });

  it("records fetchedAt and SMHI attribution URL", () => {
    const out = parseSmhi(fixture as SmhiPointResponse, FETCHED_AT);
    expect(out.fetchedAt).toBe(FETCHED_AT);
    expect(out.attributionUrl).toMatch(/smhi\.se/);
  });

  it("throws when timeSeries is empty", () => {
    expect(() => parseSmhi({ approvedTime: "x", referenceTime: "x", timeSeries: [] }, FETCHED_AT)).toThrow(
      /no timeSeries/,
    );
  });

  it("throws when a required parameter is missing", () => {
    const broken: SmhiPointResponse = {
      approvedTime: "x",
      referenceTime: "x",
      timeSeries: [{ validTime: "2026-05-22T11:00:00Z", parameters: [] }],
    };
    expect(() => parseSmhi(broken, FETCHED_AT)).toThrow(/missing parameter "t"/);
  });
});
