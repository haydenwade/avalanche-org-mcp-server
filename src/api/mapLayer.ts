import { AVALANCHE_MAP_LAYER_PATH } from "../constants.js";
import { buildUrl, fetchJson } from "./client.js";
import { computeBounds } from "../lib/geometry.js";
import type {
  AvalancheFeatureProperties,
  AvalancheMapLayerFeature,
  AvalancheMapLayerFeatureCollection,
  NormalizedAvalancheFeature,
  Position,
  SupportedGeometry,
} from "../types.js";

type MapLayerRequest = {
  centerId?: string;
  day?: string;
};

export type MapLayerResult = {
  requestUrl: string;
  geojson: AvalancheMapLayerFeatureCollection;
  features: NormalizedAvalancheFeature[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asPosition(value: unknown): Position | null {
  if (!Array.isArray(value) || value.length < 2) return null;

  const lon = value[0];
  const lat = value[1];
  if (typeof lon !== "number" || typeof lat !== "number") return null;
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;

  return [lon, lat];
}

function normalizeLinearRing(value: unknown): Position[] | null {
  if (!Array.isArray(value)) return null;

  const ring: Position[] = [];
  for (const coordinate of value) {
    const position = asPosition(coordinate);
    if (!position) return null;
    ring.push(position);
  }

  if (ring.length < 3) return null;
  return ring;
}

function normalizePolygonCoordinates(value: unknown): Position[][] | null {
  if (!Array.isArray(value)) return null;

  const polygon: Position[][] = [];
  for (const ringValue of value) {
    const ring = normalizeLinearRing(ringValue);
    if (!ring) return null;
    polygon.push(ring);
  }

  if (polygon.length === 0) return null;
  return polygon;
}

function normalizeMultiPolygonCoordinates(value: unknown): Position[][][] | null {
  if (!Array.isArray(value)) return null;

  const multiPolygon: Position[][][] = [];
  for (const polygonValue of value) {
    const polygon = normalizePolygonCoordinates(polygonValue);
    if (!polygon) return null;
    multiPolygon.push(polygon);
  }

  if (multiPolygon.length === 0) return null;
  return multiPolygon;
}

function normalizeGeometry(value: unknown): SupportedGeometry | null {
  if (!isRecord(value) || typeof value.type !== "string") return null;

  if (value.type === "Polygon") {
    const coordinates = normalizePolygonCoordinates(value.coordinates);
    if (!coordinates) return null;
    return { type: "Polygon", coordinates };
  }

  if (value.type === "MultiPolygon") {
    const coordinates = normalizeMultiPolygonCoordinates(value.coordinates);
    if (!coordinates) return null;
    return { type: "MultiPolygon", coordinates };
  }

  return null;
}

function normalizeProperties(value: unknown): AvalancheFeatureProperties {
  if (!isRecord(value)) return {};
  return value as AvalancheFeatureProperties;
}

function normalizeFeature(value: unknown): NormalizedAvalancheFeature | null {
  if (!isRecord(value)) return null;

  const geometry = normalizeGeometry(value.geometry);
  if (!geometry) return null;

  const id =
    typeof value.id === "string" || typeof value.id === "number" ? value.id : null;
  const properties = normalizeProperties(value.properties);
  const raw = value as AvalancheMapLayerFeature;

  return {
    raw,
    id,
    properties,
    geometry,
    bounds: computeBounds(geometry),
  };
}

function normalizeFeatureCollection(raw: unknown): {
  geojson: AvalancheMapLayerFeatureCollection;
  features: NormalizedAvalancheFeature[];
} {
  if (!isRecord(raw)) {
    throw new Error("Avalanche.org map-layer response was not a JSON object.");
  }

  if (!Array.isArray(raw.features)) {
    throw new Error("Avalanche.org map-layer response did not include a features array.");
  }

  const geojson = {
    ...(raw as Record<string, unknown>),
    type: typeof raw.type === "string" ? raw.type : "FeatureCollection",
    features: raw.features as AvalancheMapLayerFeature[],
  } as AvalancheMapLayerFeatureCollection;

  const features = raw.features
    .map((feature) => normalizeFeature(feature))
    .filter((feature): feature is NormalizedAvalancheFeature => feature != null);

  return { geojson, features };
}

function buildMapLayerPath(centerId?: string): string {
  if (!centerId) return AVALANCHE_MAP_LAYER_PATH;
  return `${AVALANCHE_MAP_LAYER_PATH}/${encodeURIComponent(centerId)}`;
}

export async function getMapLayer(request: MapLayerRequest = {}): Promise<MapLayerResult> {
  const url = buildUrl({
    path: buildMapLayerPath(request.centerId),
    day: request.day,
  });
  const raw = await fetchJson<unknown>(url);
  const { geojson, features } = normalizeFeatureCollection(raw);

  return {
    requestUrl: url.toString(),
    geojson,
    features,
  };
}
