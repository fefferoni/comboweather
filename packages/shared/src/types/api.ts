import type { ComboForecast, ProviderForecast, ProviderId } from "./forecast.js";

export interface ForecastRequest {
  lat: number;
  lon: number;
  lang?: "sv" | "en";
  force?: boolean;
}

export type ProviderBlock = Partial<Record<ProviderId, ProviderForecast>>;

export interface ForecastResponse {
  location: { lat: number; lon: number };
  /** ISO 8601 UTC — when this composite response was assembled. */
  fetchedAt: string;
  combo: ComboForecast;
  providers: ProviderBlock;
}
