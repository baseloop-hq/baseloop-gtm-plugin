---
name: baseloop-gtm:plan
description: This command should be used when the user wants to design a Baseloop data workflow from a goal description. It analyzes requirements, surveys available tools, and produces a step-by-step workflow architecture without creating anything.
argument-hint: "[workflow goal, e.g. 'Import HubSpot companies, qualify B2B, find founders, sync contacts back']"
disable-model-invocation: true
allowed-tools: Bash(echo *), Read, Glob, Grep, mcp__baseloop-gtm__list_tables, mcp__baseloop-gtm__get_table_schema, mcp__baseloop-gtm__list_rows, mcp__baseloop-gtm__get_row_details, mcp__baseloop-gtm__list_actions, mcp__baseloop-gtm__get_action_schema, mcp__baseloop-gtm__get_connected_platforms, mcp__baseloop-gtm__resolve_action_options, mcp__baseloop-gtm__list_views
---

# Design a GTM Workflow

## Goal

<workflow_goal>$ARGUMENTS</workflow_goal>

If the goal above is empty, ask: "What workflow do you want to build? Describe the data flow you want to achieve."

Do not proceed until you have a clear goal.

## Phase 1: Survey the Environment

Before designing anything, gather context by calling these MCP tools:

1. **`list_tables`** — See what tables already exist. The user may have existing data to build on.
2. **`get_connected_platforms`** — See which integrations are connected (HubSpot, Slack, LinkedIn, etc.). This determines which actions are available.
3. **`list_actions`** — Get the full action catalog. Note which have `hasDetailedGuide: true`.

If relevant tables already exist, also call `get_table_schema` on each to understand current columns, data types, and what's already been built.

If the user mentions specific actions or integrations, call `get_action_schema` to read the `aiDescription` for those actions now — you'll need this context for the design.

## Phase 2: Design the Architecture

Based on the goal and available tools, design the workflow:

### 1. Identify entity types
What data entities are involved? Companies, contacts, deals? Each gets its own table.

### 2. Map the data flow
For each table, define the column chain in order:
- **Source**: Where does data come from? (LinkedIn import, HubSpot list, webhook, manual)
- **Enrichment**: What data needs to be added? (enrich_company, enrich_contact, email/phone enrichment)
- **People finding**: If the workflow needs to find contacts at companies, choose the right method based on target audience:
  - **LinkedIn-heavy** (tech, enterprise, B2B): `li_find_people_at_company` only
  - **Non-LinkedIn** (small businesses, non-tech, low-LinkedIn regions): `custom_ai_agent` with web search + JSON Schema only
  - **Mixed/uncertain**: both, with AI web search gated on LinkedIn `isNotFound`
  - See workflow-patterns.md "People-Finding Strategy" for details. **Do not build both unless the audience warrants it.**
- **Qualification**: What filtering/scoring is needed? (custom_ai_agent, formula, perplexity)
- **Routing**: Does data flow to other tables? (sendToTable with mode and field mappings)
- **Sync**: Does data go to a CRM or outreach tool? (hubspot_create_object, outreach actions)

### 3. Define autoRunConditions
Which columns gate on which upstream results? Apply the "filter cheap before expensive" principle:
- Free: formulas, lookups
- Cheap: enrichment (1-2 credits)
- Expensive: AI + web search (5-50 credits), findPeople (2 credits/contact)

### 4. Check CRM integrity
Any CRM sync MUST follow the lookup-before-create pattern. Verify that:
- Lookup columns exist before create columns
- Create columns are gated on lookup returning `isNotFound`
- Parent record IDs are passed through (e.g., company HubSpot ID to contacts)
- **Company association rule:** If the workflow pushes contacts to HubSpot after a job change or company enrichment, the plan MUST include company lookup-before-create and contact-company association. Never update a contact's company as a flat text field without also creating/linking the Company object. This means: resolve company domain → lookup company in HubSpot → create if not found → update contact with `associateWithObject: true` pointing to the company's HubSpot ID.

## Phase 3: Present the Plan

Output the workflow architecture in this format:

### Tables

For each table:
- **Name** and entity type
- **Source** (how data gets in)
- **Column chain** (ordered list with action key, autoRunCondition, purpose)
- **Send to Table connections** (if routing to other tables, specify mode and key mappings)

### Data Flow Diagram

Show the table-to-table flow:
```
[Companies] --sendToTable(send_for_each_item)--> [Contacts] --hubspot_create_object--> HubSpot
```

### Cost Estimate

Approximate credit cost per row flowing through the full workflow. Note which actions are free vs. paid.

### Risks and Considerations

Flag any concerns: missing integrations, data quality requirements, rate limits, non-deterministic steps.

Standard risk items to check:
- **Company domain availability:** If the workflow enriches contacts and the enrichment may return null for `companyWebsite`, the plan must include an AI domain resolution step (custom_ai_agent with web search, ~4 credits per row) before HubSpot company lookup. Flag this cost in the estimate.

### Testing Strategy

Define how the workflow will be validated before running on the full dataset:

1. **Rung 1 checkpoints** — for each table, what does a successful 1-row test look like? (Expected output values, expected row count in destination tables, expected CRM state)
2. **Rung 2 scope** — 10 rows through the full chain. What to verify at scale (error rate, data quality, CRM dedup).
3. **Test cost** — estimated credits for Rung 1 (1 row × full chain) + Rung 2 (10 rows × full chain).
4. **Full-scale cost** — estimated credits for all rows. This number will be reported to the user before Rung 3.

## Phase 4: Confirm and Handoff

**Do NOT create any tables or columns.** This command is plan-only.

Present three options to the user:

1. **Build step by step** — `/baseloop-gtm:build` — Create tables and columns one at a time, verifying each step before proceeding.
2. **Build autonomously** — `/baseloop-gtm:lfg` — Plan, build, and test (Rung 1 + Rung 2) autonomously. Pauses for your approval before running on the full dataset (Rung 3).
3. **Adjust the plan** — Modify the architecture before building.

Ask: "Ready to build? Choose **build** for step-by-step, **lfg** for autonomous end-to-end, or tell me what to adjust."
