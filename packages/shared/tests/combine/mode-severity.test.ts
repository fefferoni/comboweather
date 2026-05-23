import { describe, expect, it } from "vitest";
import { modeSeverity } from "../../src/combine/mode-severity.js";

describe("modeSeverity", () => {
  it("returns the only symbol when all agree", () => {
    expect(modeSeverity(["clearsky_day", "clearsky_day", "clearsky_day"])).toBe("clearsky_day");
  });

  it("picks the majority when one symbol dominates", () => {
    expect(modeSeverity(["rain", "clearsky_day", "rain"])).toBe("rain");
  });

  it("breaks ties in favor of the more severe symbol", () => {
    // Three single-occurrence symbols — pure tie → severity wins.
    // severity: clearsky=0, fair_day=1, rain=5 → rain.
    expect(modeSeverity(["clearsky_day", "fair_day", "rain"])).toBe("rain");
  });

  it("treats unknown symbols as cloudy-severity for tiebreaking", () => {
    // "weirdcode" is unknown → mapped to cloudy (sev 3). Beats clearsky (0)
    // by severity tiebreak.
    expect(modeSeverity(["clearsky_day", "weirdcode"])).toBe("weirdcode");
  });

  it("returns the single element for a one-symbol input", () => {
    expect(modeSeverity(["fair_night"])).toBe("fair_night");
  });

  it("throws on an empty array", () => {
    expect(() => modeSeverity([])).toThrow(/at least one/);
  });
});
