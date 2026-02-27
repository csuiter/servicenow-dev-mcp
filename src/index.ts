#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerSdkCommandTools } from "./tools/sdk-commands.js";
import { registerCodeGeneratorTools } from "./tools/code-generators.js";
import { registerResources } from "./resources/references.js";
import { registerPrompts } from "./prompts/new-app.js";

const server = new McpServer({
  name: "servicenow-dev-mcp",
  version: "1.0.0",
});

registerSdkCommandTools(server);
registerCodeGeneratorTools(server);
registerResources(server);
registerPrompts(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ServiceNow Dev MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
