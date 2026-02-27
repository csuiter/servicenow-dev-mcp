# ServiceNow Developer MCP Server

An MCP (Model Context Protocol) server that gives Claude direct access to ServiceNow SDK operations and Fluent code generation. Build, deploy, and manage ServiceNow applications end-to-end without leaving the conversation.

## Features

### SDK CLI Tools

Wraps the `now-sdk` CLI so Claude can run ServiceNow operations directly:

| Tool | Description |
|------|-------------|
| `snc_auth_list` | List saved authentication credentials |
| `snc_auth_add` | Get the command to add credentials (interactive — must be run in your terminal) |
| `snc_auth_use` | Set the default auth alias |
| `snc_init` | Scaffold a new Fluent application |
| `snc_build` | Compile Fluent source to deployable artifacts |
| `snc_install` | Deploy a built application to your instance |
| `snc_dependencies` | Pull table type definitions for IDE autocompletion |
| `snc_transform` | Convert legacy XML metadata to Fluent TypeScript |
| `snc_clean` | Remove build output |

### Fluent Code Generators

Generate valid ServiceNow Fluent TypeScript that can be written directly into `.now.ts` files:

| Tool | Description |
|------|-------------|
| `snc_generate_table` | Table with typed columns (String, Integer, Boolean, Date, Reference, Choice, etc.) |
| `snc_generate_flow` | Flow with record triggers, conditions, and actions |
| `snc_generate_business_rule` | Business rule with script function |
| `snc_generate_acl` | CRUD access control lists for a table |
| `snc_generate_role` | Role definition |
| `snc_generate_app_menu` | Application menu with navigation modules |
| `snc_generate_workspace` | Workspace config with table registrations and list views |

### Reference Resources

Static documentation available as MCP resources:

| Resource URI | Content |
|--------------|---------|
| `servicenow://fluent/api-reference` | All Fluent API functions with code examples |
| `servicenow://fluent/column-types` | Column types and their options |
| `servicenow://fluent/flow-triggers` | Flow trigger types and condition syntax |
| `servicenow://fluent/flow-actions` | Flow action types (log, lookUpRecord, updateRecord, sendEmail, etc.) |
| `servicenow://sdk/commands` | SDK CLI command reference |

### Guided Prompt

- **`new-servicenow-app`** — Walks through creating a complete application step by step (tables, roles, ACLs, business rules, flows, menu, workspace, build, deploy)

## Setup

### Prerequisites

- Node.js 18+
- ServiceNow SDK (`@servicenow/sdk`) — installed globally or via `npx`
- A ServiceNow instance with admin access

### Install

```bash
git clone <this-repo>
cd servicenow-dev-mcp
npm install
npm run build
```

### Register with Claude Code

```bash
claude mcp add --scope user servicenow-dev -- node /absolute/path/to/servicenow-dev-mcp/build/index.js
```

### Authenticate with your instance

The `snc_auth_add` tool will give you the command to run. Authentication is interactive and must be done in your terminal:

```bash
npx now-sdk auth --add <instance-name> --type basic --alias <alias>
npx now-sdk auth --use <alias>
```

### Environment Variables (optional)

| Variable | Description | Default |
|----------|-------------|---------|
| `SNC_DEFAULT_AUTH_ALIAS` | Default credential alias for SDK commands | `dev252193` |

## Usage

Once registered, Claude can use the tools in any conversation:

```
> Use snc_auth_list to show my saved credentials

> Create a new ServiceNow app called "IT Asset Tracker" with scope x_myorg_assets

> Generate a table called x_myorg_assets_item with columns for name, serial_number,
  asset_type (choice), purchase_date, assigned_to (reference to sys_user), and status

> Build and deploy the app to my instance
```

Use the `new-servicenow-app` prompt for a guided walkthrough:

```
> /prompt new-servicenow-app appName="Expense Tracker" scopeName="x_myorg_expenses"
```

## Project Structure

```
servicenow-dev-mcp/
├── src/
│   ├── index.ts                # Entry point — McpServer + STDIO transport
│   ├── tools/
│   │   ├── sdk-commands.ts     # 9 CLI wrapper tools
│   │   └── code-generators.ts  # 7 Fluent code generators
│   ├── resources/
│   │   └── references.ts       # 5 static reference resources
│   └── prompts/
│       └── new-app.ts          # Guided new-app prompt
├── package.json
└── tsconfig.json
```

## Development

```bash
npm run dev    # Watch mode — recompiles on changes
npm run build  # One-time build
npm start      # Run the server (STDIO transport)
```

## Known Quirks

- **`sys_id` on custom tables**: The Fluent type system doesn't include `sys_id` on custom `TableAwareRecord` types. Use `// @ts-ignore` before lines that access `params.trigger.current.sys_id`.
- **No parenthesized expressions**: The Fluent DSL parser rejects `as any` casts. Use `// @ts-ignore` instead.
- **`sys_ui_section` title field**: The `title` property is a boolean (controls visibility), not a string.
- **`snc_auth_add` is interactive**: The SDK auth flow uses interactive prompts that can't be automated. The tool returns the command for you to run manually.

## License

MIT
