import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { SearchResponse } from "@combo/shared";

const DEFAULT_BASE_URL =
  "https://7i3ujfuk72.execute-api.eu-north-1.amazonaws.com/dev";

function baseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  const raw = fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_BASE_URL;
  return raw.replace(/\/+$/, "");
}

export class SearchFetchError extends Error {
  public readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "SearchFetchError";
    if (status !== undefined) this.status = status;
  }
}

export interface FetchSearchArgs {
  query: string;
  lang?: "sv" | "en";
  signal?: AbortSignal;
}

export async function fetchSearch({
  query,
  lang,
  signal,
}: FetchSearchArgs): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query });
  if (lang) params.set("lang", lang);
  const url = `${baseUrl()}/search?${params.toString()}`;

  const init: RequestInit = {
    method: "GET",
    headers: { Accept: "application/json" },
  };
  if (signal) init.signal = signal;

  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new SearchFetchError(
      `Search request failed: ${res.status} ${text || res.statusText}`,
      res.status,
    );
  }
  return (await res.json()) as SearchResponse;
}

export function useSearch(
  query: string,
  lang?: "sv" | "en",
): UseQueryResult<SearchResponse, Error> {
  const enabled = query.trim().length >= 2;
  return useQuery<SearchResponse, Error>({
    queryKey: ["search", query.trim().toLowerCase(), lang ?? "auto"],
    queryFn: ({ signal }) =>
      fetchSearch({
        query,
        ...(lang ? { lang } : {}),
        signal,
      }),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
}
