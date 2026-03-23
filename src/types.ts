export type Position = [number, number];
export type LinearRing = Position[];
export type PolygonCoordinates = LinearRing[];
export type MultiPolygonCoordinates = PolygonCoordinates[];

export type GeoJsonPolygonGeometry = {
  type: "Polygon";
  coordinates: PolygonCoordinates;
};

export type GeoJsonMultiPolygonGeometry = {
  type: "MultiPolygon";
  coordinates: MultiPolygonCoordinates;
};

export type SupportedGeometry = GeoJsonPolygonGeometry | GeoJsonMultiPolygonGeometry;

export type AvalancheFeatureProperties = {
  name?: string | null;
  center?: string | null;
  center_link?: string | null;
  timezone?: string | null;
  center_id?: string | null;
  state?: string | null;
  travel_advice?: string | null;
  danger?: string | null;
  danger_level?: number | string | null;
  color?: string | null;
  stroke?: string | null;
  font_color?: string | null;
  link?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  warning?: unknown;
  [key: string]: unknown;
};

export type AvalancheMapLayerFeature = {
  type?: string;
  id?: string | number | null;
  properties?: AvalancheFeatureProperties | null;
  geometry?: SupportedGeometry | null;
  [key: string]: unknown;
};

export type AvalancheMapLayerFeatureCollection = {
  type?: string;
  features: AvalancheMapLayerFeature[];
  [key: string]: unknown;
};

export type Bounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type NormalizedAvalancheFeature = {
  raw: AvalancheMapLayerFeature;
  id: string | number | null;
  properties: AvalancheFeatureProperties;
  geometry: SupportedGeometry;
  bounds: Bounds;
};
