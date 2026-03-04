import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  AVALANCHE_PUBLIC_API_DOCS_URL,
  AVALANCHE_SOURCE_NAME,
  SAFETY_DISCLAIMER,
} from "./constants.js";
import { getMapLayer } from "./api/mapLayer.js";
import { lookupDangerRatingByPoint } from "./lib/dangerLookup.js";
import { assertValidDay, normalizeOptionalCenterId } from "./lib/validation.js";

type JsonRecord = Record<string, unknown>;

function jsonToolResult<T extends JsonRecord>(structuredContent: T) {
  let text = "{\"status\":\"ok\"}";
  try {
    text = JSON.stringify(structuredContent);
  } catch {}

  return {
    content: [
      {
        type: "text" as const,
        text,
      },
    ],
    structuredContent,
  };
}

const nullableIdSchema = z.union([z.string(), z.number()]).nullable();

const cacheMetaSchema = {
  key: z.string(),
  status: z.enum(["hit", "miss", "stale"]),
  fetched_at: z.string(),
  expires_at: z.string(),
  ttl_seconds: z.number(),
  error: z.string().optional(),
};

const sourceMetaSchema = {
  source: z.string(),
  source_docs: z.string(),
  request_url: z.string(),
  cache: z.object(cacheMetaSchema),
  disclaimer: z.string(),
};

const dangerPointOutputSchema = {
  match: z.enum(["inside_zone", "nearest_zone", "no_match"]),
  distance_km: z.number().nullable(),
  distance_miles: z.number().nullable(),
  zone: z.object({
    id: nullableIdSchema,
    name: z.string().nullable(),
    state: z.string().nullable(),
  }),
  center: z.object({
    id: z.string().nullable(),
    name: z.string().nullable(),
    timezone: z.string().nullable(),
    link: z.string().nullable(),
  }),
  danger: z.object({
    level: z.number().nullable(),
    label: z.string().nullable(),
    color: z.string().nullable(),
  }),
  travel_advice: z.string().nullable(),
  forecast_url: z.string().nullable(),
  validity: z.object({
    start_date: z.string().nullable(),
    end_date: z.string().nullable(),
  }),
  warning: z.unknown().nullable(),
  region: z
    .object({
      id: nullableIdSchema,
      geometry_type: z.string().nullable(),
      properties: z.record(z.unknown()).nullable(),
    })
    .nullable(),
  meta: z.object(sourceMetaSchema),
};

const rawMapLayerOutputSchema = {
  geojson: z.unknown(),
  meta: z.object({
    source: z.string(),
    source_docs: z.string(),
    request_url: z.string(),
    cache: z.object(cacheMetaSchema),
    disclaimer: z.string(),
    center_id: z.string().nullable().optional(),
    day: z.string().nullable().optional(),
  }),
};

function rawMapLayerResponse(args: {
  geojson: unknown;
  sourceRequestUrl: string;
  cacheKey: string;
  cacheStatus: "hit" | "miss" | "stale";
  fetchedAt: number;
  expiresAt: number;
  ttlMs: number;
  cacheError?: string;
  centerId?: string;
  day?: string;
}) {
  return {
    geojson: args.geojson,
    meta: {
      source: AVALANCHE_SOURCE_NAME,
      source_docs: AVALANCHE_PUBLIC_API_DOCS_URL,
      request_url: args.sourceRequestUrl,
      cache: {
        key: args.cacheKey,
        status: args.cacheStatus,
        fetched_at: new Date(args.fetchedAt).toISOString(),
        expires_at: new Date(args.expiresAt).toISOString(),
        ttl_seconds: Math.round(args.ttlMs / 1000),
        ...(args.cacheError ? { error: args.cacheError } : {}),
      },
      disclaimer: SAFETY_DISCLAIMER,
      ...(args.centerId ? { center_id: args.centerId } : {}),
      ...(args.day ? { day: args.day } : {}),
    },
  };
}

export function registerAvalancheTools(server: McpServer) {
  server.registerTool(
    "avalanche_danger_rating_by_point",
    {
      description:
        "Get the current avalanche danger rating and forecast metadata for the avalanche zone containing a latitude/longitude point. Can fall back to the nearest zone.",
      inputSchema: {
        lat: z.number().describe("Latitude in decimal degrees."),
        lon: z.number().describe("Longitude in decimal degrees."),
        preferNearest: z
          .boolean()
          .optional()
          .describe("If true (default), return the nearest zone when the point is outside all polygons."),
        centerId: z
          .string()
          .optional()
          .describe("Optional avalanche center ID to scope the search (example: CBAC)."),
      },
      outputSchema: dangerPointOutputSchema,
    },
    async (args) => {
      const result = await lookupDangerRatingByPoint({
        lat: args.lat,
        lon: args.lon,
        preferNearest: args.preferNearest ?? true,
        centerId: args.centerId,
      });
      return jsonToolResult(result);
    },
  );

  server.registerTool(
    "raw_map_layer",
    {
      description:
        "Return the raw Avalanche.org map-layer GeoJSON FeatureCollection for all avalanche centers. Supports an optional historic day (YYYY-MM-DD).",
      inputSchema: {
        day: z.string().optional().describe("Optional historic day in YYYY-MM-DD format."),
      },
      outputSchema: rawMapLayerOutputSchema,
    },
    async (args) => {
      const day = args.day ? assertValidDay(args.day) : undefined;
      const mapLayer = await getMapLayer({ day });
      return jsonToolResult(
        rawMapLayerResponse({
          geojson: mapLayer.geojson,
          sourceRequestUrl: mapLayer.requestUrl,
          cacheKey: mapLayer.cacheKey,
          cacheStatus: mapLayer.cacheStatus,
          fetchedAt: mapLayer.fetchedAt,
          expiresAt: mapLayer.expiresAt,
          ttlMs: mapLayer.ttlMs,
          cacheError: mapLayer.cacheError,
          day,
        }),
      );
    },
  );

  server.registerTool(
    "raw_map_layer_by_avalanche_center",
    {
      description:
        "Return the raw Avalanche.org map-layer GeoJSON FeatureCollection for a specific avalanche center ID. Supports an optional historic day (YYYY-MM-DD).",
      inputSchema: {
        centerId: z.string().describe("Avalanche center ID (example: CBAC)."),
        day: z.string().optional().describe("Optional historic day in YYYY-MM-DD format."),
      },
      outputSchema: rawMapLayerOutputSchema,
    },
    async (args) => {
      const centerId = normalizeOptionalCenterId(args.centerId);
      if (!centerId) {
        throw new Error("centerId is required.");
      }

      const day = args.day ? assertValidDay(args.day) : undefined;
      const mapLayer = await getMapLayer({ centerId, day });

      return jsonToolResult(
        rawMapLayerResponse({
          geojson: mapLayer.geojson,
          sourceRequestUrl: mapLayer.requestUrl,
          cacheKey: mapLayer.cacheKey,
          cacheStatus: mapLayer.cacheStatus,
          fetchedAt: mapLayer.fetchedAt,
          expiresAt: mapLayer.expiresAt,
          ttlMs: mapLayer.ttlMs,
          cacheError: mapLayer.cacheError,
          centerId,
          day,
        }),
      );
    },
  );

  server.registerTool(
    "historic_avalanche_danger_rating_by_point",
    {
      description:
        "Get the avalanche danger rating and forecast metadata for the avalanche zone containing a latitude/longitude point on a specific historic day (YYYY-MM-DD). Can fall back to the nearest zone.",
      inputSchema: {
        lat: z.number().describe("Latitude in decimal degrees."),
        lon: z.number().describe("Longitude in decimal degrees."),
        day: z.string().describe("Historic day in YYYY-MM-DD format."),
        preferNearest: z
          .boolean()
          .optional()
          .describe("If true (default), return the nearest zone when the point is outside all polygons."),
        centerId: z
          .string()
          .optional()
          .describe("Optional avalanche center ID to scope the search (example: CBAC)."),
      },
      outputSchema: {
        ...dangerPointOutputSchema,
        day: z.string(),
      },
    },
    async (args) => {
      const day = assertValidDay(args.day);
      const result = await lookupDangerRatingByPoint({
        lat: args.lat,
        lon: args.lon,
        day,
        preferNearest: args.preferNearest ?? true,
        centerId: args.centerId,
      });

      return jsonToolResult({
        ...result,
        day,
      });
    },
  );
}
