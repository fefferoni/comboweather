import { describe, expect, it } from "vitest";
import { mean, range } from "../../src/combine/util.js";

describe("mean", () => {
  it("averages a small array", () => {
    expect(mean([1, 2, 3])).toBe(2);
  });

  it("returns the single value for a one-element array", () => {
    expect(mean([7.5])).toBe(7.5);
  });

  it("throws on an empty array", () => {
    expect(() => mean([])).toThrow(/at least one/);
  });
});

describe("range", () => {
  it("returns max - min", () => {
    expect(range([1, 5, 3])).toBe(4);
  });

  it("handles descending values", () => {
    expect(range([5, 4, 3])).toBe(2);
  });

  it("returns 0 for a single value", () => {
    expect(range([9])).toBe(0);
  });

  it("throws on an empty array", () => {
    expect(() => range([])).toThrow(/at least one/);
  });
});
