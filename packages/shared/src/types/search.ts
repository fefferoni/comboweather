export interface SearchResult {
  /** Short display name, typically the city/locality. */
  name: string;
  /** Full Nominatim "display_name" — comma-separated administrative breadcrumb. */
  displayName: string;
  /** ISO-3166-1 alpha-2 country code (uppercase). */
  countryCode?: string;
  lat: number;
  lon: number;
}

export interface SearchResponse {
  /** The query as it was normalized for caching. */
  query: string;
  results: SearchResult[];
  /** ISO 8601 UTC — when the upstream geocoder was last hit. */
  fetchedAt: string;
  attributionUrl: string;
}
