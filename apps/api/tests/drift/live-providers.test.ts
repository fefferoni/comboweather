/**
 * Live drift detection — hits each provider's real API and runs it through
 * the production parsers. Gated by RUN_LIVE_DRIFT=1 so day-to-day CI doesn't
 * pay the network cost or block on upstream availability. The
 * `.github/workflows/drift-check.yml` workflow runs this once a day at
 * 06:00 UTC.
 *
 * What this catches:
 *   - Upstream provider changes shape (field rename, removal, restructure)
 *   - Parser blows up on a previously-tolerated edge case
 *   - Provider domain is unreachable / has rotated certs
 *
 * What this does NOT catch:
 *   - Subtle semantic drift (e.g. units changed from m/s to km/h with same
 *     field name) — would need value-range heuristics; deferred.
 */
import { describe, expect, it } from "vitest";
import { fetchSmhi, parseSmhi } from "../../src/providers/smhi.js";
import { fetchMet, parseMet } from "../../src/providers/met.js";
import { fetchDmi, parseDmi } from "../../src/providers/dmi.js";

const RUN_LIVE = process.env.RUN_LIVE_DRIFT === "1";

// Stockholm — covered by SMHI's Sweden domain and MET's global domain.
const SE_LAT = 59.33;
const SE_LON = 18.07;
// Copenhagen — primary coverage for DMI's harmonie_dini_sf.
const DK_LAT = 55.68;
const DK_LON = 12.57;

describe.skipIf(!RUN_LIVE)("live drift — providers", () => {
  it("SMHI snow1g/v1 parser handles a live response", async () => {
    const raw = await fetchSmhi(SE_LAT, SE_LON);
    const parsed = parseSmhi(raw, new Date().toISOString());
    expect(parsed.hourly.length).toBeGreaterThan(0);
    expect(parsed.daily.length).toBeGreaterThan(0);
    expect(typeof parsed.current.temperature).toBe("number");
    expect(typeof parsed.current.wind.speed).toBe("number");
    expect(typeof parsed.current.wind.direction).toBe("number");
    expect(parsed.current.symbol).toMatch(/^[a-z]/);
  }, 30000);

  it("MET locationforecast/2.0/compact parser handles a live response", async () => {
    const raw = await fetchMet(SE_LAT, SE_LON);
    const parsed = parseMet(raw, new Date().toISOString());
    expect(parsed.hourly.length).toBeGreaterThan(0);
    expect(parsed.daily.length).toBeGreaterThan(0);
    expect(typeof parsed.current.temperature).toBe("number");
    expect(parsed.current.symbol).toMatch(/^[a-z]/);
  }, 30000);

  it("DMI forecastedr parser handles a live response", async () => {
    const raw = await fetchDmi(DK_LAT, DK_LON);
    const parsed = parseDmi(raw, new Date().toISOString());
    expect(parsed.hourly.length).toBeGreaterThan(0);
    expect(parsed.daily.length).toBeGreaterThan(0);
    expect(typeof parsed.current.temperature).toBe("number");
  }, 30000);
});
