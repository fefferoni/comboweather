import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { ForecastResponse } from "@combo/shared";
import { fetchForecast } from "./client";

const STALE_MS = 30 * 60 * 1000;

export function useForecast(
  coords: { lat: number; lon: number } | null,
): UseQueryResult<ForecastResponse, Error> {
  return useQuery<ForecastResponse, Error>({
    queryKey: coords
      ? ["forecast", roundKey(coords.lat), roundKey(coords.lon)]
      : ["forecast", "pending"],
    queryFn: ({ signal }) => {
      if (!coords) throw new Error("No location");
      return fetchForecast({ lat: coords.lat, lon: coords.lon, signal });
    },
    enabled: coords !== null,
    staleTime: STALE_MS,
    gcTime: 60 * 60 * 1000,
    retry: 2,
  });
}

// Match the backend's 2-decimal cache key — keeps cache hits aligned and
// prevents needless refetches as the GPS jitters within ~1 km.
function roundKey(n: number): number {
  return Math.round(n * 100) / 100;
}
