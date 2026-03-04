import {
  ARCHIVE_MAP_LAYER_TTL_MS,
  AVALANCHE_MAP_LAYER_PATH,
} from "../constants.js";
import { buildUrl, fetchJson } from "./client.js";
import { computeBounds } from "../lib/geometry.js";
import type {
  AvalancheFeatureProperties,
  AvalancheMapLayerFeature,
  AvalancheMapLayerFeatureCollection,
  CacheStatus,
  NormalizedAvalancheFeature,
  Position,
  SupportedGeometry,
} from "../types.js";

type MapLayerRequest = {
  centerId?: string;
  day?: string;
};

type MapLayerCacheEntry = {
  cacheKey: string;
  requestUrl: string;
  fetchedAt: number;
  expiresAt: number;
  ttlMs: number;
  geojson: AvalancheMapLayerFeatureCollection;
  features: NormalizedAvalancheFeature[];
};

export type MapLayerResult = MapLayerCacheEntry & {
  cacheStatus: CacheStatus;
  cacheError?: string;
};

const cache = new Map<string, MapLayerCacheEntry>();
const inflight = new Map<string, Promise<MapLayerCacheEntry>>();
const MAX_CACHE_ENTRIES = 256;

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

function getMountainHour(date: Date): number {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    hour: "numeric",
    hourCycle: "h23",
  }).format(date);

  const hour = Number(formatted);
  return Number.isFinite(hour) ? hour : 0;
}

function getCurrentMapLayerTtlMs(date = new Date()): number {
  const hourMt = getMountainHour(date);
  if (hourMt >= 6 && hourMt < 10) return 5 * 60 * 1000;
  if (hourMt >= 10) return 60 * 60 * 1000;
  return 3 * 60 * 60 * 1000;
}

function getCacheKey({ centerId, day }: MapLayerRequest): string {
  const scope = centerId ?? "all";
  const when = day ?? "today";
  return `${scope}:${when}`;
}

function buildMapLayerPath(centerId?: string): string {
  if (!centerId) return AVALANCHE_MAP_LAYER_PATH;
  return `${AVALANCHE_MAP_LAYER_PATH}/${encodeURIComponent(centerId)}`;
}

function evictExpiredEntries(now: number) {
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }

  if (cache.size <= MAX_CACHE_ENTRIES) return;

  const sorted = [...cache.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
  for (const [key] of sorted.slice(0, cache.size - MAX_CACHE_ENTRIES)) {
    cache.delete(key);
  }
}

async function fetchMapLayerFromUpstream(request: MapLayerRequest): Promise<MapLayerCacheEntry> {
  const cacheKey = getCacheKey(request);
  const url = buildUrl({
    path: buildMapLayerPath(request.centerId),
    day: request.day,
  });
  const raw = await fetchJson<unknown>(url);
  const { geojson, features } = normalizeFeatureCollection(raw);

  const now = Date.now();
  const ttlMs = request.day ? ARCHIVE_MAP_LAYER_TTL_MS : getCurrentMapLayerTtlMs(new Date(now));

  return {
    cacheKey,
    requestUrl: url.toString(),
    fetchedAt: now,
    expiresAt: now + ttlMs,
    ttlMs,
    geojson,
    features,
  };
}

async function fetchAndStore(request: MapLayerRequest): Promise<MapLayerCacheEntry> {
  const entry = await fetchMapLayerFromUpstream(request);
  cache.set(entry.cacheKey, entry);
  evictExpiredEntries(Date.now());
  return entry;
}

export async function getMapLayer(request: MapLayerRequest = {}): Promise<MapLayerResult> {
  const cacheKey = getCacheKey(request);
  const now = Date.now();
  const cached = cache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return {
      ...cached,
      cacheStatus: "hit",
    };
  }

  const inflightRequest = inflight.get(cacheKey);
  if (inflightRequest) {
    const entry = await inflightRequest;
    return {
      ...entry,
      cacheStatus: "hit",
    };
  }

  const requestPromise = fetchAndStore(request);
  inflight.set(cacheKey, requestPromise);

  try {
    const entry = await requestPromise;
    return {
      ...entry,
      cacheStatus: "miss",
    };
  } catch (error) {
    if (cached) {
      return {
        ...cached,
        cacheStatus: "stale",
        cacheError: error instanceof Error ? error.message : String(error),
      };
    }

    if (error instanceof Error) throw error;
    throw new Error(String(error));
  } finally {
    inflight.delete(cacheKey);
  }
}
