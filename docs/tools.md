# MCP Tool Schemas

Source of truth for tool registration and schemas is [`src/tools.ts`](../src/tools.ts).

All tools return:

- `structuredContent` as JSON
- `content[0].text` as a JSON string of the same payload

`day` values use `YYYY-MM-DD`.

## Shared Metadata Shape

Most tool responses include:

```json
{
  "meta": {
    "source": "Avalanche.org Public API",
    "source_docs": "https://github.com/NationalAvalancheCenter/Avalanche.org-Public-API-Docs",
    "request_url": "https://api.avalanche.org/...",
    "cache": {
      "key": "all:today",
      "status": "hit",
      "fetched_at": "2026-03-03T20:00:00.000Z",
      "expires_at": "2026-03-03T21:00:00.000Z",
      "ttl_seconds": 3600,
      "error": "optional cache refresh error"
    },
    "disclaimer": "Avalanche conditions change rapidly. Verify the official avalanche center forecast before making travel decisions."
  }
}
```

`meta.cache.error` is only present when stale cache is served after an upstream error.

## `avalanche_danger_rating_by_point`

Get current avalanche danger for a latitude/longitude.

### Input

| Field | Type | Required | Notes |
|---|---|---|---|
| `lat` | number | Yes | Latitude in decimal degrees |
| `lon` | number | Yes | Longitude in decimal degrees |
| `preferNearest` | boolean | No | Defaults to `true`; returns nearest zone if point is outside all polygons |
| `centerId` | string | No | Optional center scope (example: `CBAC`) |

### Output

```json
{
  "match": "inside_zone | nearest_zone | no_match",
  "distance_km": 0,
  "distance_miles": 0,
  "zone": {
    "id": "string | number | null",
    "name": "string | null",
    "state": "string | null"
  },
  "center": {
    "id": "string | null",
    "name": "string | null",
    "timezone": "string | null",
    "link": "string | null"
  },
  "danger": {
    "level": "number | null",
    "label": "string | null",
    "color": "string | null"
  },
  "travel_advice": "string | null",
  "forecast_url": "string | null",
  "validity": {
    "start_date": "string | null",
    "end_date": "string | null"
  },
  "warning": "unknown | null",
  "region": {
    "id": "string | number | null",
    "geometry_type": "string | null",
    "properties": "record<string, unknown> | null"
  },
  "meta": {}
}
```

### Example Input

```json
{
  "lat": 40.5763,
  "lon": -111.7522,
  "preferNearest": true,
  "centerId": "UAC"
}
```

## `historic_avalanche_danger_rating_by_point`

Get avalanche danger for a latitude/longitude on a specific day.

### Input

Same as `avalanche_danger_rating_by_point`, plus:

| Field | Type | Required | Notes |
|---|---|---|---|
| `day` | string | Yes | Historic day in `YYYY-MM-DD` format |

### Output

Same output as `avalanche_danger_rating_by_point`, plus:

| Field | Type | Notes |
|---|---|---|
| `day` | string | Echoes validated request day |

### Example Input

```json
{
  "lat": 40.5763,
  "lon": -111.7522,
  "day": "2026-02-24",
  "preferNearest": true
}
```

## `raw_map_layer`

Return raw Avalanche.org map-layer GeoJSON for all centers.

### Input

| Field | Type | Required | Notes |
|---|---|---|---|
| `day` | string | No | Optional historic day in `YYYY-MM-DD` format |

### Output

```json
{
  "geojson": "unknown",
  "meta": {
    "source": "string",
    "source_docs": "string",
    "request_url": "string",
    "cache": {
      "key": "string",
      "status": "hit | miss | stale",
      "fetched_at": "string",
      "expires_at": "string",
      "ttl_seconds": "number",
      "error": "string (optional)"
    },
    "disclaimer": "string",
    "day": "string (optional)"
  }
}
```

### Example Input

```json
{
  "day": "2026-02-24"
}
```

## `raw_map_layer_by_avalanche_center`

Return raw Avalanche.org map-layer GeoJSON for one center.

### Input

| Field | Type | Required | Notes |
|---|---|---|---|
| `centerId` | string | Yes | Avalanche center ID (example: `CBAC`) |
| `day` | string | No | Optional historic day in `YYYY-MM-DD` format |

### Output

Same as `raw_map_layer`, plus optional `meta.center_id`:

| Field | Type | Notes |
|---|---|---|
| `meta.center_id` | string | Included when center-scoped lookup is used |

### Example Input

```json
{
  "centerId": "CBAC",
  "day": "2026-02-24"
}
```

## Validation and Errors

- Invalid `day` format throws an error (`YYYY-MM-DD` required).
- Invalid `lat` or `lon` range throws an error.
- Empty `centerId` throws an error where center scoping is required.
