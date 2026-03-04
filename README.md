# avalanche-org-mcp-server

MCP server for the [Avalanche.org Public API](https://api.avalanche.org/) map-layer endpoints.

This server provides structured tools for:
- Looking up avalanche danger ratings by latitude/longitude
- Looking up historic avalanche danger ratings by latitude/longitude (`day=YYYY-MM-DD`)
- Returning raw `map-layer` GeoJSON (all centers or a specific avalanche center)

The implementation is based on the [Avalanche.org Public API docs](https://github.com/NationalAvalancheCenter/Avalanche.org-Public-API-Docs).

## Safety

Tool outputs include a short safety disclaimer. Avalanche conditions can change rapidly and may vary within a forecast zone. Always confirm the official avalanche center forecast before making travel decisions.

## Tools

### `avalanche_danger_rating_by_point`

Inputs:

```json
{
  "lat": 40.5763,
  "lon": -111.7522,
  "preferNearest": true,
  "centerId": "UAC"
}
```

Output (structured JSON):
- `match`: `inside_zone` | `nearest_zone` | `no_match`
- `distance_km`, `distance_miles`
- `zone`, `center`, `danger`
- `travel_advice`, `forecast_url`, `validity`, `warning`
- `region` (includes all region properties)
- `meta` (source, cache info, disclaimer)

### `historic_avalanche_danger_rating_by_point`

Same as `avalanche_danger_rating_by_point`, but requires `day`:

```json
{
  "lat": 40.5763,
  "lon": -111.7522,
  "day": "2026-02-24",
  "preferNearest": true
}
```

### `raw_map_layer`

Returns the raw Avalanche.org GeoJSON FeatureCollection for all centers.

Inputs:

```json
{
  "day": "2026-02-24"
}
```

Output:

```json
{
  "geojson": {},
  "meta": {}
}
```

### `raw_map_layer_by_avalanche_center`

Returns the raw Avalanche.org GeoJSON FeatureCollection for one center.

Inputs:

```json
{
  "centerId": "CBAC",
  "day": "2026-02-24"
}
```

## Implementation Notes

- Uses in-memory caching keyed by center/day (for example: `all:today`, `UAC:2026-02-24`)
- Current-day cache TTL follows a dynamic Mountain Time schedule similar to `snow-data`
- Historic (`day`) responses cache for 24 hours
- Point-in-polygon supports both `Polygon` and `MultiPolygon`
- Nearest-zone fallback uses a simple vertex-distance heuristic (haversine distance in km)

## Build and Run

Requires Node.js `>=18`.

```bash
npm install
npm run build
npm start
```

## Usage with Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "avalanche-org": {
      "command": "node",
      "args": ["/absolute/path/to/avalanche-org-mcp-server/dist/src/index.js"]
    }
  }
}
```

Or run from the repo via `npm start`:

```json
{
  "mcpServers": {
    "avalanche-org": {
      "command": "npm",
      "args": ["start", "--silent"],
      "cwd": "/absolute/path/to/avalanche-org-mcp-server"
    }
  }
}
```

## Attribution

- Data source: [Avalanche.org Public API](https://api.avalanche.org/)
- Public API docs: [NationalAvalancheCenter/Avalanche.org-Public-API-Docs](https://github.com/NationalAvalancheCenter/Avalanche.org-Public-API-Docs)

This project is not affiliated with Avalanche.org or the National Avalanche Center.
