import { describe, expect, it } from "vitest";
import { locationKey, roundCoord } from "../../src/lib/geo.js";

describe("geo", () => {
  it("rounds to 2 decimals", () => {
    expect(roundCoord(59.3298765)).toBe(59.33);
    expect(roundCoord(18.071)).toBe(18.07);
    expect(roundCoord(0.004)).toBe(0);
    expect(roundCoord(-12.346)).toBe(-12.35);
  });

  it("builds a stable location key", () => {
    expect(locationKey(59.3298, 18.07)).toBe("loc#59.33#18.07");
    expect(locationKey(59.33, 18.07)).toBe(locationKey(59.3298, 18.0712));
  });

  it("pads coords with trailing zero where needed", () => {
    expect(locationKey(60, 15)).toBe("loc#60.00#15.00");
  });
});
