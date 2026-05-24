import type { SearchResult } from "@combo/shared";

// Nominatim usage policy:
//   https://operations.osmfoundation.org/policies/nominatim/
// Identify the app via User-Agent, throttle to ≤ 1 req/s globally — we satisfy
// that by caching aggressively in DDB (see searches.ts). Country filter is
// scoped to the Nordics since that's the v1 launch geography.
const NOMINATIM_HOST = "https://nominatim.openstreetmap.org";
const NORDIC_COUNTRY_CODES = "se,no,dk,fi";
export const NOMINATIM_ATTRIBUTION_URL =
  "https://operations.osmfoundation.org/policies/nominatim/";
const USER_AGENT =
  "ComboWeather/0.4 (https://github.com/fefferoni/comboweather)";

interface NominatimItem {
  name?: string;
  display_name?: string;
  lat: string;
  lon: string;
  address?: {
    country_code?: string;
  };
}

export interface NominatimOptions {
  /** Per-request limit; Nominatim caps at 50 but 8 is plenty for a picker. */
  limit?: number;
  /** Accept-Language header value; influences display_name localization. */
  acceptLanguage?: string;
  /** Override for tests. */
  fetchImpl?: typeof fetch;
}

export async function searchNominatim(
  query: string,
  options: NominatimOptions = {},
): Promise<SearchResult[]> {
  const limit = options.limit ?? 8;
  const acceptLanguage = options.acceptLanguage ?? "sv,en;q=0.8";
  const fetchImpl = options.fetchImpl ?? fetch;

  const url = new URL(`${NOMINATIM_HOST}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", NORDIC_COUNTRY_CODES);

  const response = await fetchImpl(url.toString(), {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept-Language": acceptLanguage,
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim returned ${response.status}`);
  }

  const items = (await response.json()) as NominatimItem[];
  const results: SearchResult[] = [];
  for (const item of items) {
    const lat = Number(item.lat);
    const lon = Number(item.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const displayName = item.display_name ?? "";
    if (!displayName) continue;
    const name = item.name && item.name.length > 0
      ? item.name
      : displayName.split(",")[0]!.trim();
    const result: SearchResult = {
      name,
      displayName,
      lat,
      lon,
    };
    if (item.address?.country_code) {
      result.countryCode = item.address.country_code.toUpperCase();
    }
    results.push(result);
  }
  return results;
}

/** Lowercase, trim, collapse whitespace — used both as cache key and outbound query. */
export function normalizeQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase();
}
