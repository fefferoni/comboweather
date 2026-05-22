import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { ProviderForecast, ComboForecast, ProviderId } from "@combo/shared";
import { locationKey } from "../lib/geo.js";

const ONE_DAY_SECONDS = 24 * 60 * 60;

export type ForecastSk = `provider#${ProviderId | "combo"}`;

export interface ForecastRow {
  pk: string;
  sk: ForecastSk;
  data: ProviderForecast | ComboForecast;
  fetchedAt: string;
  algoVersion?: number;
  ttl: number;
}

export interface ForecastsClient {
  getProvider(
    lat: number,
    lon: number,
    provider: ProviderId,
  ): Promise<{ data: ProviderForecast; fetchedAt: string } | undefined>;
  putProvider(
    lat: number,
    lon: number,
    provider: ProviderId,
    data: ProviderForecast,
  ): Promise<void>;
  getCombo(
    lat: number,
    lon: number,
  ): Promise<{ data: ComboForecast; fetchedAt: string; algoVersion: number } | undefined>;
  putCombo(lat: number, lon: number, data: ComboForecast): Promise<void>;
}

export function createForecastsClient(options: {
  tableName: string;
  client?: DynamoDBDocumentClient;
}): ForecastsClient {
  const doc =
    options.client ??
    DynamoDBDocumentClient.from(
      new DynamoDBClient({
        ...(process.env.DYNAMO_LOCAL_ENDPOINT
          ? { endpoint: process.env.DYNAMO_LOCAL_ENDPOINT }
          : {}),
      }),
    );

  async function get(
    pk: string,
    sk: ForecastSk,
  ): Promise<ForecastRow | undefined> {
    const out = await doc.send(
      new GetCommand({ TableName: options.tableName, Key: { pk, sk } }),
    );
    return out.Item as ForecastRow | undefined;
  }

  async function put(row: ForecastRow): Promise<void> {
    await doc.send(new PutCommand({ TableName: options.tableName, Item: row }));
  }

  return {
    async getProvider(lat, lon, provider) {
      const pk = locationKey(lat, lon);
      const row = await get(pk, `provider#${provider}`);
      if (!row) return undefined;
      return { data: row.data as ProviderForecast, fetchedAt: row.fetchedAt };
    },
    async putProvider(lat, lon, provider, data) {
      const fetchedAt = new Date().toISOString();
      await put({
        pk: locationKey(lat, lon),
        sk: `provider#${provider}`,
        data,
        fetchedAt,
        ttl: Math.floor(Date.now() / 1000) + ONE_DAY_SECONDS,
      });
    },
    async getCombo(lat, lon) {
      const pk = locationKey(lat, lon);
      const row = await get(pk, "provider#combo");
      if (!row || row.algoVersion === undefined) return undefined;
      return {
        data: row.data as ComboForecast,
        fetchedAt: row.fetchedAt,
        algoVersion: row.algoVersion,
      };
    },
    async putCombo(lat, lon, data) {
      const fetchedAt = new Date().toISOString();
      await put({
        pk: locationKey(lat, lon),
        sk: "provider#combo",
        data,
        fetchedAt,
        algoVersion: data.algoVersion,
        ttl: Math.floor(Date.now() / 1000) + ONE_DAY_SECONDS,
      });
    },
  };
}
