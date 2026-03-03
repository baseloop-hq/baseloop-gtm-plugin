---
name: baseloop-gtm:diagnose
description: This command should be used when a Baseloop workflow column has errors, produces unexpected output, or data is not flowing between tables. It investigates the root cause, applies a fix, and verifies the resolution.
argument-hint: "[table name, column name, or problem description]"
disable-model-invocation: true
allowed-tools: Bash(echo *), Read, Glob, Grep, mcp__baseloop-gtm__list_organizations, mcp__baseloop-gtm__list_workspaces, mcp__baseloop-gtm__list_tables, mcp__baseloop-gtm__get_table_schema, mcp__baseloop-gtm__list_views, mcp__baseloop-gtm__list_rows, mcp__baseloop-gtm__list_row_ids, mcp__baseloop-gtm__get_row_details, mcp__baseloop-gtm__list_actions, mcp__baseloop-gtm__get_action_schema, mcp__baseloop-gtm__get_connected_platforms, mcp__baseloop-gtm__resolve_action_options, mcp__baseloop-gtm__create_workspace, mcp__baseloop-gtm__update_workspace, mcp__baseloop-gtm__delete_workspace, mcp__baseloop-gtm__clone_workspace, mcp__baseloop-gtm__create_table, mcp__baseloop-gtm__update_table, mcp__baseloop-gtm__delete_table, mcp__baseloop-gtm__duplicate_table, mcp__baseloop-gtm__create_column, mcp__baseloop-gtm__update_column, mcp__baseloop-gtm__delete_column, mcp__baseloop-gtm__create_rows, mcp__baseloop-gtm__update_row, mcp__baseloop-gtm__delete_rows, mcp__baseloop-gtm__create_view, mcp__baseloop-gtm__update_view, mcp__baseloop-gtm__delete_view, mcp__baseloop-gtm__set_view_filters, mcp__baseloop-gtm__delete_view_filters, mcp__baseloop-gtm__reorder_columns, mcp__baseloop-gtm__update_view_columns, mcp__baseloop-gtm__send_webhook_data, mcp__baseloop-gtm__run_field, mcp__baseloop-gtm__run_fields, mcp__baseloop-gtm__get_run_status, mcp__baseloop-gtm__list_runs, mcp__baseloop-gtm__cancel_run, mcp__baseloop-gtm__wait_for_run, mcp__baseloop-gtm__preview_formula, mcp__baseloop-gtm__clone_field, mcp__baseloop-gtm__reorder_tables, mcp__baseloop-gtm__list_presets, mcp__baseloop-gtm__create_preset, mcp__baseloop-gtm__update_preset, mcp__baseloop-gtm__delete_preset, mcp__baseloop-gtm__list_workspace_templates, mcp__baseloop-gtm__mark_workspace_as_template, mcp__baseloop-gtm__unmark_workspace_as_template, mcp__baseloop-gtm__clone_workspace_template
---

# Diagnose a Workflow Error

## Problem

<problem_description>$ARGUMENTS</problem_description>

If the problem description above is empty, ask: "Which table or column is having issues? Describe what you expected vs. what happened."

Before starting, read [error-patterns.md](../skills/gtm-engineering/references/error-patterns.md) and [pitfalls.md](../skills/gtm-engineering/references/pitfalls.md) to load known error signatures.

---

## Phase 1: Investigate (read-only)

Gather evidence without changing anything.

### Step 1: Locate the failing table and column

1. `list_tables` — identify the table mentioned in the problem.
2. `get_table_schema` — find the failing column. Look for columns whose action matches the problem description.
3. If unclear which column is failing, `list_rows` with `filters` (e.g. `hasError` operator) to find rows with errors. For large tables, use `list_row_ids` with `hasError` filter to efficiently get just the IDs of failing rows without loading cell data.

### Step 2: Read the error

1. `get_row_details` (without fieldId) — see all cell values for a failing row. Identify which cells show "error" or unexpected nulls.
2. `get_row_details` (with fieldId) — read the `errorMessage` and `fullValue` for the failing column. The `fullValue` often contains partial execution data, API responses, or AI reasoning.
3. If a `runId` is available, `get_run_status` — check run-level stats (succeeded, skippedDueToConditions, failed, total) and `failedRowIds`.

### Step 3: Trace upstream

For each `{{column_name}}` referenced in the failing column's config:
1. Check if the referenced column exists in `get_table_schema`.
2. Check if the referenced column has a non-null value in the failing row via `get_row_details`.
3. If the upstream value is null or wrong, the upstream column is the real problem — recurse.

### Step 4: Match against known patterns

Compare findings against error-patterns.md:
- Empty errorMessage → config crash
- All rows failed → configuration problem (property names, auth)
- Send to Table 0 rows → sourceArrayPath or condition issue
- Formula error → renamed columns or syntax
- AI empty output → upstream nulls, vague prompt
- HubSpot ignores fields → display names vs internal names
- Run hangs → rate limits, web search, or stuck
- autoRunCondition blocks → wrong operator or upstream data

---

## Phase 2: Diagnose

Present findings to the user:

```
**Symptom:** [What was observed]
**Affected column:** [table_name > column_name (action_key)]
**Error data:** [errorMessage or relevant fullValue excerpt]
**Root cause:** [Identified cause from error-patterns.md or investigation]
**Confidence:** High / Medium / Low
**Related pitfall:** [If a pitfall from pitfalls.md applies, reference it]
```

- **High confidence**: Error matches a known pattern exactly. Proceed to fix.
- **Medium confidence**: Error matches a pattern partially. Proceed but watch for secondary issues.
- **Low confidence**: Error is ambiguous. Ask the user for more context before fixing.

---

## Phase 3: Fix and Verify

### Step 1: Apply the fix

Based on the diagnosis:
- **Config error** (wrong property names, field mappings, prompt): `update_column` with corrected config.
- **Upstream data issue**: Diagnose the upstream column first (recursive — go back to Phase 1 for that column).
- **Auth/rate limit**: Tell the user to reconnect the platform or wait.
- **Formula error**: Use `preview_formula` to iterate the formula until correct, then `update_column`.

### Step 2: Re-run the fixed column

1. `run_field` with `skipCellsWithData: false` and `runAction: "first_one"` — test on a single row.
2. `wait_for_run` to wait for completion.

### Step 3: Verify the fix

1. `get_row_details` with fieldId — confirm the error is gone and output looks correct.
2. If still failing, re-read the error and try a different fix. Maximum 2 attempts before escalating to the user.

### Step 4: Scale up

1. `run_field` with `skipCellsWithData: false` and `runAction: "first_ten"` — re-run on 10 rows.
2. `wait_for_run`, then `get_run_status` — confirm 0 failures.
3. If any failures remain, investigate the failing rows (they may have different data that triggers a different error).

### Step 5: Report and handoff

Present the resolution:
```
**Fixed:** [What was wrong and what was changed]
**Verified:** [X/Y rows passing after fix]
**Next steps:**
- Scale up using the Scaling Ladder: `run_field` with `runAction: "first_ten"`, then full dataset with user approval
- Check downstream tables for cascading issues
- Run `/baseloop-gtm:diagnose` on any other failing columns
```

If the fix resolved one column but revealed issues in downstream columns, offer to diagnose those next.
