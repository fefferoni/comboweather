import type { ForecastResponse } from "@combo/shared";

const DEFAULT_BASE_URL =
  "https://7i3ujfuk72.execute-api.eu-north-1.amazonaws.com/dev";

function baseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  const raw = fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_BASE_URL;
  return raw.replace(/\/+$/, "");
}

export interface FetchForecastArgs {
  lat: number;
  lon: number;
  force?: boolean;
  signal?: AbortSignal;
}

export class ForecastFetchError extends Error {
  public readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ForecastFetchError";
    if (status !== undefined) this.status = status;
  }
}

export async function fetchForecast({
  lat,
  lon,
  force,
  signal,
}: FetchForecastArgs): Promise<ForecastResponse> {
  const params = new URLSearchParams({
    lat: lat.toFixed(2),
    lon: lon.toFixed(2),
  });
  if (force) params.set("force", "true");
  const url = `${baseUrl()}/forecast?${params.toString()}`;

  const init: RequestInit = {
    method: "GET",
    headers: { Accept: "application/json" },
  };
  if (signal) init.signal = signal;

  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ForecastFetchError(
      `Forecast request failed: ${res.status} ${text || res.statusText}`,
      res.status,
    );
  }
  return (await res.json()) as ForecastResponse;
}
