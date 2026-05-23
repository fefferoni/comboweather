import { describe, expect, it } from "vitest";
import { confidenceFromTempSpread } from "../../src/combine/confidence.js";

describe("confidenceFromTempSpread", () => {
  it("returns high when 3 providers agree tightly", () => {
    // score = 3 × (1 − 0/5) = 3.0 → high
    expect(confidenceFromTempSpread(3, 0)).toBe("high");
  });

  it("returns high when 3 providers have moderate spread", () => {
    // score = 3 × (1 − 1/5) = 2.4 → not high (2.4 < 2.5) → medium.
    expect(confidenceFromTempSpread(3, 1)).toBe("medium");
    // score = 3 × (1 − 0.5/5) = 2.7 → high.
    expect(confidenceFromTempSpread(3, 0.5)).toBe("high");
  });

  it("returns high when 2 providers agree perfectly", () => {
    // score = 2 × (1 − 0/5) = 2.0 → not high (<2.5) → medium.
    expect(confidenceFromTempSpread(2, 0)).toBe("medium");
  });

  it("returns medium for typical 2-of-3 cases with some spread", () => {
    // score = 2 × (1 − 1/5) = 1.6 → medium.
    expect(confidenceFromTempSpread(2, 1)).toBe("medium");
  });

  it("returns low when there's only one provider", () => {
    // score = 1 × (1 − 0/5) = 1.0 → low (< 1.5)
    expect(confidenceFromTempSpread(1, 0)).toBe("low");
  });

  it("returns low when the spread exceeds the saturation point", () => {
    // 3 providers but 6°C apart → normalized = 1 → score = 0 → low.
    expect(confidenceFromTempSpread(3, 6)).toBe("low");
  });

  it("treats negative or zero provider counts as low (defensive)", () => {
    expect(confidenceFromTempSpread(0, 0)).toBe("low");
    expect(confidenceFromTempSpread(-1, 0)).toBe("low");
  });

  it("clamps negative spread inputs to zero", () => {
    // Range can never be negative in practice, but the function should
    // still produce a sane answer if it ever sees one.
    expect(confidenceFromTempSpread(3, -2)).toBe("high");
  });
});
