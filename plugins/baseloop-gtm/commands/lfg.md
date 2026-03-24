---
name: baseloop-gtm:lfg
description: This command should be used when the user wants to plan, build, and debug an entire Baseloop workflow autonomously from a goal description, with minimal intervention.
argument-hint: "[workflow goal, e.g. 'Import HubSpot companies, qualify B2B SaaS, find founders, sync contacts back']"
disable-model-invocation: true
allowed-tools: Bash(echo *), Read, Glob, Grep, mcp__baseloop-gtm__list_organizations, mcp__baseloop-gtm__list_workspaces, mcp__baseloop-gtm__list_tables, mcp__baseloop-gtm__get_table_schema, mcp__baseloop-gtm__list_views, mcp__baseloop-gtm__list_rows, mcp__baseloop-gtm__list_row_ids, mcp__baseloop-gtm__get_row_details, mcp__baseloop-gtm__list_actions, mcp__baseloop-gtm__get_action_schema, mcp__baseloop-gtm__get_connected_platforms, mcp__baseloop-gtm__resolve_action_options, mcp__baseloop-gtm__create_workspace, mcp__baseloop-gtm__update_workspace, mcp__baseloop-gtm__delete_workspace, mcp__baseloop-gtm__clone_workspace, mcp__baseloop-gtm__create_table, mcp__baseloop-gtm__update_table, mcp__baseloop-gtm__delete_table, mcp__baseloop-gtm__duplicate_table, mcp__baseloop-gtm__create_field, mcp__baseloop-gtm__update_field, mcp__baseloop-gtm__delete_field, mcp__baseloop-gtm__create_rows, mcp__baseloop-gtm__update_row, mcp__baseloop-gtm__delete_rows, mcp__baseloop-gtm__create_view, mcp__baseloop-gtm__update_view, mcp__baseloop-gtm__delete_view, mcp__baseloop-gtm__set_view_filters, mcp__baseloop-gtm__delete_view_filters, mcp__baseloop-gtm__reorder_fields, mcp__baseloop-gtm__update_view_fields, mcp__baseloop-gtm__send_webhook_data, mcp__baseloop-gtm__run_field, mcp__baseloop-gtm__run_fields, mcp__baseloop-gtm__get_run_status, mcp__baseloop-gtm__list_runs, mcp__baseloop-gtm__cancel_run, mcp__baseloop-gtm__wait_for_run, mcp__baseloop-gtm__preview_formula, mcp__baseloop-gtm__clone_field, mcp__baseloop-gtm__reorder_tables, mcp__baseloop-gtm__list_presets, mcp__baseloop-gtm__create_preset, mcp__baseloop-gtm__update_preset, mcp__baseloop-gtm__delete_preset, mcp__baseloop-gtm__list_workspace_templates, mcp__baseloop-gtm__mark_workspace_as_template, mcp__baseloop-gtm__unmark_workspace_as_template, mcp__baseloop-gtm__clone_workspace_template
---

# LFG — Autonomous Workflow Engineering

Build an entire GTM workflow end-to-end: plan the architecture, create all tables and fields, test each step, diagnose and fix errors, and deliver a working workflow.

## Goal

<workflow_goal>$ARGUMENTS</workflow_goal>

If the goal above is empty, ask: "What workflow do you want me to build? Describe the data flow you want to achieve."

---

## Step 1: Plan

Follow the `/baseloop-gtm:plan` workflow:

1. Survey the environment (`list_tables`, `get_connected_platforms`, `list_actions`).
2. Design the architecture (tables, field chains, autoRunConditions, data flow).
3. Present the plan to the user.
4. **Wait for user confirmation before building.** The plan defines what gets created — the user must approve it.

---

## Step 2: Build and Rung 1

Follow the `/baseloop-gtm:build` workflow (Steps 1 through 4.5) using the approved plan. Every `run_field` in this step MUST use `runAction: "first_one"`. Rung 1 must pass (all fields healthy on the test row) before proceeding.

---

## Step 3: Rung 2

Follow `/baseloop-gtm:build` Step 5 — Rung 2 (`first_ten`). Enable `autoRunEnabled`, run with `first_ten`, verify zero failures across the full chain. Rung 2 must pass before proceeding.

---

## Step 4: Diagnose and Fix

For each failing field found in Rung 1 or Rung 2, follow the `/baseloop-gtm:diagnose` workflow. After fixing a field, re-check downstream fields — the fix may unblock them. Repeat until all fields are healthy or escalate to the user.

---

## Step 5: Final Report and Rung 3 Approval

Present the completed workflow and **ask for user approval before full-scale execution**:

```
## Workflow Summary

**Tables:** [list with row counts]
**Fields:** [total fields across all tables]
**Health:** [X/Y fields healthy]

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

After approval, for tables with >100 rows, use the batch processing pattern: `list_row_ids` (with `hasNotRun` filter) → chunk into batches of 100 → `run_fields` with `rowIds` → `wait_for_run` between batches. See SKILL.md "Batch processing with `list_row_ids`".
