---
name: baseloop-gtm:build
description: This skill should be used when a workflow plan is ready and needs to be built step by step. It creates tables and fields, runs and verifies each step, and handles inline error diagnosis before proceeding.
argument-hint: "[plan description or reference to a previous /baseloop-gtm:plan output]"
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

- **Source tables**: `create_table` with `sourceField` configuration (action type + actionKey + input). Always include an `emoji` (emoji-mart shortcode, e.g. `":rocket:"`, `":briefcase:"`).
- **Send to Table destinations**: `create_table` with NO fields and an `emoji`. Send to Table auto-creates them.
- **Other tables**: `create_table` with a name, workspace, and `emoji`.

### Step 2: Trigger source import (if source table)

**For action-based sources** (HubSpot import, LinkedIn import):
1. `create_rows` with `[{}]` to create a placeholder row.
2. `run_field` on the source field with `skipCellsWithData: false`.
3. `wait_for_run` to wait for the import.
4. `list_rows` to verify data was imported. Report row count to user.

**For webhook sources:**
1. `get_table_schema` to find the webhook field ID (type=webhook).
2. `send_webhook_data` with the webhook field's fieldId and sample JSON data.
3. `list_rows` to verify the row was created with the expected data.

### Step 3: Add all fields (configuration only — DO NOT RUN)

Create all fields for the table before running anything. This lets you set up the full chain with autoRunConditions so a single row can flow end-to-end during testing.

**Do NOT run any field until ALL fields for this table are created.** Creating and running fields one at a time prevents end-to-end testing and leads to running all rows before the chain is validated.

**Exception — extraction fields:** Do NOT create extraction fields during initial field creation. Instead:
1. Create the action field in this step
2. Wait until Rung 1 (Step 4) to run it
3. Inspect the `fullValue` with `get_row_details` using the action field's `fieldId`
4. THEN create extraction fields with verified paths derived from the actual response
5. Resume creating downstream fields that depend on the extracted values

For each field in the plan:

1. **Read the action guide** — `get_action_schema` to get the `aiDescription`. Read it fully before configuring.
2. **Resolve field names** — `get_table_schema` for current field `name` fields (never guess).
3. **Resolve dynamic options** — `resolve_action_options` for any dynamic values (HubSpot properties, campaign IDs, list IDs).
4. **Create the field** — `create_field` with full configuration including `autoRunCondition`. Set `autoRunEnabled: false` for now — we'll test with explicit runs first.
5. **Type safety check** — if this field has extraction fields (`extractorFieldId`), verify that EVERY extraction field uses `type: "text"`. No booleans, no numbers, no selects. This is the #1 silent data loss mistake.

For Send to Table fields:
1. Create the destination table first (empty, no fields)
2. Read `get_action_schema` for `send_to_table`
3. Configure fieldMappings using plain field `name` fields (NOT `{{field_name}}`)
4. For `send_for_each_item`: set `sourceFieldField` (plain name) and `sourceArrayPath`
5. For parent row data: use `column:field_name` prefix in mapping values

Report the full field chain to the user before proceeding to testing.

### Step 4: Scaling Ladder — Rung 1 (first_one)

**Every `run_field` in this step MUST use `runAction: "first_one"`. No exceptions.**

Run a single row through the **entire chain**. This validates that autoRunConditions cascade correctly and data flows through Send to Table to downstream tables.

1. **Run the first field** — `run_field` with `runAction: "first_one"`.
2. **Wait and verify** — `wait_for_run`, then `get_row_details` to check output.
3. **Run the next field** on the same row — `run_field` with `runAction: "first_one"`.
4. **Continue through the chain** — field by field on the same row, verifying each step.
5. **Check downstream tables** — after Send to Table runs, call `list_rows` on destination tables to verify rows were created with correct data.
6. **Follow the data to the end** — continue running fields in destination tables (still `runAction: "first_one"`) until data reaches the final step (CRM sync, outreach, notification).

**If a field fails — inline diagnosis:**

1. Read [error-patterns.md](../gtm-engineering/references/error-patterns.md) to load known error signatures.
2. `get_row_details` with fieldId — read the `errorMessage` and `fullValue`.
3. Match against known patterns (config mismatch, upstream null, auth failure, rate limit).
4. Fix with `update_field`, then re-run with `run_field` using `skipCellsWithData: false` and `runAction: "first_one"` on that field ONLY.
5. `get_row_details` again to verify the fix.
6. Never re-run upstream fields that already have correct data.

If the error persists after 2 fix attempts, suggest running `/baseloop-gtm:diagnose` for a deeper investigation.

### Step 4.5: Rung 1 verification checklist

Before scaling up, verify every table in the workflow:

1. **Row counts** — `list_rows` on each table. Verify expected row counts match (source → destination).
2. **No errors** — `get_row_details` on the test row in each table, checking that no field shows "error" status.
3. **Send to Table destinations** — `list_rows` on each destination table. Confirm rows were created with correct data.
4. **CRM sync responses** — for HubSpot create/update fields, check `fullValue` for successful API responses.
5. **autoRunConditions** — verify that gated fields ran only on rows that met the condition.

Report the checklist results to the user. **Do NOT proceed to Step 5 until Rung 1 passes.** Fix errors first, then scale.

### Step 5: Scaling Ladder — Rung 2 (first_ten) and Rung 3 (full scale)

**Rung 2 (`first_ten`):**

Once Rung 1 passes with zero errors:
1. **Enable autoRunEnabled** on all fields that should auto-trigger — `update_field` for each.
2. **Run a small batch** — `run_field` on the first field with `runAction: "first_ten"`. AutoRunConditions will cascade through the chain.
3. **Wait for propagation** — poll with `get_run_status` or `wait_for_run` until the full chain completes.
4. **Verify** — `list_rows` on each table, `get_run_status` for 0 failures.

**Rung 3 (full scale — requires user approval):**

Once Rung 2 passes with zero errors:
1. **Report Rung 2 results** — show sample output, error count, credit usage so far.
2. **State the cost** — row count remaining and estimated credit cost for the full run.
3. **Ask for approval** before running on the full dataset.
4. Only after explicit approval, run on the full dataset:
   - **≤100 rows:** `run_fields` with `runAction: "first_hundred"` covers everything.
   - **>100 rows:** use the batch processing pattern:
     1. `list_row_ids` with filters (e.g., `hasNotRun` on the target field) to get only unprocessed row IDs. Use `limit: 500` and paginate with `page` if needed.
     2. Chunk the IDs into batches of 100.
     3. For each batch: `run_fields` with `rowIds` set to the batch.
     4. `wait_for_run` on each batch's `runIds` before starting the next.
     5. Repeat until all rows are processed.

**NEVER skip from Rung 1 to Rung 3.** The ladder is sequential.

## Progress Tracking

After each step, provide a brief status:
- What was just built and verified
- What comes next
- Any issues encountered and how they were resolved

## Completion

When the full workflow is built and verified:

1. **Summarize the architecture** — list all tables and their field chains
2. **Show verification results** — sample output from each step
3. **Note the cost** — approximate credits used in testing, projected cost per row at scale
4. **Handoff options**:
   - **Scale up (Rung 3)**: run on full dataset — state row count and estimated credit cost, wait for user approval
   - **Diagnose**: if any fields still have issues, run `/baseloop-gtm:diagnose`
   - **Schedule**: set up recurring imports (`update_table` or `update_field` with schedule config)
   - **Adjust**: modify the plan and rebuild specific steps
