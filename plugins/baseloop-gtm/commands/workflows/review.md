---
name: baseloop-gtm:review
description: This command should be used to proactively audit an existing Baseloop workflow for known pitfalls, missing safeguards, and credit-wasting patterns before they cause problems. It is read-only and never modifies the workflow.
argument-hint: "[workspace name or table name to audit]"
disable-model-invocation: true
allowed-tools: Bash(echo *), Read, Glob, Grep, mcp__baseloop-gtm__list_organizations, mcp__baseloop-gtm__list_workspaces, mcp__baseloop-gtm__list_tables, mcp__baseloop-gtm__get_table_schema, mcp__baseloop-gtm__list_views, mcp__baseloop-gtm__list_rows, mcp__baseloop-gtm__get_row_details, mcp__baseloop-gtm__list_actions, mcp__baseloop-gtm__get_action_schema, mcp__baseloop-gtm__get_connected_platforms, mcp__baseloop-gtm__resolve_action_options, mcp__baseloop-gtm__get_run_status, mcp__baseloop-gtm__list_runs, mcp__baseloop-gtm__preview_formula, mcp__baseloop-gtm__list_presets, mcp__baseloop-gtm__list_workspace_templates
---

# Review — Proactive Workflow Audit

Inspect an existing workflow for known pitfalls, missing safeguards, and credit-wasting patterns. This command is **read-only** — it never creates, updates, or deletes anything.

## Target

<audit_target>$ARGUMENTS</audit_target>

If the target above is empty, ask: "Which workspace or table should I audit? I'll check it for known pitfalls and missing safeguards."

Before starting, read [pitfalls.md](../../skills/gtm-engineering/references/pitfalls.md) and [error-patterns.md](../../skills/gtm-engineering/references/error-patterns.md) to load the full checklist.

---

## Phase 1: Discover

1. `list_workspaces` — find the target workspace.
2. `list_tables` — get all tables in the workspace.
3. For each table: `get_table_schema` — get all columns, their actions, types, and autoRunConditions.
4. For tables with data: `list_rows` (limit 5) — spot-check for errors, nulls, or unexpected values.

Build a mental map of the workflow: source tables → enrichment tables → routing tables → CRM sync tables.

---

## Phase 2: Audit

Check every table and column against the following checklist. For each finding, record the severity and specific column.

### Critical (credit waste or data corruption)

**C1 — Missing autoRunCondition on expensive actions**
For each column with an action in: `enrich_company`, `enrich_contact`, `li_find_people_at_company`, `custom_ai_agent`, `perplexity_ai_agent`, `builtwith_lookup`.
- Does it have an `autoRunCondition`? If not → **Critical**: "Column [name] runs [action] on every row without gating. Add autoRunCondition on upstream prerequisites."

**C2 — Referencing action output instead of extracting fullValue**
For each column whose input config contains `{{column_name}}` where `column_name` is an action column (not a formula, not an input, not an extraction):
- The downstream column is likely receiving display text ("Found", "Sent", "Created") instead of actual data → **Critical**: "Column [name] references action column [ref] directly. Create an extraction column for the needed value."

**C3 — Non-text types on extraction or AI output columns**
For each column with `extractorFieldId` or action `custom_ai_agent`/`perplexity_ai_agent`:
- Is the column type something other than `text`? → **Critical**: "Column [name] uses type [type] for extraction/AI output. Must be `text` to avoid silent coercion."

**C4 — CRM create without lookup-before-create**
For each `hubspot_create_object` or `hubspot_create_engagement` column:
- Is there a corresponding `hubspot_lookup_object` column on the same table gating it with `isNotFound`? If not → **Critical**: "Column [name] creates CRM records without checking for duplicates first."

**C5 — Send to Table destination has pre-created columns**
For each `send_to_table` column, check the destination table:
- Were columns manually created before the Send to Table was configured? Look for duplicate column names or columns with no action → **Critical**: "Destination table [name] may have pre-created columns that will conflict with Send to Table auto-creation."

### Warning (likely bugs or inefficiencies)

**W1 — Missing blocklist check**
Does the workflow have enrichment columns but no `lookup_single_record` against a blocklist table before them? → **Warning**: "No blocklist check before enrichment. Credits may be wasted on existing customers or churned accounts."

**W2 — No email verification before outreach routing**
Does the workflow route to outreach (Reply, Lemlist, Instantly) without an email verification step? → **Warning**: "No email verification before outreach. Expect high bounce rates."

**W3 — Missing engagement notes for disqualification**
Does the workflow create HubSpot engagement notes only for qualified leads? Check if there are engagement columns gated on disqualification conditions → **Warning**: "No engagement notes for disqualified leads. CRM will lack context on why accounts were skipped."

**W4 — autoRunOnNewRow not enabled on destination tables**
For tables that receive data via Send to Table:
- Is `autoRunOnNewRow` enabled? If not → **Warning**: "Table [name] receives rows from Send to Table but autoRunOnNewRow is off. Action columns won't cascade automatically."

**W5 — Source table not triggered after create_table**
For tables with a source column (HubSpot import, LinkedIn import):
- Does the table have data rows? If 0 rows → **Warning**: "Table [name] has a source column but no data. The source import may not have been triggered after creation."

**W6 — Company intelligence not propagated to contact tables**
For contact-level tables that have AI email/outreach columns:
- Is there a `lookup_single_record` back to the companies table? If not → **Warning**: "Table [name] has AI outreach columns but no lookup to company intelligence. Emails will be generic."

### Info (best practices)

**I1 — Scaling Ladder compliance**
Check `list_runs` for recent runs. Were there runs with `runAction: null` (all rows) on expensive actions? → **Info**: "Column [name] was run on all rows at once. Consider using the Scaling Ladder (first_one → first_ten → full)."

**I2 — Multiple HubSpot lookups for different property sets**
For CRM-syncing workflows, is there only one `hubspot_lookup_object` column? → **Info**: "Single HubSpot lookup may miss properties. Consider separate lookups for account data vs engagement data."

**I3 — Missing table source tag**
For workflows cloned from templates, does each table have a "Table Source" field or formula? → **Info**: "No table source identifier. Downstream systems can't distinguish which campaign batch records came from."

---

## Phase 3: Report

Present findings grouped by severity:

```
## Workflow Audit: [workspace name]

**Tables audited:** [count]
**Columns inspected:** [count]

### Critical ([count])
- **C1** [table > column]: [description]
- **C2** [table > column]: [description]
...

### Warning ([count])
- **W1** [table]: [description]
...

### Info ([count])
- **I1** [table > column]: [description]
...

### Summary
- [X] critical issues that should be fixed before running at scale
- [Y] warnings that may cause problems
- [Z] informational suggestions

### Recommended Next Steps
1. Fix critical issues first (use `/baseloop-gtm:diagnose` for each)
2. Address warnings before scaling to full dataset
3. Consider info items for workflow optimization
```

If zero findings: "Workflow looks healthy. No known pitfalls detected."
