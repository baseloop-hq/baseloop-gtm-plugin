---
name: gtm-engineering
description: This skill should be used when building, testing, diagnosing, or fixing automated GTM data workflows using Baseloop tables and MCP tools. It applies when the user wants to create data workflows, enrich companies or contacts, qualify leads with AI, write personalized email sequences, sync to CRMs like HubSpot, debug failing columns, or configure Baseloop actions.
---

# GTM Engineering

Build automated data workflows that source, enrich, qualify, compose outreach content, and route company and contact data using Baseloop tables and integrations.

## Mental Model

Data flows through stages: **source -> enrich -> qualify -> compose -> route -> sync**.

Design every workflow around these principles:

- **Separation of concerns** — one table per entity type. Companies, contacts, and deals each get their own table. Use Send to Table to move data between them.
- **Exclude before enriching** — check against blocklist/existing CRM data with `lookup_single_record` before spending credits. This is the cheapest gate.
- **Filter cheap before expensive** — formulas are free, enrichment is cheap (1-2 credits), AI + web search is expensive (5-50 credits). Always gate expensive steps behind cheaper filters using autoRunCondition.
- **Choose the right people-finding method** — `li_find_people_at_company` (LinkedIn) vs `custom_ai_agent` with web search vs both. Don't default to building both. LinkedIn works for tech/enterprise/B2B; AI web search works for small businesses, non-tech, or low-LinkedIn-adoption regions. Ask about the target audience before deciding. See workflow-patterns.md for the full decision guide.
- **CRM integrity** — always **lookup before create** when syncing to a CRM. Gate creation on lookup returning "not found". Pass parent record IDs (e.g., company HubSpot ID) so associations are set on creation. This makes workflows idempotent.
- **CRM audit trail** — write HubSpot engagement notes for every outcome (qualified, disqualified with reason, not found). Sales reps need to know why each account was or wasn't pursued.
- **Lookup back to parent** — when contacts are created via Send to Table, use `lookup_single_record` to pull company-level data (HubSpot ID, AE assignment, qualification results) back into the contacts table.
- **Incremental building** — build one step at a time. Verify output before adding the next step. Never build the entire workflow and run it all at once.
- **Scaling Ladder** — every `run_field` call must follow the ladder: `first_one` (validate output) → `first_ten` (validate at scale) → all (only after user approval). Never skip rungs. Never call `run_field` without `runAction`.
- **Shared reference tables** — blocklists, account tier data, and other lookup targets should live in their own workspace and be referenced via `lookup_single_record` from multiple workflows. Maintain them separately; never embed exclusion logic in each workflow.
- **Template workspaces for campaign batches** — build a workflow once, then clone the workspace for each new campaign batch. Each batch gets its own data but the same column structure. Track the source batch with a "Table Source" formula or input field.
- **Recency gating** — before re-enriching or re-contacting, check when the account was last touched. Use a formula like "Contacted Within 30 Days" gated on `hs_last_contacted_date` to avoid wasting credits on recently worked accounts.
- **Webhook as universal ingestion** — external systems (ad platforms, call tools, phone providers, follower trackers, outreach platforms) push data via webhook. Pair with `autoRunOnNewRow: true` so processing starts automatically with zero manual intervention.
- **Per-segment sourcing tables** — create separate import tables per country × vertical × team member (e.g., "{name} - Pharma - ITA", "{name} - Transport - ITA"). All share identical schema but are owned by different people. This makes parallel sourcing conflict-free and lets each team member manage their own Sales Nav searches independently.
- **Formula-based campaign routing** — use formula chains to compute routing dimensions (language, persona cluster, tier) and combine them into a lookup key that maps to external campaign IDs. One HTTP request with a formula-computed URL path replaces N separate routing columns. Example: Language × Job Title Cluster = 8 outreach campaigns, routed by a single `sendHttpRequest` with `{{category_mapping_code}}` in the URL.
- **Layered qualification** — don't qualify in one step. Use a multi-stage funnel: dedup (website validation) → qualification (business model, competitor detection, CRM detection) → segment split (SaaS vs Service) → deep enrichment (intelligence, funding, hiring, traffic). Each stage gates the next, so expensive enrichment only runs on pre-qualified companies.
- **Intelligence-first enrichment** — research the company deeply (ICP intelligence, target personas, prospecting signals) at the company level before enriching contacts. Store intelligence on the Companies Master List, then propagate to all downstream tables (Outbound, CRM Enrichment, Inbound) via `lookup_single_record`. This means company research is done once and reused across every contact at that company.
- **Content generation (advanced)** — most users write email copy in the outreach platform and use Baseloop for enrichment + routing. But when outreach platforms' built-in personalization isn't enough, Baseloop can **generate the outreach content itself** — AI agent columns write personalized multi-email sequences using company intelligence from lookup. Formulas assemble final messages with conditional text (e.g., "connect HubSpot" vs "connect your CRM" based on CRM detection). Only propose this when the user needs per-prospect personalization beyond simple merge fields.
- **Feedback loops to outreach platforms** — after classifying replies or call outcomes, POST the classification back to the outreach platform API (e.g., update lead category, mark as interested/not interested). This keeps the outreach platform in sync with Baseloop's AI-powered analysis and prevents the platform from continuing sequences on classified leads.

## Build Protocol

### Before writing a single column

1. **Analyze the table** — if a table exists, call `get_table_schema` to see its columns, `list_rows` to see sample data. Understand what's already there.
2. **Survey the toolbox** — call `list_actions` to see all available actions, `get_connected_platforms` to see active integrations (HubSpot, LinkedIn, Slack, etc.), and `get_action_schema` for relevant actions. A built-in enrichment or formula may solve what you were about to build an AI Agent for.
3. **Plan the chain** — map out the full workflow (source -> enrich -> qualify -> route -> sync) before creating any columns. Identify which steps need formulas, which need enrichment, and which truly need AI.

### For each column in the chain

1. **Read the action guide** — call `get_action_schema` for the action. The `aiDescription` contains critical constraints and configuration examples. Read it before configuring.
2. **Resolve names and options** — use `get_table_schema` for column `name` fields (never guess). Use `resolve_action_options` for dynamic values (HubSpot properties, list IDs, campaign IDs).
3. **Create the column** — `create_column` with full configuration including autoRunCondition if needed.

### Test end-to-end using the Scaling Ladder

After all columns are created, test the **entire chain** — not column-by-column. This validates that data flows correctly through autoRunConditions and Send to Table.

1. **Rung 1 (`first_one`)** — `run_field` with `runAction: "first_one"` on each column sequentially. Verify output with `get_row_details` at every step. Follow data across tables via Send to Table.
2. **Rung 2 (`first_ten`)** — only after Rung 1 passes with zero errors. `run_field` with `runAction: "first_ten"`. Verify with `get_run_status` (0 failures).
3. **Rung 3 (full scale)** — only after Rung 2 passes AND user approves. Report row count and estimated credit cost. Wait for explicit go-ahead before running on the full dataset.

Report results to the user after each rung. **STOP and get approval before Rung 3.**

### For source actions (imports)

Source actions require a two-step creation:
1. `create_table` with `sourceField` to create the table and source column atomically.
2. Create one placeholder row with `create_row` (pass `[{}]`).
3. `run_field` on the source column with `skipCellsWithData: false` to trigger the import.
4. Verify with `list_rows` — the import creates the actual data rows.

### When fixing a column

If a column's configuration is wrong:
1. Fix with `update_column`.
2. Re-run **only that column** with `run_field` (skipCellsWithData: false).
3. Never re-run upstream columns that already have correct data.

### When diagnosing errors

Follow the investigate → diagnose → fix → verify cycle:

1. **Investigate** (read-only):
   - `get_run_status` for run-level errors (all rows failed, run hanging)
   - `get_row_details` with fieldId for cell-level errors (read errorMessage, fullValue)
   - `get_table_schema` for config validation (compare against `get_action_schema`)
   - Trace upstream: check if every `{{column_name}}` reference resolves to a non-null value

2. **Diagnose** — match against known patterns:
   - Check [error-patterns.md](./references/error-patterns.md) for known error signatures
   - Check [pitfalls.md](./references/pitfalls.md) for preventive patterns that were missed
   - Verify config against `get_action_schema` output

3. **Fix** — smallest change that resolves the issue:
   - `update_column` for config fixes (property names, field mappings, prompts)
   - `run_field` with `skipCellsWithData: false` on ONLY the fixed column
   - For formula issues: iterate with `preview_formula` before updating

4. **Verify** — prove the fix worked:
   - `get_row_details` to confirm the error is resolved on the test row
   - Scale up: re-run on 10 rows, confirm 0 failures in `get_run_status`

## Critical Rules

### NEVER call run_field without runAction

Every `run_field` call MUST include the `runAction` parameter. Omitting `runAction` runs ALL rows — the most expensive mistake possible. Treat a bare `run_field` (without `runAction`) as a bug.

- **Testing a column:** `runAction: "first_one"`
- **Small-scale validation:** `runAction: "first_ten"`
- **Full dataset:** only after user approval — `runAction: "first_hundred"` or larger
- **Watch for small datasets:** if a table has < 100 rows, `"first_hundred"` runs everything. Use `"first_ten"` or `"first_one"` instead.

### Send to Table auto-creates destination columns
Create an empty destination table with `create_table` (no columns). The `fieldMappings` in Send to Table define what columns get created. **Never pre-create columns** in a Send to Table destination — it causes duplicate/mismatched columns.

### Template resolution happens before actions run
`{{field_name}}` in action input is resolved to actual cell values BEFORE the action executes. The action never sees the template string. In Send to Table field mappings, use plain column field names (e.g., `company_name_abc`), NOT `{{company_name_abc}}`. In `send_for_each_item` mode, use `column:field_name` to reference parent row columns.

### AI actions are non-deterministic
Custom AI Agent columns produce different results each run. Never re-run upstream AI columns to fix a downstream config issue. Ask: "Which column's *configuration* changed?" Re-run only that one.

### For AI-powered enrichment, always use custom_ai_agent
Create action columns with the `custom_ai_agent` action key for any classification, scoring, extraction, or research task. Do not create plain primitive columns for AI work.

### Think about implicit triggers
Creating tables, running columns, and autoRunConditions can trigger downstream effects. Before each action, ask: "What else will this trigger?"

## Quick Reference

**Discovery:** `list_tables`, `get_table_schema`, `list_rows`, `get_row_details`, `list_actions`, `get_action_schema`, `get_connected_platforms`, `resolve_action_options`, `list_views`
**Mutations:** `create_workspace`, `create_table`, `update_table`, `create_column`, `update_column`, `delete_column`, `create_rows`, `delete_row`
**Execution:** `run_field`, `run_fields`, `wait_for_run`, `get_run_status`
**AI helpers:** `preview_formula`

## Reference Documents

For detailed action configurations and common workflow patterns, see:
- [action-catalog.md](./references/action-catalog.md) — All available actions by workflow stage with configuration guidance
- [workflow-patterns.md](./references/workflow-patterns.md) — Common end-to-end workflow recipes
- [pitfalls.md](./references/pitfalls.md) — Known failure modes and how to avoid them
- [error-patterns.md](./references/error-patterns.md) — Error signatures mapped to root causes and fix procedures
