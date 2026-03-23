# avalanche-org-mcp-server

[![npm version](https://img.shields.io/npm/v/avalanche-org-mcp-server)](https://www.npmjs.com/package/avalanche-org-mcp-server)
[![Publish npm package](https://github.com/haydenwade/avalanche-org-mcp-server/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/haydenwade/avalanche-org-mcp-server/actions/workflows/npm-publish.yml)
[![Publish container image](https://github.com/haydenwade/avalanche-org-mcp-server/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/haydenwade/avalanche-org-mcp-server/actions/workflows/docker-publish.yml)

A minimal [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server that wraps the [Avalanche.org Public API](https://api.avalanche.org/) map-layer endpoints. It lets LLMs look up avalanche danger ratings by location, retrieve raw forecast GeoJSON, and query historic conditions.

## Features

- **Danger lookup by lat/lon** — find the avalanche zone for any point and get its current danger rating
- **Historic danger lookup** — same as above, but for a specific past date
- **Raw map-layer GeoJSON** — full FeatureCollection for all avalanche centers, or scoped to one center

Data sourced from the [Avalanche.org Public API](https://api.avalanche.org/). See the [API docs](https://github.com/NationalAvalancheCenter/Avalanche.org-Public-API-Docs) for details.

## Quick Start

### Claude Desktop (npx — recommended)

Add this to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "avalanche-org": {
      "command": "npx",
      "args": ["-y", "avalanche-org-mcp-server"]
    }
  }
}
```

No install required. Claude will download and run it automatically.

### Global npm install

```bash
npm install -g avalanche-org-mcp-server
```

```json
{
  "mcpServers": {
    "avalanche-org": {
      "command": "avalanche-org-mcp-server"
    }
  }
}
```

### Docker

```bash
docker pull ghcr.io/haydenwade/avalanche-org-mcp-server:latest
```

```json
{
  "mcpServers": {
    "avalanche-org": {
      "command": "docker",
      "args": ["run", "--rm", "-i", "ghcr.io/haydenwade/avalanche-org-mcp-server:latest"]
    }
  }
}
```

### From source

```bash
git clone https://github.com/haydenwade/avalanche-org-mcp-server.git
cd avalanche-org-mcp-server
npm install
npm run build
```

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

## Tools

### `avalanche_danger_rating_by_point`

Get the current avalanche danger rating for a lat/lon point. Returns the zone the point falls in, or the nearest zone if `preferNearest` is true.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `lat` | number | yes | Latitude in decimal degrees |
| `lon` | number | yes | Longitude in decimal degrees |
| `preferNearest` | boolean | no | Fall back to nearest zone if point is outside all polygons (default: `true`) |
| `centerId` | string | no | Scope search to a specific avalanche center (e.g. `"UAC"`, `"CBAC"`) |

**Example input:**

```json
{ "lat": 40.5763, "lon": -111.7522, "preferNearest": true, "centerId": "UAC" }
```

<details>
<summary><strong>Example output</strong></summary>

```json
{
  "match": "inside_zone",
  "distance_km": 0,
  "distance_miles": 0,
  "zone": {
    "id": "zone-1",
    "name": "Salt Lake",
    "state": "UT"
  },
  "center": {
    "id": "UAC",
    "name": "Utah Avalanche Center",
    "timezone": "America/Denver",
    "link": "https://utahavalanchecenter.org"
  },
  "danger": {
    "level": 3,
    "label": "Considerable",
    "color": "#f1a302"
  },
  "travel_advice": "Dangerous avalanche conditions. Careful snowpack evaluation, cautious route-finding and conservative decision-making essential.",
  "forecast_url": "https://utahavalanchecenter.org/forecast/salt-lake",
  "validity": {
    "start_date": "2026-03-22",
    "end_date": "2026-03-23"
  },
  "warning": null
}
```

</details>

---

### `historic_avalanche_danger_rating_by_point`

Same as above, but for a specific historic date. Returns all the same fields plus `day`.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `lat` | number | yes | Latitude in decimal degrees |
| `lon` | number | yes | Longitude in decimal degrees |
| `day` | string | yes | Date in `YYYY-MM-DD` format |
| `preferNearest` | boolean | no | Fall back to nearest zone (default: `true`) |
| `centerId` | string | no | Scope to an avalanche center |

**Example input:**

```json
{ "lat": 40.5763, "lon": -111.7522, "day": "2025-02-24", "preferNearest": true }
```

<details>
<summary><strong>Example output</strong></summary>

```json
{
  "match": "inside_zone",
  "distance_km": 0,
  "distance_miles": 0,
  "zone": { "id": "zone-1", "name": "Salt Lake", "state": "UT" },
  "center": { "id": "UAC", "name": "Utah Avalanche Center", "..." : "..." },
  "danger": { "level": 3, "label": "Considerable", "color": "#f1a302" },
  "travel_advice": "Dangerous avalanche conditions. ...",
  "forecast_url": "https://utahavalanchecenter.org/forecast/salt-lake",
  "validity": { "start_date": "2025-02-24", "end_date": "2025-02-25" },
  "warning": null,
  "day": "2025-02-24"
}
```

</details>

---

### `raw_map_layer`

Returns the raw Avalanche.org map-layer GeoJSON FeatureCollection for **all** avalanche centers.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `day` | string | no | Historic date in `YYYY-MM-DD` format |

<details>
<summary><strong>Example output</strong></summary>

```json
{
  "geojson": {
    "type": "FeatureCollection",
    "features": [ "... full GeoJSON features ..." ]
  }
}
```

</details>

---

### `raw_map_layer_by_avalanche_center`

Returns the raw map-layer GeoJSON FeatureCollection for a **single** avalanche center.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `centerId` | string | yes | Avalanche center ID (e.g. `"CBAC"`, `"NWAC"`, `"UAC"`) |
| `day` | string | no | Historic date in `YYYY-MM-DD` format |

<details>
<summary><strong>Example output</strong></summary>

```json
{
  "geojson": {
    "type": "FeatureCollection",
    "features": [ "... full GeoJSON features ..." ]
  }
}
```

</details>

## Development

Requires Node.js >= 18.

```bash
npm install
npm run build
npm test
```

To interactively test tools with the [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector):

```bash
npx @modelcontextprotocol/inspector node dist/src/index.js
```

### Project structure

```
src/
  index.ts          # Entry point — server setup + stdio transport
  tools.ts          # Tool registration
  constants.ts      # API URLs and timeouts
  types.ts          # GeoJSON type definitions
  api/
    mapLayer.ts     # Map-layer fetch + GeoJSON normalization
  lib/
    geometry.ts     # Point-in-polygon, haversine distance, bounds
    dangerLookup.ts # Danger rating lookup logic
    validation.ts   # Date and coordinate validation
test/
  *.test.ts         # Tests (node:test)
```

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b my-feature`)
3. Make your changes and add tests
4. Run `npm test` to make sure everything passes
5. Open a pull request

## License

MIT
