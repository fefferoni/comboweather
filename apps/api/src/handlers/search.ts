import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import type { SearchResponse } from "@combo/shared";
import {
  NOMINATIM_ATTRIBUTION_URL,
  normalizeQuery,
  searchNominatim,
} from "../geocoding/nominatim.js";
import {
  createSearchesClient,
  type SearchesClient,
} from "../cache/searches.js";
import { captureException, initSentry } from "../sentry.js";

initSentry();

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 80;

let cachedClient: SearchesClient | undefined;

function getClient(): SearchesClient {
  if (!cachedClient) {
    const tableName = process.env.SEARCHES_TABLE;
    if (!tableName) throw new Error("SEARCHES_TABLE env var is not set");
    cachedClient = createSearchesClient({ tableName });
  }
  return cachedClient;
}

class BadRequest extends Error {}

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const raw = event.queryStringParameters?.q ?? "";
    if (typeof raw !== "string" || raw.trim().length < MIN_QUERY_LENGTH) {
      throw new BadRequest(
        `Query param "q" must be at least ${MIN_QUERY_LENGTH} characters`,
      );
    }
    if (raw.length > MAX_QUERY_LENGTH) {
      throw new BadRequest(
        `Query param "q" must be at most ${MAX_QUERY_LENGTH} characters`,
      );
    }

    const lang = event.queryStringParameters?.lang;
    const acceptLanguage =
      lang === "sv" ? "sv,en;q=0.8" : lang === "en" ? "en,sv;q=0.8" : undefined;

    const query = normalizeQuery(raw);
    const client = getClient();

    const cached = await client.get(query);
    if (cached) {
      const body: SearchResponse = {
        query,
        results: cached.results,
        fetchedAt: cached.fetchedAt,
        attributionUrl: NOMINATIM_ATTRIBUTION_URL,
      };
      return ok(body);
    }

    const results = await searchNominatim(query, {
      ...(acceptLanguage ? { acceptLanguage } : {}),
    });
    await client.put(query, results);

    const body: SearchResponse = {
      query,
      results,
      fetchedAt: new Date().toISOString(),
      attributionUrl: NOMINATIM_ATTRIBUTION_URL,
    };
    return ok(body);
  } catch (err) {
    if (err instanceof BadRequest) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: err.message }),
      };
    }
    captureException(err);
    console.error("search handler error", err);
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Search service unavailable" }),
    };
  }
};

function ok(body: SearchResponse): APIGatewayProxyResultV2 {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
    body: JSON.stringify(body),
  };
}
