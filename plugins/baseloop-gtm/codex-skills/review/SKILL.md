---
name: review
description: This skill should be used to proactively audit an existing Baseloop workflow for known pitfalls, missing safeguards, and credit-wasting patterns before they cause problems. It is read-only and never modifies the workflow.
argument-hint: "[workspace name or table name to audit]"
---

# Review — Proactive Workflow Audit

<!-- INTERACTION-METHOD-START -->

## Interaction Method

When asking the user a question, use the platform's blocking question tool: `AskUserQuestion` in Claude Code (call `ToolSearch` with `select:AskUserQuestion` first if its schema isn't loaded), `request_user_input` in Codex, `ask_user` in Gemini, `ask_user` in Pi (requires the `pi-ask-user` extension). Fall back to numbered options in chat only when no blocking tool exists in the harness or the call errors — not because a schema load is required. Never silently skip the question.

Ask one question at a time. Prefer a concise single-select choice when natural options exist.

<!-- INTERACTION-METHOD-END -->


Inspect an existing workflow for known pitfalls, missing safeguards, and credit-wasting patterns. This skill is **read-only** — it never creates, updates, or deletes anything.

## Target

<audit_target>$ARGUMENTS</audit_target>

If the target above is empty, ask: "Which workspace or table should I audit? I'll check it for known pitfalls and missing safeguards."

Before starting, read [pitfalls.md](./references/pitfalls.md), [error-patterns.md](./references/error-patterns.md), and [platform-discovery.md](./references/platform-discovery.md) to load the full checklist and current runtime-discovery rules.

## Phase 0: Load Applicable Learnings

If `docs/solutions/` exists in the current working directory, scan it for entries that extend the audit. Match logic:

1. Read every `*.md` file's YAML frontmatter (skip files with `superseded_by:` set).
2. A learning is applicable when at least one `modules` value overlaps with the audit target's modules (e.g. workflow touches HubSpot → match entries whose `modules` includes `hubspot`).
3. For each applicable learning, read the body section "General pattern" and use it to extend the audit checks below — e.g. a learning about HubSpot enum mismatch becomes an additional Critical or Warning check for that workflow.

Surface them to the user as a short bullet list before the audit report:

> Loaded 2 applicable learnings from `docs/solutions/`:
> - 2026-04-25-resolve-domain-before-hubspot-lookup — Resolve company domain before HubSpot lookup
> - 2026-04-12-hubspot-enum-mismatch — Convert lifecyclestage enum before HubSpot update

If no learnings match or `docs/solutions/` doesn't exist, skip silently.

---

## Phase 1: Discover

1. `list_workspaces` — find the target workspace.
2. `list_tables` — get all tables in the workspace.
3. `get_connected_platforms` — load org-specific provider connection state.
4. `list_actions` — load current action metadata, including `connectionStatus`, `creditCostHint`, lifecycle flags, and detailed-guide availability.
5. For each table: `get_table_schema` — get all fields, their actions, types, and autoRunConditions.
6. For action fields whose schema or guide matters to the audit, call `get_action_schema`. Use `resolve_action_options` when validating CRM properties, campaign IDs, enum values, Send to Table paths, or other dynamic options.
7. For tables with data: `list_rows` (limit 5) — spot-check for errors, nulls, or unexpected values.

Build a mental map of the workflow: source tables → enrichment tables → routing tables → CRM sync tables.

---

## Phase 2: Audit

Check every table and field against the following checklist. For each finding, record the severity and specific field.

### Critical (credit waste or data corruption)

**C1 — Missing autoRunCondition on paid or variable-credit actions**
For each field whose current `list_actions` metadata has `creditCostHint` other than `free`, or whose `get_action_schema` guide indicates credit usage.
- Does it have an `autoRunCondition`? If not → **Critical**: "Field [name] runs [action] on every row without gating. Add autoRunCondition on upstream prerequisites."

**C1b — Disconnected, legacy, or deprecated action**
For each action field, compare the stored action key against `list_actions`.
- Is the provider disconnected, the action missing, or the metadata marked with `deprecationNotice`? → **Critical** if the field cannot run, otherwise **Warning** with the required reconnection or migration step.

**C2 — Referencing action output instead of extracting fullValue**
For each field whose input config contains `{{field_name}}` where `field_name` is an action field (not a formula, not an input, not an extraction):
- The downstream field is likely receiving display text ("Found", "Sent", "Created") instead of actual data → **Critical**: "Field [name] references action field [ref] directly. Create an extraction field for the needed value."

**C3 — Non-text types on extraction or AI output fields**
For each field with `extractorFieldId`, or whose current action guide indicates AI/LLM output:
- Is the field type something other than `text`? → **Critical**: "Field [name] uses type [type] for extraction/AI output. Must be `text` to avoid silent coercion."

**C4 — CRM create without lookup-before-create**
For each CRM record-creation action returned by current `list_actions`/`get_action_schema` metadata:
- Is there a corresponding CRM lookup field on the same table gating creation with `isNotFound`? If not → **Critical**: "Field [name] creates CRM records without checking for duplicates first."

**C5 — Send to Table destination has pre-created fields**
For each `send_to_table` field, check the destination table:
- Read the current `send_to_table` guide via `get_action_schema`. If it still owns destination field creation, check whether fields were manually created before routing was configured. Look for duplicate field names or fields with no action → **Critical**: "Destination table [name] may have pre-created fields that conflict with Send to Table behavior."

### Warning (likely bugs or inefficiencies)

**W1 — Missing blocklist check**
Does the workflow have enrichment fields but no `lookup_single_record` against a blocklist table before them? → **Warning**: "No blocklist check before enrichment. Credits may be wasted on existing customers or churned accounts."

**W2 — No email verification before outreach routing**
Does the workflow route to an outreach platform without an email verification step? → **Warning**: "No email verification before outreach. Expect high bounce rates."

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

**W7 — Oversized formula used for semantic classification**
For formula fields that classify free-text values:
- Does the config/prompt embed long enumerations, geography lists, industry lists, job-title dictionaries, or synonym maps? Does the source column contain ambiguous values such as mixed countries and cities? If yes → **Warning**: "Field [name] uses a formula for open-ended semantic classification. Replace with a tightly gated `custom_ai_agent` field and use formulas only for downstream deterministic gates."

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
