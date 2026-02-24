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

## Step 2: Build — Scaling Ladder Rung 1 (first_one)

Follow the `/baseloop-gtm:build` workflow using the approved plan:

1. **Create tables** — create all tables in the plan.
2. **Create ALL columns per table** — create every column for a table before running anything. Do not create-then-run one column at a time.
3. **Test with `first_one`** — `run_field` with `runAction: "first_one"` on each column sequentially. Verify output with `get_row_details` at every step. Follow data across Send to Table connections.
4. **Fix inline errors** — read error-patterns.md, diagnose, fix with `update_column`, re-run with `runAction: "first_one"` and `skipCellsWithData: false`.

**Every `run_field` call in this step MUST include `runAction: "first_one"`. Never omit `runAction`. Never use `first_ten` or `first_hundred` during the build phase.**

Rung 1 must pass (all columns healthy on the test row) before proceeding.

---

## Step 3: Scaling Ladder Rung 2 (first_ten)

After Rung 1 passes, scale to 10 rows:

1. Enable `autoRunEnabled` on all columns that should auto-trigger.
2. `run_field` on the first column of each source table with `runAction: "first_ten"`.
3. `wait_for_run` and `get_run_status` — confirm zero failures across the chain.
4. Follow data across tables: `list_rows` on destination tables, verify row counts.
5. For each table: `get_row_details` on 3 sample rows — check for errors or unexpected nulls.
6. Compile a health report:
   - Healthy columns (passing on all sampled rows)
   - Failing columns (error status, unexpected output)
   - Skipped columns (autoRunCondition not met — verify this is expected)

Rung 2 must pass before proceeding.

---

## Step 4: Diagnose and Fix

For each failing column found in Rung 1 or Rung 2:

1. Follow the `/baseloop-gtm:diagnose` workflow:
   - Investigate (read error, trace upstream, match patterns)
   - Diagnose (identify root cause)
   - Fix (`update_column` + `run_field` with `runAction: "first_one"` and `skipCellsWithData: false`)
   - Verify (confirm fix on 1 row, then re-run Rung 2)

2. After fixing a column, re-check downstream columns — the fix may unblock them.

3. Repeat until all columns are healthy or escalate unresolvable issues to the user.

---

## Step 5: Final Report and Rung 3 Approval

Present the completed workflow and **ask for user approval before full-scale execution**:

```
## Workflow Summary

**Tables:** [list with row counts]
**Columns:** [total columns across all tables]
**Health:** [X/Y columns healthy]

### Architecture
[Table-to-table data flow diagram]

### Verification Results
[Sample output from Rung 1 and Rung 2]

### Cost
[Credits used in testing so far]
[Estimated credits for full-scale run (Rung 3): N rows × cost per row]

### Errors Resolved
[List of errors found and fixed during build, if any]

### Rung 3: Ready to scale?
[Row count remaining] rows at ~[cost] credits each = ~[total] credits.
Approve to run on the full dataset, or adjust the plan first.
```

**Do NOT run the full dataset without user approval.** LFG is autonomous through Rung 1 and Rung 2, but pauses at Rung 3.
