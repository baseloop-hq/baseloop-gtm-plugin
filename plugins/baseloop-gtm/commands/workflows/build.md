---
name: baseloop-gtm:build
description: This command should be used when a workflow plan is ready and needs to be built step by step. It creates tables and columns, runs and verifies each step, and handles inline error diagnosis before proceeding.
argument-hint: "[plan description or reference to a previous /baseloop-gtm:plan output]"
disable-model-invocation: true
allowed-tools: Bash(echo *), Read, Glob, Grep, mcp__baseloop-gtm__list_tables, mcp__baseloop-gtm__get_table_schema, mcp__baseloop-gtm__list_rows, mcp__baseloop-gtm__get_row_details, mcp__baseloop-gtm__list_actions, mcp__baseloop-gtm__get_action_schema, mcp__baseloop-gtm__get_connected_platforms, mcp__baseloop-gtm__resolve_action_options, mcp__baseloop-gtm__list_views, mcp__baseloop-gtm__get_run_status, mcp__baseloop-gtm__preview_formula, mcp__baseloop-gtm__create_table, mcp__baseloop-gtm__update_table, mcp__baseloop-gtm__create_column, mcp__baseloop-gtm__update_column, mcp__baseloop-gtm__delete_column, mcp__baseloop-gtm__create_rows, mcp__baseloop-gtm__delete_row, mcp__baseloop-gtm__run_field, mcp__baseloop-gtm__run_fields, mcp__baseloop-gtm__wait_for_run, mcp__baseloop-gtm__create_workspace, mcp__baseloop-gtm__infer_ai_column, mcp__baseloop-gtm__send_webhook_data
---

# Build a GTM Workflow

## Input

<build_plan>$ARGUMENTS</build_plan>

If the plan above is empty, check the conversation for a recent `/baseloop-gtm:plan` output. If none found, ask: "What workflow do you want to build? Run `/baseloop-gtm:plan` first to design the architecture, or describe what you want."

## Pre-flight Check

Before building, verify:

1. **MCP connection** — Call `list_tables` to confirm the Baseloop MCP server is connected. If it fails, tell the user to set up the MCP connection first.
2. **Connected platforms** — Call `get_connected_platforms` to verify needed integrations are connected (e.g., HubSpot OAuth, Slack).
3. **Existing tables** — Call `list_tables` to check if any tables from the plan already exist. If so, ask whether to reuse or create new ones.
4. **Workspace** — Identify the target workspace. If none exists, create one with `create_workspace`.

## Build Protocol

For each table in the plan, follow this sequence:

### Step 1: Create the table

- **Source tables**: `create_table` with `sourceField` configuration (action type + actionKey + input).
- **Send to Table destinations**: `create_table` with NO columns. Send to Table auto-creates them.
- **Other tables**: `create_table` with just a name and workspace.

### Step 2: Trigger source import (if source table)

**For action-based sources** (HubSpot import, LinkedIn import):
1. `create_rows` with `[{}]` to create a placeholder row.
2. `run_field` on the source column with `skipCellsWithData: false`.
3. `wait_for_run` to wait for the import.
4. `list_rows` to verify data was imported. Report row count to user.

**For webhook sources:**
1. `get_table_schema` to find the webhook column ID (type=webhook).
2. `send_webhook_data` with the webhook column's fieldId and sample JSON data.
3. `list_rows` to verify the row was created with the expected data.

### Step 3: Add all columns (configuration only)

Create all columns for the table before running anything. This lets you set up the full chain with autoRunConditions so a small sample can flow end-to-end.

For each column in the plan:

1. **Read the action guide** — `get_action_schema` to get the `aiDescription`. Read it fully before configuring.
2. **Resolve column names** — `get_table_schema` for current column `name` fields (never guess).
3. **Resolve dynamic options** — `resolve_action_options` for any dynamic values (HubSpot properties, campaign IDs, list IDs).
4. **Create the column** — `create_column` with full configuration including `autoRunCondition`. Set `autoRunEnabled: false` for now — we'll test with explicit runs first.

For Send to Table columns:
1. Create the destination table first (empty, no columns)
2. Read `get_action_schema` for sendToTable
3. Configure fieldMappings using plain column `name` fields (NOT `{{field_name}}`)
4. For `send_for_each_item`: set `sourceColumnField` (plain name) and `sourceArrayPath`
5. For parent row data: use `column:field_name` prefix in mapping values

Report the full column chain to the user before proceeding to testing.

### Step 4: Test end-to-end with a small sample

Run a small sample (1-3 rows) through the **entire chain**, not column-by-column. This validates that autoRunConditions cascade correctly and data flows through Send to Table to downstream tables.

1. **Run the first column** on a small sample — `run_field` with `runAction: "first_one"`.
2. **Wait and verify** — `wait_for_run`, then `get_row_details` to check output.
3. **Run the next column** on the same row — `run_field` with `runAction: "first_one"`.
4. **Continue through the chain** — column by column, verifying each step's output feeds correctly into the next.
5. **Check downstream tables** — after Send to Table runs, call `list_rows` on destination tables to verify rows were created with correct data.
6. **Follow the data to the end** — continue running columns in destination tables until data reaches the final step (CRM sync, outreach, notification).

**If a column fails — inline diagnosis:**

1. Read [error-patterns.md](../skills/gtm-engineering/references/error-patterns.md) to load known error signatures.
2. `get_row_details` with fieldId — read the `errorMessage` and `fullValue`.
3. Match against known patterns (config mismatch, upstream null, auth failure, rate limit).
4. Fix with `update_column`, then re-run with `run_field` using `skipCellsWithData: false` on that column ONLY.
5. `get_row_details` again to verify the fix.
6. Never re-run upstream columns that already have correct data.

If the error persists after 2 fix attempts, suggest running `/baseloop-gtm:diagnose` for a deeper investigation.

### Step 4.5: End-to-end verification checklist

Before enabling auto-run, verify every table in the workflow:

1. **Row counts** — `list_rows` on each table. Verify expected row counts match (source → destination).
2. **No errors** — `get_row_details` on 2-3 rows per table, checking that no column shows "error" status.
3. **Send to Table destinations** — `list_rows` on each destination table. Confirm rows were created with correct data.
4. **CRM sync responses** — for HubSpot create/update columns, check `fullValue` for successful API responses.
5. **autoRunConditions** — verify that gated columns ran only on rows that met the condition.

Report the checklist results to the user before proceeding to scale.

### Step 5: Enable auto-run and test at scale

Once the end-to-end sample passes:
1. **Enable autoRunEnabled** on all columns that should auto-trigger — `update_column` for each.
2. **Run a larger batch** — `run_field` on the first column with `runAction: "first_ten"`. AutoRunConditions will cascade through the chain automatically.
3. **Wait for propagation** — poll with `get_run_status` or `wait_for_run` until the full chain completes.
4. **Verify final output** — `list_rows` on each table to check results at scale.

## Progress Tracking

After each step, provide a brief status:
- What was just built and verified
- What comes next
- Any issues encountered and how they were resolved

## Completion

When the full workflow is built and verified:

1. **Summarize the architecture** — list all tables and their column chains
2. **Show verification results** — sample output from each step
3. **Note the cost** — approximate credits used in testing, projected cost per row at scale
4. **Handoff options**:
   - **Scale up**: run on larger dataset (`run_fields` with `first_hundred`), enable `autoRunOnNewRow`
   - **Diagnose**: if any columns still have issues, run `/baseloop-gtm:diagnose`
   - **Schedule**: set up recurring imports (`update_table` or `update_column` with schedule config)
   - **Adjust**: modify the plan and rebuild specific steps
