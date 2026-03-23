import assert from "node:assert/strict";
import test from "node:test";
import { registerAvalancheTools } from "../src/tools.js";

type ToolHandler = (args: Record<string, unknown>) => Promise<{
  content?: Array<{ type: string; text?: string }>;
}>;

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

test("all registered tools return JSON data in text content", async () => {
  const server = new FakeServer();
  registerAvalancheTools(server as never);

  const originalFetch = globalThis.fetch;
  const sample = buildSampleMapLayer();
  globalThis.fetch = async () =>
    new Response(JSON.stringify(sample), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

  try {
    const cases: Array<[string, Record<string, unknown>]> = [
      ["avalanche_danger_rating_by_point", { lat: 40.5, lon: -111.5 }],
      [
        "historic_avalanche_danger_rating_by_point",
        { lat: 40.5, lon: -111.5, day: "2026-03-01" },
      ],
      ["raw_map_layer", {}],
      ["raw_map_layer_by_avalanche_center", { centerId: "UAC" }],
    ];

    for (const [toolName, args] of cases) {
      const tool = server.tools.get(toolName);
      assert.ok(tool, `Missing tool registration for ${toolName}`);

      const result = await tool.handler(args);
      const text = result.content?.[0]?.text;
      assert.equal(typeof text, "string", `${toolName} should include text content`);

      const parsed = JSON.parse(text as string) as Record<string, unknown>;
      assert.ok(Object.keys(parsed).length > 0, `${toolName} text should contain JSON keys`);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
