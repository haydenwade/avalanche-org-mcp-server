import {
  AVALANCHE_PUBLIC_API_DOCS_URL,
  AVALANCHE_SOURCE_NAME,
  SAFETY_DISCLAIMER,
} from "../constants.js";
import { getMapLayer } from "../api/mapLayer.js";
import {
  minDistanceToGeometryVerticesKm,
  pointInBounds,
  pointInGeometry,
} from "./geometry.js";
import { assertLatLon, normalizeOptionalCenterId } from "./validation.js";
import type { NormalizedAvalancheFeature } from "../types.js";

type DangerPointLookupRequest = {
  lat: number;
  lon: number;
  preferNearest?: boolean;
  centerId?: string | null;
  day?: string;
};

type FeatureMatch =
  | {
      match: "inside_zone";
      feature: NormalizedAvalancheFeature;
      distanceKm: 0;
    }
  | {
      match: "nearest_zone";
      feature: NormalizedAvalancheFeature;
      distanceKm: number;
    }
  | {
      match: "no_match";
      feature: null;
      distanceKm: null;
    };

export type DangerPointLookupOutput = {
  match: "inside_zone" | "nearest_zone" | "no_match";
  distance_km: number | null;
  distance_miles: number | null;
  zone: {
    id: string | number | null;
    name: string | null;
    state: string | null;
  };
  center: {
    id: string | null;
    name: string | null;
    timezone: string | null;
    link: string | null;
  };
  danger: {
    level: number | null;
    label: string | null;
    color: string | null;
  };
  travel_advice: string | null;
  forecast_url: string | null;
  validity: {
    start_date: string | null;
    end_date: string | null;
  };
  warning: unknown | null;
  region: {
    id: string | number | null;
    geometry_type: string | null;
    properties: Record<string, unknown> | null;
  } | null;
  meta: {
    source: string;
    source_docs: string;
    request_url: string;
    disclaimer: string;
  };
};

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function roundDistance(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Number(value.toFixed(3));
}

function kmToMiles(km: number | null): number | null {
  if (km == null) return null;
  return km * 0.621371;
}

function findFeatureMatch(
  features: NormalizedAvalancheFeature[],
  lat: number,
  lon: number,
  preferNearest: boolean,
): FeatureMatch {
  for (const feature of features) {
    if (!pointInBounds(lat, lon, feature.bounds)) continue;
    if (pointInGeometry(lat, lon, feature.geometry)) {
      return {
        match: "inside_zone",
        feature,
        distanceKm: 0,
      };
    }
  }

  if (!preferNearest || features.length === 0) {
    return {
      match: "no_match",
      feature: null,
      distanceKm: null,
    };
  }

  let nearestFeature: NormalizedAvalancheFeature | null = null;
  let nearestDistanceKm = Number.POSITIVE_INFINITY;

  for (const feature of features) {
    const distanceKm = minDistanceToGeometryVerticesKm(lat, lon, feature.geometry);
    if (distanceKm < nearestDistanceKm) {
      nearestDistanceKm = distanceKm;
      nearestFeature = feature;
    }
  }

  if (!nearestFeature || !Number.isFinite(nearestDistanceKm)) {
    return {
      match: "no_match",
      feature: null,
      distanceKm: null,
    };
  }

  return {
    match: "nearest_zone",
    feature: nearestFeature,
    distanceKm: nearestDistanceKm,
  };
}

export async function lookupDangerRatingByPoint(
  request: DangerPointLookupRequest,
): Promise<DangerPointLookupOutput> {
  const { lat, lon } = assertLatLon(request.lat, request.lon);
  const centerId = normalizeOptionalCenterId(request.centerId);
  const preferNearest = request.preferNearest ?? true;

  const mapLayer = await getMapLayer({
    centerId,
    day: request.day,
  });

  const featureMatch = findFeatureMatch(mapLayer.features, lat, lon, preferNearest);
  const matchedFeature = featureMatch.feature;
  const properties = matchedFeature?.properties ?? null;
  const distanceKm =
    featureMatch.match === "no_match" ? null : roundDistance(featureMatch.distanceKm);

  return {
    match: featureMatch.match,
    distance_km: distanceKm,
    distance_miles: roundDistance(kmToMiles(distanceKm)),
    zone: {
      id: matchedFeature?.id ?? null,
      name: asString(properties?.name),
      state: asString(properties?.state),
    },
    center: {
      id: asString(properties?.center_id),
      name: asString(properties?.center),
      timezone: asString(properties?.timezone),
      link: asString(properties?.center_link),
    },
    danger: {
      level: asNumber(properties?.danger_level),
      label: asString(properties?.danger),
      color: asString(properties?.color),
    },
    travel_advice: asString(properties?.travel_advice),
    forecast_url: asString(properties?.link),
    validity: {
      start_date: asString(properties?.start_date),
      end_date: asString(properties?.end_date),
    },
    warning: properties?.warning ?? null,
    region: matchedFeature
      ? {
          id: matchedFeature.id,
          geometry_type: matchedFeature.geometry.type,
          properties: matchedFeature.properties as Record<string, unknown>,
        }
      : null,
    meta: {
      source: AVALANCHE_SOURCE_NAME,
      source_docs: AVALANCHE_PUBLIC_API_DOCS_URL,
      request_url: mapLayer.requestUrl,
      disclaimer: SAFETY_DISCLAIMER,
    },
  };
}
