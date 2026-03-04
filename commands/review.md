---
name: baseloop-gtm:review
description: This command should be used to proactively audit an existing Baseloop workflow for known pitfalls, missing safeguards, and credit-wasting patterns before they cause problems. It is read-only and never modifies the workflow.
argument-hint: "[workspace name or table name to audit]"
disable-model-invocation: true
allowed-tools: Bash(echo *), Read, Glob, Grep, mcp__baseloop-gtm__list_organizations, mcp__baseloop-gtm__list_workspaces, mcp__baseloop-gtm__list_tables, mcp__baseloop-gtm__get_table_schema, mcp__baseloop-gtm__list_views, mcp__baseloop-gtm__list_rows, mcp__baseloop-gtm__list_row_ids, mcp__baseloop-gtm__get_row_details, mcp__baseloop-gtm__list_actions, mcp__baseloop-gtm__get_action_schema, mcp__baseloop-gtm__get_connected_platforms, mcp__baseloop-gtm__resolve_action_options, mcp__baseloop-gtm__get_run_status, mcp__baseloop-gtm__list_runs, mcp__baseloop-gtm__preview_formula, mcp__baseloop-gtm__list_presets, mcp__baseloop-gtm__list_workspace_templates
---

# Review — Proactive Workflow Audit

Inspect an existing workflow for known pitfalls, missing safeguards, and credit-wasting patterns. This command is **read-only** — it never creates, updates, or deletes anything.

## Target

<audit_target>$ARGUMENTS</audit_target>

If the target above is empty, ask: "Which workspace or table should I audit? I'll check it for known pitfalls and missing safeguards."

Before starting, read [pitfalls.md](../skills/gtm-engineering/references/pitfalls.md) and [error-patterns.md](../skills/gtm-engineering/references/error-patterns.md) to load the full checklist.

---

## Phase 1: Discover

1. `list_workspaces` — find the target workspace.
2. `list_tables` — get all tables in the workspace.
3. For each table: `get_table_schema` — get all fields, their actions, types, and autoRunConditions.
4. For tables with data: `list_rows` (limit 5) — spot-check for errors, nulls, or unexpected values.

Build a mental map of the workflow: source tables → enrichment tables → routing tables → CRM sync tables.

---

## Phase 2: Audit

Check every table and field against the following checklist. For each finding, record the severity and specific field.

### Critical (credit waste or data corruption)

**C1 — Missing autoRunCondition on expensive actions**
For each field with an action in: `enrich_company`, `enrich_contact`, `li_find_people_at_company`, `custom_ai_agent`, `perplexity_ai_agent`, `builtwith_lookup`.
- Does it have an `autoRunCondition`? If not → **Critical**: "Field [name] runs [action] on every row without gating. Add autoRunCondition on upstream prerequisites."

**C2 — Referencing action output instead of extracting fullValue**
For each field whose input config contains `{{field_name}}` where `field_name` is an action field (not a formula, not an input, not an extraction):
- The downstream field is likely receiving display text ("Found", "Sent", "Created") instead of actual data → **Critical**: "Field [name] references action field [ref] directly. Create an extraction field for the needed value."

**C3 — Non-text types on extraction or AI output fields**
For each field with `extractorFieldId` or action `custom_ai_agent`/`perplexity_ai_agent`:
- Is the field type something other than `text`? → **Critical**: "Field [name] uses type [type] for extraction/AI output. Must be `text` to avoid silent coercion."

**C4 — CRM create without lookup-before-create**
For each `hubspot_create_object` or `hubspot_create_engagement` field:
- Is there a corresponding `hubspot_lookup_object` field on the same table gating it with `isNotFound`? If not → **Critical**: "Field [name] creates CRM records without checking for duplicates first."

**C5 — Send to Table destination has pre-created fields**
For each `send_to_table` field, check the destination table:
- Were fields manually created before the Send to Table was configured? Look for duplicate field names or fields with no action → **Critical**: "Destination table [name] may have pre-created fields that will conflict with Send to Table auto-creation."

### Warning (likely bugs or inefficiencies)

**W1 — Missing blocklist check**
Does the workflow have enrichment fields but no `lookup_single_record` against a blocklist table before them? → **Warning**: "No blocklist check before enrichment. Credits may be wasted on existing customers or churned accounts."

**W2 — No email verification before outreach routing**
Does the workflow route to outreach (Reply, Lemlist, Instantly) without an email verification step? → **Warning**: "No email verification before outreach. Expect high bounce rates."

**W3 — Missing engagement notes for disqualification**
Does the workflow create HubSpot engagement notes only for qualified leads? Check if there are engagement fields gated on disqualification conditions → **Warning**: "No engagement notes for disqualified leads. CRM will lack context on why accounts were skipped."

**W4 — autoRunOnNewRow not enabled on destination tables**
For tables that receive data via Send to Table:
- Is `autoRunOnNewRow` enabled? If not → **Warning**: "Table [name] receives rows from Send to Table but autoRunOnNewRow is off. Action fields won't cascade automatically."

**W5 — Source table not triggered after create_table**
For tables with a source field (HubSpot import, LinkedIn import):
- Does the table have data rows? If 0 rows → **Warning**: "Table [name] has a source field but no data. The source import may not have been triggered after creation."

**W6 — Company intelligence not propagated to contact tables**
For contact-level tables that have AI email/outreach fields:
- Is there a `lookup_single_record` back to the companies table? If not → **Warning**: "Table [name] has AI outreach fields but no lookup to company intelligence. Emails will be generic."

### Info (best practices)

**I1 — Scaling Ladder compliance**
Check `list_runs` for recent runs. Were there runs with `runAction: null` (all rows) on expensive actions? → **Info**: "Field [name] was run on all rows at once. Consider using the Scaling Ladder (first_one → first_ten → full)."

**I2 — Multiple HubSpot lookups for different property sets**
For CRM-syncing workflows, is there only one `hubspot_lookup_object` field? → **Info**: "Single HubSpot lookup may miss properties. Consider separate lookups for account data vs engagement data."

**I3 — Missing table source tag**
For workflows cloned from templates, does each table have a "Table Source" field or formula? → **Info**: "No table source identifier. Downstream systems can't distinguish which campaign batch records came from."

---

## Phase 3: Report

Present findings grouped by severity:

```
## Workflow Audit: [workspace name]

**Tables audited:** [count]
**Fields inspected:** [count]

### Critical ([count])
- **C1** [table > field]: [description]
- **C2** [table > field]: [description]
...

### Warning ([count])
- **W1** [table]: [description]
...

### Info ([count])
- **I1** [table > field]: [description]
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
