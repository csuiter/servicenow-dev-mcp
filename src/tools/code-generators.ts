import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// ── Column spec schema (reused across tools) ────────────────────────────────

const ColumnSpec = z.object({
  name: z.string().describe("Column field name (snake_case)"),
  type: z
    .enum([
      "string",
      "integer",
      "boolean",
      "date",
      "datetime",
      "decimal",
      "reference",
      "choice",
    ])
    .describe("Column type"),
  label: z.string().describe("Display label"),
  mandatory: z.boolean().optional().describe("Required field"),
  maxLength: z.number().optional().describe("Max length (string only)"),
  referenceTable: z
    .string()
    .optional()
    .describe("Referenced table name (reference only)"),
  choices: z
    .record(z.string(), z.string())
    .optional()
    .describe("Choice key→label map (choice only)"),
  defaultValue: z
    .string()
    .optional()
    .describe("Default value"),
});

type ColumnSpecType = z.infer<typeof ColumnSpec>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function columnTypeImport(type: string): string {
  const map: Record<string, string> = {
    string: "StringColumn",
    integer: "IntegerColumn",
    boolean: "BooleanColumn",
    date: "DateColumn",
    datetime: "DateTimeColumn",
    decimal: "DecimalColumn",
    reference: "ReferenceColumn",
    choice: "ChoiceColumn",
  };
  return map[type] || "StringColumn";
}

function generateColumnCode(col: ColumnSpecType, indent: string): string {
  const props: string[] = [];
  props.push(`label: '${col.label}'`);
  if (col.mandatory) props.push("mandatory: true");
  if (col.maxLength) props.push(`maxLength: ${col.maxLength}`);
  if (col.defaultValue !== undefined) props.push(`default: '${col.defaultValue}'`);

  if (col.type === "reference" && col.referenceTable) {
    props.push(`referenceTable: '${col.referenceTable}'`);
  }

  if (col.type === "choice" && col.choices) {
    const entries = Object.entries(col.choices)
      .map(([k, v], i) => `${indent}            ${k}: { label: '${v}', sequence: ${i + 1} }`)
      .join(",\n");
    props.push(`choices: {\n${entries},\n${indent}        }`);
  }

  const typeFn = columnTypeImport(col.type);
  const propsStr = props.join(`,\n${indent}            `);
  return `${indent}        ${col.name}: ${typeFn}({\n${indent}            ${propsStr},\n${indent}        })`;
}

function idKey(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
}

// ── Registration ─────────────────────────────────────────────────────────────

export function registerCodeGeneratorTools(server: McpServer): void {
  // ── snc_generate_table ───────────────────────────────────────────────────
  server.tool(
    "snc_generate_table",
    "Generate a Fluent Table definition file with columns",
    {
      tableName: z
        .string()
        .describe("Full table name including scope prefix (e.g. x_myapp_task)"),
      label: z.string().describe("Display label for the table"),
      columns: z.array(ColumnSpec).describe("Column definitions"),
      displayColumn: z
        .string()
        .optional()
        .describe("Column to use as display value"),
    },
    async ({ tableName, label, columns, displayColumn }) => {
      const imports = new Set<string>(["Table"]);
      for (const col of columns) imports.add(columnTypeImport(col.type));

      const importList = Array.from(imports).sort().join(", ");
      const colCode = columns
        .map((c) => generateColumnCode(c, ""))
        .join(",\n");

      const varName = tableName.replace(/\./g, "_");
      let code = `import { ${importList} } from '@servicenow/sdk/core'\n\n`;
      code += `export const ${varName} = Table({\n`;
      code += `    name: '${tableName}',\n`;
      code += `    label: '${label}',\n`;
      code += `    schema: {\n${colCode},\n    },\n`;
      if (displayColumn) code += `    display: '${displayColumn}',\n`;
      code += `})\n`;

      return { content: [{ type: "text" as const, text: code }] };
    }
  );

  // ── snc_generate_flow ────────────────────────────────────────────────────
  server.tool(
    "snc_generate_flow",
    "Generate a Fluent Flow definition with trigger and actions",
    {
      name: z.string().describe("Flow name"),
      description: z.string().describe("Flow description"),
      triggerType: z
        .enum(["created", "updated", "createdOrUpdated"])
        .describe("Record trigger type"),
      table: z.string().describe("Table to trigger on"),
      condition: z
        .string()
        .optional()
        .describe("Trigger condition (e.g. 'priority=1')"),
      actions: z
        .array(
          z.object({
            type: z
              .enum(["log", "updateRecord", "sendEmail", "lookUpRecord"])
              .describe("Action type"),
            config: z
              .record(z.string(), z.string())
              .describe("Action-specific configuration"),
          })
        )
        .describe("Flow actions to execute"),
    },
    async ({ name, description, triggerType, table, condition, actions }) => {
      const flowId = idKey(name);
      let code = `import { action, Flow, wfa, trigger } from '@servicenow/sdk/automation'\n\n`;
      code += `export const ${flowId} = Flow(\n`;
      code += `    {\n`;
      code += `        $id: Now.ID['${flowId}'],\n`;
      code += `        name: '${name}',\n`;
      code += `        description: '${description}',\n`;
      code += `    },\n`;
      code += `    wfa.trigger(\n`;
      code += `        trigger.record.${triggerType},\n`;
      code += `        { $id: Now.ID['${flowId}_trigger'] },\n`;
      code += `        {\n`;
      code += `            table: '${table}',\n`;
      if (condition) code += `            condition: '${condition}',\n`;
      code += `            run_flow_in: 'background',\n`;
      code += `            run_on_extended: 'false',\n`;
      code += `            run_when_setting: 'both',\n`;
      code += `            run_when_user_setting: 'any',\n`;
      code += `            run_when_user_list: [],\n`;
      code += `        }\n`;
      code += `    ),\n`;
      code += `    (params) => {\n`;

      for (const act of actions) {
        const actId = idKey(`${flowId}_${act.type}`);
        switch (act.type) {
          case "log":
            code += `        wfa.action(\n`;
            code += `            action.core.log,\n`;
            code += `            { $id: Now.ID['${actId}'] },\n`;
            code += `            {\n`;
            code += `                log_level: '${act.config.level || "info"}',\n`;
            code += `                log_message: '${act.config.message || "Flow executed"}',\n`;
            code += `            }\n`;
            code += `        )\n\n`;
            break;
          case "updateRecord":
            code += `        wfa.action(\n`;
            code += `            action.core.updateRecord,\n`;
            code += `            { $id: Now.ID['${actId}'] },\n`;
            code += `            {\n`;
            code += `                table_name: '${act.config.table || table}',\n`;
            code += `                // @ts-ignore - sys_id is a system column\n`;
            code += `                record: wfa.dataPill(params.trigger.current.sys_id, 'reference'),\n`;
            code += `                values: {\n`;
            for (const [k, v] of Object.entries(act.config)) {
              if (k !== "table") code += `                    ${k}: '${v}',\n`;
            }
            code += `                },\n`;
            code += `            }\n`;
            code += `        )\n\n`;
            break;
          case "sendEmail":
            code += `        wfa.action(\n`;
            code += `            action.core.sendEmail,\n`;
            code += `            { $id: Now.ID['${actId}'] },\n`;
            code += `            {\n`;
            code += `                table_name: '${table}',\n`;
            code += `                watermark_email: true,\n`;
            code += `                ah_subject: '${act.config.subject || "Notification"}',\n`;
            code += `                ah_body: '${act.config.body || ""}',\n`;
            code += `                // @ts-ignore - sys_id is a system column\n`;
            code += `                record: wfa.dataPill(params.trigger.current.sys_id, 'reference'),\n`;
            code += `                ah_to: '${act.config.to || ""}',\n`;
            code += `            }\n`;
            code += `        )\n\n`;
            break;
          case "lookUpRecord":
            code += `        const ${actId}_result = wfa.action(\n`;
            code += `            action.core.lookUpRecord,\n`;
            code += `            { $id: Now.ID['${actId}'] },\n`;
            code += `            {\n`;
            code += `                table: '${act.config.table || "sys_user"}',\n`;
            code += `                conditions: '${act.config.conditions || ""}',\n`;
            code += `                sort_type: 'sort_asc',\n`;
            code += `                if_multiple_records_are_found_action: 'use_first_record',\n`;
            code += `            }\n`;
            code += `        )\n\n`;
            break;
        }
      }

      code += `    }\n`;
      code += `)\n`;

      return { content: [{ type: "text" as const, text: code }] };
    }
  );

  // ── snc_generate_business_rule ───────────────────────────────────────────
  server.tool(
    "snc_generate_business_rule",
    "Generate a Fluent BusinessRule definition",
    {
      name: z.string().describe("Business rule name"),
      table: z.string().describe("Table to attach the rule to"),
      when: z
        .enum(["before", "after", "async", "display"])
        .describe("When to run the rule"),
      actions: z
        .array(z.enum(["insert", "update", "delete", "query"]))
        .describe("On which operations"),
      condition: z
        .string()
        .optional()
        .describe("Filter condition (e.g. 'state=2')"),
      scriptBody: z
        .string()
        .describe("Function body for the script (receives 'current' GlideRecord)"),
      scriptFunctionName: z
        .string()
        .optional()
        .describe("Name for the exported script function"),
    },
    async ({ name, table, when, actions, condition, scriptBody, scriptFunctionName }) => {
      const ruleId = idKey(name);
      const fnName = scriptFunctionName || `${ruleId}Script`;
      const actionStr = actions.map((a) => `'${a}'`).join(", ");

      let code = `import { BusinessRule } from '@servicenow/sdk/core'\n`;
      code += `import { GlideRecord, gs } from '@servicenow/glide'\n\n`;
      code += `function ${fnName}(current: GlideRecord): void {\n`;
      code += `    ${scriptBody}\n`;
      code += `}\n\n`;
      code += `BusinessRule({\n`;
      code += `    $id: Now.ID['${ruleId}'],\n`;
      code += `    name: '${name}',\n`;
      code += `    table: '${table}',\n`;
      code += `    when: '${when}',\n`;
      code += `    action: [${actionStr}],\n`;
      code += `    active: true,\n`;
      if (condition) code += `    filter_condition: '${condition}',\n`;
      code += `    script: ${fnName},\n`;
      code += `    abort_action: false,\n`;
      code += `})\n`;

      return { content: [{ type: "text" as const, text: code }] };
    }
  );

  // ── snc_generate_acl ─────────────────────────────────────────────────────
  server.tool(
    "snc_generate_acl",
    "Generate Fluent ACL definitions for a table (one per CRUD operation)",
    {
      table: z.string().describe("Table name"),
      operations: z
        .array(z.enum(["create", "read", "write", "delete"]))
        .default(["create", "read", "write", "delete"])
        .describe("Operations to generate ACLs for"),
      roleName: z
        .string()
        .optional()
        .describe("Role variable name to import (e.g. 'myAppUser')"),
      roleImportPath: z
        .string()
        .optional()
        .describe("Import path for the role (e.g. './role.now')"),
    },
    async ({ table, operations, roleName, roleImportPath }) => {
      let code = `import { Acl } from '@servicenow/sdk/core'\n`;
      if (roleName && roleImportPath) {
        code += `import { ${roleName} } from '${roleImportPath}'\n`;
      }
      code += `\n`;

      for (const op of operations) {
        const aclId = idKey(`${table}_${op}`);
        code += `Acl({\n`;
        code += `    $id: Now.ID['${aclId}'],\n`;
        code += `    active: true,\n`;
        code += `    type: 'record',\n`;
        code += `    operation: '${op}',\n`;
        if (roleName) {
          code += `    roles: [${roleName}],\n`;
        }
        code += `    table: '${table}',\n`;
        code += `})\n\n`;
      }

      return { content: [{ type: "text" as const, text: code }] };
    }
  );

  // ── snc_generate_role ────────────────────────────────────────────────────
  server.tool(
    "snc_generate_role",
    "Generate a Fluent Role definition",
    {
      name: z
        .string()
        .describe("Role name including scope (e.g. x_myapp.my_role)"),
      description: z.string().describe("Role description"),
      exportName: z
        .string()
        .optional()
        .describe("TypeScript export variable name"),
    },
    async ({ name, description, exportName }) => {
      const varName = exportName || idKey(name.split(".").pop() || name);
      let code = `import { Role } from '@servicenow/sdk/core'\n\n`;
      code += `export const ${varName} = Role({\n`;
      code += `    name: '${name}',\n`;
      code += `    description: '${description}',\n`;
      code += `})\n`;

      return { content: [{ type: "text" as const, text: code }] };
    }
  );

  // ── snc_generate_app_menu ────────────────────────────────────────────────
  server.tool(
    "snc_generate_app_menu",
    "Generate a Fluent ApplicationMenu with navigation modules",
    {
      title: z.string().describe("Menu title"),
      description: z.string().describe("Menu description"),
      modules: z
        .array(
          z.object({
            title: z.string().describe("Module title"),
            table: z.string().describe("Table name for the module"),
            linkType: z
              .enum(["LIST", "NEW"])
              .default("LIST")
              .describe("LIST for list view, NEW for create form"),
            order: z.number().describe("Display order"),
          })
        )
        .describe("Navigation modules"),
      roleName: z
        .string()
        .optional()
        .describe("Role variable to import for access control"),
      roleImportPath: z
        .string()
        .optional()
        .describe("Import path for the role"),
    },
    async ({ title, description, modules, roleName, roleImportPath }) => {
      const menuId = idKey(title);

      let code = `import { ApplicationMenu, Record } from '@servicenow/sdk/core'\n`;
      if (roleName && roleImportPath) {
        code += `import { ${roleName} } from '${roleImportPath}'\n`;
      }
      code += `\n`;

      code += `export const ${menuId} = ApplicationMenu({\n`;
      code += `    $id: Now.ID['${menuId}'],\n`;
      code += `    title: '${title}',\n`;
      code += `    description: '${description}',\n`;
      code += `    active: true,\n`;
      if (roleName) code += `    roles: [${roleName}],\n`;
      code += `})\n\n`;

      for (const mod of modules) {
        const modId = idKey(`${menuId}_${mod.title}`);
        code += `Record({\n`;
        code += `    table: 'sys_app_module',\n`;
        code += `    $id: Now.ID['${modId}'],\n`;
        code += `    data: {\n`;
        code += `        title: '${mod.title}',\n`;
        code += `        active: true,\n`;
        code += `        application: ${menuId}.$id,\n`;
        code += `        link_type: '${mod.linkType}',\n`;
        code += `        name: '${mod.table}',\n`;
        code += `        order: ${mod.order},\n`;
        code += `        override_menu_roles: false,\n`;
        code += `        require_confirmation: false,\n`;
        code += `        uncancelable: false,\n`;
        code += `    },\n`;
        code += `})\n\n`;
      }

      return { content: [{ type: "text" as const, text: code }] };
    }
  );

  // ── snc_generate_workspace ───────────────────────────────────────────────
  server.tool(
    "snc_generate_workspace",
    "Generate Fluent workspace configuration records (sys_aw_master_config, sys_aw_table, list views)",
    {
      title: z.string().describe("Workspace title"),
      urlPath: z
        .string()
        .describe("URL path (accessible at /now/workspace/<urlPath>)"),
      description: z.string().describe("Workspace description"),
      tables: z
        .array(
          z.object({
            tableName: z.string().describe("Table name"),
            primary: z
              .boolean()
              .default(false)
              .describe("Is this the primary table"),
            listColumns: z
              .array(z.string())
              .describe("Column names for the list view"),
          })
        )
        .describe("Tables to register in the workspace"),
    },
    async ({ title, urlPath, description, tables }) => {
      const wsId = idKey(title);

      let code = `import { Record, List } from '@servicenow/sdk/core'\n\n`;

      // Workspace master config
      code += `Record({\n`;
      code += `    table: 'sys_aw_master_config',\n`;
      code += `    $id: Now.ID['${wsId}'],\n`;
      code += `    data: {\n`;
      code += `        title: '${title}',\n`;
      code += `        description: '${description}',\n`;
      code += `        url_path: '${urlPath}',\n`;
      code += `        active: true,\n`;
      code += `    },\n`;
      code += `})\n\n`;

      // Workspace tables and list views
      for (const tbl of tables) {
        const tblId = idKey(`ws_${tbl.tableName}`);
        code += `Record({\n`;
        code += `    table: 'sys_aw_table',\n`;
        code += `    $id: Now.ID['${tblId}'],\n`;
        code += `    data: {\n`;
        code += `        master_config: Now.ID['${wsId}'],\n`;
        code += `        table: '${tbl.tableName}',\n`;
        code += `        active: true,\n`;
        code += `        primary: ${tbl.primary},\n`;
        code += `    },\n`;
        code += `})\n\n`;

        // List view
        const viewId = idKey(`${tbl.tableName}_view`);
        code += `const ${viewId} = Record({\n`;
        code += `    table: 'sys_ui_view',\n`;
        code += `    $id: Now.ID['${viewId}'],\n`;
        code += `    data: {\n`;
        code += `        name: '${viewId}',\n`;
        code += `        title: '${tbl.tableName} Workspace View',\n`;
        code += `    },\n`;
        code += `})\n\n`;

        const listId = idKey(`${tbl.tableName}_list`);
        const cols = tbl.listColumns
          .map((c, i) => `        { element: '${c}', position: ${i} }`)
          .join(",\n");
        code += `List({\n`;
        code += `    $id: Now.ID['${listId}'],\n`;
        code += `    table: '${tbl.tableName}',\n`;
        code += `    view: ${viewId},\n`;
        code += `    columns: [\n${cols},\n    ],\n`;
        code += `})\n\n`;
      }

      return { content: [{ type: "text" as const, text: code }] };
    }
  );
}
