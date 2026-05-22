import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import {
  combine,
  type ForecastResponse,
  type ProviderForecast,
} from "@combo/shared";
import { roundCoord } from "../lib/geo.js";
import { fetchSmhi, parseSmhi } from "../providers/smhi.js";
import { createForecastsClient, type ForecastsClient } from "../cache/forecasts.js";
import { captureException, initSentry } from "../sentry.js";

initSentry();

const FRESH_MAX_AGE_MS = 30 * 60 * 1000;

let cachedClient: ForecastsClient | undefined;

function getClient(): ForecastsClient {
  if (!cachedClient) {
    const tableName = process.env.FORECASTS_TABLE;
    if (!tableName) throw new Error("FORECASTS_TABLE env var is not set");
    cachedClient = createForecastsClient({ tableName });
  }
  return cachedClient;
}

interface ParsedQuery {
  lat: number;
  lon: number;
  force: boolean;
}

function parseQuery(event: APIGatewayProxyEventV2): ParsedQuery {
  const q = event.queryStringParameters ?? {};
  const lat = Number(q.lat);
  const lon = Number(q.lon);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new BadRequest('Query param "lat" must be a number in [-90, 90]');
  }
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    throw new BadRequest('Query param "lon" must be a number in [-180, 180]');
  }
  return {
    lat: roundCoord(lat),
    lon: roundCoord(lon),
    force: q.force === "true",
  };
}

class BadRequest extends Error {}

function isFresh(fetchedAt: string, now: number): boolean {
  const t = Date.parse(fetchedAt);
  return Number.isFinite(t) && now - t < FRESH_MAX_AGE_MS;
}

async function getSmhiForecast(
  client: ForecastsClient,
  lat: number,
  lon: number,
  force: boolean,
): Promise<ProviderForecast> {
  const now = Date.now();
  if (!force) {
    const cached = await client.getProvider(lat, lon, "smhi");
    if (cached && isFresh(cached.fetchedAt, now)) return cached.data;
  }
  const raw = await fetchSmhi(lat, lon);
  const data = parseSmhi(raw, new Date(now).toISOString());
  await client.putProvider(lat, lon, "smhi", data);
  return data;
}

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const { lat, lon, force } = parseQuery(event);
    const client = getClient();

    const smhi = await getSmhiForecast(client, lat, lon, force);

    // v0.1 has one provider, so combine() is a near-passthrough — always
    // recompute. The combo row is still persisted so v0.2's multi-provider
    // cache + algoVersion-bump recompute path has the schema to build on.
    const combo = combine([smhi]);
    await client.putCombo(lat, lon, combo);

    const body: ForecastResponse = {
      location: { lat, lon },
      fetchedAt: new Date().toISOString(),
      combo,
      providers: { smhi },
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
      },
      body: JSON.stringify(body),
    };
  } catch (err) {
    if (err instanceof BadRequest) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: err.message }),
      };
    }
    captureException(err);
    console.error("forecast handler error", err);
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Upstream forecast unavailable" }),
    };
  }
};
