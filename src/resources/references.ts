import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerResources(server: McpServer): void {
  // ── Fluent API Reference ─────────────────────────────────────────────────
  server.resource(
    "fluent-api-reference",
    "servicenow://fluent/api-reference",
    async () => ({
      contents: [
        {
          uri: "servicenow://fluent/api-reference",
          mimeType: "text/markdown",
          text: API_REFERENCE,
        },
      ],
    })
  );

  // ── Column Types ─────────────────────────────────────────────────────────
  server.resource(
    "fluent-column-types",
    "servicenow://fluent/column-types",
    async () => ({
      contents: [
        {
          uri: "servicenow://fluent/column-types",
          mimeType: "text/markdown",
          text: COLUMN_TYPES,
        },
      ],
    })
  );

  // ── Flow Triggers ────────────────────────────────────────────────────────
  server.resource(
    "fluent-flow-triggers",
    "servicenow://fluent/flow-triggers",
    async () => ({
      contents: [
        {
          uri: "servicenow://fluent/flow-triggers",
          mimeType: "text/markdown",
          text: FLOW_TRIGGERS,
        },
      ],
    })
  );

  // ── Flow Actions ─────────────────────────────────────────────────────────
  server.resource(
    "fluent-flow-actions",
    "servicenow://fluent/flow-actions",
    async () => ({
      contents: [
        {
          uri: "servicenow://fluent/flow-actions",
          mimeType: "text/markdown",
          text: FLOW_ACTIONS,
        },
      ],
    })
  );

  // ── SDK Commands ─────────────────────────────────────────────────────────
  server.resource(
    "sdk-commands",
    "servicenow://sdk/commands",
    async () => ({
      contents: [
        {
          uri: "servicenow://sdk/commands",
          mimeType: "text/markdown",
          text: SDK_COMMANDS,
        },
      ],
    })
  );
}

// ── Static content ─────────────────────────────────────────────────────────

const API_REFERENCE = `# ServiceNow Fluent API Reference

## Core Module: \`@servicenow/sdk/core\`

### Table Definition
\`\`\`typescript
import { Table, StringColumn, IntegerColumn } from '@servicenow/sdk/core'

export const myTable = Table({
    name: 'x_scope_table_name',
    label: 'My Table',
    schema: { /* columns */ },
    display: 'field_name',        // optional display column
    index: [{ element, name }],   // optional indexes
})
\`\`\`

### Record (Generic metadata record)
\`\`\`typescript
import { Record } from '@servicenow/sdk/core'

Record({
    table: 'sys_table_name',
    $id: Now.ID['unique_key'],
    data: { /* field values */ },
})
\`\`\`

### ApplicationMenu
\`\`\`typescript
import { ApplicationMenu } from '@servicenow/sdk/core'

ApplicationMenu({
    $id: Now.ID['menu_id'],
    title: 'Menu Title',
    description: 'Description',
    active: true,
    roles: [roleVariable],
})
\`\`\`

### Role
\`\`\`typescript
import { Role } from '@servicenow/sdk/core'

export const myRole = Role({
    name: 'x_scope.role_name',
    description: 'Role description',
})
\`\`\`

### Acl
\`\`\`typescript
import { Acl } from '@servicenow/sdk/core'

Acl({
    $id: Now.ID['acl_id'],
    active: true,
    type: 'record',
    operation: 'read',      // create | read | write | delete
    roles: [roleVariable],
    table: 'table_name',
    script: functionRef,     // optional
})
\`\`\`

### BusinessRule
\`\`\`typescript
import { BusinessRule } from '@servicenow/sdk/core'

BusinessRule({
    $id: Now.ID['rule_id'],
    name: 'Rule Name',
    table: 'table_name',
    when: 'before',           // before | after | async | display
    action: ['insert', 'update'],
    active: true,
    filter_condition: 'field=value',
    script: functionRef,
    abort_action: false,
})
\`\`\`

### List
\`\`\`typescript
import { List } from '@servicenow/sdk/core'

List({
    $id: Now.ID['list_id'],
    table: 'table_name',
    view: viewRecordRef,
    columns: [
        { element: 'field_name', position: 0 },
    ],
})
\`\`\`

## Automation Module: \`@servicenow/sdk/automation\`

### Flow
\`\`\`typescript
import { action, Flow, wfa, trigger } from '@servicenow/sdk/automation'

export const myFlow = Flow(
    { $id: Now.ID['flow_id'], name: 'Flow Name', description: '...' },
    wfa.trigger(trigger.record.created, { $id: Now.ID['trigger_id'] }, { table, condition, ... }),
    (params) => {
        wfa.action(action.core.log, { $id: Now.ID['action_id'] }, { log_level, log_message })
    }
)
\`\`\`

## Utility: \`Now.include()\`
Reference external file content in Record data fields:
\`\`\`typescript
script: Now.include('./my-script.server.js')
\`\`\`

## Utility: \`Now.ID[]\`
Generate unique sys_ids for metadata records:
\`\`\`typescript
$id: Now.ID['descriptive_unique_key']
\`\`\`
`;

const COLUMN_TYPES = `# Fluent Column Types

All imported from \`@servicenow/sdk/core\`.

## StringColumn
Text field.
- \`label\`: string (required)
- \`mandatory\`: boolean
- \`maxLength\`: number (default 40)
- \`unique\`: boolean
- \`read_only\`: boolean
- \`default\`: string
- \`dropdown\`: 'none' | 'suggestion' | 'dropdown_with_none'
- \`choices\`: { key: { label: string, sequence?: number } }

## IntegerColumn
Whole number field.
- \`label\`: string
- \`mandatory\`: boolean
- \`default\`: number

## BooleanColumn
True/false field.
- \`label\`: string
- \`mandatory\`: boolean
- \`default\`: boolean

## DateColumn
Date-only field (yyyy-MM-dd).
- \`label\`: string
- \`mandatory\`: boolean

## DateTimeColumn
Date and time field.
- \`label\`: string
- \`mandatory\`: boolean

## DecimalColumn
Decimal number field.
- \`label\`: string
- \`mandatory\`: boolean

## ReferenceColumn
Foreign key reference to another table.
- \`label\`: string
- \`mandatory\`: boolean
- \`referenceTable\`: string (target table name, required)
- \`read_only\`: boolean
- \`active\`: boolean

## ChoiceColumn
Dropdown / radio selection.
- \`label\`: string
- \`mandatory\`: boolean
- \`default\`: string (choice key)
- \`dropdown\`: 'none' | 'suggestion' | 'dropdown_with_none'
- \`choices\`: { key: { label: string, sequence?: number } }

## Other Column Types
- \`ListColumn\` — multi-value reference
- \`ScriptColumn\` — script field
- \`ConditionsColumn\` — condition builder
- \`TranslatedFieldColumn\` — translatable string
- \`TranslatedTextColumn\` — translatable text area
- \`URLColumn\` — URL field
- \`EmailColumn\` — email field
- \`PhoneNumberColumn\` — phone number
- \`PriceColumn\` — currency/price
- \`FieldNameColumn\` — field name reference
- \`TableNameColumn\` — table name reference
- \`DocumentIdColumn\` — document ID
- \`DomainIdColumn\` — domain reference
`;

const FLOW_TRIGGERS = `# Fluent Flow Trigger Types

Import: \`import { trigger } from '@servicenow/sdk/automation'\`

## Record Triggers
- \`trigger.record.created\` — fires when a record is inserted
- \`trigger.record.updated\` — fires when a record is updated
- \`trigger.record.createdOrUpdated\` — fires on insert or update

### Trigger Configuration
\`\`\`typescript
wfa.trigger(
    trigger.record.created,
    { $id: Now.ID['trigger_id'] },
    {
        table: 'table_name',
        condition: 'field=value^field2=value2',   // encoded query
        run_flow_in: 'background',                // 'background' | 'foreground'
        trigger_strategy: 'unique_changes',       // for updated triggers
        run_on_extended: 'false',                  // run on extended tables
        run_when_setting: 'both',                  // 'both' | 'initial' | 'always'
        run_when_user_setting: 'any',
        run_when_user_list: [],
    }
)
\`\`\`

## Trigger Parameters
In the flow body, access trigger data via \`params\`:
- \`params.trigger.current.<field>\` — current record field values
- \`params.trigger.current.sys_id\` — record sys_id (use @ts-ignore for custom tables)
- \`params.trigger.table_name\` — trigger table name

## Condition Syntax
Uses ServiceNow encoded query format:
- \`field=value\` — equals
- \`field!=value\` — not equals
- \`fieldCHANGES\` — field changed
- \`fieldISEMPTY\` — field is empty
- \`^OR\` — OR operator
- \`^\` — AND operator
`;

const FLOW_ACTIONS = `# Fluent Flow Action Types

Import: \`import { action, wfa } from '@servicenow/sdk/automation'\`

## Core Actions

### Log
\`\`\`typescript
wfa.action(action.core.log, { $id }, {
    log_level: 'info',     // 'info' | 'warn' | 'error'
    log_message: 'message',
})
\`\`\`

### Look Up Record
\`\`\`typescript
const result = wfa.action(action.core.lookUpRecord, { $id }, {
    table: 'sys_user',
    conditions: 'sys_id=<value>',
    sort_type: 'sort_asc',
    if_multiple_records_are_found_action: 'use_first_record',
})
// Access: result.Record.<field>
\`\`\`

### Update Record
\`\`\`typescript
wfa.action(action.core.updateRecord, { $id }, {
    table_name: 'table_name',
    record: wfa.dataPill(params.trigger.current.sys_id, 'reference'),
    values: { field: 'value' },
})
\`\`\`

### Send Email
\`\`\`typescript
wfa.action(action.core.sendEmail, { $id }, {
    table_name: 'table_name',
    watermark_email: true,
    ah_subject: 'Subject',
    ah_body: 'Body text',
    record: wfa.dataPill(params.trigger.current.sys_id, 'reference'),
    ah_to: 'email@example.com',
})
\`\`\`

### Send Notification
\`\`\`typescript
wfa.action(action.core.sendNotification, { $id }, {
    table_name: 'table_name',
    record: wfa.dataPill(params.trigger.current.sys_id, 'reference'),
    notification: 'notification_name',
})
\`\`\`

### Send SMS
\`\`\`typescript
wfa.action(action.core.sendSms, { $id }, {
    recipients: 'phone_number',
    message: 'SMS body',
})
\`\`\`

## Flow Logic

### If / ElseIf / Else
\`\`\`typescript
wfa.flowLogic.if({ $id, condition: 'expression', annotation: 'label' }, () => { /* actions */ })
wfa.flowLogic.elseIf({ $id, condition, annotation }, () => { /* actions */ })
\`\`\`

### ForEach
\`\`\`typescript
wfa.flowLogic.forEach(dataPillArray, { $id }, () => { /* actions */ })
\`\`\`

## Data Pills
Reference trigger/action data dynamically:
\`\`\`typescript
wfa.dataPill(params.trigger.current.field_name, 'string')
wfa.dataPill(params.trigger.current.ref_field, 'reference')
wfa.dataPill(lookupResult.Record.field, 'string')
\`\`\`
`;

const SDK_COMMANDS = `# ServiceNow SDK CLI Commands

## Authentication
\`\`\`
now-sdk auth --add <instance> --type basic --alias <alias>
now-sdk auth --delete <alias>
now-sdk auth --use <alias>
now-sdk auth --list
\`\`\`

## Application Lifecycle
\`\`\`
now-sdk init --appName "Name" --scopeName "x_scope" --template typescript.basic [--auth alias]
now-sdk build [--frozenKeys]
now-sdk install [--auth alias]
now-sdk clean
\`\`\`

## Templates (for init --template)
- base
- configuration
- typescript.basic
- typescript.react
- typescript.vue
- javascript.basic
- javascript.react
- partial.typescript.react
- partial.typescript.vue
- partial.javascript.react

## Dependencies
\`\`\`
now-sdk dependencies [--auth alias]
\`\`\`
Downloads table definitions and TypeScript types from the instance.
Types are saved to \`@types/servicenow/fluent/\`.
Configure tables in \`now.config.json\`:
\`\`\`json
{
  "dependencies": {
    "global": {
      "tables": ["incident", "sys_user"],
      "roles": ["admin"]
    }
  }
}
\`\`\`

## Transform (Legacy Conversion)
\`\`\`
now-sdk transform --from <sys_id_or_path> [--auth alias]
\`\`\`
Converts legacy ServiceNow app metadata (XML) to Fluent TypeScript.

## Project Files
- \`now.config.json\` — scope, scopeId, name, dependencies
- \`package.json\` — standard npm with \`now-sdk build\` script
- \`src/fluent/\` — Fluent \`.now.ts\` files
- \`src/server/\` — Server-side TypeScript (\`.ts\`)
- \`src/fluent/generated/\` — Auto-generated keys file
`;
