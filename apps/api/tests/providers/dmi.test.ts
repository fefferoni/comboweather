import { describe, expect, it } from "vitest";
import fixture from "../fixtures/dmi/copenhagen-2026-05-22.json";
import { fetchDmi, parseDmi, type DmiCoverage } from "../../src/providers/dmi.js";

const FETCHED_AT = "2026-05-22T17:05:00Z";

describe("parseDmi (forecastedr / harmonie_dini_sf)", () => {
  it("converts Kelvin temperature to Celsius for current conditions", () => {
    const out = parseDmi(fixture as DmiCoverage, FETCHED_AT);
    // 293.25 K → 20.10 °C. Float subtraction has noise so use closeTo.
    expect(out.current.temperature).toBeCloseTo(20.1, 5);
    expect(out.current.time).toBe("2026-05-22T17:00:00Z");
  });

  it("converts pressure from Pa to hPa", () => {
    const out = parseDmi(fixture as DmiCoverage, FETCHED_AT);
    // 102000 Pa = 1020.0 hPa
    expect(out.current.pressure).toBe(1020.0);
  });

  it("normalizes relative humidity from percent to 0..1", () => {
    const out = parseDmi(fixture as DmiCoverage, FETCHED_AT);
    expect(out.current.humidity).toBeCloseTo(0.54, 5);
  });

  it("passes cloud cover through (it's already 0..1)", () => {
    const out = parseDmi(fixture as DmiCoverage, FETCHED_AT);
    expect(out.current.cloudCover).toBe(0.1);
  });

  it("derives a clear-sky symbol when precip=0 and clouds<15%", () => {
    const out = parseDmi(fixture as DmiCoverage, FETCHED_AT);
    expect(out.current.symbol).toBe("clearsky_day");
  });

  it("treats total-precipitation as accumulated and emits the per-hour delta", () => {
    const out = parseDmi(fixture as DmiCoverage, FETCHED_AT);
    // Accumulated series: [0, 0, 1.2, 1.3] → per-hour: [0, 0, 1.2, 0.1]
    expect(out.hourly[0]?.precipitation.amount).toBe(0);
    expect(out.hourly[1]?.precipitation.amount).toBe(0);
    expect(out.hourly[2]?.precipitation.amount).toBeCloseTo(1.2, 5);
    expect(out.hourly[3]?.precipitation.amount).toBeCloseTo(0.1, 5);
  });

  it("clamps a decreasing accumulated series to 0 (defensive)", () => {
    // Real-world DMI runs sometimes show tiny floating-point dips at the
    // hourly granularity. The parser must never report negative precip.
    const dippy = JSON.parse(JSON.stringify(fixture)) as DmiCoverage;
    dippy.ranges["total-precipitation"]!.values = [0.5, 0.4, 0.6, 0.6];
    const out = parseDmi(dippy, FETCHED_AT);
    const got = out.hourly.map((h) => h.precipitation.amount);
    expect(got[0]).toBe(0.5);
    expect(got[1]).toBe(0);
    expect(got[2]).toBeCloseTo(0.2, 5);
    expect(got[3]).toBe(0);
  });

  it("derives partly cloudy at night when precip=0 and clouds≈50%", () => {
    const out = parseDmi(fixture as DmiCoverage, FETCHED_AT);
    // index 1: 20:00 (night), precip=0, cloud=0.6 → DMI code 3 → partlycloudy_night.
    expect(out.hourly[1]?.symbol).toBe("partlycloudy_night");
  });

  it("derives rain (no day/night suffix) when per-hour precip ≥ 1 mm", () => {
    const out = parseDmi(fixture as DmiCoverage, FETCHED_AT);
    // index 2: per-hour precip 1.2 → DMI code 63 → "rain".
    expect(out.hourly[2]).toMatchObject({
      time: "2026-05-22T23:00:00Z",
      wind: { speed: 2.3, direction: 212 },
      symbol: "rain",
    });
    expect(out.hourly[2]?.temperature).toBeCloseTo(12.0, 5);
  });

  it("aggregates daily buckets with severity-tiebroken dominant symbol", () => {
    const out = parseDmi(fixture as DmiCoverage, FETCHED_AT);
    expect(out.daily).toHaveLength(2);
    expect(out.daily[0]?.date).toBe("2026-05-22");
    expect(out.daily[0]?.tempMin).toBeCloseTo(12.0, 5);
    expect(out.daily[0]?.tempMax).toBeCloseTo(20.1, 5);
    expect(out.daily[0]?.precipitation.amount).toBeCloseTo(1.2, 5);
    expect(out.daily[0]?.symbol).toBe("rain");
    expect(out.daily[1]?.date).toBe("2026-05-23");
    expect(out.daily[1]?.precipitation.amount).toBeCloseTo(0.1, 5);
    expect(out.daily[1]?.symbol).toBe("lightrain");
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
        domainType: "Grid",
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
        domainType: "Grid",
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
  it("hits the keyless opendataapi.dmi.dk host with rounded coords and the corrected parameter list", async () => {
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
    // The collection rejects the whole request if any param name is wrong;
    // pin the corrected spelling so a regression here fails locally.
    expect(capturedUrl).toContain("pressure-sealevel");
    expect(capturedUrl).not.toContain("pressure-sea-level");
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
