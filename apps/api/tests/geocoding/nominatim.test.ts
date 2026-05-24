import { describe, expect, it, vi } from "vitest";
import { normalizeQuery, searchNominatim } from "../../src/geocoding/nominatim.js";

const FIXTURE = [
  {
    name: "Stockholm",
    display_name: "Stockholm, Stockholms län, Sverige",
    lat: "59.3293235",
    lon: "18.0685808",
    address: { country_code: "se" },
  },
  {
    name: "Old Town",
    display_name: "Gamla stan, Stockholm, Sverige",
    lat: "59.3257",
    lon: "18.0717",
    address: { country_code: "se" },
  },
];

function mockFetch(body: unknown, status = 200) {
  return vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

describe("normalizeQuery", () => {
  it("trims, lowercases, and collapses whitespace", () => {
    expect(normalizeQuery("  Stockholm  ")).toBe("stockholm");
    expect(normalizeQuery("New\tYork  City")).toBe("new york city");
    expect(normalizeQuery("ÅRE")).toBe("åre");
  });
});

describe("searchNominatim", () => {
  it("maps Nominatim items to SearchResult shape", async () => {
    const fetchImpl = mockFetch(FIXTURE);
    const out = await searchNominatim("stockholm", { fetchImpl });
    expect(out).toEqual([
      {
        name: "Stockholm",
        displayName: "Stockholm, Stockholms län, Sverige",
        countryCode: "SE",
        lat: 59.3293235,
        lon: 18.0685808,
      },
      {
        name: "Old Town",
        displayName: "Gamla stan, Stockholm, Sverige",
        countryCode: "SE",
        lat: 59.3257,
        lon: 18.0717,
      },
    ]);
  });

  it("sets User-Agent and country filter on the upstream call", async () => {
    const fetchImpl = mockFetch([]);
    await searchNominatim("malmö", { fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const call = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(call[0]).toContain("countrycodes=se%2Cno%2Cdk%2Cfi");
    expect(call[0]).toContain("q=malm%C3%B6");
    expect(call[1].headers).toMatchObject({
      "User-Agent": expect.stringContaining("ComboWeather"),
    });
  });

  it("falls back to display_name when item.name is missing", async () => {
    const fetchImpl = mockFetch([
      { display_name: "Älta, Nacka, Sverige", lat: "59.27", lon: "18.18" },
    ]);
    const [result] = await searchNominatim("älta", { fetchImpl });
    expect(result?.name).toBe("Älta");
    expect(result?.countryCode).toBeUndefined();
  });

  it("skips entries with non-numeric coordinates", async () => {
    const fetchImpl = mockFetch([
      { name: "Bad", display_name: "Bad", lat: "not-a-number", lon: "1" },
      { name: "Good", display_name: "Good", lat: "1", lon: "2" },
    ]);
    const out = await searchNominatim("anything", { fetchImpl });
    expect(out).toHaveLength(1);
    expect(out[0]?.name).toBe("Good");
  });

  it("skips entries without a display_name", async () => {
    const fetchImpl = mockFetch([
      { lat: "1", lon: "2" },
      { name: "Has it", display_name: "Has it, Sverige", lat: "3", lon: "4" },
    ]);
    const out = await searchNominatim("foo", { fetchImpl });
    expect(out).toHaveLength(1);
    expect(out[0]?.name).toBe("Has it");
  });

  it("throws on non-2xx upstream responses", async () => {
    const fetchImpl = mockFetch({}, 503);
    await expect(searchNominatim("x", { fetchImpl })).rejects.toThrow(
      /Nominatim returned 503/,
    );
  });
});
