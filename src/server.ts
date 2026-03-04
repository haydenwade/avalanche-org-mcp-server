import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAvalancheTools } from "./tools.js";

export function createServer() {
  const server = new McpServer({
    name: "avalanche-org-mcp-server",
    version: "0.1.0",
  });

  registerAvalancheTools(server);
  return server;
}
