import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getMapLayer } from "./api/mapLayer.js";
import { lookupDangerRatingByPoint } from "./lib/dangerLookup.js";
import { assertValidDay, normalizeOptionalCenterId } from "./lib/validation.js";

function textResult(data: Record<string, unknown>) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

export function registerAvalancheTools(server: McpServer) {
  const dangerLookupInputSchema = {
    lat: z.number().describe("Latitude in decimal degrees."),
    lon: z.number().describe("Longitude in decimal degrees."),
    preferNearest: z
      .boolean()
      .optional()
      .describe("If true (default), return the nearest zone when the point is outside all polygons."),
    centerId: z
      .string()
      .optional()
      .describe("Optional avalanche center ID to scope the search (example: UAC)."),
  };

  server.registerTool(
    "avalanche_danger_rating_by_point",
    {
      description:
        "Get the current avalanche danger rating and forecast metadata for the avalanche zone containing a latitude/longitude point. Can fall back to the nearest zone.",
      inputSchema: dangerLookupInputSchema,
    },
    async (args) => {
      const result = await lookupDangerRatingByPoint({
        lat: args.lat,
        lon: args.lon,
        preferNearest: args.preferNearest ?? true,
        centerId: args.centerId,
      });
      return textResult(result);
    },
  );

  server.registerTool(
    "historic_avalanche_danger_rating_by_point",
    {
      description:
        "Get the avalanche danger rating and forecast metadata for the avalanche zone containing a latitude/longitude point on a specific historic day (YYYY-MM-DD). Can fall back to the nearest zone.",
      inputSchema: {
        ...dangerLookupInputSchema,
        day: z.string().describe("Historic day in YYYY-MM-DD format."),
      },
    },
    async (args) => {
      const day = assertValidDay(args.day);
      const result = await lookupDangerRatingByPoint({
        lat: args.lat,
        lon: args.lon,
        preferNearest: args.preferNearest ?? true,
        centerId: args.centerId,
        day,
      });
      return textResult({ ...result, day });
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
    },
    async (args) => {
      const day = args.day ? assertValidDay(args.day) : undefined;
      const mapLayer = await getMapLayer({ day });
      return textResult({
        geojson: mapLayer.geojson,
      });
    },
  );

  server.registerTool(
    "raw_map_layer_by_avalanche_center",
    {
      description:
        "Return the raw Avalanche.org map-layer GeoJSON FeatureCollection for a specific avalanche center ID. Supports an optional historic day (YYYY-MM-DD).",
      inputSchema: {
        centerId: z.string().describe("Avalanche center ID (example: UAC)."),
        day: z.string().optional().describe("Optional historic day in YYYY-MM-DD format."),
      },
    },
    async (args) => {
      const centerId = normalizeOptionalCenterId(args.centerId);
      const day = args.day ? assertValidDay(args.day) : undefined;
      const mapLayer = await getMapLayer({ centerId, day });
      return textResult({
        geojson: mapLayer.geojson,
      });
    },
  );
}
