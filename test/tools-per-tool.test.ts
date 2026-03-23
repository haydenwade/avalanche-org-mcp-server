import assert from "node:assert/strict";
import test from "node:test";
import { registerAvalancheTools } from "../src/tools.js";

type ToolResult = {
  content?: Array<{ type: string; text?: string }>;
};

type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResult>;

class FakeServer {
  tools = new Map<string, { handler: ToolHandler }>();

  registerTool(
    name: string,
    _config: unknown,
    handler: ToolHandler,
  ) {
    this.tools.set(name, { handler });
  }
}

function buildSampleMapLayer() {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        id: "zone-1",
        properties: {
          name: "Test Zone",
          state: "UT",
          center_id: "UAC",
          center: "Utah Avalanche Center",
          timezone: "America/Denver",
          center_link: "https://utahavalanchecenter.org",
          danger_level: 3,
          danger: "Considerable",
          color: "orange",
          travel_advice: "Careful route-finding",
          link: "https://utahavalanchecenter.org/forecast/salt-lake",
          start_date: "2026-03-03",
          end_date: "2026-03-04",
        },
        geometry: {
          type: "Polygon",
          coordinates: [[[-112, 40], [-111, 40], [-111, 41], [-112, 41], [-112, 40]]],
        },
      },
    ],
  };
}

function buildServer() {
  const server = new FakeServer();
  registerAvalancheTools(server as never);
  return server;
}

function getToolHandler(server: FakeServer, toolName: string): ToolHandler {
  const tool = server.tools.get(toolName);
  assert.ok(tool, `Missing tool registration for ${toolName}`);
  return tool.handler;
}

function parseResult(result: ToolResult): Record<string, unknown> {
  const text = result.content?.[0]?.text;
  if (typeof text !== "string") {
    throw new Error("Tool should include text content");
  }
  return JSON.parse(text) as Record<string, unknown>;
}

async function withMockedMapLayerFetch(
  run: (requestedUrls: string[]) => Promise<void>,
): Promise<void> {
  const requestedUrls: string[] = [];
  const sample = buildSampleMapLayer();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: URL | RequestInfo) => {
    requestedUrls.push(String(input));
    return new Response(JSON.stringify(sample), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  try {
    await run(requestedUrls);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("avalanche_danger_rating_by_point returns zone, danger, and forecast", async () => {
  const server = buildServer();
  const handler = getToolHandler(server, "avalanche_danger_rating_by_point");

  await withMockedMapLayerFetch(async (requestedUrls) => {
    const result = await handler({ lat: 40.5, lon: -111.5, centerId: "UAC" });
    const output = parseResult(result);

    assert.equal(output.match, "inside_zone");
    assert.equal((output.zone as Record<string, unknown>).name, "Test Zone");
    assert.equal((output.center as Record<string, unknown>).id, "UAC");
    assert.equal((output.danger as Record<string, unknown>).level, 3);
    assert.ok(requestedUrls[0]?.includes("/v2/public/products/map-layer/UAC"));
  });
});

test("historic_avalanche_danger_rating_by_point includes the requested day", async () => {
  const server = buildServer();
  const handler = getToolHandler(server, "historic_avalanche_danger_rating_by_point");
  const day = "2026-03-14";

  await withMockedMapLayerFetch(async (requestedUrls) => {
    const result = await handler({ lat: 40.5, lon: -111.5, day });
    const output = parseResult(result);

    assert.equal(output.day, day);
    assert.ok(requestedUrls[0]?.includes(`day=${day}`));
  });
});

test("raw_map_layer returns geojson payload", async () => {
  const server = buildServer();
  const handler = getToolHandler(server, "raw_map_layer");
  const day = "2026-03-15";

  await withMockedMapLayerFetch(async (requestedUrls) => {
    const result = await handler({ day });
    const output = parseResult(result);

    const sample = buildSampleMapLayer();
    assert.deepEqual(output.geojson, sample);
    assert.ok(requestedUrls[0]?.includes("/v2/public/products/map-layer"));
    assert.ok(requestedUrls[0]?.includes(`day=${day}`));
  });
});

test("raw_map_layer_by_avalanche_center scopes request to center", async () => {
  const server = buildServer();
  const handler = getToolHandler(server, "raw_map_layer_by_avalanche_center");
  const centerId = "CBAC";
  const day = "2026-03-16";

  await withMockedMapLayerFetch(async (requestedUrls) => {
    const result = await handler({ centerId, day });
    const output = parseResult(result);

    assert.deepEqual(output.geojson, buildSampleMapLayer());
    assert.ok(requestedUrls[0]?.includes(`/v2/public/products/map-layer/${centerId}`));
    assert.ok(requestedUrls[0]?.includes(`day=${day}`));
  });
});
