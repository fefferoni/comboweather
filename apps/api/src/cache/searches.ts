import { createHash } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { SearchResult } from "@combo/shared";

const ONE_WEEK_SECONDS = 7 * 24 * 60 * 60;

export interface SearchRow {
  pk: string;
  query: string;
  results: SearchResult[];
  fetchedAt: string;
  ttl: number;
}

export interface SearchesClient {
  get(
    normalizedQuery: string,
  ): Promise<{ results: SearchResult[]; fetchedAt: string } | undefined>;
  put(normalizedQuery: string, results: SearchResult[]): Promise<void>;
}

function searchKey(normalizedQuery: string): string {
  // SHA-256 keeps pk length bounded and avoids weird characters in DDB keys.
  const hash = createHash("sha256").update(normalizedQuery).digest("hex");
  return `search#${hash}`;
}

export function createSearchesClient(options: {
  tableName: string;
  client?: DynamoDBDocumentClient;
  ttlSeconds?: number;
}): SearchesClient {
  const ttlSeconds = options.ttlSeconds ?? ONE_WEEK_SECONDS;
  const doc =
    options.client ??
    DynamoDBDocumentClient.from(
      new DynamoDBClient({
        ...(process.env.DYNAMO_LOCAL_ENDPOINT
          ? { endpoint: process.env.DYNAMO_LOCAL_ENDPOINT }
          : {}),
      }),
    );

  return {
    async get(normalizedQuery) {
      const pk = searchKey(normalizedQuery);
      const out = await doc.send(
        new GetCommand({ TableName: options.tableName, Key: { pk } }),
      );
      const row = out.Item as SearchRow | undefined;
      if (!row) return undefined;
      return { results: row.results, fetchedAt: row.fetchedAt };
    },
    async put(normalizedQuery, results) {
      const fetchedAt = new Date().toISOString();
      const row: SearchRow = {
        pk: searchKey(normalizedQuery),
        query: normalizedQuery,
        results,
        fetchedAt,
        ttl: Math.floor(Date.now() / 1000) + ttlSeconds,
      };
      await doc.send(
        new PutCommand({ TableName: options.tableName, Item: row }),
      );
    },
  };
}
