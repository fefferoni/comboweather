import { describe, expect, it } from "vitest";
import fixture from "../fixtures/dmi/copenhagen-2026-05-22.json";
import { fetchDmi, parseDmi, type DmiCoverage } from "../../src/providers/dmi.js";

const FETCHED_AT = "2026-05-22T17:05:00Z";

describe("parseDmi (forecastedr / harmonie_dini_sf)", () => {
  it("maps index 0 to current conditions with derived symbol", () => {
    const out = parseDmi(fixture as DmiCoverage, FETCHED_AT);
    // precip=0, cloud=0.1 → DMI code 1 (clear) → MET "clearsky_day" at 17:00.
    expect(out.current).toEqual({
      time: "2026-05-22T17:00:00Z",
      temperature: 20.1,
      precipitation: { amount: 0 },
      wind: { speed: 4.2, direction: 270 },
      symbol: "clearsky_day",
      cloudCover: 0.1,
      pressure: 1020.0,
      humidity: 0.54,
    });
  });

  it("derives partly cloudy at night for moderate cloud cover", () => {
    const out = parseDmi(fixture as DmiCoverage, FETCHED_AT);
    // index 1: 20:00, precip=0, cloud=0.6 → DMI code 3 → partlycloudy_night.
    expect(out.hourly[1]?.symbol).toBe("partlycloudy_night");
  });

  it("derives rain when precipitation crosses 1 mm", () => {
    const out = parseDmi(fixture as DmiCoverage, FETCHED_AT);
    // index 2: precip=1.2 → DMI code 63 → "rain" (no day/night suffix).
    expect(out.hourly[2]).toEqual({
      time: "2026-05-22T23:00:00Z",
      temperature: 12.0,
      precipitation: { amount: 1.2 },
      wind: { speed: 2.3, direction: 212 },
      symbol: "rain",
    });
  });

  it("aggregates daily buckets with severity-tiebroken dominant symbol", () => {
    const out = parseDmi(fixture as DmiCoverage, FETCHED_AT);
    expect(out.daily).toEqual([
      {
        date: "2026-05-22",
        tempMin: 12.0,
        tempMax: 20.1,
        precipitation: { amount: expect.closeTo(1.2, 10) },
        symbol: "rain",
      },
      {
        date: "2026-05-23",
        tempMin: 9.5,
        tempMax: 9.5,
        precipitation: { amount: expect.closeTo(0.1, 10) },
        symbol: "lightrain",
      },
    ]);
  });

  it("records fetchedAt and DMI attribution URL", () => {
    const out = parseDmi(fixture as DmiCoverage, FETCHED_AT);
    expect(out.fetchedAt).toBe(FETCHED_AT);
    expect(out.attributionUrl).toMatch(/dmi\.dk/);
  });

  it("throws when the time axis is empty", () => {
    const empty: DmiCoverage = {
      type: "Coverage",
      domain: {
        type: "Domain",
        domainType: "PointSeries",
        axes: { x: { values: [0] }, y: { values: [0] }, t: { values: [] } },
      },
      ranges: {},
    };
    expect(() => parseDmi(empty, FETCHED_AT)).toThrow(/no time axis/);
  });

  it("throws when temperature is missing for a step", () => {
    const broken: DmiCoverage = {
      type: "Coverage",
      domain: {
        type: "Domain",
        domainType: "PointSeries",
        axes: { x: { values: [0] }, y: { values: [0] }, t: { values: ["2026-05-22T17:00:00Z"] } },
      },
      ranges: {
        "wind-speed-10m": { type: "NdArray", values: [3] },
        "wind-dir-10m": { type: "NdArray", values: [200] },
        "total-precipitation": { type: "NdArray", values: [0] },
      },
    };
    expect(() => parseDmi(broken, FETCHED_AT)).toThrow(/missing required value for "temperature-2m"/);
  });
});

describe("fetchDmi", () => {
  it("hits the keyless opendataapi.dmi.dk host with rounded coords", async () => {
    let capturedUrl: string | undefined;
    const fakeFetch = (async (url: string) => {
      capturedUrl = url;
      return new Response(JSON.stringify(fixture), { status: 200 });
    }) as unknown as typeof fetch;

    const result = await fetchDmi(55.6789, 12.5683, { fetch: fakeFetch });
    expect(result).toBeDefined();
    expect(capturedUrl).toContain("opendataapi.dmi.dk");
    expect(capturedUrl).toContain("coords=POINT%2812.57+55.68%29");
    expect(capturedUrl).toContain("parameter-name=temperature-2m");
    expect(capturedUrl).not.toContain("api-key");
  });

  it("throws when DMI responds with a non-2xx status", async () => {
    const fakeFetch = (async () =>
      new Response("nope", { status: 503, statusText: "Service Unavailable" })) as unknown as typeof fetch;
    await expect(
      fetchDmi(55.68, 12.57, { fetch: fakeFetch }),
    ).rejects.toThrow(/DMI fetch failed: 503/);
  });
});
