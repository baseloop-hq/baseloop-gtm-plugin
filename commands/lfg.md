---
name: baseloop-gtm:lfg
description: This command should be used when the user wants to plan, build, and debug an entire Baseloop workflow autonomously from a goal description, with minimal intervention.
argument-hint: "[workflow goal, e.g. 'Import HubSpot companies, qualify B2B SaaS, find founders, sync contacts back']"
disable-model-invocation: true
allowed-tools: Bash(echo *), Read, Glob, Grep, mcp__baseloop-gtm__list_tables, mcp__baseloop-gtm__get_table_schema, mcp__baseloop-gtm__list_rows, mcp__baseloop-gtm__get_row_details, mcp__baseloop-gtm__list_actions, mcp__baseloop-gtm__get_action_schema, mcp__baseloop-gtm__get_connected_platforms, mcp__baseloop-gtm__resolve_action_options, mcp__baseloop-gtm__list_views, mcp__baseloop-gtm__get_run_status, mcp__baseloop-gtm__preview_formula, mcp__baseloop-gtm__create_table, mcp__baseloop-gtm__update_table, mcp__baseloop-gtm__create_column, mcp__baseloop-gtm__update_column, mcp__baseloop-gtm__delete_column, mcp__baseloop-gtm__create_rows, mcp__baseloop-gtm__delete_row, mcp__baseloop-gtm__run_field, mcp__baseloop-gtm__run_fields, mcp__baseloop-gtm__wait_for_run, mcp__baseloop-gtm__create_workspace, mcp__baseloop-gtm__infer_ai_column, mcp__baseloop-gtm__send_webhook_data
---

# LFG — Autonomous Workflow Engineering

Build an entire GTM workflow end-to-end: plan the architecture, create all tables and columns, test each step, diagnose and fix errors, and deliver a working workflow.

## Goal

<workflow_goal>$ARGUMENTS</workflow_goal>

If the goal above is empty, ask: "What workflow do you want me to build? Describe the data flow you want to achieve."

---

## Step 1: Plan

Follow the `/baseloop-gtm:plan` workflow:

1. Survey the environment (`list_tables`, `get_connected_platforms`, `list_actions`).
2. Design the architecture (tables, column chains, autoRunConditions, data flow).
3. Present the plan to the user.
4. **Wait for user confirmation before building.** The plan defines what gets created — the user must approve it.

---

## Step 2: Build

Follow the `/baseloop-gtm:build` workflow using the approved plan:

1. Create tables and columns step by step.
2. Test end-to-end with a small sample (1-3 rows).
3. For each column: run, wait, verify output before moving to the next.
4. Handle inline errors: read error-patterns.md, diagnose, fix with `update_column`, re-run, verify.

---

## Step 3: Health Check

After the build completes, inspect every column in every table:

1. `list_tables` — get all tables created in this workflow.
2. For each table: `get_table_schema` + `list_rows`.
3. For each row (sample 3 rows per table): `get_row_details` — check for any column with "error" status or unexpected nulls.
4. Compile a health report:
   - Healthy columns (passing on all sampled rows)
   - Failing columns (error status, unexpected output)
   - Skipped columns (autoRunCondition not met — verify this is expected)

---

## Step 4: Diagnose and Fix

For each failing column found in the health check:

1. Follow the `/baseloop-gtm:diagnose` workflow:
   - Investigate (read error, trace upstream, match patterns)
   - Diagnose (identify root cause)
   - Fix (`update_column` + `run_field`)
   - Verify (confirm fix on 1 row, then scale to 10)

2. After fixing a column, re-check downstream columns — the fix may unblock them.

3. Repeat until all columns are healthy or escalate unresolvable issues to the user.

---

## Step 5: Final Report

Present the completed workflow:

```
## Workflow Summary

**Tables:** [list with row counts]
**Columns:** [total columns across all tables]
**Health:** [X/Y columns healthy]

### Architecture
[Table-to-table data flow diagram]

### Verification Results
[Sample output from each stage]

### Cost
[Credits used in testing, projected cost per row at scale]

### Errors Resolved
[List of errors found and fixed during build, if any]

### Next Steps
- Scale up: run on full dataset
- Enable autoRunOnNewRow for continuous processing
- Set up schedules for recurring imports
```
