import { exec } from "child_process";
import { promisify } from "util";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const execAsync = promisify(exec);

const DEFAULT_AUTH = process.env.SNC_DEFAULT_AUTH_ALIAS || "dev252193";

async function runSdk(command: string, cwd?: string) {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: cwd || process.cwd(),
      timeout: 120_000,
      env: { ...process.env, FORCE_COLOR: "0" },
    });
    const output = stdout || stderr || "Command completed successfully.";
    return { content: [{ type: "text" as const, text: output.trim() }] };
  } catch (error: unknown) {
    const msg =
      error instanceof Error
        ? (error as any).stderr || error.message
        : String(error);
    return {
      content: [{ type: "text" as const, text: `Error: ${msg}` }],
      isError: true,
    };
  }
}

export function registerSdkCommandTools(server: McpServer): void {
  // ── snc_auth_list ────────────────────────────────────────────────────────
  server.tool(
    "snc_auth_list",
    "List all saved ServiceNow authentication credentials",
    {},
    async () => runSdk("npx now-sdk auth --list")
  );

  // ── snc_auth_add ─────────────────────────────────────────────────────────
  server.tool(
    "snc_auth_add",
    "Returns the command the user must run in their terminal to add ServiceNow auth credentials (interactive — cannot be automated)",
    {
      instance: z
        .string()
        .describe("Instance name without domain (e.g. 'dev12345')"),
      alias: z
        .string()
        .optional()
        .describe("Alias for the credential (defaults to instance name)"),
      type: z
        .enum(["basic", "oauth"])
        .default("basic")
        .describe("Authentication type"),
    },
    async ({ instance, alias, type }) => {
      const a = alias || instance;
      const cmd = `npx now-sdk auth --add ${instance} --type ${type} --alias ${a}`;
      return {
        content: [
          {
            type: "text" as const,
            text: `This command requires interactive input (username/password). Run it in your terminal:\n\n${cmd}\n\nThen set as default:\nnpx now-sdk auth --use ${a}`,
          },
        ],
      };
    }
  );

  // ── snc_auth_use ─────────────────────────────────────────────────────────
  server.tool(
    "snc_auth_use",
    "Set the default authentication alias for SDK commands",
    {
      alias: z.string().describe("Credential alias to set as default"),
    },
    async ({ alias }) => runSdk(`npx now-sdk auth --use ${alias}`)
  );

  // ── snc_init ─────────────────────────────────────────────────────────────
  server.tool(
    "snc_init",
    "Scaffold a new ServiceNow Fluent application",
    {
      appName: z.string().describe("Application display name"),
      scopeName: z
        .string()
        .describe("Scope name (e.g. x_myorg_myapp, max 18 chars)"),
      template: z
        .enum([
          "base",
          "configuration",
          "typescript.basic",
          "typescript.react",
          "typescript.vue",
          "javascript.basic",
          "javascript.react",
          "partial.typescript.react",
          "partial.typescript.vue",
          "partial.javascript.react",
        ])
        .default("typescript.basic")
        .describe("Project template"),
      packageName: z
        .string()
        .optional()
        .describe("npm package name (defaults to kebab-case of appName)"),
      auth: z
        .string()
        .optional()
        .describe(`Auth alias (defaults to ${DEFAULT_AUTH})`),
      directory: z
        .string()
        .optional()
        .describe("Working directory to run in"),
    },
    async ({ appName, scopeName, template, packageName, auth, directory }) => {
      const parts = [
        "npx now-sdk init",
        `--appName "${appName}"`,
        `--scopeName "${scopeName}"`,
        `--template ${template}`,
      ];
      if (packageName) parts.push(`--packageName "${packageName}"`);
      parts.push(`--auth ${auth || DEFAULT_AUTH}`);
      return runSdk(parts.join(" "), directory);
    }
  );

  // ── snc_build ────────────────────────────────────────────────────────────
  server.tool(
    "snc_build",
    "Build/compile a ServiceNow Fluent application",
    {
      directory: z
        .string()
        .optional()
        .describe("Project root directory"),
    },
    async ({ directory }) => runSdk("npx now-sdk build", directory)
  );

  // ── snc_install ──────────────────────────────────────────────────────────
  server.tool(
    "snc_install",
    "Deploy a built ServiceNow application to the instance",
    {
      directory: z
        .string()
        .optional()
        .describe("Project root directory"),
      auth: z
        .string()
        .optional()
        .describe(`Auth alias (defaults to ${DEFAULT_AUTH})`),
    },
    async ({ directory, auth }) => {
      const parts = ["npx now-sdk install"];
      if (auth) parts.push(`--auth ${auth}`);
      return runSdk(parts.join(" "), directory);
    }
  );

  // ── snc_dependencies ─────────────────────────────────────────────────────
  server.tool(
    "snc_dependencies",
    "Pull table type definitions from the ServiceNow instance for IDE autocompletion",
    {
      directory: z
        .string()
        .optional()
        .describe("Project root directory"),
      auth: z
        .string()
        .optional()
        .describe(`Auth alias (defaults to ${DEFAULT_AUTH})`),
    },
    async ({ directory, auth }) => {
      const parts = ["npx now-sdk dependencies"];
      if (auth) parts.push(`--auth ${auth}`);
      return runSdk(parts.join(" "), directory);
    }
  );

  // ── snc_transform ────────────────────────────────────────────────────────
  server.tool(
    "snc_transform",
    "Convert legacy ServiceNow application metadata (XML) to Fluent TypeScript",
    {
      from: z
        .string()
        .optional()
        .describe("SYS_ID of legacy app on instance, or path to XML directory"),
      directory: z
        .string()
        .optional()
        .describe("Project root directory"),
      auth: z
        .string()
        .optional()
        .describe(`Auth alias (defaults to ${DEFAULT_AUTH})`),
    },
    async ({ from, directory, auth }) => {
      const parts = ["npx now-sdk transform"];
      if (from) parts.push(`--from "${from}"`);
      if (auth) parts.push(`--auth ${auth}`);
      return runSdk(parts.join(" "), directory);
    }
  );

  // ── snc_clean ────────────────────────────────────────────────────────────
  server.tool(
    "snc_clean",
    "Remove build output directories for a ServiceNow application",
    {
      directory: z
        .string()
        .optional()
        .describe("Project root directory"),
    },
    async ({ directory }) => runSdk("npx now-sdk clean", directory)
  );
}
