# avalanche-org-mcp-server

[![npm version](https://img.shields.io/npm/v/avalanche-org-mcp-server)](https://www.npmjs.com/package/avalanche-org-mcp-server)
[![Publish npm package](https://github.com/haydenwade/avalanche-org-mcp-server/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/haydenwade/avalanche-org-mcp-server/actions/workflows/npm-publish.yml)
[![Publish container image](https://github.com/haydenwade/avalanche-org-mcp-server/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/haydenwade/avalanche-org-mcp-server/actions/workflows/docker-publish.yml)
[![GHCR package](https://img.shields.io/badge/ghcr-ghcr.io%2Fhaydenwade%2Favalanche--org--mcp--server-2ea44f)](https://github.com/haydenwade/avalanche-org-mcp-server/pkgs/container/avalanche-org-mcp-server)

MCP server for the [Avalanche.org Public API](https://api.avalanche.org/) map-layer endpoints.

## Features

- Avalanche danger lookup by latitude/longitude
- Historic avalanche danger lookup by latitude/longitude (`day=YYYY-MM-DD`)
- Raw `map-layer` GeoJSON access (all centers or one center)
- Structured output with forecast links, region metadata, and safety context

## Install

### Method 1: `npx` (recommended)

No global install required:

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

### Method 2: Global npm install

```bash
npm install -g avalanche-org-mcp-server
```

Then configure Claude Desktop:

```json
{
  "mcpServers": {
    "avalanche-org": {
      "command": "avalanche-org-mcp-server",
      "args": []
    }
  }
}
```

### Method 3: Run with Docker

```bash
docker pull ghcr.io/haydenwade/avalanche-org-mcp-server:latest
```

Claude Desktop config:

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

### Method 4: Build from source

```bash
git clone https://github.com/haydenwade/avalanche-org-mcp-server.git
cd avalanche-org-mcp-server
npm install
npm run build
```

Claude Desktop config:

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

## Available Tools

### `avalanche_danger_rating_by_point`

Looks up current avalanche danger by point.

Input example:

```json
{
  "lat": 40.5763,
  "lon": -111.7522,
  "preferNearest": true,
  "centerId": "UAC"
}
```

Returns:

- Match type (`inside_zone`, `nearest_zone`, `no_match`)
- Distance info
- Region, center, and danger rating
- Forecast and validity metadata

### `historic_avalanche_danger_rating_by_point`

Same lookup flow, but for a required `day`:

```json
{
  "lat": 40.5763,
  "lon": -111.7522,
  "day": "2026-02-24",
  "preferNearest": true
}
```

### `raw_map_layer`

Returns raw Avalanche.org map-layer GeoJSON for all centers.

### `raw_map_layer_by_avalanche_center`

Returns raw Avalanche.org map-layer GeoJSON for one center.

## Development

Requires Node.js `>=18`.

```bash
npm install
npm test
```

## Release Automation

This repository includes GitHub Actions for publishing:

- npm: `.github/workflows/npm-publish.yml`
- GitHub Container Registry (GHCR): `.github/workflows/docker-publish.yml`

Required repository secrets:

- `NPM_TOKEN`

Optional repository variable:

- `GHCR_IMAGE_NAME` (defaults to `ghcr.io/haydenwade/avalanche-org-mcp-server`)

Both workflows run on `release.published` and can also be run manually via `workflow_dispatch`.

## Safety

Tool outputs include a short safety disclaimer. Avalanche conditions can change rapidly and may vary within a forecast zone. Always confirm the official avalanche center forecast before making travel decisions.

## Attribution

- Data source: [Avalanche.org Public API](https://api.avalanche.org/)
- Public API docs: [NationalAvalancheCenter/Avalanche.org-Public-API-Docs](https://github.com/NationalAvalancheCenter/Avalanche.org-Public-API-Docs)

This project is not affiliated with Avalanche.org or the National Avalanche Center.
