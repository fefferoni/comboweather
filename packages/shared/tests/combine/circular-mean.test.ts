import { describe, expect, it } from "vitest";
import { circularMean, circularSpread } from "../../src/combine/circular-mean.js";

describe("circularMean", () => {
  it("averages 350° and 10° to ~0° (the wraparound case)", () => {
    const result = circularMean([350, 10]);
    // Allow tiny float noise; semantically the result is 0/360.
    expect(Math.min(result, 360 - result)).toBeCloseTo(0, 5);
  });

  it("returns 100° for three identical bearings", () => {
    expect(circularMean([100, 100, 100])).toBeCloseTo(100, 5);
  });

  it("handles a positive-angle mean without wrapping", () => {
    expect(circularMean([90, 100, 110])).toBeCloseTo(100, 5);
  });

  it("wraps a negative atan2 result into [0, 360)", () => {
    // Bearings 190° and 200° → resultant angle in the third quadrant →
    // atan2 returns a negative radians value; circularMean must add 360.
    const result = circularMean([190, 200]);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeCloseTo(195, 5);
  });

  it("returns 0 when the vectors cancel out (e.g. 90° + 270°)", () => {
    expect(circularMean([90, 270])).toBe(0);
  });

  it("throws on an empty array", () => {
    expect(() => circularMean([])).toThrow(/at least one/);
  });
});

describe("circularSpread", () => {
  it("returns 0 for a single bearing", () => {
    expect(circularSpread([42])).toBe(0);
  });

  it("returns the absolute difference for two close bearings", () => {
    expect(circularSpread([100, 130])).toBe(30);
  });

  it("wraps to the shorter arc across 0°", () => {
    expect(circularSpread([350, 10])).toBe(20);
  });

  it("picks the widest pair when more than two bearings are present", () => {
    // pair (20, 200) → 180° (the widest pair wraps at exactly half-circle).
    expect(circularSpread([10, 20, 200])).toBe(180);
  });
});
