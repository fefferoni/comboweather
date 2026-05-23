import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import {
  ALGO_VERSION,
  combine,
  type ForecastResponse,
  type ProviderForecast,
  type ProviderId,
} from "@combo/shared";
import { roundCoord } from "../lib/geo.js";
import { fetchSmhi, parseSmhi } from "../providers/smhi.js";
import { fetchMet, parseMet } from "../providers/met.js";
import { fetchDmi, parseDmi } from "../providers/dmi.js";
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

interface ProviderRunner<Raw> {
  id: ProviderId;
  fetch: (lat: number, lon: number) => Promise<Raw | null>;
  parse: (raw: Raw, fetchedAt: string) => ProviderForecast;
}

const RUNNERS: ProviderRunner<unknown>[] = [
  // Order matters: combine() uses the first non-null result as the canonical
  // time grid, and we want SMHI's grid driving the combo.
  { id: "smhi", fetch: fetchSmhi as ProviderRunner<unknown>["fetch"], parse: parseSmhi as ProviderRunner<unknown>["parse"] },
  { id: "met", fetch: fetchMet as ProviderRunner<unknown>["fetch"], parse: parseMet as ProviderRunner<unknown>["parse"] },
  { id: "dmi", fetch: fetchDmi as ProviderRunner<unknown>["fetch"], parse: parseDmi as ProviderRunner<unknown>["parse"] },
];

interface ResolvedProvider {
  id: ProviderId;
  forecast: ProviderForecast | null;
  error?: Error;
}

async function resolveProvider(
  runner: ProviderRunner<unknown>,
  client: ForecastsClient,
  lat: number,
  lon: number,
  force: boolean,
): Promise<ResolvedProvider> {
  const now = Date.now();
  try {
    if (!force) {
      const cached = await client.getProvider(lat, lon, runner.id);
      if (cached && isFresh(cached.fetchedAt, now)) {
        return { id: runner.id, forecast: cached.data };
      }
    }
    const raw = await runner.fetch(lat, lon);
    // Runner.fetch is typed as returning `Raw | null` to leave room for
    // future "deliberately offline" providers; today no runner uses that.
    if (raw === null) return { id: runner.id, forecast: null };
    const data = runner.parse(raw, new Date(now).toISOString());
    await client.putProvider(lat, lon, runner.id, data);
    return { id: runner.id, forecast: data };
  } catch (err) {
    // Per-provider failures are tolerated; combine() runs on whatever survived.
    const error = err instanceof Error ? err : new Error(String(err));
    captureException(error);
    console.error(`provider ${runner.id} failed`, error);
    return { id: runner.id, forecast: null, error };
  }
}

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const { lat, lon, force } = parseQuery(event);
    const client = getClient();

    const resolved = await Promise.all(
      RUNNERS.map((r) => resolveProvider(r, client, lat, lon, force)),
    );

    const successes = resolved.filter((r) => r.forecast !== null);
    if (successes.length === 0) {
      throw new Error("All upstream providers failed");
    }

    const combo = combine(successes.map((r) => r.forecast!));
    await client.putCombo(lat, lon, combo);

    const providers: ForecastResponse["providers"] = {};
    for (const r of successes) {
      providers[r.id] = r.forecast!;
    }

    const body: ForecastResponse = {
      location: { lat, lon },
      fetchedAt: new Date().toISOString(),
      combo,
      providers,
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
        "X-Algo-Version": String(ALGO_VERSION),
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
