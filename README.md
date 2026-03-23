# avalanche-org-mcp-server

[![npm version](https://img.shields.io/npm/v/avalanche-org-mcp-server)](https://www.npmjs.com/package/avalanche-org-mcp-server)
[![Publish npm package](https://github.com/haydenwade/avalanche-org-mcp-server/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/haydenwade/avalanche-org-mcp-server/actions/workflows/npm-publish.yml)
[![Publish container image](https://github.com/haydenwade/avalanche-org-mcp-server/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/haydenwade/avalanche-org-mcp-server/actions/workflows/docker-publish.yml)

A minimal [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server that wraps the [Avalanche.org Public API](https://api.avalanche.org/) map-layer endpoints. It lets LLMs look up avalanche danger ratings by location, retrieve raw forecast GeoJSON, and query historic conditions.

## Features

- **Danger lookup by lat/lon** — find the avalanche zone for any point and get its current danger rating
- **Historic danger lookup** — same as above, but for a specific past date
- **Raw map-layer GeoJSON** — full FeatureCollection for all avalanche centers, or scoped to one center
- **Safety context** — every response includes a disclaimer and a link to the official forecast

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

**Returns:** match type, danger level/label/color, zone name, center info, forecast URL, travel advice, and validity dates.

---

### `historic_avalanche_danger_rating_by_point`

Same as above, but for a specific historic date.

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

---

### `raw_map_layer`

Returns the raw Avalanche.org map-layer GeoJSON FeatureCollection for **all** avalanche centers.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `day` | string | no | Historic date in `YYYY-MM-DD` format |

---

### `raw_map_layer_by_avalanche_center`

Returns the raw map-layer GeoJSON FeatureCollection for a **single** avalanche center.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `centerId` | string | yes | Avalanche center ID (e.g. `"CBAC"`, `"NWAC"`, `"UAC"`) |
| `day` | string | no | Historic date in `YYYY-MM-DD` format |

## Development

Requires Node.js >= 18.

```bash
npm install
npm run build
npm test
```

### Project structure

```
src/
  index.ts          # Entry point — stdio transport
  server.ts         # McpServer setup
  tools.ts          # Tool registration and schemas
  constants.ts      # API URLs, timeouts, disclaimer text
  types.ts          # GeoJSON type definitions
  api/
    client.ts       # HTTP client (fetch wrapper)
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

## Safety

Tool outputs include a safety disclaimer. Avalanche conditions change rapidly and may vary within a forecast zone. **Always confirm the official avalanche center forecast before making travel decisions.**

## Attribution

- Data: [Avalanche.org Public API](https://api.avalanche.org/)
- API docs: [NationalAvalancheCenter/Avalanche.org-Public-API-Docs](https://github.com/NationalAvalancheCenter/Avalanche.org-Public-API-Docs)

This project is not affiliated with Avalanche.org or the National Avalanche Center.

## License

MIT
