import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { describe, expect, it, vi } from "vitest";
import type { SearchResult } from "@combo/shared";
import { createSearchesClient } from "../../src/cache/searches.js";

function makeDoc(items: Record<string, unknown> = {}) {
  return {
    send: vi.fn(async (command: unknown) => {
      if (command instanceof GetCommand) {
        const pk = command.input.Key?.pk as string | undefined;
        return { Item: pk ? items[pk] : undefined };
      }
      if (command instanceof PutCommand) {
        const item = command.input.Item as { pk: string };
        items[item.pk] = item;
        return {};
      }
      throw new Error("unexpected command");
    }),
  };
}

const RESULT: SearchResult = {
  name: "Stockholm",
  displayName: "Stockholm, Sverige",
  countryCode: "SE",
  lat: 59.33,
  lon: 18.07,
};

describe("searches cache", () => {
  it("round-trips a search via DynamoDB Document client", async () => {
    const store: Record<string, unknown> = {};
    const doc = makeDoc(store);
    const client = createSearchesClient({
      tableName: "T",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client: doc as any,
      ttlSeconds: 60,
    });

    expect(await client.get("stockholm")).toBeUndefined();

    await client.put("stockholm", [RESULT]);
    const fetched = await client.get("stockholm");
    expect(fetched?.results).toEqual([RESULT]);
    expect(typeof fetched?.fetchedAt).toBe("string");

    const stored = Object.values(store)[0] as {
      pk: string;
      ttl: number;
      query: string;
    };
    expect(stored.pk).toMatch(/^search#[0-9a-f]{64}$/);
    expect(stored.query).toBe("stockholm");
    expect(stored.ttl).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("returns undefined for an unknown query", async () => {
    const doc = makeDoc({});
    const client = createSearchesClient({
      tableName: "T",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client: doc as any,
    });
    expect(await client.get("nope")).toBeUndefined();
  });
});
