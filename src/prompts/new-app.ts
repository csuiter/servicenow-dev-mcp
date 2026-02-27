import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerPrompts(server: McpServer): void {
  server.prompt(
    "new-servicenow-app",
    "Guided workflow to create a complete new ServiceNow application with tables, roles, ACLs, business rules, flows, and workspace",
    {
      appName: z
        .string()
        .describe("Application display name (e.g. 'Expense Tracker')"),
      scopeName: z
        .string()
        .describe("Application scope (e.g. x_myorg_expenses, max 18 chars)"),
      description: z
        .string()
        .optional()
        .describe("Brief description of what the app does"),
    },
    async ({ appName, scopeName, description }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Create a new ServiceNow application called "${appName}" with scope "${scopeName}".${description ? ` ${description}` : ""}

Use the ServiceNow MCP tools to build the complete application:

1. **Initialize** — Use \`snc_init\` with template \`typescript.basic\` to scaffold the project
2. **Tables** — Use \`snc_generate_table\` for each table needed. Ask me what tables and columns I want.
3. **Roles** — Use \`snc_generate_role\` to create access roles
4. **ACLs** — Use \`snc_generate_acl\` to secure each table
5. **Business Rules** — Use \`snc_generate_business_rule\` for any automation logic
6. **Flows** — Use \`snc_generate_flow\` for workflow automation
7. **App Menu** — Use \`snc_generate_app_menu\` to create navigation
8. **Workspace** — Use \`snc_generate_workspace\` to set up the workspace UI
9. **Build** — Use \`snc_build\` to compile
10. **Deploy** — Use \`snc_install\` to deploy to the instance

Start by asking me about the tables and fields I need for this application.`,
          },
        },
      ],
    })
  );
}
