import type {
  Bounds,
  LinearRing,
  PolygonCoordinates,
  SupportedGeometry,
} from "../types.js";

const EARTH_RADIUS_KM = 6371.0088;

export function geometryPolygons(
  geometry: SupportedGeometry,
): PolygonCoordinates[] {
  return geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
}

export function computeBounds(geometry: SupportedGeometry): Bounds {
  let west = Number.POSITIVE_INFINITY;
  let south = Number.POSITIVE_INFINITY;
  let east = Number.NEGATIVE_INFINITY;
  let north = Number.NEGATIVE_INFINITY;

  for (const polygon of geometryPolygons(geometry)) {
    for (const ring of polygon) {
      for (const [lon, lat] of ring) {
        if (lon < west) west = lon;
        if (lon > east) east = lon;
        if (lat < south) south = lat;
        if (lat > north) north = lat;
      }
    }
  }

  return { west, south, east, north };
}

export function pointInBounds(lat: number, lon: number, bounds: Bounds): boolean {
  return (
    lon >= bounds.west &&
    lon <= bounds.east &&
    lat >= bounds.south &&
    lat <= bounds.north
  );
}

export function pointInRing(lat: number, lon: number, ring: LinearRing): boolean {
  if (ring.length < 3) return false;

  let inside = false;
  const px = lon;
  const py = lat;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];

    const intersects =
      (yi > py) !== (yj > py) &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;

    if (intersects) inside = !inside;
  }

  return inside;
}

function pointInPolygon(lat: number, lon: number, polygon: PolygonCoordinates): boolean {
  const [outerRing, ...holes] = polygon;
  if (!outerRing || !pointInRing(lat, lon, outerRing)) return false;

  for (const hole of holes) {
    if (pointInRing(lat, lon, hole)) return false;
  }

  return true;
}

export function pointInGeometry(
  lat: number,
  lon: number,
  geometry: SupportedGeometry,
): boolean {
  for (const polygon of geometryPolygons(geometry)) {
    if (pointInPolygon(lat, lon, polygon)) return true;
  }
  return false;
}

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

export function minDistanceToGeometryVerticesKm(
  lat: number,
  lon: number,
  geometry: SupportedGeometry,
): number {
  let minDistanceKm = Number.POSITIVE_INFINITY;

  for (const polygon of geometryPolygons(geometry)) {
    for (const ring of polygon) {
      for (const [vertexLon, vertexLat] of ring) {
        const distanceKm = haversineKm(lat, lon, vertexLat, vertexLon);
        if (distanceKm < minDistanceKm) minDistanceKm = distanceKm;
      }
    }
  }

  return minDistanceKm;
}
